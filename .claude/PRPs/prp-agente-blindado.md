# PRP — Agente blindado + instalador por-tenant

> Estado: PROPUESTA (pendiente de aprobación del alcance por fases)
> Autor: Claude Code · Fecha: 2026-08-24
> Solicitud original: "instalador por tenant ya listo sin buscar códigos, descargable solo desde el
> panel del admin del tenant, instalador estable, que el usuario final no lo pueda bajar ni apagar,
> y que funcione correctamente."

## Decisiones fijadas (con el usuario)

1. **Despliegue:** Mixto / no definido aún → diseñamos para el **peor caso** (Servicio de Windows
   blindado) y documentamos honestamente qué se garantiza según los permisos del empleado.
2. **Atribución:** **El usuario se elige 1 vez.** En el primer arranque el agente muestra la lista
   de colaboradores del tenant y la persona se selecciona. Luego nunca vuelve a pedir nada.
3. **Alcance SO v1:** **Solo Windows.** macOS/Linux quedan para una fase posterior.

## Garantías honestas de "no lo puede apagar / desinstalar"

| Escenario del empleado                                      | ¿Puede detener el servicio?                | ¿Puede desinstalar?    |
| ----------------------------------------------------------- | ------------------------------------------ | ---------------------- |
| **Usuario estándar (sin admin)** — deseable, vía GPO/Intune | ❌ No (deny-stop SDDL + Session 0)         | ❌ No (requiere admin) |
| **Empleado con admin local**                                | ⚠️ Sí, con esfuerzo (UAC + parar servicio) | ⚠️ Sí, con admin       |

> Conclusión que debe quedar clara al tenant: el blindaje es **real y fuerte contra usuarios
> estándar**. Contra un admin local determinado ningún agente de endpoint del mundo es 100%
> inviolable; lo que damos es watchdog + auto-reinicio + protección de detención + registro de
> manipulación (tamper) para que cualquier intento quede visible en el panel.

---

## Arquitectura objetivo

### Antes (hoy)

- App Tauri de **bandeja**, corre como el usuario logueado.
- Botones **Pausar / Salir / PIN** → el empleado puede apagarlo.
- Autostart por registro (`tauri-plugin-autostart`) → el usuario puede desactivarlo.
- Enrolamiento por **código de 8 caracteres por usuario** (15 min).

### Después (objetivo)

```
┌──────────────────────── PC Windows ────────────────────────┐
│                                                             │
│  Session 0 (SYSTEM)              Session interactiva (user) │
│  ┌─────────────────────┐         ┌────────────────────────┐│
│  │ bcwork-agent-svc     │  spawn  │ bcwork-agent-helper    ││
│  │ (Servicio Windows)   │────────▶│ (captura ventana activa││
│  │ • auto-start         │         │  + picker 1-sola-vez)  ││
│  │ • restart-on-fail    │◀────────│  SIN UI de apagado     ││
│  │ • deny-stop SDDL     │  buffer │                        ││
│  │ • watchdog           │         └────────────────────────┘│
│  │ • sender loop        │                                    │
│  │ • lee provisioning   │                                    │
│  └──────────┬──────────┘                                    │
└─────────────┼───────────────────────────────────────────────┘
              │ HTTPS
              ▼
   /api/ingest/provision  → crea device (sin asignar) + api_key
   /api/ingest/roster     → lista de colaboradores para el picker
   /api/ingest/assign     → vincula device ↔ colaborador (1 vez)
   /api/ingest/activity   → (ya existe) envío de actividad
```

### Instalador por-tenant (un solo archivo, sin códigos)

- **1 MSI estático firmado** (lo compila el pipeline de Windows, se hostea en GitHub Releases).
  Autorado con plantilla WiX propia para:
  - Instalar el agente como **Servicio de Windows** (LocalSystem, auto-start, failure-actions).
  - Aceptar la propiedad pública MSI **`TENANT_TOKEN`** y escribirla en
    `C:\ProgramData\BCWork\provisioning.json` (ACL restringida a SYSTEM/Admins) vía custom action.
  - Aplicar **deny-stop SDDL** al servicio para usuarios estándar.
- **Descarga por-tenant desde el panel:** el endpoint `/api/admin/installer` toma el MSI estático e
  **inyecta el token del tenant** parchando un placeholder de ancho fijo pre-sembrado en la tabla
  Property del MSI (`TENANT_TOKEN` = 64 chars placeholder). Resultado: **un único `.msi`** que el
  admin descarga y ejecuta (o empuja por GPO). Cero códigos.
  - _Fallback_ si el parche byte-a-byte resulta frágil: servir MSI + `install.cmd` con
    `msiexec /i BCWork.msi TENANT_TOKEN=<token> /qn`. Menos elegante (2 archivos); se evita.

### Flujo de primer arranque (atribución "elige 1 vez")

1. Servicio arranca → lee `provisioning.json` (tenant token).
2. POST `/api/ingest/provision` `{token, hostname, windows_username, os}` → server valida token,
   crea `agent_devices` **sin asignar** (`user_id NULL`) + `api_key` scope `ingest:activity`.
   Devuelve `{device_id, api_key, assigned:false}`.
3. Servicio lanza el **helper** en la sesión interactiva. Helper hace GET `/api/ingest/roster`
   (con api_key) → muestra picker de colaboradores del tenant.
4. Usuario se elige → POST `/api/ingest/assign` `{user_id}` → server setea `agent_devices.user_id`,
   `assigned_at`. Helper se cierra y **no vuelve a mostrarse**.
