//! Puente local con la extensión del navegador.
//!
//! Un agente nativo ve la ventana activa, no lo que hay dentro del navegador.
//! La URL solo la conoce el propio navegador, y la extensión BCWork se la
//! cuenta a este helper por `127.0.0.1:47831`: un POST con el dominio de la
//! pestaña activa cada vez que cambia. El helper lo guarda en memoria y
//! `capture_core` lo adjunta a las muestras cuyo proceso es un navegador.
//!
//! Por qué así y no que la extensión hable con el servidor: (1) la extensión
//! no necesita credenciales ni configuración — se instala por política y ya
//! está — y (2) el tiempo de navegador no se cuenta dos veces, porque el
//! evento sigue siendo el del agente, solo que ahora sabe el dominio.
//!
//! Solo se guarda el dominio (`youtube.com`), nunca la URL completa: es lo
//! que hace defendible el tratamiento ante la Ley 1581.

use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use std::time::Instant;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::TcpListener;

pub const PORT: u16 = 47831;

/// Cuánto tiempo se considera vigente el último dominio reportado. Si la
/// extensión deja de hablar (navegador cerrado, extensión deshabilitada) no
/// queremos seguir atribuyendo un dominio viejo.
const VIGENCIA_SECS: u64 = 120;

#[derive(Clone, Default)]
pub struct DomainState {
    /// navegador ("chrome", "msedge", "firefox", ...) → (dominio, cuándo)
    por_navegador: HashMap<String, (String, Option<Instant>)>,
    ultimo: Option<(String, Instant)>,
}

pub type Shared = Arc<Mutex<DomainState>>;

pub fn new_shared() -> Shared {
    Arc::new(Mutex::new(DomainState::default()))
}

/// Dominio a adjuntar a una muestra cuyo proceso activo es `app`.
/// Devuelve None si `app` no es navegador o si no hay reporte reciente.
pub fn domain_for(shared: &Shared, app: Option<&str>) -> Option<String> {
    let clave = browser_key(app?)?;
    let st = shared.lock().ok()?;
    let fresco = |t: &Option<Instant>| t.map(|i| i.elapsed().as_secs() <= VIGENCIA_SECS).unwrap_or(false);
    if let Some((d, t)) = st.por_navegador.get(clave) {
        if fresco(t) {
            return Some(d.clone());
        }
    }
    // Brave, Vivaldi y otros derivados se presentan como Chrome: si no hubo
    // reporte con ese nombre exacto, vale el más reciente de cualquier navegador.
    st.ultimo
        .as_ref()
        .filter(|(_, t)| t.elapsed().as_secs() <= VIGENCIA_SECS)
        .map(|(d, _)| d.clone())
}

/// Nombre canónico del navegador a partir del ejecutable en foco.
pub fn browser_key(app: &str) -> Option<&'static str> {
    let a = app.to_ascii_lowercase();
    let a = a.trim_end_matches(".exe");
    match a {
        "chrome" => Some("chrome"),
        "msedge" => Some("msedge"),
        "firefox" => Some("firefox"),
        "brave" => Some("brave"),
        "opera" | "opera_gx" => Some("opera"),
        "vivaldi" => Some("vivaldi"),
        _ => None,
    }
}

/// Nombre canónico a partir del user agent que manda la extensión.
fn key_from_ua(ua: &str) -> &'static str {
    if ua.contains("Edg/") {
        "msedge"
    } else if ua.contains("Firefox/") {
        "firefox"
    } else if ua.contains("OPR/") {
        "opera"
    } else if ua.contains("Vivaldi") {
        "vivaldi"
    } else {
        "chrome"
    }
}

/// Servidor HTTP mínimo. Solo entiende `POST /domain` con JSON
/// `{"domain": "youtube.com", "ua": "..."}` (domain vacío = ninguna pestaña
/// web activa) y el preflight `OPTIONS`. Cualquier otra cosa: 404.
pub async fn serve(shared: Shared) {
    let listener = match TcpListener::bind(("127.0.0.1", PORT)).await {
        Ok(l) => l,
        Err(e) => {
            log::warn!("puente del navegador: no se pudo escuchar en {PORT}: {e}");
            return;
        }
    };
    log::info!("puente del navegador escuchando en 127.0.0.1:{PORT}");

    loop {
        let Ok((mut sock, _)) = listener.accept().await else { continue };
        let shared = shared.clone();
        tokio::spawn(async move {
            let mut buf = vec![0u8; 8192];
            let Ok(n) = sock.read(&mut buf).await else { return };
            let req = String::from_utf8_lossy(&buf[..n]).to_string();
            let respuesta = handle(&shared, &req);
            let _ = sock.write_all(respuesta.as_bytes()).await;
            let _ = sock.shutdown().await;
        });
    }
}

