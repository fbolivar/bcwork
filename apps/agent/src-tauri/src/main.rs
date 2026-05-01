#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod capture;
mod db;
mod sender;
mod state;

use std::sync::Mutex;
use tauri::{Manager, SystemTray, SystemTrayMenu, CustomMenuItem, SystemTrayEvent};
use state::AgentState;

fn build_tray() -> SystemTray {
    let show = CustomMenuItem::new("show", "Abrir BCWork");
    let pause = CustomMenuItem::new("pause", "Pausar monitoreo");
    let quit = CustomMenuItem::new("quit", "Salir");
    let menu = SystemTrayMenu::new()
        .add_item(show)
        .add_item(pause)
        .add_native_item(tauri::SystemTrayMenuItem::Separator)
        .add_item(quit);
    SystemTray::new().with_menu(menu)
}

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
        .system_tray(build_tray())
        .on_system_tray_event(|app, event| match event {
            SystemTrayEvent::MenuItemClick { id, .. } => match id.as_str() {
                "show" => {
                    if let Some(w) = app.get_window("main") {
                        let _ = w.show();
                        let _ = w.set_focus();
                    }
                }
                "pause" => {
                    let state = app.state::<Mutex<AgentState>>();
                    let mut s = state.lock().unwrap();
                    s.paused = !s.paused;
                }
                "quit" => std::process::exit(0),
                _ => {}
            },
            SystemTrayEvent::DoubleClick { .. } => {
                if let Some(w) = app.get_window("main") {
                    let _ = w.show();
                    let _ = w.set_focus();
                }
            }
            _ => {}
        })
        .invoke_handler(tauri::generate_handler![
            commands::enroll,
            commands::get_status,
            commands::set_paused,
            commands::get_events_count,
        ])
        .setup(|app| {
            let handle = app.handle();
            let db_path = app
                .path_resolver()
                .app_data_dir()
                .expect("no app data dir")
                .join("buffer.db");

            db::init(&db_path).expect("failed to init local db");

            // Lanzar loop de captura
            let capture_handle = handle.clone();
            tauri::async_runtime::spawn(async move {
                capture::run_capture_loop(capture_handle).await;
            });

            // Lanzar loop de envío cada 5 minutos
            let sender_handle = handle.clone();
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

        // Persistir credenciales en store
        use tauri_plugin_store::StoreExt;
        let store = app.store("credentials.json").map_err(|e| e.to_string())?;
        store.set("server_url", serde_json::json!(server_url));
        store.set("api_key", body["api_key"].clone());
        store.set("device_id", body["device_id"].clone());
        store.save().map_err(|e| e.to_string())?;

        Ok(body)
    }

    #[tauri::command]
    pub fn get_status(state: State<'_, Mutex<AgentState>>) -> serde_json::Value {
        let s = state.lock().unwrap();
        serde_json::json!({
            "enrolled": s.enrolled,
            "paused": s.paused,
            "active_seconds": s.active_seconds,
            "idle_seconds": s.idle_seconds,
            "current_app": s.current_app,
            "last_sent_at": s.last_sent_at,
        })
    }

    #[tauri::command]
    pub fn set_paused(state: State<'_, Mutex<AgentState>>, paused: bool) {
        let mut s = state.lock().unwrap();
        s.paused = paused;
    }

    #[tauri::command]
    pub fn get_events_count(app: tauri::AppHandle) -> i64 {
        let db_path = app
            .path_resolver()
            .app_data_dir()
            .expect("no app data dir")
            .join("buffer.db");
        db::count_pending(&db_path).unwrap_or(0)
    }
}
