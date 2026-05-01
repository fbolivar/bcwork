use anyhow::Result;
use rusqlite::{Connection, params};
use serde::{Deserialize, Serialize};
use std::path::Path;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct BufferedEvent {
    pub id: Option<i64>,
    pub event_type: String,
    pub app_identifier: Option<String>,
    pub domain: Option<String>,
    pub window_title: Option<String>,
    pub productivity: Option<String>,
    pub started_at: String,
    pub duration_seconds: i64,
    pub metadata: Option<String>,
}

pub fn init(path: &Path) -> Result<()> {
    let conn = Connection::open(path)?;
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS events (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            event_type      TEXT    NOT NULL,
            app_identifier  TEXT,
            domain          TEXT,
            window_title    TEXT,
            productivity    TEXT,
            started_at      TEXT    NOT NULL,
            duration_seconds INTEGER NOT NULL,
            metadata        TEXT,
            sent            INTEGER NOT NULL DEFAULT 0,
            created_at      TEXT    NOT NULL DEFAULT (datetime('now'))
        );
        CREATE INDEX IF NOT EXISTS idx_events_sent ON events(sent);",
    )?;
    Ok(())
}

pub fn insert_event(path: &Path, ev: &BufferedEvent) -> Result<()> {
    let conn = Connection::open(path)?;
    conn.execute(
        "INSERT INTO events (event_type, app_identifier, domain, window_title, productivity, started_at, duration_seconds, metadata)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        params![
            ev.event_type, ev.app_identifier, ev.domain, ev.window_title,
            ev.productivity, ev.started_at, ev.duration_seconds, ev.metadata,
        ],
    )?;
    Ok(())
}

pub fn take_pending(path: &Path, limit: usize) -> Result<Vec<BufferedEvent>> {
    let conn = Connection::open(path)?;
    let mut stmt = conn.prepare(
        "SELECT id, event_type, app_identifier, domain, window_title, productivity, started_at, duration_seconds, metadata
         FROM events WHERE sent = 0 ORDER BY started_at ASC LIMIT ?1"
    )?;
    let rows = stmt.query_map(params![limit as i64], |row| {
        Ok(BufferedEvent {
            id: row.get(0)?,
            event_type: row.get(1)?,
            app_identifier: row.get(2)?,
            domain: row.get(3)?,
            window_title: row.get(4)?,
            productivity: row.get(5)?,
            started_at: row.get(6)?,
            duration_seconds: row.get(7)?,
            metadata: row.get(8)?,
        })
    })?
    .filter_map(|r| r.ok())
    .collect();
    Ok(rows)
}

pub fn mark_sent(path: &Path, ids: &[i64]) -> Result<()> {
    if ids.is_empty() { return Ok(()); }
    let conn = Connection::open(path)?;
    let placeholders: String = ids.iter().enumerate().map(|(i, _)| format!("?{}", i + 1)).collect::<Vec<_>>().join(",");
    let sql = format!("DELETE FROM events WHERE id IN ({})", placeholders);
    let mut stmt = conn.prepare(&sql)?;
    for (i, id) in ids.iter().enumerate() {
        stmt.raw_bind_parameter(i + 1, id)?;
    }
    stmt.raw_execute()?;
    Ok(())
}

pub fn count_pending(path: &Path) -> Result<i64> {
    let conn = Connection::open(path)?;
    Ok(conn.query_row("SELECT COUNT(*) FROM events WHERE sent = 0", [], |r| r.get(0))?)
}
