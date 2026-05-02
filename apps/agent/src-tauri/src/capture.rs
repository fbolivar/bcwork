use std::sync::Mutex;
use std::time::Duration;
use chrono::Utc;
use tauri::{AppHandle, Manager};
use crate::state::AgentState;
use crate::db::{self, BufferedEvent};

const POLL_INTERVAL_SECS: u64 = 10;
const IDLE_THRESHOLD_SECS: u64 = 5 * 60; // 5 minutes

pub async fn run_capture_loop(app: AppHandle) {
    loop {
        tokio::time::sleep(Duration::from_secs(POLL_INTERVAL_SECS)).await;

        let paused = {
            let state = app.state::<Mutex<AgentState>>();
            let s = state.lock().unwrap();
            s.paused
        };
        if paused { continue; }

        let idle_secs = get_idle_seconds();
        let is_idle = idle_secs >= IDLE_THRESHOLD_SECS;

        let (app_name, window_title) = get_active_window();
        let now = Utc::now();

        {
            let state = app.state::<Mutex<AgentState>>();
            let mut s = state.lock().unwrap();

            if s.session_started_at.is_none() {
                s.session_started_at = Some(now);
            }

            if is_idle {
                s.idle_seconds += POLL_INTERVAL_SECS;
                s.current_app = None;
            } else {
                s.active_seconds += POLL_INTERVAL_SECS;
                s.current_app = app_name.clone();
            }
        }

        if !is_idle {
            let event = BufferedEvent {
                id: None,
                event_type: "app_focus".to_string(),
                app_identifier: app_name,
                domain: None,
                window_title,
                productivity: None,
                started_at: now.to_rfc3339(),
                duration_seconds: POLL_INTERVAL_SECS as i64,
                metadata: None,
            };

            let db_path = app
                .path()
                .app_data_dir()
                .expect("no app data dir")
                .join("buffer.db");

            if let Err(e) = db::insert_event(&db_path, &event) {
                log::error!("failed to buffer event: {}", e);
            }
        }
    }
}

#[cfg(target_os = "windows")]
fn get_idle_seconds() -> u64 {
    use windows::Win32::UI::Input::KeyboardAndMouse::{GetLastInputInfo, LASTINPUTINFO};

    let mut lii = LASTINPUTINFO {
        cbSize: std::mem::size_of::<LASTINPUTINFO>() as u32,
        dwTime: 0,
    };
    unsafe {
        GetLastInputInfo(&mut lii);
        // dwTime is ms since system start; GetTickCount() returns the same epoch
        let tick = windows::Win32::System::SystemInformation::GetTickCount();
        ((tick - lii.dwTime) / 1000) as u64
    }
}

#[cfg(target_os = "macos")]
fn get_idle_seconds() -> u64 {
    use std::process::Command;
    let out = Command::new("ioreg")
        .args(["-c", "IOHIDSystem"])
        .output()
        .ok();
    if let Some(o) = out {
        let text = String::from_utf8_lossy(&o.stdout);
        for line in text.lines() {
            if line.contains("HIDIdleTime") {
                if let Some(val) = line.split('=').nth(1) {
                    if let Ok(ns) = val.trim().parse::<u64>() {
                        return ns / 1_000_000_000;
                    }
                }
            }
        }
    }
    0
}

#[cfg(not(any(target_os = "windows", target_os = "macos")))]
fn get_idle_seconds() -> u64 {
    0
}

#[cfg(target_os = "windows")]
fn get_active_window() -> (Option<String>, Option<String>) {
    use windows::Win32::UI::WindowsAndMessaging::{GetForegroundWindow, GetWindowTextW, GetWindowThreadProcessId};
    use windows::Win32::System::Threading::{OpenProcess, PROCESS_QUERY_LIMITED_INFORMATION};
    use windows::core::PWSTR;

    unsafe {
        let hwnd = GetForegroundWindow();
        if hwnd.0 == std::ptr::null_mut() { return (None, None); }

        let mut title_buf = [0u16; 512];
        let title_len = GetWindowTextW(hwnd, &mut title_buf);
        let title = if title_len > 0 {
            Some(String::from_utf16_lossy(&title_buf[..title_len as usize]))
        } else { None };

        let mut pid = 0u32;
        GetWindowThreadProcessId(hwnd, Some(&mut pid));

        let proc = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, pid).ok();
        let app_name = if let Some(h) = proc {
            let mut buf = [0u16; 512];
            let mut size = buf.len() as u32;
            if windows::Win32::System::Threading::QueryFullProcessImageNameW(
                h,
                windows::Win32::System::Threading::PROCESS_NAME_FORMAT(0),
                PWSTR(buf.as_mut_ptr()),
                &mut size,
            ).is_ok() {
                let path = String::from_utf16_lossy(&buf[..size as usize]);
                path.split('\\').last().map(|s| s.trim_end_matches(".exe").to_string())
            } else { None }
        } else { None };

        (app_name, title)
    }
}

#[cfg(target_os = "macos")]
fn get_active_window() -> (Option<String>, Option<String>) {
    use std::process::Command;
    let script = r#"tell application "System Events" to get name of first application process whose frontmost is true"#;
    let out = Command::new("osascript").args(["-e", script]).output().ok();
    let app_name = out.and_then(|o| {
        if o.status.success() {
            Some(String::from_utf8_lossy(&o.stdout).trim().to_string())
        } else { None }
    });
    (app_name, None)
}

#[cfg(not(any(target_os = "windows", target_os = "macos")))]
fn get_active_window() -> (Option<String>, Option<String>) {
    (None, None)
}
