-- ============================================================================
-- Agente blindado + instalador por-tenant  (Fase 1)
-- - Token de aprovisionamiento por-tenant (reutilizable, revocable)
-- - agent_devices: dispositivos "sin asignar" + metadata de servicio/tamper
-- ============================================================================

-- Token de aprovisionamiento por-tenant ---------------------------------------
CREATE TABLE agent_provisioning_tokens (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id          UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  token_hash         TEXT NOT NULL UNIQUE,     -- sha256(token); el claro solo se ve al crear
  token_prefix       TEXT NOT NULL,            -- primeros 8 chars, para identificar en UI
  label              TEXT,
  created_by         UUID NOT NULL REFERENCES users(id),
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  last_used_at       TIMESTAMPTZ,
  provisioned_count  INT DEFAULT 0,
  revoked_at         TIMESTAMPTZ
);
CREATE INDEX idx_prov_tokens_tenant ON agent_provisioning_tokens(tenant_id);

-- agent_devices: permitir dispositivos sin asignar + metadata --------------------
ALTER TABLE agent_devices ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE agent_devices ADD COLUMN IF NOT EXISTS assigned_at        TIMESTAMPTZ;
ALTER TABLE agent_devices ADD COLUMN IF NOT EXISTS windows_username   TEXT;
ALTER TABLE agent_devices ADD COLUMN IF NOT EXISTS provisioning_token UUID REFERENCES agent_provisioning_tokens(id);
ALTER TABLE agent_devices ADD COLUMN IF NOT EXISTS service_version    TEXT;
ALTER TABLE agent_devices ADD COLUMN IF NOT EXISTS tamper_status      TEXT DEFAULT 'ok'
  CHECK (tamper_status IN ('ok','stop_attempt','uninstall_attempt','tampered'));

-- RLS: aislamiento por tenant (mismo patrón que el esquema inicial) ---------------
ALTER TABLE agent_provisioning_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON agent_provisioning_tokens
  USING (
    tenant_id = (current_setting('app.current_tenant_id', true))::uuid
    OR current_setting('app.current_role', true) = 'platform_admin'
  );
