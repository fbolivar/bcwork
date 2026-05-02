#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod capture;
mod db;
mod sender;
mod state;

use std::sync::Mutex;
use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::{MouseButton, TrayIconBuilder, TrayIconEvent},
    Manager,
};
use state::AgentState;

fn main() {
    env_logger::init();

    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec![]),
        ))
        .plugin(tauri_plugin_notification::init())
        .manage(Mutex::new(AgentState::default()))
        .invoke_handler(tauri::generate_handler![
            commands::enroll,
            commands::get_status,
            commands::set_paused,
            commands::set_paused_with_pin,
            commands::get_events_count,
            commands::verify_pin,
            commands::quit_app,
        ])
        .setup(|app| {
            let show = MenuItem::with_id(app, "show", "Abrir BCWork", true, None::<&str>)?;
            let pause = MenuItem::with_id(app, "pause", "Pausar monitoreo", true, None::<&str>)?;
            let sep = PredefinedMenuItem::separator(app)?;
            let quit = MenuItem::with_id(app, "quit", "Salir", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show, &pause, &sep, &quit])?;

            let _tray = TrayIconBuilder::new()
                .menu(&menu)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "show" => {
                        if let Some(w) = app.get_webview_window("main") {
                            let _ = w.show();
                            let _ = w.set_focus();
                        }
                    }
                    "pause" => {
                        // Tray pause: signal the frontend to show PIN dialog if needed
                        if let Some(w) = app.get_webview_window("main") {
                            let _ = w.show();
                            let _ = w.set_focus();
                            let _ = w.emit("tray-pause-requested", ());
                        }
                    }
                    "quit" => {
                        // Require PIN before quitting if PIN is set
                        if let Some(w) = app.get_webview_window("main") {
                            let _ = w.show();
                            let _ = w.set_focus();
                            let _ = w.emit("tray-quit-requested", ());
                        }
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::DoubleClick {
                        button: MouseButton::Left,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(w) = app.get_webview_window("main") {
                            let _ = w.show();
                            let _ = w.set_focus();
                        }
                    }
                })
                .build(app)?;

            let db_path = app
                .path()
                .app_data_dir()
                .expect("no app data dir")
                .join("buffer.db");

            db::init(&db_path).expect("failed to init local db");

            let handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                capture::run_capture_loop(handle).await;
            });

            let sender_handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                sender::run_sender_loop(sender_handle, db_path).await;
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error running agent");
}

mod commands {
    use super::*;
    use tauri::State;
    use tauri_plugin_autostart::ManagerExt;

    #[tauri::command]
    pub async fn enroll(
        app: tauri::AppHandle,
        code: String,
        device_name: String,
        server_url: String,
    ) -> Result<serde_json::Value, String> {
        let hostname = gethostname::gethostname()
            .to_string_lossy()
            .to_string();

        #[cfg(target_os = "windows")]
        let platform = "windows";
        #[cfg(target_os = "macos")]
        let platform = "macos";
        #[cfg(target_os = "linux")]
        let platform = "linux";

        let client = reqwest::Client::new();
        let resp = client
            .post(format!("{}/api/ingest/enroll", server_url.trim_end_matches('/')))
            .json(&serde_json::json!({
                "code": code,
                "device_name": device_name,
                "platform": platform,
                "hostname": hostname,
            }))
            .send()
            .await
            .map_err(|e| e.to_string())?;

        if !resp.status().is_success() {
            let text = resp.text().await.unwrap_or_default();
            return Err(format!("enroll failed: {}", text));
        }

        let body: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;

        use tauri_plugin_store::StoreExt;
        let store = app.store("credentials.json").map_err(|e| e.to_string())?;
        store.set("server_url", serde_json::json!(server_url));
        store.set("api_key", body["api_key"].clone());
        store.set("device_id", body["device_id"].clone());
        store.save().map_err(|e| e.to_string())?;

        // Enable autostart on successful enrollment
        let autostart = app.autolaunch();
        let _ = autostart.enable();
        log::info!("autostart enabled after enrollment");

        Ok(body)
    }

    #[tauri::command]
    pub fn get_status(
        app: tauri::AppHandle,
        state: State<'_, Mutex<AgentState>>,
    ) -> serde_json::Value {
        use tauri_plugin_store::StoreExt;
        let s = state.lock().unwrap();

        // Check if PIN is configured
        let pin_required = app
            .store("credentials.json")
            .ok()
            .and_then(|store| store.get("pin_hash"))
            .and_then(|v| v.as_str().map(|s| !s.is_empty()))
            .unwrap_or(false);

        serde_json::json!({
            "enrolled": s.enrolled,
            "paused": s.paused,
            "active_seconds": s.active_seconds,
            "idle_seconds": s.idle_seconds,
            "current_app": s.current_app,
            "last_sent_at": s.last_sent_at,
            "pin_required": pin_required,
        })
    }

    #[tauri::command]
    pub fn set_paused(state: State<'_, Mutex<AgentState>>, paused: bool) {
        let mut s = state.lock().unwrap();
        s.paused = paused;
    }

    /// Pause/resume with PIN verification. Returns error if PIN is wrong.
    #[tauri::command]
    pub fn set_paused_with_pin(
        app: tauri::AppHandle,
        state: State<'_, Mutex<AgentState>>,
        paused: bool,
        pin: Option<String>,
    ) -> Result<(), String> {
        use tauri_plugin_store::StoreExt;

        let store = app.store("credentials.json").map_err(|e| e.to_string())?;
        let stored_hash = store
            .get("pin_hash")
            .and_then(|v| v.as_str().map(|s| s.to_string()));

        if let Some(hash) = stored_hash {
            if !hash.is_empty() {
                let entered = pin.ok_or("PIN requerido")?;
                if entered != hash {
                    return Err("PIN incorrecto".to_string());
                }
            }
        }

        let mut s = state.lock().unwrap();
        s.paused = paused;
        Ok(())
    }

    /// Verify PIN without changing state (used to confirm quit)
    #[tauri::command]
    pub fn verify_pin(app: tauri::AppHandle, pin: String) -> Result<bool, String> {
        use tauri_plugin_store::StoreExt;
        let store = app.store("credentials.json").map_err(|e| e.to_string())?;
        let stored_hash = store
            .get("pin_hash")
            .and_then(|v| v.as_str().map(|s| s.to_string()))
            .unwrap_or_default();

        if stored_hash.is_empty() {
            return Ok(true); // No PIN set, allow
        }
        Ok(pin == stored_hash)
    }

    #[tauri::command]
    pub fn quit_app() {
        std::process::exit(0);
    }

    #[tauri::command]
    pub fn get_events_count(app: tauri::AppHandle) -> i64 {
        let db_path = app
            .path()
            .app_data_dir()
            .expect("no app data dir")
            .join("buffer.db");
        db::count_pending(&db_path).unwrap_or(0)
    }
}
