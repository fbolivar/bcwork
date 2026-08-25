<#
.SYNOPSIS
  Compila el agente blindado BCWork y produce el MSI estático (sin firmar o firmado).

.DESCRIPTION
  1. Compila el binario del servicio (bcwork-agent-svc).
  2. (Opcional) lo firma.
  3. Lo copia como sidecar con el sufijo de target-triple que exige Tauri.
  4. Compila el helper + genera el MSI con `tauri build` (que firma vía signCommand
     si WINDOWS_CERTIFICATE_FILE/PASSWORD están definidos en el entorno).

  El MSI resultante es el "MSI estático" con el placeholder TENANT_TOKEN. Súbelo a
  GitHub Releases (o Blob) y apunta AGENT_INSTALLER_URL a su URL: el panel lo
  descarga, inyecta el token del tenant y lo entrega listo.

.PARAMETER Sign
  Firma también el binario del servicio (el MSI lo firma Tauri por separado).

.EXAMPLE
  # Requiere Rust MSVC, Node/pnpm y WiX (Tauri lo descarga solo).
  $env:WINDOWS_CERTIFICATE_FILE="C:\certs\bcwork.pfx"
  $env:WINDOWS_CERTIFICATE_PASSWORD="****"
  ./scripts/build-installer.ps1 -Sign
#>
param(
  [switch]$Sign
)

$ErrorActionPreference = "Stop"
$Triple = "x86_64-pc-windows-msvc"

# Rutas relativas a apps/agent (donde vive este script/..).
$AgentDir  = Split-Path -Parent $PSScriptRoot
$TauriDir  = Join-Path $AgentDir "src-tauri"
$SvcExe    = Join-Path $TauriDir "target\release\bcwork-agent-svc.exe"

# Tauri empaqueta automáticamente el 2do binario (bcwork-agent-svc) desde
# target/release, así que solo hay que asegurarse de compilarlo antes.
Write-Host "==> 1/3 Compilando servicio (bcwork-agent-svc)..." -ForegroundColor Cyan
Push-Location $TauriDir
cargo build --release --bin bcwork-agent-svc
Pop-Location
if (-not (Test-Path $SvcExe)) { throw "No se generó $SvcExe" }

if ($Sign) {
  Write-Host "==> 2/3 Firmando el servicio..." -ForegroundColor Cyan
  if (-not $env:WINDOWS_CERTIFICATE_FILE) { throw "Falta WINDOWS_CERTIFICATE_FILE" }
  & signtool sign /f $env:WINDOWS_CERTIFICATE_FILE /p $env:WINDOWS_CERTIFICATE_PASSWORD `
    /tr http://timestamp.sectigo.com /td sha256 /fd sha256 $SvcExe
} else {
  Write-Host "==> 2/3 (sin firmar el servicio — usa -Sign en producción)" -ForegroundColor Yellow
}

Write-Host "==> 3/3 Compilando MSI con Tauri..." -ForegroundColor Cyan
Push-Location $AgentDir
# tauri build compila el helper, ejecuta vite:build y empaqueta el MSI (firmándolo
# vía signCommand si el certificado está en el entorno).
npx tauri build --bundles msi
Pop-Location

$Msi = Get-ChildItem -Path (Join-Path $TauriDir "target\release\bundle\msi") -Filter *.msi |
  Sort-Object LastWriteTime -Descending | Select-Object -First 1
if ($Msi) {
  Write-Host "`nMSI generado:" -ForegroundColor Green
  Write-Host "  $($Msi.FullName)"
  Write-Host "`nSiguiente paso: súbelo a GitHub Releases y apunta AGENT_INSTALLER_URL a su URL." -ForegroundColor Green
} else {
  throw "No se encontró el MSI en target/release/bundle/msi"
}
