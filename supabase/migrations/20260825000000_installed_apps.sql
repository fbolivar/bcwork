-- Inventario de aplicaciones instaladas por equipo.
-- El agente reporta un snapshot; el servidor reemplaza el inventario del device.
CREATE TABLE installed_apps (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  device_id     UUID NOT NULL REFERENCES agent_devices(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  version       TEXT,
  publisher     TEXT,
  install_date  DATE,
  source        TEXT,               -- 'hklm' | 'hklm32' | 'hkcu'
  first_seen    TIMESTAMPTZ DEFAULT NOW(),
  last_seen     TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_installed_apps_tenant ON installed_apps(tenant_id);
CREATE INDEX idx_installed_apps_device ON installed_apps(device_id);
CREATE INDEX idx_installed_apps_name   ON installed_apps(tenant_id, name);

ALTER TABLE installed_apps ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON installed_apps
  USING (
    tenant_id = (current_setting('app.current_tenant_id', true))::uuid
    OR current_setting('app.current_role', true) = 'platform_admin'
  );
