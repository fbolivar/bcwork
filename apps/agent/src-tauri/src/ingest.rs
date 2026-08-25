//! Cliente HTTP hacia el servidor BCWork + manejo de credenciales locales.
//! Independiente de Tauri; lo usan el servicio y el helper.

use anyhow::{anyhow, Result};
use serde::{Deserialize, Serialize};
use crate::paths;

/// Aprovisionamiento embebido por el instalador por-tenant.
#[derive(Debug, Deserialize)]
pub struct Provisioning {
    pub server_url: String,
    pub tenant_token: String,
}

/// Credenciales del device tras aprovisionar.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Credentials {
    pub server_url: String,
    pub device_id: String,
    pub api_key: String,
    #[serde(default)]
    pub assigned: bool,
}

#[derive(Debug, Deserialize)]
pub struct RosterUser {
    pub id: String,
    pub full_name: Option<String>,
    pub email: String,
}

#[derive(Debug, Deserialize)]
pub struct RosterResponse {
    pub already_assigned: bool,
    pub assigned_user_id: Option<String>,
    pub users: Vec<RosterUser>,
}

fn platform_str() -> &'static str {
    #[cfg(target_os = "windows")]
    {
        "windows"
    }
    #[cfg(target_os = "macos")]
    {
        "macos"
    }
    #[cfg(not(any(target_os = "windows", target_os = "macos")))]
    {
        "linux"
    }
}

/// Escribe `provisioning.json` con el token del tenant (lo usa el instalador).
pub fn write_provisioning(server_url: &str, tenant_token: &str) -> Result<()> {
    paths::ensure_base_dir()?;
    let body = serde_json::json!({
        "server_url": server_url,
        "tenant_token": tenant_token,
    });
    std::fs::write(paths::provisioning_file(), serde_json::to_vec_pretty(&body)?)?;
    Ok(())
}

pub fn read_provisioning() -> Result<Provisioning> {
    let raw = std::fs::read_to_string(paths::provisioning_file())
        .map_err(|e| anyhow!("no se pudo leer provisioning.json: {e}"))?;
    Ok(serde_json::from_str(&raw)?)
}

pub fn read_credentials() -> Option<Credentials> {
    let raw = std::fs::read_to_string(paths::credentials_file()).ok()?;
    serde_json::from_str(&raw).ok()
}

pub fn write_credentials(c: &Credentials) -> Result<()> {
    paths::ensure_base_dir()?;
    std::fs::write(paths::credentials_file(), serde_json::to_vec_pretty(c)?)?;
    Ok(())
}

/// Aprovisiona el device con el token del tenant. Idempotente a nivel de archivo:
/// si ya hay credenciales, no vuelve a aprovisionar.
pub async fn provision_if_needed(version: &str) -> Result<Credentials> {
    if let Some(c) = read_credentials() {
        return Ok(c);
    }
    let prov = read_provisioning()?;
    let hostname = gethostname::gethostname().to_string_lossy().to_string();
    let win_user = std::env::var("USERNAME").ok();

    let client = reqwest::Client::new();
    let resp = client
        .post(format!(
            "{}/api/ingest/provision",
            prov.server_url.trim_end_matches('/')
        ))
        .json(&serde_json::json!({
            "token": prov.tenant_token,
            "platform": platform_str(),
            "hostname": hostname,
            "windows_username": win_user,
            "service_version": version,
        }))
        .send()
        .await?;

    if !resp.status().is_success() {
        let s = resp.status();
        let t = resp.text().await.unwrap_or_default();
        return Err(anyhow!("provision falló: {s} - {t}"));
    }

    let body: serde_json::Value = resp.json().await?;
    let creds = Credentials {
        server_url: prov.server_url,
        device_id: body["device_id"]
            .as_str()
            .ok_or_else(|| anyhow!("sin device_id"))?
            .to_string(),
        api_key: body["api_key"]
            .as_str()
            .ok_or_else(|| anyhow!("sin api_key"))?
            .to_string(),
        assigned: body["assigned"].as_bool().unwrap_or(false),
    };
    write_credentials(&creds)?;
    Ok(creds)
}

pub async fn get_roster(creds: &Credentials) -> Result<RosterResponse> {
    let client = reqwest::Client::new();
    let resp = client
        .get(format!(
            "{}/api/ingest/roster",
            creds.server_url.trim_end_matches('/')
        ))
        .bearer_auth(&creds.api_key)
        .send()
        .await?;
    if !resp.status().is_success() {
        return Err(anyhow!("roster falló: {}", resp.status()));
    }
    Ok(resp.json().await?)
}

pub async fn assign(creds: &Credentials, user_id: &str, device_name: Option<&str>) -> Result<()> {
    let client = reqwest::Client::new();
    let resp = client
        .post(format!(
            "{}/api/ingest/assign",
            creds.server_url.trim_end_matches('/')
        ))
        .bearer_auth(&creds.api_key)
        .json(&serde_json::json!({ "user_id": user_id, "device_name": device_name }))
        .send()
        .await?;
    if !resp.status().is_success() {
        let s = resp.status();
        let t = resp.text().await.unwrap_or_default();
        return Err(anyhow!("assign falló: {s} - {t}"));
    }
    // Marcar asignado localmente
    let mut updated = creds.clone();
    updated.assigned = true;
    let _ = write_credentials(&updated);
    Ok(())
}

/// Envía el snapshot de aplicaciones instaladas del equipo.
pub async fn send_inventory(
    creds: &Credentials,
    apps: &[crate::inventory::InstalledApp],
) -> Result<()> {
    let client = reqwest::Client::new();
    let resp = client
        .post(format!(
            "{}/api/ingest/inventory",
            creds.server_url.trim_end_matches('/')
        ))
        .bearer_auth(&creds.api_key)
        .json(&serde_json::json!({ "apps": apps }))
        .send()
        .await?;
    if !resp.status().is_success() {
        return Err(anyhow!("inventory falló: {}", resp.status()));
    }
    Ok(())
}

/// Reporta un intento de manipulación (parar servicio, desinstalar, etc.).
pub async fn report_tamper(creds: &Credentials, status: &str, detail: Option<&str>) -> Result<()> {
    let client = reqwest::Client::new();
    let _ = client
        .post(format!(
            "{}/api/ingest/tamper",
            creds.server_url.trim_end_matches('/')
        ))
        .bearer_auth(&creds.api_key)
        .json(&serde_json::json!({ "status": status, "detail": detail }))
        .send()
        .await?;
    Ok(())
}
