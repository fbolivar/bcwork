//! Servicio de Windows BCWork Agent (LocalSystem).
//!
//! Responsabilidades:
//! - Aprovisionar el device en el primer arranque (token del tenant → api_key).
//! - Drenar el buffer local y enviar la actividad al servidor.
//! - Vigilar (watchdog) que el helper de captura corra en la sesión interactiva;
//!   si el usuario lo mata, relanzarlo.
//! - Reportar intentos de manipulación (parar el servicio).
//!
//! Subcomandos de consola (para el instalador / diagnóstico):
//!   bcwork-agent-svc install     → registra el servicio (auto-start + restart-on-fail + deny-stop)
//!   bcwork-agent-svc uninstall   → elimina el servicio
//!   bcwork-agent-svc run         → corre el bucle en consola (debug, sin SCM)

const SERVICE_NAME: &str = "BCWorkAgent";
const SERVICE_DISPLAY: &str = "BCWork Agent";
const VERSION: &str = env!("CARGO_PKG_VERSION");
const SENDER_INTERVAL_SECS: u64 = 60;
const WATCHDOG_INTERVAL_SECS: u64 = 15;
const INVENTORY_INTERVAL_SECS: u64 = 12 * 3600;
// Cada 30 min: la consulta es un GET que devuelve un JSON pequeño, y a cambio
// una corrección llega a la flota en media hora en vez de seis. El primer
// chequeo ocurre al arrancar el servicio, así que reiniciarlo fuerza la
// actualización de inmediato.
const UPDATE_INTERVAL_SECS: u64 = 30 * 60;
const BATCH_SIZE: usize = 500;

fn main() {
    let _ = bcwork_agent::paths::ensure_base_dir();
    init_logging();

    let args: Vec<String> = std::env::args().collect();
    let arg = args.get(1).cloned().unwrap_or_default();
    match arg.as_str() {
        #[cfg(target_os = "windows")]
        "install" => {
            // install [--token <t>] [--server <url>]
            let token = flag_value(&args, "--token");
            let server = flag_value(&args, "--server");
            if let Err(e) = win::install_service(token.as_deref(), server.as_deref()) {
                eprintln!("install falló: {e}");
                std::process::exit(1);
            }
            println!("Servicio instalado.");
        }
        #[cfg(target_os = "windows")]
        "uninstall" => {
            if let Err(e) = win::uninstall_service() {
                eprintln!("uninstall falló: {e}");
                std::process::exit(1);
            }
            println!("Servicio eliminado.");
        }
        "run" => {
            // Modo consola: corre el trabajo hasta Ctrl+C.
            let rt = tokio::runtime::Runtime::new().expect("tokio runtime");
            rt.block_on(worker_main(std::sync::mpsc::channel().1));
        }
        _ => {
            #[cfg(target_os = "windows")]
            {
                if let Err(e) = win::run_as_service() {
                    log::error!("service dispatcher falló: {e}");
                }
            }
            #[cfg(not(target_os = "windows"))]
            {
                eprintln!("El servicio solo está soportado en Windows. Usa 'run' para consola.");
            }
        }
    }
}

/// Lee el valor de una bandera `--flag valor` de los argumentos.
fn flag_value(args: &[String], flag: &str) -> Option<String> {
    args.iter()
        .position(|a| a == flag)
        .and_then(|i| args.get(i + 1))
        .filter(|v| !v.starts_with("--"))
        .cloned()
}

fn init_logging() {
    // Log a archivo en ProgramData\BCWork\logs (SYSTEM no tiene consola).
    let _ = std::fs::create_dir_all(bcwork_agent::paths::log_dir());
    env_logger::Builder::from_env(env_logger::Env::default().default_filter_or("info")).init();
}

