//! Auto-actualización del agente. El servicio consulta la última versión y, si es
//! más nueva, descarga el MSI firmado y lo instala en silencio (`msiexec /qn`).
//! El MSI (major upgrade) reemplaza los binarios; las credenciales persisten en
//! ProgramData, así que el equipo conserva su identidad.

use crate::ingest::Credentials;
use anyhow::{anyhow, Result};
use sha2::{Digest, Sha256};

/// Devuelve true si lanzó una actualización.
pub async fn check_and_update(creds: &Credentials, current: &str) -> Result<bool> {
    let base = creds.server_url.trim_end_matches('/');
    let client = reqwest::Client::new();

    let resp = client
        .get(format!("{}/api/agent/latest?current={}", base, current))
        .bearer_auth(&creds.api_key)
        .send()
        .await?;
    if !resp.status().is_success() {
        return Ok(false);
    }
    let body: serde_json::Value = resp.json().await?;
    let latest = body["version"].as_str().unwrap_or("");
    let sha = body["sha256"].as_str().unwrap_or("").to_lowercase();
    if latest.is_empty() || !is_newer(latest, current) {
        return Ok(false);
    }
    log::info!("actualización disponible: {} → {}", current, latest);

    let dl = client
        .get(format!("{}/api/agent/download", base))
        .bearer_auth(&creds.api_key)
        .send()
        .await?;
    if !dl.status().is_success() {
        return Err(anyhow!("descarga falló: {}", dl.status()));
    }
    let bytes = dl.bytes().await?;

    // Verificar integridad.
    if !sha.is_empty() {
        let mut h = Sha256::new();
        h.update(&bytes);
        let got = hex::encode(h.finalize());
        if got != sha {
            return Err(anyhow!("sha256 no coincide (esperado {sha}, obtenido {got})"));
        }
    }

    let tmp = std::env::temp_dir().join(format!("bcwork-update-{}.msi", latest));
    std::fs::write(&tmp, &bytes)?;
    log::info!("instalando actualización {} desde {:?}", latest, tmp);

    run_msi(&tmp)?;
    Ok(true)
}

#[cfg(target_os = "windows")]
fn run_msi(path: &std::path::Path) -> Result<()> {
    use std::os::windows::process::CommandExt;
    const DETACHED_PROCESS: u32 = 0x0000_0008;
    // Detached: sobrevive aunque el MSI detenga este servicio durante el upgrade.
    std::process::Command::new("msiexec")
        .args([
            "/i",
            path.to_string_lossy().as_ref(),
            "/qn",
            "/norestart",
        ])
        .creation_flags(DETACHED_PROCESS)
        .spawn()?;
    Ok(())
}

#[cfg(not(target_os = "windows"))]
fn run_msi(_path: &std::path::Path) -> Result<()> {
    Ok(())
}

fn is_newer(latest: &str, current: &str) -> bool {
    parse(latest) > parse(current)
}

fn parse(v: &str) -> (u32, u32, u32) {
    let mut it = v.trim().split('.').map(|x| x.parse::<u32>().unwrap_or(0));
    (it.next().unwrap_or(0), it.next().unwrap_or(0), it.next().unwrap_or(0))
}
