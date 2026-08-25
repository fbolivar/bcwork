#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

//! Helper interactivo del agente BCWork.
//!
//! Corre en la sesión del usuario (lo lanza y vigila el servicio). Solo hace:
//! - Captura de la ventana activa → buffer compartido en ProgramData.
//! - Picker "elige tu nombre 1 vez" cuando el device aún no está asignado.
//!
//! NO tiene botones de pausar/salir ni PIN: el monitoreo no lo controla el
//! empleado. Si el usuario cierra el helper, el servicio lo vuelve a lanzar.

use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::Duration;
use tauri::{Emitter, Manager};

use bcwork_agent::{buffer, capture_core, ingest, paths};

// Se pone en true cuando el device ya está asignado a una persona.
static ASSIGNED: AtomicBool = AtomicBool::new(false);

fn main() {
    env_logger::init();
    let _ = paths::ensure_base_dir();
    let _ = buffer::init(&paths::buffer_db());

    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            commands::get_assign_state,
            commands::assign_me,
        ])
        .setup(|app| {
            // Estado inicial: ¿ya está asignado?
            if let Some(c) = ingest::read_credentials() {
                if c.assigned {
                    ASSIGNED.store(true, Ordering::Relaxed);
                }
            }

            // Bucle de captura (solo cuando está asignado; si no, no atribuye a nadie).
            tauri::async_runtime::spawn(capture_loop());

            // Si ya está asignado, mantener la ventana oculta (solo transparencia por bandeja).
            if ASSIGNED.load(Ordering::Relaxed) {
                if let Some(w) = app.get_webview_window("main") {
                    let _ = w.hide();
                }
            } else if let Some(w) = app.get_webview_window("main") {
                // Mostrar el picker una sola vez.
                let _ = w.show();
                let _ = w.set_focus();
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error running helper");
}

async fn capture_loop() {
    let db_path = paths::buffer_db();
    let mut counters = capture_core::SessionCounters::default();
    loop {
        tokio::time::sleep(Duration::from_secs(capture_core::POLL_INTERVAL_SECS)).await;
        if !ASSIGNED.load(Ordering::Relaxed) {
            continue;
        }
        counters = capture_core::capture_step(&db_path, counters);
    }
}

mod commands {
    use super::*;

    /// Estado del picker:
    /// - "waiting": el servicio aún no aprovisionó (sin credenciales).
    /// - "active":  ya asignado, no hay nada que elegir.
    /// - "pick":    hay que elegir; incluye la lista de colaboradores.
    #[tauri::command]
    pub async fn get_assign_state() -> Result<serde_json::Value, String> {
        let Some(creds) = ingest::read_credentials() else {
            return Ok(serde_json::json!({ "status": "waiting" }));
        };
        if creds.assigned || ASSIGNED.load(Ordering::Relaxed) {
            ASSIGNED.store(true, Ordering::Relaxed);
            return Ok(serde_json::json!({ "status": "active" }));
        }
        match ingest::get_roster(&creds).await {
            Ok(r) => {
                if r.already_assigned {
                    ASSIGNED.store(true, Ordering::Relaxed);
                    return Ok(serde_json::json!({ "status": "active" }));
                }
                let users: Vec<serde_json::Value> = r
                    .users
                    .into_iter()
                    .map(|u| {
                        serde_json::json!({
                            "id": u.id,
                            "full_name": u.full_name,
                            "email": u.email,
                        })
                    })
                    .collect();
                Ok(serde_json::json!({ "status": "pick", "users": users }))
            }
            Err(e) => Err(e.to_string()),
        }
    }

    /// El usuario se elige a sí mismo (una sola vez).
    #[tauri::command]
    pub async fn assign_me(app: tauri::AppHandle, user_id: String) -> Result<(), String> {
        let creds = ingest::read_credentials().ok_or("sin credenciales")?;
        let hostname = gethostname::gethostname().to_string_lossy().to_string();
        ingest::assign(&creds, &user_id, Some(&hostname))
            .await
            .map_err(|e| e.to_string())?;
        ASSIGNED.store(true, Ordering::Relaxed);
        if let Some(w) = app.get_webview_window("main") {
            let _ = w.emit("assigned", ());
            let _ = w.hide();
        }
        Ok(())
    }
}

// Silencia el warning de import no usado en plataformas sin captura.
#[allow(dead_code)]
fn _keep(_: Arc<()>) {}