/// Bucle principal del servicio. Termina cuando `shutdown_rx` recibe señal.
async fn worker_main(shutdown_rx: std::sync::mpsc::Receiver<()>) {
    use bcwork_agent::{buffer, ingest, paths};

    let db_path = paths::buffer_db();
    if let Err(e) = buffer::init(&db_path) {
        log::error!("no se pudo iniciar el buffer: {e}");
    }

    // Aprovisionar (reintenta hasta lograrlo).
    let mut creds = loop {
        match ingest::provision_if_needed(VERSION).await {
            Ok(c) => break c,
            Err(e) => {
                log::warn!("aprovisionamiento pendiente: {e}");
                if shutdown_rx.try_recv().is_ok() {
                    return;
                }
                tokio::time::sleep(std::time::Duration::from_secs(30)).await;
            }
        }
    };
    log::info!("device aprovisionado: {}", creds.device_id);

    let mut last_sender = std::time::Instant::now();
    let mut last_watchdog = std::time::Instant::now();
    let mut last_inventory: Option<std::time::Instant> = None;
    let mut last_update: Option<std::time::Instant> = None;

    loop {
        if shutdown_rx.try_recv().is_ok() {
            log::info!("shutdown solicitado");
            // Drenar lo pendiente y cerrar la sesión: si no, queda abierta para
            // siempre y la jornada nunca tiene hora de fin.
            let _ = send_batch(&creds, &db_path).await;
            close_session(&creds, &db_path).await;
            // Un stop del servicio es una acción de administrador: lo reportamos.
            let _ = ingest::report_tamper(&creds, "stop_attempt", Some("service stop")).await;
            break;
        }

        // Watchdog del helper (solo Windows).
        #[cfg(target_os = "windows")]
        if last_watchdog.elapsed().as_secs() >= WATCHDOG_INTERVAL_SECS {
            last_watchdog = std::time::Instant::now();
            win::ensure_helper_running();
        }
        #[cfg(not(target_os = "windows"))]
        {
            let _ = last_watchdog;
        }

        // Envío de actividad.
        if last_sender.elapsed().as_secs() >= SENDER_INTERVAL_SECS {
            last_sender = std::time::Instant::now();
            // Relee credenciales por si el helper actualizó 'assigned'.
            if let Some(c) = ingest::read_credentials() {
                creds = c;
            }
            if let Err(e) = send_batch(&creds, &db_path).await {
                log::error!("envío falló: {e}");
            }
        }

        // Inventario de apps instaladas: al iniciar y cada 12 horas.
        let due_inventory = match last_inventory {
            None => true,
            Some(t) => t.elapsed().as_secs() >= INVENTORY_INTERVAL_SECS,
        };
        if due_inventory {
            last_inventory = Some(std::time::Instant::now());
            let apps = bcwork_agent::inventory::collect_installed_apps();
            match bcwork_agent::ingest::send_inventory(&creds, &apps).await {
                Ok(_) => log::info!("inventario enviado: {} apps", apps.len()),
                Err(e) => {
                    log::error!("inventario falló: {e}");
                    last_inventory = None; // reintentar en el próximo ciclo
                }
            }
        }

        // Auto-actualización: al iniciar y cada 6 horas.
        let due_update = match last_update {
            None => true,
            Some(t) => t.elapsed().as_secs() >= UPDATE_INTERVAL_SECS,
        };
        if due_update {
            last_update = Some(std::time::Instant::now());
            match bcwork_agent::updater::check_and_update(&creds, VERSION).await {
                Ok(true) => {
                    log::info!("actualización lanzada; el servicio se reiniciará");
                    // El MSI detendrá este servicio; salir del bucle limpiamente.
                    break;
                }
                Ok(false) => {}
                Err(e) => log::error!("auto-update falló: {e}"),
            }
        }

        tokio::time::sleep(std::time::Duration::from_secs(2)).await;
    }
}

/// Cierra la sesión abierta en el servidor (`is_active: false`) y olvida el id.
/// Sin esto todas las work_sessions quedaban con ended_at en NULL.
async fn close_session(creds: &bcwork_agent::ingest::Credentials, db_path: &std::path::Path) {
    use bcwork_agent::buffer;

    let Some(session_id) = buffer::get_state(db_path, "session_id") else {
        return;
    };
    let active_seconds: i64 = buffer::get_state(db_path, "active_seconds")
        .and_then(|v| v.parse().ok())
        .unwrap_or(0);
    let idle_seconds: i64 = buffer::get_state(db_path, "idle_seconds")
        .and_then(|v| v.parse().ok())
        .unwrap_or(0);

    let payload = serde_json::json!({
        "batch_id": uuid::Uuid::new_v4().to_string(),
        "events": [],
        "session_state": {
            "session_id": session_id,
            "started_at": buffer::get_state(db_path, "session_started_at"),
            "is_active": false,
            "active_seconds": active_seconds,
            "idle_seconds": idle_seconds,
        },
    });

    let client = reqwest::Client::new();
    let sent = client
        .post(format!(
            "{}/api/ingest/activity",
            creds.server_url.trim_end_matches('/')
        ))
        .bearer_auth(&creds.api_key)
        .json(&payload)
        .send()
        .await;

    match sent {
        Ok(r) if r.status().is_success() => {
            buffer::clear_state(db_path, "session_id");
            log::info!("sesión cerrada en el servidor");
        }
        Ok(r) => log::warn!("no se pudo cerrar la sesión: {}", r.status()),
        Err(e) => log::warn!("no se pudo cerrar la sesión: {e}"),
    }
}

