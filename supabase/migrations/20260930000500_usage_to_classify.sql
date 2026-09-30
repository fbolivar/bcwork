-- Cola de clasificación: apps y sitios por tiempo con su clasificación efectiva
-- actual y la regla del tenant si existe.
CREATE OR REPLACE FUNCTION public.usage_to_classify(
  p_from timestamptz, p_to timestamptz, p_user_ids uuid[], p_top int DEFAULT 30
)
RETURNS TABLE (
  kind text, identifier text, seconds bigint, productivity text,
  rule_id uuid, rule_category text, rule_productivity text
)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public, pg_temp AS $$
  WITH ev AS (
    SELECT 'app'::text AS kind, ae.app_identifier AS ident,
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
  per_prod AS (SELECT kind, ident, prod, SUM(dur)::bigint AS secs FROM ev GROUP BY 1, 2, 3),
  totales AS (
    SELECT kind, ident, SUM(secs)::bigint AS total,
      (ARRAY_AGG(prod ORDER BY secs DESC))[1] AS dom_prod
    FROM per_prod GROUP BY 1, 2
  ),
  ranked AS (
    SELECT kind, ident, total, dom_prod,
      ROW_NUMBER() OVER (PARTITION BY kind ORDER BY total DESC) AS rn
    FROM totales
  )
  SELECT r.kind, r.ident, r.total, r.dom_prod, c.id, c.category, c.productivity
  FROM ranked r
  LEFT JOIN app_catalog c
    ON c.identifier = r.ident
    AND c.identifier_type = CASE WHEN r.kind = 'site' THEN 'domain' ELSE 'process' END
    AND c.tenant_id = (SELECT current_tenant_id())
  WHERE r.rn <= p_top
  ORDER BY r.kind, r.total DESC
$$;
