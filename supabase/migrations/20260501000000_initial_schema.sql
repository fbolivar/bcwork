-- BCWork — Migración inicial: extensiones, roles y esquema completo
-- Versión: 1.0.0 | Fecha: 2026-05-01

-- ===========================================================
-- EXTENSIONES
-- ===========================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "citext";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ===========================================================
-- FUNCIÓN HELPER: contexto de tenant por request
-- ===========================================================
CREATE OR REPLACE FUNCTION set_tenant_context(p_tenant UUID, p_role TEXT)
RETURNS VOID AS $$
BEGIN
  PERFORM set_config('app.current_tenant_id', COALESCE(p_tenant::text, ''), true);
  PERFORM set_config('app.current_role', p_role, true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===========================================================
-- CAPA DE PLATAFORMA (sin tenant_id — acceso solo por platform_admin)
-- ===========================================================

CREATE TABLE plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL CHECK (code IN ('basic', 'pro', 'enterprise')),
  name TEXT NOT NULL,
  monthly_price_per_seat_cop NUMERIC(12,2) NOT NULL CHECK (monthly_price_per_seat_cop >= 0),
  features JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Datos semilla de planes
INSERT INTO plans (code, name, monthly_price_per_seat_cop, features) VALUES
  ('basic', 'BCWork Basic', 29900, '{"office_vs_remote":false,"productivity_map":false,"scheduled_reports":false,"api_access":false,"payroll_export":false,"sso":false,"extended_retention":false}'),
  ('pro', 'BCWork Pro', 59900, '{"office_vs_remote":true,"productivity_map":true,"scheduled_reports":true,"api_access":false,"payroll_export":false,"sso":false,"extended_retention":false}'),
  ('enterprise', 'BCWork Enterprise', 99900, '{"office_vs_remote":true,"productivity_map":true,"scheduled_reports":true,"api_access":true,"payroll_export":true,"sso":true,"extended_retention":true}');

CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  legal_name TEXT NOT NULL,
  trade_name TEXT,
  nit TEXT UNIQUE NOT NULL,
  country_code TEXT DEFAULT 'CO',
  timezone TEXT DEFAULT 'America/Bogota',
  contact_email CITEXT NOT NULL,
  contact_phone TEXT,
  status TEXT NOT NULL DEFAULT 'trial' CHECK (status IN ('trial','active','suspended','cancelled')),
  data_retention_months SMALLINT DEFAULT 12 CHECK (data_retention_months > 0),
  data_protection_officer TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE licenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  plan_id UUID NOT NULL REFERENCES plans(id),
  seats_total INT NOT NULL CHECK (seats_total > 0),
  status TEXT NOT NULL DEFAULT 'trial' CHECK (status IN ('trial','active','past_due','suspended','cancelled')),
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  trial_ends_at TIMESTAMPTZ,
  feature_overrides JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT ends_after_starts CHECK (ends_at > starts_at)
);
CREATE INDEX idx_licenses_tenant ON licenses(tenant_id);
CREATE INDEX idx_licenses_status ON licenses(status);

CREATE TABLE billing_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  license_id UUID REFERENCES licenses(id),
  event_type TEXT NOT NULL CHECK (event_type IN ('invoice_created','payment_received','payment_failed','seat_added','seat_removed','trial_started','trial_expired')),
  amount_cop NUMERIC(14,2),
  metadata JSONB,
  occurred_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_billing_tenant ON billing_events(tenant_id, occurred_at DESC);

-- ===========================================================
-- CAPA DE TENANT (todas requieren tenant_id + RLS)
-- ===========================================================

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  email CITEXT NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  document_id_encrypted BYTEA,
  role TEXT NOT NULL CHECK (role IN ('platform_admin','tenant_admin','manager','employee')),
  manager_id UUID REFERENCES users(id),
  department TEXT,
  position TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active','invited','disabled','deleted')),
  failed_login_attempts SMALLINT DEFAULT 0,
  locked_until TIMESTAMPTZ,
  last_login_at TIMESTAMPTZ,
  password_changed_at TIMESTAMPTZ DEFAULT NOW(),
  must_change_password BOOLEAN DEFAULT FALSE,
  mfa_enabled BOOLEAN DEFAULT FALSE,
  mfa_secret_encrypted BYTEA,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, email)
);
CREATE INDEX idx_users_tenant ON users(tenant_id);
CREATE INDEX idx_users_manager ON users(manager_id);
CREATE INDEX idx_users_email ON users(email);

CREATE TABLE auth_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  refresh_token_hash TEXT NOT NULL,
  device_fingerprint TEXT,
  ip_inet INET,
  user_agent TEXT,
  issued_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  CONSTRAINT session_not_expired CHECK (expires_at > issued_at)
);
CREATE INDEX idx_auth_sessions_user ON auth_sessions(user_id);
CREATE INDEX idx_auth_sessions_token ON auth_sessions(refresh_token_hash);

-- Historial de contraseñas (Ley 2191 + buenas prácticas)
CREATE TABLE password_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_pwd_history_user ON password_history(user_id, created_at DESC);