async fn send_batch(
    creds: &bcwork_agent::ingest::Credentials,
    db_path: &std::path::Path,
) -> anyhow::Result<()> {
    use bcwork_agent::buffer;

    let events = buffer::take_pending(db_path, BATCH_SIZE)?;
    if events.is_empty() {
        return Ok(());
    }

    let batch_events: Vec<serde_json::Value> = events
        .iter()
        .map(|e| {
            serde_json::json!({
                "event_type": e.event_type,
                "app_identifier": e.app_identifier,
                "domain": e.domain,
                "window_title": e.window_title,
                "productivity": e.productivity,
                "started_at": e.started_at,
                "duration_seconds": e.duration_seconds,
                "metadata": e.metadata.as_ref().and_then(|m| serde_json::from_str::<serde_json::Value>(m).ok()),
            })
        })
        .collect();

    // Contadores reales publicados por el helper. Antes se enviaba
    // `session_id: null` e `idle_seconds: 0` fijos: el servidor abría una sesión
    // nueva por cada lote (miles sin cerrar) y la inactividad medida se perdía.
    let session_id = buffer::get_state(db_path, "session_id");
    let active_seconds: i64 = buffer::get_state(db_path, "active_seconds")
        .and_then(|v| v.parse().ok())
        .unwrap_or_else(|| events.iter().map(|e| e.duration_seconds).sum());
    let idle_seconds: i64 = buffer::get_state(db_path, "idle_seconds")
        .and_then(|v| v.parse().ok())
        .unwrap_or(0);
    let started_at = buffer::get_state(db_path, "session_started_at").unwrap_or_else(|| {
        events
            .first()
            .map(|e| e.started_at.clone())
            .unwrap_or_else(|| chrono::Utc::now().to_rfc3339())
    });

    let payload = serde_json::json!({
        "batch_id": uuid::Uuid::new_v4().to_string(),
        "events": batch_events,
        "session_state": {
            "session_id": session_id,
            "started_at": started_at,
            "is_active": true,
            "active_seconds": active_seconds,
            "idle_seconds": idle_seconds,
        },
    });

    let client = reqwest::Client::new();
    let resp = client
        .post(format!(
            "{}/api/ingest/activity",
            creds.server_url.trim_end_matches('/')
        ))
        .bearer_auth(&creds.api_key)
        .json(&payload)
        .send()
        .await?;

    let status = resp.status();
    if status.is_success() {
        let ids: Vec<i64> = events.iter().filter_map(|e| e.id).collect();
        buffer::mark_sent(db_path, &ids)?;
        // Guardar el id que asignó el servidor: sin esto el próximo lote vuelve
        // a abrir otra sesión.
        if let Ok(body) = resp.json::<serde_json::Value>().await {
            if let Some(sid) = body.get("session_id").and_then(|v| v.as_str()) {
                let _ = buffer::set_state(db_path, "session_id", sid);
            }
        }
        log::info!("batch enviado: {} eventos", ids.len());
    } else if status.as_u16() == 401 || status.as_u16() == 403 {
        // Device sin asignar todavía, o revocado. No drenar; reintentar luego.
        log::warn!("actividad rechazada ({}): device sin asignar o revocado", status);
    } else {
        let t = resp.text().await.unwrap_or_default();
        log::error!("actividad rechazada {}: {}", status, t);
    }
    Ok(())
}

// ────────────────────────────────────────────────────────────────────────────
// Específico de Windows: SCM, instalación, watchdog de sesión.
// ────────────────────────────────────────────────────────────────────────────
#[cfg(target_os = "windows")]
mod win {
    use super::*;
    use std::ffi::OsString;
    use std::sync::mpsc;
    use std::time::Duration;
    use windows_service::{
        define_windows_service,
        service::{
            ServiceAccess, ServiceControl, ServiceControlAccept, ServiceErrorControl,
            ServiceExitCode, ServiceInfo, ServiceStartType, ServiceState, ServiceStatus,
            ServiceType,
        },
        service_control_handler::{self, ServiceControlHandlerResult},
        service_dispatcher,
        service_manager::{ServiceManager, ServiceManagerAccess},
    };

