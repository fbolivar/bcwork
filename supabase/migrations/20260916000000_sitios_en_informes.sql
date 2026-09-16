-- Con la extension del navegador los eventos de Chrome/Edge traen `domain`.
-- Donde se listan aplicaciones, el sitio manda sobre el proceso: "youtube.com"
-- dice algo; "chrome" no. Sin dominio todo sigue igual.

CREATE OR REPLACE FUNCTION public.report_app_totals(p_from timestamptz, p_to timestamptz, p_user_ids uuid[])
RETURNS TABLE (app_identifier text, productivity text, seconds bigint)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public, pg_temp AS $$
  SELECT COALESCE(ae.domain, ae.app_identifier), COALESCE(ae.productivity, 'neutral'), COALESCE(SUM(ae.duration_seconds), 0)::bigint
  FROM activity_events ae
  WHERE ae.started_at >= p_from AND ae.started_at < p_to AND ae.user_id = ANY (p_user_ids)
    AND COALESCE(ae.domain, ae.app_identifier) IS NOT NULL
  GROUP BY 1, 2
  ORDER BY 3 DESC
$$;

-- apps_top del agregado diario: mismo criterio.
CREATE OR REPLACE FUNCTION public.aggregate_daily_user_metrics(p_date date, p_tenant_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(out_tenant_id uuid, out_user_id uuid, out_date date, rows_upserted integer)
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_count int := 0;
BEGIN
  WITH
  schedule AS (
    SELECT
      us.user_id AS sched_user_id,
      CASE
        WHEN array_length(ws.days_of_week, 1) > 0
          THEN round(ws.weekly_hours * 3600.0 / array_length(ws.days_of_week, 1))::int
        ELSE 28800
      END AS expected_seconds_day
    FROM user_schedules us
    JOIN work_schedules ws ON ws.id = us.schedule_id
    WHERE us.effective_from <= p_date
      AND (us.effective_to IS NULL OR us.effective_to >= p_date)
      AND (p_tenant_id IS NULL OR us.tenant_id = p_tenant_id)
  ),
  events_agg AS (
    SELECT
      ae.tenant_id AS agg_tenant_id,
      ae.user_id   AS agg_user_id,
      SUM(ae.duration_seconds) AS total_active_secs,
      SUM(CASE WHEN ae.productivity = 'productive'     THEN ae.duration_seconds ELSE 0 END) AS productive_secs,
      SUM(CASE WHEN ae.productivity = 'non_productive' THEN ae.duration_seconds ELSE 0 END) AS non_productive_secs,
      jsonb_agg(jsonb_build_object('name', COALESCE(ae.domain, ae.app_identifier), 'secs', ae.duration_seconds) ORDER BY ae.duration_seconds DESC)
        FILTER (WHERE COALESCE(ae.domain, ae.app_identifier) IS NOT NULL) AS apps_raw,
      jsonb_agg(jsonb_build_object('domain', ae.domain, 'secs', ae.duration_seconds) ORDER BY ae.duration_seconds DESC)
        FILTER (WHERE ae.domain IS NOT NULL) AS domains_raw
    FROM activity_events ae
    WHERE ae.started_at >= p_date::timestamptz
      AND ae.started_at <  (p_date + 1)::timestamptz
      AND (p_tenant_id IS NULL OR ae.tenant_id = p_tenant_id)
    GROUP BY ae.tenant_id, ae.user_id
  ),
  apps_top AS (
    SELECT ea.agg_tenant_id, ea.agg_user_id,
      jsonb_agg(jsonb_build_object('name', a.name, 'secs', a.total_secs) ORDER BY a.total_secs DESC) AS apps_top
    FROM events_agg ea,
      LATERAL (
        SELECT elem->>'name' AS name, SUM((elem->>'secs')::int) AS total_secs
        FROM jsonb_array_elements(COALESCE(ea.apps_raw, '[]'::jsonb)) AS elem
        WHERE elem->>'name' IS NOT NULL
        GROUP BY elem->>'name'
        ORDER BY total_secs DESC LIMIT 10
      ) a
    GROUP BY ea.agg_tenant_id, ea.agg_user_id
  ),
  domains_top AS (
    SELECT ea.agg_tenant_id, ea.agg_user_id,
      jsonb_agg(jsonb_build_object('domain', d.domain, 'secs', d.total_secs) ORDER BY d.total_secs DESC) AS domains_top
    FROM events_agg ea,
      LATERAL (
        SELECT elem->>'domain' AS domain, SUM((elem->>'secs')::int) AS total_secs
        FROM jsonb_array_elements(COALESCE(ea.domains_raw, '[]'::jsonb)) AS elem
        WHERE elem->>'domain' IS NOT NULL
        GROUP BY elem->>'domain'
        ORDER BY total_secs DESC LIMIT 10
      ) d
    GROUP BY ea.agg_tenant_id, ea.agg_user_id
  ),
  declared AS (
    SELECT wl.tenant_id AS dec_tenant_id, wl.user_id AS dec_user_id,
      CASE WHEN wl.location_type = 'office' THEN 'office' ELSE 'remote' END AS location_type
    FROM work_locations wl
    WHERE wl.date = p_date
      AND (p_tenant_id IS NULL OR wl.tenant_id = p_tenant_id)
  ),
  sessions_agg AS (
    SELECT DISTINCT ON (ws.tenant_id, ws.user_id)
      ws.tenant_id AS sess_tenant_id, ws.user_id AS sess_user_id, ws.location_type
    FROM work_sessions ws
    WHERE ws.started_at >= p_date::timestamptz
      AND ws.started_at <  (p_date + 1)::timestamptz
      AND ws.location_type IS NOT NULL
      AND (p_tenant_id IS NULL OR ws.tenant_id = p_tenant_id)
    ORDER BY ws.tenant_id, ws.user_id, ws.active_seconds DESC
  )
  INSERT INTO daily_user_metrics (
    tenant_id, user_id, metric_date,
    active_seconds, productive_seconds, non_productive_seconds,
    expected_seconds, productivity_ratio, focus_score,
    apps_top, domains_top, location_type, overtime_seconds
  )
  SELECT
    ea.agg_tenant_id,
    ea.agg_user_id,
    p_date,
    ea.total_active_secs,
    ea.productive_secs,
    ea.non_productive_secs,
    COALESCE(s.expected_seconds_day, 28800),
    CASE WHEN ea.total_active_secs > 0
      THEN round(ea.productive_secs::numeric / ea.total_active_secs, 4) ELSE 0
    END,
    CASE WHEN (ea.productive_secs + ea.non_productive_secs) > 0
      THEN round(ea.productive_secs::numeric / (ea.productive_secs + ea.non_productive_secs), 4)
      ELSE NULL
    END,
    COALESCE(at.apps_top,    '[]'::jsonb),
    COALESCE(dt.domains_top, '[]'::jsonb),
    COALESCE(dc.location_type, sa.location_type, 'unknown'),
    GREATEST(0, ea.total_active_secs - COALESCE(s.expected_seconds_day, 28800))
  FROM events_agg ea
  LEFT JOIN schedule     s  ON s.sched_user_id   = ea.agg_user_id
  LEFT JOIN apps_top     at ON at.agg_tenant_id  = ea.agg_tenant_id AND at.agg_user_id  = ea.agg_user_id
  LEFT JOIN domains_top  dt ON dt.agg_tenant_id  = ea.agg_tenant_id AND dt.agg_user_id  = ea.agg_user_id
  LEFT JOIN declared     dc ON dc.dec_tenant_id  = ea.agg_tenant_id AND dc.dec_user_id  = ea.agg_user_id
  LEFT JOIN sessions_agg sa ON sa.sess_tenant_id = ea.agg_tenant_id AND sa.sess_user_id = ea.agg_user_id
  ON CONFLICT (tenant_id, user_id, metric_date) DO UPDATE SET
    active_seconds         = EXCLUDED.active_seconds,
    productive_seconds     = EXCLUDED.productive_seconds,
    non_productive_seconds = EXCLUDED.non_productive_seconds,
    expected_seconds       = EXCLUDED.expected_seconds,
    productivity_ratio     = EXCLUDED.productivity_ratio,
    focus_score            = EXCLUDED.focus_score,
    apps_top               = EXCLUDED.apps_top,
    domains_top            = EXCLUDED.domains_top,
    location_type          = EXCLUDED.location_type,
    overtime_seconds       = EXCLUDED.overtime_seconds;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN QUERY SELECT p_tenant_id, NULL::uuid, p_date, v_count;
END;
$function$;

-- Reglas de dominio iniciales para cada empresa: lo obvio, para que el primer
-- dia con extension no salga todo "neutral". El administrador las ajusta en
-- el catalogo de aplicaciones.
INSERT INTO app_catalog (tenant_id, identifier, identifier_type, display_name, category, productivity)
SELECT t.id, r.identifier, 'domain', r.identifier, r.category, r.productivity
FROM tenants t
CROSS JOIN (VALUES
  ('docs.google.com',        'productivity',  'productive'),
  ('drive.google.com',       'productivity',  'productive'),
  ('sheets.google.com',      'productivity',  'productive'),
  ('mail.google.com',        'communication',         'productive'),
  ('outlook.office.com',     'communication',         'productive'),
  ('outlook.live.com',       'communication',         'productive'),
  ('office.com',             'productivity',  'productive'),
  ('sharepoint.com',         'productivity',  'productive'),
  ('teams.microsoft.com',    'communication', 'productive'),
  ('meet.google.com',        'communication', 'productive'),
  ('zoom.us',                'communication', 'productive'),
  ('github.com',             'development',   'productive'),
  ('gitlab.com',             'development',   'productive'),
  ('stackoverflow.com',      'development',   'productive'),
  ('atlassian.net',          'productivity',  'productive'),
  ('notion.so',              'productivity',  'productive'),
  ('trello.com',             'productivity',  'productive'),
  ('asana.com',              'productivity',  'productive'),
  ('figma.com',              'productivity',  'productive'),
  ('canva.com',              'productivity',  'productive'),
  ('dian.gov.co',            'productivity',  'productive'),
  ('bcwork.vercel.app',      'productivity',  'productive'),
  ('facebook.com',           'entertainment',        'non_productive'),
  ('instagram.com',          'entertainment',        'non_productive'),
  ('tiktok.com',             'entertainment',        'non_productive'),
  ('x.com',                  'entertainment',        'non_productive'),
  ('twitter.com',            'entertainment',        'non_productive'),
  ('youtube.com',            'entertainment', 'non_productive'),
  ('netflix.com',            'entertainment', 'non_productive'),
  ('twitch.tv',              'entertainment', 'non_productive'),
  ('spotify.com',            'entertainment', 'non_productive'),
  ('reddit.com',             'entertainment',        'non_productive'),
  ('pinterest.com',          'entertainment',        'non_productive'),
  ('mercadolibre.com.co',    'other',         'non_productive'),
  ('amazon.com',             'other',         'non_productive'),
  ('google.com',             'browsing',      'neutral'),
  ('bing.com',               'browsing',      'neutral'),
  ('wikipedia.org',          'browsing',      'neutral'),
  ('whatsapp.com',           'communication', 'neutral'),
  ('web.whatsapp.com',       'communication', 'neutral'),
  ('linkedin.com',           'entertainment',        'neutral'),
  ('chatgpt.com',            'productivity',  'neutral'),
  ('claude.ai',              'productivity',  'neutral')
) AS r(identifier, category, productivity)
WHERE NOT EXISTS (
  SELECT 1 FROM app_catalog c
  WHERE c.tenant_id = t.id AND c.identifier = r.identifier AND c.identifier_type = 'domain'
);
