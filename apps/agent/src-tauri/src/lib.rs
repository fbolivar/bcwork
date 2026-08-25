//! Código compartido entre el helper interactivo (Tauri) y el servicio de Windows.
//!
//! Arquitectura del agente blindado (Fase 2):
//! - `bcwork-agent-svc` (servicio, LocalSystem): provisiona, envía actividad, vigila al helper.
//! - `bcwork-agent` (helper, sesión del usuario): captura la ventana activa + picker "elige 1 vez".
//! - Ambos comparten el buffer SQLite y las credenciales en `C:\ProgramData\BCWork`.

pub mod buffer;
pub mod capture_core;
pub mod ingest;
pub mod paths;
