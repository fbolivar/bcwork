use std::path::PathBuf;
use std::sync::Mutex;
use std::time::Duration;
use chrono::Utc;
use tauri::{AppHandle, Manager};
use uuid::Uuid;
use crate::state::AgentState;
use crate::db;

const BATCH_INTERVAL_SECS: u64 = 60; // 1 minute (dev: was 300)
const BATCH_SIZE: usize = 500;

pub async fn run_sender_loop(app: AppHandle, db_path: PathBuf) {
    loop {
        tokio::time::sleep(Duration::from_secs(BATCH_INTERVAL_SECS)).await;

        if let Err(e) = send_batch(&app, &db_path).await {
            log::error!("batch send failed: {}", e);
        }
    }
}

async fn send_batch(app: &AppHandle, db_path: &PathBuf) -> anyhow::Result<()> {
    use tauri_plugin_store::StoreExt;

    let store = app.store("credentials.json")?;
    let server_url = store.get("server_url")
        .and_then(|v| v.as_str().map(|s| s.to_string()))
        .ok_or_else(|| anyhow::anyhow!("not enrolled"))?;
    let api_key = store.get("api_key")
        .and_then(|v| v.as_str().map(|s| s.to_string()))
        .ok_or_else(|| anyhow::anyhow!("no api key"))?;

    let events = db::take_pending(db_path, BATCH_SIZE)?;
    if events.is_empty() { return Ok(()); }

    let (active_secs, idle_secs, session_id, session_started_at, is_paused) = {
        let state = app.state::<Mutex<AgentState>>();
        let s = state.lock().unwrap();
        (
            s.active_seconds,
            s.idle_seconds,
            s.session_id.clone(),
            s.session_started_at.map(|t| t.to_rfc3339()).unwrap_or_else(|| Utc::now().to_rfc3339()),
            s.paused,
        )
    };

    if is_paused { return Ok(()); }

    let batch_events: Vec<serde_json::Value> = events.iter().map(|e| {
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
    }).collect();

    let payload = serde_json::json!({
        "batch_id": Uuid::new_v4().to_string(),
        "events": batch_events,
        "session_state": {
            "session_id": session_id,
            "started_at": session_started_at,
            "is_active": true,
            "active_seconds": active_secs,
            "idle_seconds": idle_secs,
        },
    });

    let client = reqwest::Client::new();
    let resp = client
        .post(format!("{}/api/ingest/activity", server_url.trim_end_matches('/')))
        .bearer_auth(&api_key)
        .json(&payload)
        .send()
        .await?;

    if resp.status().is_success() {
        let body: serde_json::Value = resp.json().await?;
        let ids: Vec<i64> = events.iter().filter_map(|e| e.id).collect();
        db::mark_sent(db_path, &ids)?;

        let new_session_id = body["session_id"].as_str().map(|s| s.to_string());
        let state = app.state::<Mutex<AgentState>>();
        let mut s = state.lock().unwrap();
        if let Some(sid) = new_session_id {
            s.session_id = Some(sid);
        }
        s.last_sent_at = Some(Utc::now());
        log::info!("batch sent: {} events", ids.len());

        // Store pin_hash from server if provided
        if let Some(pin_hash) = body["pin_hash"].as_str() {
            use tauri_plugin_store::StoreExt;
            if let Ok(store) = app.store("credentials.json") {
                store.set("pin_hash", serde_json::json!(pin_hash));
                let _ = store.save();
            }
        }
    } else {
        let status = resp.status();
        let text = resp.text().await.unwrap_or_default();
        log::error!("batch rejected: {} - {}", status, text);
    }

    Ok(())
}
