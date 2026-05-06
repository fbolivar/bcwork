CREATE TABLE IF NOT EXISTS screenshots (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id     UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id       UUID        NOT NULL REFERENCES users(id),
  device_id     UUID        REFERENCES agent_devices(id),
  session_id    UUID        REFERENCES work_sessions(id),
  taken_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  storage_path  TEXT        NOT NULL,
  thumbnail_path TEXT,
  width         INT,
  height        INT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE screenshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY screenshots_tenant ON screenshots
  USING (
    tenant_id = (current_setting('app.current_tenant_id', true))::uuid
    OR current_setting('app.current_role', true) = 'platform_admin'
  );

CREATE INDEX IF NOT EXISTS screenshots_user_taken ON screenshots (user_id, taken_at DESC);
CREATE INDEX IF NOT EXISTS screenshots_tenant_taken ON screenshots (tenant_id, taken_at DESC);

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'screenshots',
  'screenshots',
  false,
  5242880,
  ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;