5. Servicio comienza a capturar y enviar actividad atribuida a ese colaborador.

---

## Modelo de datos (migración)

```sql
-- Token de aprovisionamiento por-tenant (reutilizable, revocable)
CREATE TABLE agent_provisioning_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,       -- sha256 del token; el claro solo se muestra al crear
  token_prefix TEXT NOT NULL,            -- primeros 8 chars para identificarlo en UI
  label TEXT,                            -- ej. "Instalador 2026"
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ,
  provisioned_count INT DEFAULT 0,
  revoked_at TIMESTAMPTZ
);
CREATE INDEX idx_prov_tokens_tenant ON agent_provisioning_tokens(tenant_id);

-- agent_devices: permitir dispositivos sin asignar + metadata de servicio/tamper
ALTER TABLE agent_devices ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE agent_devices ADD COLUMN assigned_at        TIMESTAMPTZ;
ALTER TABLE agent_devices ADD COLUMN windows_username   TEXT;
ALTER TABLE agent_devices ADD COLUMN provisioning_token UUID REFERENCES agent_provisioning_tokens(id);
ALTER TABLE agent_devices ADD COLUMN service_version    TEXT;
ALTER TABLE agent_devices ADD COLUMN tamper_status      TEXT DEFAULT 'ok'
  CHECK (tamper_status IN ('ok','stop_attempt','uninstall_attempt','tampered'));
```

RLS: `agent_provisioning_tokens` con las mismas policies de tenant que el resto (helper de la
migración inicial recorre una lista de tablas; se añade ahí).

---

## Endpoints nuevos

| Método | Ruta                    | Auth                | Descripción                                                     |
| ------ | ----------------------- | ------------------- | --------------------------------------------------------------- |
| POST   | `/api/ingest/provision` | tenant token (body) | Crea device sin asignar + api_key                               |
| GET    | `/api/ingest/roster`    | Bearer api_key      | Lista colaboradores activos del tenant (para el picker)         |
| POST   | `/api/ingest/assign`    | Bearer api_key      | Asigna el device al `user_id` elegido (solo si aún no asignado) |
| POST   | `/api/ingest/tamper`    | Bearer api_key      | El agente reporta intento de manipulación                       |
| GET    | `/api/admin/installer`  | Sesión tenant_admin | Descarga MSI por-tenant con token inyectado                     |

## tRPC (adminProcedure / tenantAdminProcedure)

- `admin.createProvisioningToken({ label })` → devuelve token claro **una sola vez**.
- `admin.listProvisioningTokens()` → prefijos, uso, estado.
- `admin.revokeProvisioningToken({ id })`.
- (se conserva `generateEnrollmentCode` marcado como legacy/oculto durante la transición).

---

## Fases de ejecución

### Fase 1 — Backend + DB + Panel ← IMPLEMENTAR PRIMERO (100% verificable sin pipeline)

- Migración (archivo en `supabase/migrations/`, **no aplicar a prod sin OK**).
- Endpoints `/api/ingest/provision`, `/roster`, `/assign`, `/tamper`.
- tRPC de tokens de aprovisionamiento.
- Endpoint `/api/admin/installer` (parche de token; sirve el MSI configurado por env, con 503 claro
  si aún no hay MSI de servicio).
- UI en `/admin/devices`: tarjeta **"Instalador del tenant"** (generar/copiar/revocar token +
  botón Descargar). Ocultar el flujo de códigos por-usuario.

### Fase 2 — Agente → Servicio de Windows (Rust/Tauri)

- Separar en `bcwork-agent-svc` (servicio) + `bcwork-agent-helper` (captura + picker).
- `windows-service` crate, bucle de servicio, watchdog, restart-on-fail.
- Lee `provisioning.json`, hace provision/roster/assign.
- Quitar Pausar/Salir/PIN del empleado. Captura en sesión interactiva vía WTS/CreateProcessAsUser.

### Fase 3 — Instalador WiX + servicio + inyección de token

- Plantilla WiX propia en Tauri: instala servicio, ACLs, deny-stop SDDL, failure-actions,
  propiedad `TENANT_TOKEN` con placeholder de ancho fijo, custom action a ProgramData.
- Firma de código (usa `signCommand` ya declarado en `tauri.conf.json`).
- Conectar el parche byte-a-byte de `/api/admin/installer`.

### Fase 4 — Pruebas, endurecimiento y documentación

- E2E en VM Windows: instalar por GPO como usuario estándar, verificar que no se puede detener ni
  desinstalar, matar el helper y ver que el watchdog lo revive, reporte de tamper en panel.
- Documentar garantías por nivel de permiso y el runbook de despliegue por GPO/Intune.

## Requisitos externos (dependen del pipeline del cliente, no de este entorno)

- Toolchain Windows (Rust MSVC, WiX/Tauri) para compilar el servicio y el MSI.
- **Certificado de firma de código** (SmartScreen tratará un MSI sin firmar como "raro"/peligroso).
- GitHub Release con el MSI estático (o mover el hosting a Supabase Storage/Vercel Blob).

## Riesgos / notas de blindaje

- Session 0 isolation: el servicio no puede pintar UI; por eso el helper corre en la sesión del
  usuario. El picker de "elige 1 vez" vive en el helper.
- Un admin local siempre podrá forzar; se mitiga con tamper-reporting, no con imposibilidad total.
- **Cumplimiento legal (Colombia, Ley 1581):** se CONSERVA el aviso de privacidad y el registro de
  consentimiento (tabla `consents`). Esto es monitoreo laboral **declarado**, no software oculto.

```

```