    define_windows_service!(ffi_service_main, service_main);

    pub fn run_as_service() -> windows_service::Result<()> {
        service_dispatcher::start(SERVICE_NAME, ffi_service_main)
    }

    fn service_main(_args: Vec<OsString>) {
        if let Err(e) = run() {
            log::error!("service run error: {e}");
        }
    }

    fn run() -> windows_service::Result<()> {
        let (shutdown_tx, shutdown_rx) = mpsc::channel::<()>();

        let event_handler = move |control| match control {
            ServiceControl::Stop | ServiceControl::Shutdown => {
                let _ = shutdown_tx.send(());
                ServiceControlHandlerResult::NoError
            }
            ServiceControl::Interrogate => ServiceControlHandlerResult::NoError,
            _ => ServiceControlHandlerResult::NotImplemented,
        };

        let status_handle = service_control_handler::register(SERVICE_NAME, event_handler)?;

        let running = ServiceStatus {
            service_type: ServiceType::OWN_PROCESS,
            current_state: ServiceState::Running,
            controls_accepted: ServiceControlAccept::STOP | ServiceControlAccept::SHUTDOWN,
            exit_code: ServiceExitCode::Win32(0),
            checkpoint: 0,
            wait_hint: Duration::default(),
            process_id: None,
        };
        status_handle.set_service_status(running)?;

        // Corre el trabajo async en un runtime propio hasta que llegue el stop.
        let rt = tokio::runtime::Runtime::new().expect("tokio runtime");
        rt.block_on(super::worker_main(shutdown_rx));

        let stopped = ServiceStatus {
            service_type: ServiceType::OWN_PROCESS,
            current_state: ServiceState::Stopped,
            controls_accepted: ServiceControlAccept::empty(),
            exit_code: ServiceExitCode::Win32(0),
            checkpoint: 0,
            wait_hint: Duration::default(),
            process_id: None,
        };
        status_handle.set_service_status(stopped)?;
        Ok(())
    }

    /// Placeholder de 64 chars que el servidor byte-patchea con el token real.
    /// Debe coincidir con PLACEHOLDER en apps/web/.../api/admin/installer/route.ts.
    const TOKEN_PLACEHOLDER: &str =
        "BCWORK_TENANT_TOKEN_PLACEHOLDER_00000000000000000000000000000000";

    pub fn install_service(
        token: Option<&str>,
        server: Option<&str>,
    ) -> windows_service::Result<()> {
        // 1) Sembrar provisioning.json + ACL, si el instalador pasó el token.
        if let Some(tok) = token {
            // Si el MSI no fue personalizado (sigue el placeholder), no sembramos.
            if tok != TOKEN_PLACEHOLDER && !tok.is_empty() {
                let server_url = server
                    .filter(|s| !s.is_empty())
                    .unwrap_or("https://bcwork.bc-security.com");
                if let Err(e) = bcwork_agent::ingest::write_provisioning(server_url, tok) {
                    log::error!("no se pudo escribir provisioning.json: {e}");
                } else {
                    harden_program_data_acl();
                }
            } else {
                log::warn!("token placeholder: el MSI no fue personalizado por el panel");
            }
        }

        let manager =
            ServiceManager::local_computer(None::<&str>, ServiceManagerAccess::CREATE_SERVICE)?;

        let exe = std::env::current_exe().expect("current exe");
        let service_info = ServiceInfo {
            name: OsString::from(SERVICE_NAME),
            display_name: OsString::from(SERVICE_DISPLAY),
            service_type: ServiceType::OWN_PROCESS,
            start_type: ServiceStartType::AutoStart,
            error_control: ServiceErrorControl::Normal,
            executable_path: exe,
            launch_arguments: vec![],
            dependencies: vec![],
            account_name: None, // LocalSystem
            account_password: None,
        };

        let service = manager.create_service(
            &service_info,
            ServiceAccess::CHANGE_CONFIG | ServiceAccess::START,
        )?;
        service.set_description(
            "Monitoreo de actividad laboral BCWork. Servicio protegido; su detención queda registrada.",
        )?;

        // Reinicio automático ante caídas (watchdog del propio SCM).
        // Config de failure actions y deny-stop se aplican con sc.exe para máxima compatibilidad.
        drop(service);
        apply_hardening();
        let _ = start_now();
        Ok(())
    }

