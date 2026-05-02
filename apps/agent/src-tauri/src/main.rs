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
            commands::get_events_count,
        ])
        .setup(|app| {
            // Build system tray
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
                        let state = app.state::<Mutex<AgentState>>();
                        let mut s = state.lock().unwrap();
                        s.paused = !s.paused;
                    }
                    "quit" => std::process::exit(0),
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
            .path()
            .app_data_dir()
            .expect("no app data dir")
            .join("buffer.db");
        db::count_pending(&db_path).unwrap_or(0)
    }
}
