//! Captura de la ventana activa y del tiempo de inactividad. Sin dependencias de
//! Tauri: escribe directamente al buffer compartido. Corre en el helper (sesión
//! interactiva), porque el foreground window no es accesible desde el Session 0.

use crate::buffer::{self, BufferedEvent};
use chrono::Utc;
use std::path::Path;

pub const POLL_INTERVAL_SECS: u64 = 10;
pub const IDLE_THRESHOLD_SECS: u64 = 5 * 60;

#[derive(Default, Clone)]
pub struct SessionCounters {
    pub active_seconds: u64,
    pub idle_seconds: u64,
    pub current_app: Option<String>,
    pub started: bool,
}

/// Un tick de captura: mide idle + ventana activa, actualiza contadores y (si hay
/// actividad) inserta un evento en el buffer. Devuelve los contadores actualizados.
pub fn capture_step(db_path: &Path, mut counters: SessionCounters) -> SessionCounters {
    counters.started = true;
    let idle_secs = get_idle_seconds();
    let is_idle = idle_secs >= IDLE_THRESHOLD_SECS;
    let (app_name, window_title) = get_active_window();
    let now = Utc::now();

    if is_idle {
        counters.idle_seconds += POLL_INTERVAL_SECS;
        counters.current_app = None;
    } else {
        counters.active_seconds += POLL_INTERVAL_SECS;
        counters.current_app = app_name.clone();

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
        if let Err(e) = buffer::insert_event(db_path, &event) {
            log::error!("no se pudo bufferizar evento: {}", e);
        }
    }
    counters
}

#[cfg(target_os = "windows")]
pub fn get_idle_seconds() -> u64 {
    use windows::Win32::UI::Input::KeyboardAndMouse::{GetLastInputInfo, LASTINPUTINFO};
    let mut lii = LASTINPUTINFO {
        cbSize: std::mem::size_of::<LASTINPUTINFO>() as u32,
        dwTime: 0,
    };
    unsafe {
        let _ = GetLastInputInfo(&mut lii);
        let tick = windows::Win32::System::SystemInformation::GetTickCount();
        ((tick.wrapping_sub(lii.dwTime)) / 1000) as u64
    }
}

#[cfg(target_os = "macos")]
pub fn get_idle_seconds() -> u64 {
    use std::process::Command;
    let out = Command::new("ioreg").args(["-c", "IOHIDSystem"]).output().ok();
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
pub fn get_idle_seconds() -> u64 {
    0
}

#[cfg(target_os = "windows")]
pub fn get_active_window() -> (Option<String>, Option<String>) {
    use windows::core::PWSTR;
    use windows::Win32::System::Threading::{OpenProcess, PROCESS_QUERY_LIMITED_INFORMATION};
    use windows::Win32::UI::WindowsAndMessaging::{
        GetForegroundWindow, GetWindowTextW, GetWindowThreadProcessId,
    };

    unsafe {
        let hwnd = GetForegroundWindow();
        if hwnd.0 == std::ptr::null_mut() {
            return (None, None);
        }

        let mut title_buf = [0u16; 512];
        let title_len = GetWindowTextW(hwnd, &mut title_buf);
        let title = if title_len > 0 {
            Some(String::from_utf16_lossy(&title_buf[..title_len as usize]))
        } else {
            None
        };

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
            )
            .is_ok()
            {
                let path = String::from_utf16_lossy(&buf[..size as usize]);
                path.split('\\')
                    .last()
                    .map(|s| s.trim_end_matches(".exe").to_string())
            } else {
                None
            }
        } else {
            None
        };

        (app_name, title)
    }
}

#[cfg(target_os = "macos")]
pub fn get_active_window() -> (Option<String>, Option<String>) {
    use std::process::Command;
    let script = r#"tell application "System Events" to get name of first application process whose frontmost is true"#;
    let out = Command::new("osascript").args(["-e", script]).output().ok();
    let app_name = out.and_then(|o| {
        if o.status.success() {
            Some(String::from_utf8_lossy(&o.stdout).trim().to_string())
        } else {
            None
        }
    });
    (app_name, None)
}

#[cfg(not(any(target_os = "windows", target_os = "macos")))]
pub fn get_active_window() -> (Option<String>, Option<String>) {
    (None, None)
}