-- Consentimientos (Ley 1581 — HabeasData)
CREATE TABLE consents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  policy_version TEXT NOT NULL,
  consent_type TEXT NOT NULL CHECK (consent_type IN ('monitoring_basic','window_titles','ip_logging','data_processing')),
  granted BOOLEAN NOT NULL,
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  evidence_hash TEXT,
  ip_inet INET,
  user_agent TEXT
);
CREATE INDEX idx_consents_user ON consents(user_id);

-- Equipos
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  manager_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE team_members (
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (team_id, user_id)
);

-- Horarios de trabajo
CREATE TABLE work_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  weekly_hours NUMERIC(4,2) DEFAULT 47 CHECK (weekly_hours > 0 AND weekly_hours <= 60),
  start_time TIME,
  end_time TIME,
  break_minutes INT DEFAULT 60 CHECK (break_minutes >= 0),
  flex_minutes INT DEFAULT 0 CHECK (flex_minutes >= 0),
  workdays INT[] DEFAULT '{1,2,3,4,5}',
  disconnection_grace_minutes INT DEFAULT 15,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE user_schedules (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  schedule_id UUID NOT NULL REFERENCES work_schedules(id),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  effective_from DATE NOT NULL,
  effective_to DATE,
  PRIMARY KEY (user_id, schedule_id, effective_from),
  CONSTRAINT effective_range CHECK (effective_to IS NULL OR effective_to > effective_from)
);

-- Catálogo de apps
CREATE TABLE app_catalog (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  identifier TEXT NOT NULL,
  identifier_type TEXT NOT NULL CHECK (identifier_type IN ('process','domain')),
  display_name TEXT NOT NULL,
  category TEXT CHECK (category IN ('communication','development','browsing','entertainment','productivity','other')),
  productivity TEXT NOT NULL CHECK (productivity IN ('productive','neutral','non_productive')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, identifier, identifier_type)
);
CREATE INDEX idx_app_catalog_lookup ON app_catalog(tenant_id, identifier, identifier_type);

-- Dispositivos / instalaciones del agente
CREATE TABLE agent_devices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_token_hash TEXT UNIQUE NOT NULL,
  enrollment_code_hash TEXT,
  os TEXT NOT NULL CHECK (os IN ('windows','macos','linux')),
  os_version TEXT,
  hostname TEXT,
  agent_version TEXT NOT NULL,
  enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ,
  status TEXT DEFAULT 'active' CHECK (status IN ('active','paused','revoked')),
  capabilities JSONB DEFAULT '{}'
);
CREATE INDEX idx_agent_devices_user ON agent_devices(user_id);

-- Códigos de enrolamiento (válidos 24h)
CREATE TABLE enrollment_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES users(id),
  code_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  used_by_device UUID REFERENCES agent_devices(id)
);

-- Sesiones de jornada
CREATE TABLE work_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_id UUID REFERENCES agent_devices(id),
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  ip_inet INET,
  location_type TEXT CHECK (location_type IN ('office','remote','unknown')),
  active_seconds INT DEFAULT 0 CHECK (active_seconds >= 0),
  idle_seconds INT DEFAULT 0 CHECK (idle_seconds >= 0),
  productive_seconds INT DEFAULT 0 CHECK (productive_seconds >= 0),
  non_productive_seconds INT DEFAULT 0 CHECK (non_productive_seconds >= 0),
  source TEXT DEFAULT 'agent' CHECK (source IN ('agent','manual','imported')),
  status TEXT DEFAULT 'open' CHECK (status IN ('open','closed','edited_pending','approved')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_sessions_user_date ON work_sessions(user_id, started_at DESC);
CREATE INDEX idx_sessions_tenant_date ON work_sessions(tenant_id, started_at DESC);

-- Eventos atómicos — tabla de alto volumen con particionado
CREATE TABLE activity_events (
  id BIGSERIAL,
  tenant_id UUID NOT NULL,
  user_id UUID NOT NULL,
  device_id UUID,
  session_id UUID,
  event_type TEXT NOT NULL CHECK (event_type IN ('app_focus','domain_visit','idle_start','idle_end','pause','resume')),
  app_identifier TEXT,
  domain TEXT,
  window_title TEXT,
  productivity TEXT CHECK (productivity IN ('productive','neutral','non_productive')),
  started_at TIMESTAMPTZ NOT NULL,
  duration_seconds INT CHECK (duration_seconds >= 0),
  metadata JSONB,
  PRIMARY KEY (id, started_at)
) PARTITION BY RANGE (started_at);

CREATE TABLE activity_events_2026_05 PARTITION OF activity_events
  FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');
CREATE TABLE activity_events_2026_06 PARTITION OF activity_events
  FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');
CREATE TABLE activity_events_2026_07 PARTITION OF activity_events
  FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');
CREATE TABLE activity_events_2026_08 PARTITION OF activity_events
  FOR VALUES FROM ('2026-08-01') TO ('2026-09-01');
CREATE TABLE activity_events_2026_09 PARTITION OF activity_events
  FOR VALUES FROM ('2026-09-01') TO ('2026-10-01');
CREATE TABLE activity_events_2026_10 PARTITION OF activity_events
  FOR VALUES FROM ('2026-10-01') TO ('2026-11-01');

CREATE INDEX idx_events_user_time ON activity_events(user_id, started_at DESC);
CREATE INDEX idx_events_tenant_time ON activity_events(tenant_id, started_at DESC);

-- Agregados diarios
CREATE TABLE daily_user_metrics (
  tenant_id UUID NOT NULL,
  user_id UUID NOT NULL,
  metric_date DATE NOT NULL,
  active_seconds INT DEFAULT 0,
  productive_seconds INT DEFAULT 0,
  non_productive_seconds INT DEFAULT 0,
  expected_seconds INT DEFAULT 0,
  productivity_ratio NUMERIC(5,4),
  focus_score NUMERIC(5,2),
  apps_top JSONB,
  domains_top JSONB,
  location_type TEXT,
  overtime_seconds INT DEFAULT 0,
  PRIMARY KEY (tenant_id, user_id, metric_date)
);
CREATE INDEX idx_daily_metrics_user ON daily_user_metrics(user_id, metric_date DESC);

-- Ediciones manuales
CREATE TABLE activity_edits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  user_id UUID NOT NULL REFERENCES users(id),
  proposed_by UUID NOT NULL REFERENCES users(id),
  reviewed_by UUID REFERENCES users(id),
  edit_type TEXT NOT NULL CHECK (edit_type IN ('add_time','remove_time','reclassify')),
  applies_to_date DATE NOT NULL,
  payload JSONB NOT NULL,
  reason TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ
);

