//! Rutas compartidas en un directorio del sistema (no del usuario) para que el
//! servicio (LocalSystem) y el helper (usuario) lean/escriban lo mismo.
//!
//! Todo vive en `%ProgramData%\BCWork` (típicamente `C:\ProgramData\BCWork`),
//! con ACL restringida a SYSTEM/Administradores (la aplica el instalador, Fase 3).

use std::path::PathBuf;

/// Directorio base compartido: `%ProgramData%\BCWork`.
pub fn base_dir() -> PathBuf {
    let program_data =
        std::env::var("ProgramData").unwrap_or_else(|_| "C:\\ProgramData".to_string());
    PathBuf::from(program_data).join("BCWork")
}

/// Aprovisionamiento embebido por el instalador: `{ server_url, tenant_token }`.
pub fn provisioning_file() -> PathBuf {
    base_dir().join("provisioning.json")
}

/// Credenciales del device tras aprovisionar: `{ device_id, api_key, assigned }`.
pub fn credentials_file() -> PathBuf {
    base_dir().join("credentials.json")
}

/// Buffer local de eventos (escrito por el helper, drenado por el servicio).
pub fn buffer_db() -> PathBuf {
    base_dir().join("buffer.db")
}

/// Carpeta de logs.
pub fn log_dir() -> PathBuf {
    base_dir().join("logs")
}

/// Asegura que el directorio base existe.
pub fn ensure_base_dir() -> std::io::Result<()> {
    std::fs::create_dir_all(base_dir())
}
