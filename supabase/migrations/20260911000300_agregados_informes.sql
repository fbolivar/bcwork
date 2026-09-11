-- Agregados para Informes > Resumen.
--
-- Una semana de GVM son ~40 000 eventos y un mes ~150 000; traerlos al
-- servidor para sumarlos es absurdo cuando Postgres los tiene a mano. Estas
-- funciones devuelven lo ya sumado. Son SECURITY INVOKER: corren con el rol
-- de quien llama y el RLS de activity_events sigue aplicando.

-- Totales por persona y dia local: base de KPIs, rankings, llegada y salida.
CREATE OR REPLACE FUNCTION public.report_user_days(
  p_from timestamptz,
  p_to timestamptz,
  p_user_ids uuid[],
  p_tz text DEFAULT 'America/Bogota'
)
RETURNS TABLE (
  user_id uuid,
  day date,
  productive bigint,
  non_productive bigint,
  neutral bigint,
  first_at timestamptz,
  last_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  SELECT
    ae.user_id,
    (ae.started_at AT TIME ZONE p_tz)::date AS day,
    COALESCE(SUM(ae.duration_seconds) FILTER (WHERE ae.productivity = 'productive'), 0)::bigint,
    COALESCE(SUM(ae.duration_seconds) FILTER (WHERE ae.productivity = 'non_productive'), 0)::bigint,
    COALESCE(SUM(ae.duration_seconds) FILTER (WHERE ae.productivity IS DISTINCT FROM 'productive'
                                               AND ae.productivity IS DISTINCT FROM 'non_productive'), 0)::bigint,
    MIN(ae.started_at),
    MAX(ae.started_at)
  FROM activity_events ae
  WHERE ae.started_at >= p_from
    AND ae.started_at <  p_to
    AND ae.user_id = ANY (p_user_ids)
  GROUP BY ae.user_id, (ae.started_at AT TIME ZONE p_tz)::date
$$;

-- Perfil por hora del dia (en franjas de p_bucket_minutes) sumando todo el
-- periodo: la "barra de productividad" de un rango.
CREATE OR REPLACE FUNCTION public.report_time_profile(
  p_from timestamptz,
  p_to timestamptz,
  p_user_ids uuid[],
  p_bucket_minutes int DEFAULT 30,
  p_tz text DEFAULT 'America/Bogota'
)
RETURNS TABLE (
  bucket int,
  productive bigint,
  non_productive bigint,
  neutral bigint
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  SELECT
    ((EXTRACT(HOUR FROM (ae.started_at AT TIME ZONE p_tz)) * 60
      + EXTRACT(MINUTE FROM (ae.started_at AT TIME ZONE p_tz)))::int / p_bucket_minutes) AS bucket,
    COALESCE(SUM(ae.duration_seconds) FILTER (WHERE ae.productivity = 'productive'), 0)::bigint,
    COALESCE(SUM(ae.duration_seconds) FILTER (WHERE ae.productivity = 'non_productive'), 0)::bigint,
    COALESCE(SUM(ae.duration_seconds) FILTER (WHERE ae.productivity IS DISTINCT FROM 'productive'
                                               AND ae.productivity IS DISTINCT FROM 'non_productive'), 0)::bigint
  FROM activity_events ae
  WHERE ae.started_at >= p_from
    AND ae.started_at <  p_to
    AND ae.user_id = ANY (p_user_ids)
  GROUP BY 1
  ORDER BY 1
$$;

-- Total por aplicacion y clase en el periodo.
CREATE OR REPLACE FUNCTION public.report_app_totals(
  p_from timestamptz,
  p_to timestamptz,
  p_user_ids uuid[]
)
RETURNS TABLE (
  app_identifier text,
  productivity text,
  seconds bigint
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  SELECT
    ae.app_identifier,
    COALESCE(ae.productivity, 'neutral'),
    COALESCE(SUM(ae.duration_seconds), 0)::bigint
  FROM activity_events ae
  WHERE ae.started_at >= p_from
    AND ae.started_at <  p_to
    AND ae.user_id = ANY (p_user_ids)
    AND ae.app_identifier IS NOT NULL
  GROUP BY ae.app_identifier, COALESCE(ae.productivity, 'neutral')
  ORDER BY 3 DESC
$$;

GRANT EXECUTE ON FUNCTION public.report_user_days(timestamptz, timestamptz, uuid[], text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.report_time_profile(timestamptz, timestamptz, uuid[], int, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.report_app_totals(timestamptz, timestamptz, uuid[]) TO authenticated, service_role;