fn handle(shared: &Shared, req: &str) -> String {
    const CORS: &str = "Access-Control-Allow-Origin: *\r\nAccess-Control-Allow-Methods: POST, OPTIONS\r\nAccess-Control-Allow-Headers: content-type\r\n";
    let primera = req.lines().next().unwrap_or("");
    let mut partes = primera.split_whitespace();
    let metodo = partes.next().unwrap_or("");
    let ruta = partes.next().unwrap_or("");

    if metodo == "OPTIONS" {
        return format!("HTTP/1.1 204 No Content\r\n{CORS}Content-Length: 0\r\nConnection: close\r\n\r\n");
    }
    if metodo == "GET" && ruta == "/ping" {
        let cuerpo = format!("{{\"ok\":true,\"version\":\"{}\"}}", env!("CARGO_PKG_VERSION"));
        return format!(
            "HTTP/1.1 200 OK\r\n{CORS}Content-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
            cuerpo.len(),
            cuerpo
        );
    }
    if metodo != "POST" || ruta != "/domain" {
        return format!("HTTP/1.1 404 Not Found\r\n{CORS}Content-Length: 0\r\nConnection: close\r\n\r\n");
    }

    // Solo la extensión debería hablar aquí. Un origen que no sea de extensión
    // se ignora: no es un ataque que valga la pena, pero tampoco ruido gratis.
    let origen_ok = req
        .lines()
        .any(|l| {
            let l = l.to_ascii_lowercase();
            l.starts_with("origin:") && (l.contains("chrome-extension://") || l.contains("moz-extension://"))
        });
    if !origen_ok {
        return format!("HTTP/1.1 403 Forbidden\r\n{CORS}Content-Length: 0\r\nConnection: close\r\n\r\n");
    }

    let cuerpo = req.split("\r\n\r\n").nth(1).unwrap_or("");
    let json: serde_json::Value = serde_json::from_str(cuerpo).unwrap_or(serde_json::Value::Null);
    let dominio = json.get("domain").and_then(|v| v.as_str()).unwrap_or("").trim().to_ascii_lowercase();
    let ua = json.get("ua").and_then(|v| v.as_str()).unwrap_or("");
    let clave = key_from_ua(ua).to_string();

    if let Ok(mut st) = shared.lock() {
        if dominio.is_empty() {
            // Ninguna pestaña web activa: no atribuir nada hasta el próximo reporte.
            st.por_navegador.insert(clave, (String::new(), None));
            st.ultimo = None;
        } else {
            let ahora = Instant::now();
            st.por_navegador.insert(clave, (dominio.clone(), Some(ahora)));
            st.ultimo = Some((dominio, ahora));
        }
    }
    format!("HTTP/1.1 204 No Content\r\n{CORS}Content-Length: 0\r\nConnection: close\r\n\r\n")
}

#[cfg(test)]
mod tests {
    use super::*;

    fn post(shared: &Shared, dominio: &str, ua: &str) -> String {
        let cuerpo = format!("{{\"domain\":\"{dominio}\",\"ua\":\"{ua}\"}}");
        let req = format!(
            "POST /domain HTTP/1.1\r\nHost: 127.0.0.1\r\nOrigin: chrome-extension://abc\r\nContent-Type: application/json\r\nContent-Length: {}\r\n\r\n{}",
            cuerpo.len(),
            cuerpo
        );
        handle(shared, &req)
    }

    #[test]
    fn el_dominio_solo_se_adjunta_a_navegadores() {
        let s = new_shared();
        assert!(post(&s, "youtube.com", "Mozilla/5.0 Chrome/128").starts_with("HTTP/1.1 204"));
        assert_eq!(domain_for(&s, Some("chrome.exe")).as_deref(), Some("youtube.com"));
        assert_eq!(domain_for(&s, Some("chrome")).as_deref(), Some("youtube.com"));
        assert_eq!(domain_for(&s, Some("EXCEL.EXE")), None);
        assert_eq!(domain_for(&s, None), None);
    }

    #[test]
    fn cada_navegador_lleva_su_dominio_y_el_ultimo_sirve_de_respaldo() {
        let s = new_shared();
        post(&s, "docs.google.com", "Mozilla/5.0 Chrome/128 Edg/128");
        post(&s, "youtube.com", "Mozilla/5.0 Chrome/128");
        assert_eq!(domain_for(&s, Some("msedge.exe")).as_deref(), Some("docs.google.com"));
        assert_eq!(domain_for(&s, Some("chrome.exe")).as_deref(), Some("youtube.com"));
        // Brave se presenta como Chrome y no reporto con su nombre: vale el ultimo.
        assert_eq!(domain_for(&s, Some("brave.exe")).as_deref(), Some("youtube.com"));
    }

    #[test]
    fn sin_pestana_web_no_se_atribuye_nada() {
        let s = new_shared();
        post(&s, "youtube.com", "Mozilla/5.0 Chrome/128");
        post(&s, "", "Mozilla/5.0 Chrome/128");
        assert_eq!(domain_for(&s, Some("chrome.exe")), None);
    }

    #[test]
    fn origen_ajeno_se_rechaza() {
        let s = new_shared();
        let req = "POST /domain HTTP/1.1\r\nHost: 127.0.0.1\r\nContent-Length: 2\r\n\r\n{}";
        assert!(handle(&s, req).starts_with("HTTP/1.1 403"));
        assert!(handle(&s, "OPTIONS /domain HTTP/1.1\r\n\r\n").starts_with("HTTP/1.1 204"));
        assert!(handle(&s, "GET /ping HTTP/1.1\r\n\r\n").contains("\"ok\":true"));
    }
}
