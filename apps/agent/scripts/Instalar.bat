@echo off
setlocal enabledelayedexpansion
title Instalador BCWork Agent

REM ============================================================
REM  BCWork Agent - Instalador para un equipo (sin GPO)
REM  Confia el certificado de BC Security y ejecuta la instalacion.
REM  No requiere escribir codigos.
REM ============================================================

REM --- Auto-elevacion a Administrador ---
net session >nul 2>&1
if %errorlevel% neq 0 (
  echo Solicitando permisos de administrador...
  powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
  exit /b
)

cd /d "%~dp0"

echo.
echo ============================================================
echo   Instalando BCWork Agent
echo ============================================================
echo.

echo [1/2] Confiando el certificado de BC Security SAS...
certutil -addstore -f Root "bcwork-codesign.cer" >nul 2>&1
certutil -addstore -f TrustedPublisher "bcwork-codesign.cer" >nul 2>&1

echo [2/2] Instalando el agente...
msiexec /i "BCWork-Agent.msi" /qb

if %errorlevel% equ 0 (
  echo.
  echo   Instalacion completada. El agente se activara en unos segundos
  echo   y pedira elegir el nombre del colaborador una sola vez.
) else (
  echo.
  echo   La instalacion termino con codigo %errorlevel%.
)

echo.
pause
endlocal
