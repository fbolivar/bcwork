-- El panel del dia descargaba todos los eventos del dia (35.000-57.000 filas
-- en GVM, en paginas de 1000 por PostgREST) para sumarlos en Node. Ahora suma
-- Postgres: una fila por persona con sus totales, llegada, ultimo evento y la
-- clase de ese ultimo evento (para "productivo ahora mismo").
-- SECURITY INVOKER: el RLS de activity_events sigue mandando.

CREATE OR REPLACE FUNCTION public.day_user_totals(p_from timestamptz, p_to timestamptz, p_user_ids uuid[])
RETURNS TABLE (
  user_id uuid,
  productive bigint,
  non_productive bigint,
  neutral bigint,
  first_at timestamptz,
  last_at timestamptz,
  last_class text
)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public, pg_temp AS $$
  WITH t AS (
    SELECT
      ae.user_id,
      COALESCE(SUM(ae.duration_seconds) FILTER (WHERE ae.productivity = 'productive'), 0)::bigint AS productive,
      COALESCE(SUM(ae.duration_seconds) FILTER (WHERE ae.productivity = 'non_productive'), 0)::bigint AS non_productive,
      COALESCE(SUM(ae.duration_seconds) FILTER (WHERE ae.productivity IS DISTINCT FROM 'productive' AND ae.productivity IS DISTINCT FROM 'non_productive'), 0)::bigint AS neutral,
      MIN(ae.started_at) AS first_at,
      MAX(ae.started_at) AS last_at
    FROM activity_events ae
    WHERE ae.started_at >= p_from AND ae.started_at < p_to AND ae.user_id = ANY (p_user_ids)
    GROUP BY ae.user_id
  )
  SELECT t.user_id, t.productive, t.non_productive, t.neutral, t.first_at, t.last_at,
    (SELECT COALESCE(u.productivity, 'neutral') FROM activity_events u
      WHERE u.user_id = t.user_id AND u.started_at = t.last_at
        AND u.started_at >= p_from AND u.started_at < p_to
      ORDER BY u.id DESC LIMIT 1) AS last_class
  FROM t
$$;