    fn start_now() -> std::io::Result<()> {
        std::process::Command::new("sc.exe")
            .args(["start", SERVICE_NAME])
            .status()?;
        Ok(())
    }

    /// Endurecimiento vía sc.exe:
    /// - failure actions: reiniciar el servicio a los 5s en los 3 primeros fallos.
    /// - deny-stop SDDL: los usuarios estándar no pueden detenerlo (sí SYSTEM/Admins).
    fn apply_hardening() {
        let _ = std::process::Command::new("sc.exe")
            .args([
                "failure",
                SERVICE_NAME,
                "reset=",
                "86400",
                "actions=",
                "restart/5000/restart/5000/restart/5000",
            ])
            .status();

        // SDDL: Admins (BA) y SYSTEM (SY) control total; Usuarios autenticados (AU)
        // pueden consultar estado pero NO detener/pausar/borrar.
        // CCLCSWRPWPDTLOCRRC = full-ish; para AU quitamos WP/DT/RP (stop/pause/start).
        let sddl = "D:(A;;CCLCSWRPWPDTLOCRRC;;;SY)(A;;CCLCSWRPWPDTLOCRRC;;;BA)(A;;CCLCSWLOCRRC;;;AU)(A;;CCLCSWLOCRRC;;;IU)S:(AU;FA;CCDCLCSWRPWPDTLOCRSDRCWDWO;;;WD)";
        let _ = std::process::Command::new("sc.exe")
            .args(["sdset", SERVICE_NAME, sddl])
            .status();
    }

    /// Endurece las ACL en `%ProgramData%\BCWork`:
    /// - El directorio permite a SYSTEM/Admins control total y a los usuarios
    ///   autenticados MODIFICAR (para que el helper escriba buffer.db y lea
    ///   credentials.json —api_key con alcance a este device, revocable—).
    /// - `provisioning.json` (el TOKEN DEL TENANT, la joya) queda SOLO para
    ///   SYSTEM/Admins: un usuario estándar no puede leerlo ni copiarlo.
    fn harden_program_data_acl() {
        let dir = bcwork_agent::paths::base_dir();
        let path = dir.to_string_lossy().to_string();
        // Directorio base: herencia reseteada + permisos explícitos.
        let _ = std::process::Command::new("icacls")
            .args([&path, "/inheritance:r"])
            .status();
        let _ = std::process::Command::new("icacls")
            .args([&path, "/grant:r", "*S-1-5-18:(OI)(CI)F"]) // SYSTEM
            .status();
        let _ = std::process::Command::new("icacls")
            .args([&path, "/grant:r", "*S-1-5-32-544:(OI)(CI)F"]) // Administradores
            .status();
        let _ = std::process::Command::new("icacls")
            .args([&path, "/grant:r", "*S-1-5-11:(OI)(CI)M"]) // Usuarios autenticados: modificar
            .status();

        // provisioning.json: bloqueado a SYSTEM/Admins.
        let prov = bcwork_agent::paths::provisioning_file()
            .to_string_lossy()
            .to_string();
        let _ = std::process::Command::new("icacls")
            .args([&prov, "/inheritance:r"])
            .status();
        let _ = std::process::Command::new("icacls")
            .args([&prov, "/grant:r", "*S-1-5-18:F", "*S-1-5-32-544:F"])
            .status();
    }

    pub fn uninstall_service() -> windows_service::Result<()> {
        let manager =
            ServiceManager::local_computer(None::<&str>, ServiceManagerAccess::CONNECT)?;
        let service = manager.open_service(
            SERVICE_NAME,
            ServiceAccess::STOP | ServiceAccess::DELETE | ServiceAccess::QUERY_STATUS,
        )?;
        let _ = service.stop();
        service.delete()?;
        Ok(())
    }

    // ── Watchdog de sesión: garantiza que el helper corre en la sesión activa ──

    use std::sync::atomic::{AtomicU32, Ordering};
    // PID del helper que lanzamos (0 = ninguno).
    static HELPER_PID: AtomicU32 = AtomicU32::new(0);

