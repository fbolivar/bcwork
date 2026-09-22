-- Calidad de datos por equipo: lo que hay que mirar antes de creer un informe.
-- SECURITY INVOKER: cada empresa ve solo sus equipos por RLS.
CREATE OR REPLACE FUNCTION public.data_quality_devices(p_from timestamptz, p_to timestamptz)
RETURNS TABLE (
  device_id uuid,
  samples bigint,
  duplicate_slots bigint,
  browser_samples bigint,
  browser_with_domain bigint,
  first_at timestamptz,
  last_at timestamptz,
  open_sessions bigint,
  idle_seconds bigint,
  active_seconds bigint
)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public, pg_temp AS $$
  WITH ev AS (
    SELECT ae.device_id, ae.started_at, ae.app_identifier, ae.domain,
      floor(extract(epoch FROM ae.started_at) / 10) AS slot
    FROM activity_events ae
    WHERE ae.started_at >= p_from AND ae.started_at < p_to AND ae.device_id IS NOT NULL
  ),
  slots AS (
    SELECT device_id, slot, count(*) AS n FROM ev GROUP BY 1, 2
  ),
  agg AS (
    SELECT device_id,
      count(*) AS samples,
      count(*) FILTER (WHERE lower(app_identifier) IN ('chrome','msedge','firefox','brave','opera','vivaldi')) AS browser_samples,
      count(*) FILTER (WHERE domain IS NOT NULL) AS browser_with_domain,
      min(started_at) AS first_at,
      max(started_at) AS last_at
    FROM ev GROUP BY 1
  ),
  dup AS (
    SELECT device_id, count(*) FILTER (WHERE n > 1) AS duplicate_slots FROM slots GROUP BY 1
  ),
  ses AS (
    SELECT ws.device_id,
      count(*) FILTER (WHERE ws.ended_at IS NULL) AS open_sessions,
      COALESCE(sum(ws.idle_seconds), 0)::bigint AS idle_seconds,
      COALESCE(sum(ws.active_seconds), 0)::bigint AS active_seconds
    FROM work_sessions ws
    WHERE ws.started_at >= p_from AND ws.started_at < p_to
    GROUP BY 1
  )
  SELECT d.id, COALESCE(a.samples, 0), COALESCE(dup.duplicate_slots, 0),
    COALESCE(a.browser_samples, 0), COALESCE(a.browser_with_domain, 0),
    a.first_at, a.last_at,
    COALESCE(s.open_sessions, 0), COALESCE(s.idle_seconds, 0), COALESCE(s.active_seconds, 0)
  FROM agent_devices d
  LEFT JOIN agg a ON a.device_id = d.id
  LEFT JOIN dup ON dup.device_id = d.id
  LEFT JOIN ses s ON s.device_id = d.id
  WHERE d.revoked_at IS NULL
$$;
