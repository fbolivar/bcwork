-- Uso agregado para el informe: aplicaciones (proceso) y sitios web (dominio)
-- por separado, con la clasificación dominante y el tiempo total.
CREATE OR REPLACE FUNCTION public.analyst_usage(
  p_from timestamptz, p_to timestamptz, p_user_ids uuid[], p_top int DEFAULT 12
)
RETURNS TABLE (kind text, name text, productivity text, seconds bigint)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public, pg_temp AS $$
  WITH ev AS (
    SELECT 'app'::text AS kind, ae.app_identifier AS name,
      COALESCE(ae.productivity, 'neutral') AS prod, ae.duration_seconds AS dur
    FROM activity_events ae
    WHERE ae.started_at >= p_from AND ae.started_at < p_to
      AND ae.user_id = ANY (p_user_ids) AND ae.app_identifier IS NOT NULL
    UNION ALL
    SELECT 'site'::text, ae.domain, COALESCE(ae.productivity, 'neutral'), ae.duration_seconds
    FROM activity_events ae
    WHERE ae.started_at >= p_from AND ae.started_at < p_to
      AND ae.user_id = ANY (p_user_ids) AND ae.domain IS NOT NULL
  ),
  per_prod AS (
    SELECT kind, name, prod, SUM(dur)::bigint AS secs FROM ev GROUP BY 1, 2, 3
  ),
  totales AS (
    SELECT kind, name, SUM(secs)::bigint AS total,
      (ARRAY_AGG(prod ORDER BY secs DESC))[1] AS dom_prod
    FROM per_prod GROUP BY 1, 2
  ),
  ranked AS (
    SELECT kind, name, dom_prod AS prod, total,
      ROW_NUMBER() OVER (PARTITION BY kind ORDER BY total DESC) AS rn
    FROM totales
  )
  SELECT kind, name, prod, total FROM ranked WHERE rn <= p_top ORDER BY kind, total DESC
$$;