    pub fn ensure_helper_running() {
        use windows::Win32::System::RemoteDesktop::WTSGetActiveConsoleSessionId;
        let session_id = unsafe { WTSGetActiveConsoleSessionId() };
        // 0xFFFFFFFF = no hay sesión de consola activa (pantalla de bloqueo / nadie logueado).
        if session_id == 0xFFFF_FFFF {
            return;
        }

        // ¿Sigue vivo el helper que lanzamos?
        let pid = HELPER_PID.load(Ordering::Relaxed);
        if pid != 0 && is_process_alive(pid) {
            return;
        }

        match spawn_helper_in_session(session_id) {
            Ok(new_pid) => {
                HELPER_PID.store(new_pid, Ordering::Relaxed);
                log::info!("helper lanzado en sesión {} (pid {})", session_id, new_pid);
            }
            Err(e) => log::warn!("no se pudo lanzar el helper: {e}"),
        }
    }

    fn is_process_alive(pid: u32) -> bool {
        use windows::Win32::Foundation::CloseHandle;
        use windows::Win32::System::Threading::{
            GetExitCodeProcess, OpenProcess, PROCESS_QUERY_LIMITED_INFORMATION,
        };
        const STILL_ACTIVE: u32 = 259; // STATUS_PENDING
        unsafe {
            let Ok(h) = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, pid) else {
                return false;
            };
            let mut code = 0u32;
            let alive = GetExitCodeProcess(h, &mut code).is_ok() && code == STILL_ACTIVE;
            let _ = CloseHandle(h);
            alive
        }
    }

    /// Lanza el helper (bcwork-agent.exe) como el usuario de la sesión interactiva.
    /// Requiere ejecutarse como SYSTEM (el servicio lo es) para WTSQueryUserToken.
    fn spawn_helper_in_session(session_id: u32) -> anyhow::Result<u32> {
        use windows::core::{PCWSTR, PWSTR};
        use windows::Win32::Foundation::{CloseHandle, HANDLE};
        use windows::Win32::System::Environment::{CreateEnvironmentBlock, DestroyEnvironmentBlock};
        use windows::Win32::System::RemoteDesktop::WTSQueryUserToken;
        use windows::Win32::System::Threading::{
            CreateProcessAsUserW, CREATE_NEW_CONSOLE, CREATE_UNICODE_ENVIRONMENT,
            PROCESS_INFORMATION, STARTUPINFOW,
        };

        // Ruta del helper: mismo directorio que el ejecutable del servicio.
        let exe_dir = std::env::current_exe()?
            .parent()
            .map(|p| p.to_path_buf())
            .ok_or_else(|| anyhow::anyhow!("sin directorio del exe"))?;
        let helper = exe_dir.join("bcwork-agent.exe");
        if !helper.exists() {
            return Err(anyhow::anyhow!("helper no encontrado en {:?}", helper));
        }

        unsafe {
            // Token del usuario logueado en esa sesión.
            let mut user_token = HANDLE::default();
            WTSQueryUserToken(session_id, &mut user_token)?;

            // Bloque de entorno del usuario.
            let mut env_block: *mut core::ffi::c_void = std::ptr::null_mut();
            let _ = CreateEnvironmentBlock(&mut env_block, user_token, false);

            // Línea de comandos (UTF-16, mutable, terminada en NUL).
            let mut cmd: Vec<u16> = format!("\"{}\" --helper", helper.display())
                .encode_utf16()
                .chain(std::iter::once(0))
                .collect();

            // Escritorio interactivo.
            let mut desktop: Vec<u16> = "winsta0\\default\0".encode_utf16().collect();

            let mut si = STARTUPINFOW::default();
            si.cb = std::mem::size_of::<STARTUPINFOW>() as u32;
            si.lpDesktop = PWSTR(desktop.as_mut_ptr());

            let mut pi = PROCESS_INFORMATION::default();

            let res = CreateProcessAsUserW(
                user_token,
                PCWSTR::null(),
                PWSTR(cmd.as_mut_ptr()),
                None,
                None,
                false,
                CREATE_UNICODE_ENVIRONMENT | CREATE_NEW_CONSOLE,
                Some(env_block as *const core::ffi::c_void),
                PCWSTR::null(),
                &si,
                &mut pi,
            );

            let pid = pi.dwProcessId;

            if !env_block.is_null() {
                let _ = DestroyEnvironmentBlock(env_block);
            }
            if !pi.hProcess.is_invalid() {
                let _ = CloseHandle(pi.hProcess);
            }
            if !pi.hThread.is_invalid() {
                let _ = CloseHandle(pi.hThread);
            }
            let _ = CloseHandle(user_token);

            res.map_err(|e| anyhow::anyhow!("CreateProcessAsUser falló: {e}"))?;
            Ok(pid)
        }
    }
}
