use chrono::{DateTime, Utc};

#[derive(Default)]
pub struct AgentState {
    pub enrolled: bool,
    pub paused: bool,
    pub active_seconds: u64,
    pub idle_seconds: u64,
    pub current_app: Option<String>,
    pub last_sent_at: Option<DateTime<Utc>>,
    pub session_id: Option<String>,
    pub session_started_at: Option<DateTime<Utc>>,
}
