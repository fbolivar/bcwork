//! Inventario de aplicaciones instaladas (Windows).
//! Lee las claves de desinstalación del registro (vista 64-bit y 32-bit).
//! Corre en el servicio (LocalSystem) → cubre instalaciones a nivel de máquina.

use serde::Serialize;

#[derive(Debug, Serialize, Clone)]
pub struct InstalledApp {
    pub name: String,
    pub version: Option<String>,
    pub publisher: Option<String>,
    pub install_date: Option<String>,
    pub source: String, // "hklm" | "hklm32"
}

#[cfg(target_os = "windows")]
pub fn collect_installed_apps() -> Vec<InstalledApp> {
    use winreg::enums::{HKEY_LOCAL_MACHINE, KEY_READ, KEY_WOW64_32KEY, KEY_WOW64_64KEY};
    use winreg::RegKey;

    const UNINSTALL: &str = r"SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall";
    let mut apps = Vec::new();
    let mut seen = std::collections::HashSet::new();

    for (flag, source) in [(KEY_WOW64_64KEY, "hklm"), (KEY_WOW64_32KEY, "hklm32")] {
        let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);
        let Ok(uninstall) = hklm.open_subkey_with_flags(UNINSTALL, KEY_READ | flag) else {
            continue;
        };
        for sub_name in uninstall.enum_keys().filter_map(|k| k.ok()) {
            let Ok(sub) = uninstall.open_subkey_with_flags(&sub_name, KEY_READ | flag) else {
                continue;
            };

            // DisplayName es obligatorio (si no, es una entrada "fantasma").
            let name: String = match sub.get_value("DisplayName") {
                Ok(n) => n,
                Err(_) => continue,
            };
            let name = name.trim().to_string();
            if name.is_empty() {
                continue;
            }

            // Ocultar componentes del sistema y actualizaciones/parches.
            let system_component: u32 = sub.get_value("SystemComponent").unwrap_or(0);
            if system_component == 1 {
                continue;
            }
            if sub.get_value::<String, _>("ParentKeyName").is_ok() {
                continue; // updates/patches de otra app
            }
            let release_type: String = sub.get_value("ReleaseType").unwrap_or_default();
            if release_type.eq_ignore_ascii_case("Security Update")
                || release_type.eq_ignore_ascii_case("Update")
                || release_type.eq_ignore_ascii_case("Hotfix")
            {
                continue;
            }

            let version: Option<String> = sub
                .get_value("DisplayVersion")
                .ok()
                .map(|v: String| v.trim().to_string())
                .filter(|v| !v.is_empty());
            let publisher: Option<String> = sub
                .get_value("Publisher")
                .ok()
                .map(|v: String| v.trim().to_string())
                .filter(|v| !v.is_empty());
            let install_date: Option<String> = sub
                .get_value("InstallDate")
                .ok()
                .map(|v: String| v.trim().to_string())
                .filter(|v| !v.is_empty());

            // Dedup por (name, version): una app puede estar en ambas vistas.
            let key = format!("{}|{}", name.to_lowercase(), version.clone().unwrap_or_default());
            if !seen.insert(key) {
                continue;
            }

            apps.push(InstalledApp {
                name,
                version,
                publisher,
                install_date,
                source: source.to_string(),
            });
        }
    }

    apps.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
    apps
}

#[cfg(not(target_os = "windows"))]
pub fn collect_installed_apps() -> Vec<InstalledApp> {
    Vec::new()
}