-- Alertas
CREATE TABLE alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  alert_type TEXT NOT NULL CHECK (alert_type IN ('long_workday','no_break','out_of_hours','disconnection_due','overtime_warning')),
  severity TEXT DEFAULT 'info' CHECK (severity IN ('info','warning','critical')),
  message TEXT NOT NULL,
  metadata JSONB,
  triggered_at TIMESTAMPTZ DEFAULT NOW(),
  acknowledged_at TIMESTAMPTZ
);
CREATE INDEX idx_alerts_user ON alerts(user_id, triggered_at DESC);

-- Ausencias / vacaciones
CREATE TABLE time_off (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  type TEXT NOT NULL CHECK (type IN ('vacation','sick','personal','maternity','paternity','other')),
  starts_on DATE NOT NULL,
  ends_on DATE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  approved_by UUID REFERENCES users(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_range CHECK (ends_on >= starts_on)
);

-- Notificaciones in-app
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  channel TEXT NOT NULL CHECK (channel IN ('in_app','email')),
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_notifications_user ON notifications(user_id, created_at DESC);

-- Reportes programados
CREATE TABLE scheduled_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  report_type TEXT NOT NULL CHECK (report_type IN ('daily','weekly','monthly','payroll')),
  filters JSONB,
  recipients TEXT[] NOT NULL,
  cron_expression TEXT NOT NULL,
  format TEXT DEFAULT 'pdf' CHECK (format IN ('pdf','xlsx','csv')),
  is_active BOOLEAN DEFAULT TRUE,
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ
);

-- Auditoría inmutable
CREATE TABLE audit_logs (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID,
  actor_user_id UUID,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  ip_inet INET,
  user_agent TEXT,
  before_state JSONB,
  after_state JSONB,
  occurred_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_audit_tenant_time ON audit_logs(tenant_id, occurred_at DESC);
CREATE INDEX idx_audit_action ON audit_logs(action, occurred_at DESC);

-- API Keys (Enterprise)
CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  scopes TEXT[] NOT NULL,
  created_by UUID REFERENCES users(id),
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ
);

-- Rangos IP corporativos
CREATE TABLE corporate_ip_ranges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  cidr CIDR NOT NULL,
  label TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, cidr)
);

-- ===========================================================
-- ROW LEVEL SECURITY
-- ===========================================================

-- Tablas con tenant_id
DO $$ DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'users','auth_sessions','password_history','consents','teams','team_members',
    'work_schedules','user_schedules','app_catalog','agent_devices','enrollment_codes',
    'work_sessions','daily_user_metrics','activity_edits','alerts',
    'time_off','notifications','scheduled_reports','api_keys','corporate_ip_ranges'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I
       USING (
         tenant_id = (current_setting(''app.current_tenant_id'', true))::uuid
         OR current_setting(''app.current_role'', true) = ''platform_admin''
       )', t
    );
  END LOOP;
END $$;

-- activity_events (tabla particionada — la policy se aplica al padre)
ALTER TABLE activity_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON activity_events
  USING (
    tenant_id = (current_setting('app.current_tenant_id', true))::uuid
    OR current_setting('app.current_role', true) = 'platform_admin'
  );

-- ===========================================================
-- TRIGGER: updated_at automático
-- ===========================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_tenants_updated_at BEFORE UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_licenses_updated_at BEFORE UPDATE ON licenses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
