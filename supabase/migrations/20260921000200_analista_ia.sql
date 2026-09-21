-- Analista IA: analisis periodicos del comportamiento del equipo (tendencias,
-- productividad, riesgos) que el administrador genera y guarda para reportar
-- a gerencia. Los hechos (facts) los calcula BCWork de forma determinista; el
-- modelo solo los interpreta y redacta.

CREATE TABLE IF NOT EXISTS ai_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  period_from date NOT NULL,
  period_to date NOT NULL,
  weeks int NOT NULL,
  facts jsonb NOT NULL,
  report jsonb,
  model text,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ai_analyses_tenant ON ai_analyses(tenant_id, created_at DESC);

ALTER TABLE ai_analyses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON ai_analyses;
CREATE POLICY tenant_isolation ON ai_analyses
  USING ((tenant_id = (SELECT current_tenant_id())) OR (SELECT is_platform_admin()))
  WITH CHECK ((tenant_id = (SELECT current_tenant_id())) OR (SELECT is_platform_admin()));

-- Aplicaciones y sitios por persona (top N por persona), para que el analista
-- sepa en que se va el tiempo de cada quien. SECURITY INVOKER: RLS manda.
CREATE OR REPLACE FUNCTION public.analyst_user_apps(p_from timestamptz, p_to timestamptz, p_user_ids uuid[], p_top int DEFAULT 8)
RETURNS TABLE (user_id uuid, app_identifier text, productivity text, seconds bigint)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public, pg_temp AS $$
  SELECT user_id, app_identifier, productivity, seconds FROM (
    SELECT
      ae.user_id,
      COALESCE(ae.domain, ae.app_identifier) AS app_identifier,
      COALESCE(ae.productivity, 'neutral') AS productivity,
      SUM(ae.duration_seconds)::bigint AS seconds,
      ROW_NUMBER() OVER (PARTITION BY ae.user_id ORDER BY SUM(ae.duration_seconds) DESC) AS rn
    FROM activity_events ae
    WHERE ae.started_at >= p_from AND ae.started_at < p_to AND ae.user_id = ANY (p_user_ids)
      AND COALESCE(ae.domain, ae.app_identifier) IS NOT NULL
    GROUP BY ae.user_id, COALESCE(ae.domain, ae.app_identifier), COALESCE(ae.productivity, 'neutral')
  ) t
  WHERE rn <= p_top
  ORDER BY user_id, seconds DESC
$$;

-- Actividad fuera de horario por persona y dia: segundos antes de las 7:00 y
-- despues de las 19:00 hora local, y en fin de semana (Ley 2191, desconexion).
CREATE OR REPLACE FUNCTION public.analyst_user_offhours(p_from timestamptz, p_to timestamptz, p_user_ids uuid[], p_tz text DEFAULT 'America/Bogota')
RETURNS TABLE (user_id uuid, day date, early bigint, late bigint, weekend bigint)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public, pg_temp AS $$
  SELECT
    ae.user_id,
    (ae.started_at AT TIME ZONE p_tz)::date AS day,
    COALESCE(SUM(ae.duration_seconds) FILTER (WHERE EXTRACT(HOUR FROM (ae.started_at AT TIME ZONE p_tz)) < 7), 0)::bigint,
    COALESCE(SUM(ae.duration_seconds) FILTER (WHERE EXTRACT(HOUR FROM (ae.started_at AT TIME ZONE p_tz)) >= 19), 0)::bigint,
    COALESCE(SUM(ae.duration_seconds) FILTER (WHERE EXTRACT(DOW FROM (ae.started_at AT TIME ZONE p_tz)) IN (0, 6)), 0)::bigint
  FROM activity_events ae
  WHERE ae.started_at >= p_from AND ae.started_at < p_to AND ae.user_id = ANY (p_user_ids)
  GROUP BY 1, 2
$$;

-- Inactividad por persona y dia local. PostgREST corta en 1000 filas y ocho
-- semanas de sesiones de una empresa ya pasan de eso.
CREATE OR REPLACE FUNCTION public.analyst_user_idle(p_from timestamptz, p_to timestamptz, p_user_ids uuid[], p_tz text DEFAULT 'America/Bogota')
RETURNS TABLE (user_id uuid, day date, idle bigint)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public, pg_temp AS $$
  SELECT ws.user_id, (ws.started_at AT TIME ZONE p_tz)::date, COALESCE(SUM(ws.idle_seconds), 0)::bigint
  FROM work_sessions ws
  WHERE ws.started_at >= p_from AND ws.started_at < p_to AND ws.user_id = ANY (p_user_ids)
  GROUP BY 1, 2
$$;
