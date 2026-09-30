-- Jornada por bloques de trabajo + ausencias justificadas en las metricas.
--
-- 1) work_gap_minutes por empresa (default 30): una pausa mayor corta el bloque.
--    Asi, cuando alguien deja el equipo encendido al irse, ese tiempo no cuenta
--    ni como jornada ni como inactividad, y un evento suelto de madrugada no
--    estira la hora de salida.
-- 2) work_day_blocks: por persona/dia devuelve tiempo activo, jornada (ancho de
--    los bloques), inactividad (huecos cortos dentro de la jornada) y la primera
--    y ultima actividad de bloques de >=5 min. SECURITY INVOKER (manda el RLS).
-- Las ausencias aprobadas (absence_requests) se leen en la capa de servicio
-- (server/ausencias.ts): un dia de incapacidad/vacaciones/permiso no es falta.

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS work_gap_minutes int NOT NULL DEFAULT 30;

CREATE OR REPLACE FUNCTION public.work_day_blocks(
  p_from timestamptz, p_to timestamptz, p_user_ids uuid[],
  p_gap_minutes int DEFAULT 30, p_tz text DEFAULT 'America/Bogota'
)
RETURNS TABLE (
  user_id uuid, day date,
  productive bigint, non_productive bigint, neutral bigint,
  active_seconds bigint, worked_seconds bigint, idle_seconds bigint,
  first_at timestamptz, last_at timestamptz
)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public, pg_temp AS $$
  WITH ev AS (
    SELECT ae.user_id AS uid,
      (ae.started_at AT TIME ZONE p_tz)::date AS d,
      ae.started_at AS ts,
      COALESCE(ae.duration_seconds, 10) AS dur,
      ae.productivity AS p,
      ae.started_at - lag(ae.started_at) OVER (
        PARTITION BY ae.user_id, (ae.started_at AT TIME ZONE p_tz)::date
        ORDER BY ae.started_at) AS gap
    FROM activity_events ae
    WHERE ae.started_at >= p_from AND ae.started_at < p_to AND ae.user_id = ANY (p_user_ids)
  ),
  marked AS (
    SELECT *,
      SUM(CASE WHEN gap IS NULL OR gap > make_interval(mins => p_gap_minutes) THEN 1 ELSE 0 END)
        OVER (PARTITION BY uid, d ORDER BY ts) AS blk
    FROM ev
  ),
  blocks AS (
    SELECT uid, d, blk,
      MIN(ts) AS b_start,
      MAX(ts) + interval '10 seconds' AS b_end,
      SUM(dur) AS active,
      SUM(dur) FILTER (WHERE p = 'productive') AS prod,
      SUM(dur) FILTER (WHERE p = 'non_productive') AS nonprod,
      SUM(dur) FILTER (WHERE p IS DISTINCT FROM 'productive' AND p IS DISTINCT FROM 'non_productive') AS neu,
      EXTRACT(EPOCH FROM (MAX(ts) + interval '10 seconds' - MIN(ts)))::bigint AS span
    FROM marked GROUP BY uid, d, blk
  )
  SELECT uid, d,
    COALESCE(SUM(prod), 0)::bigint,
    COALESCE(SUM(nonprod), 0)::bigint,
    COALESCE(SUM(neu), 0)::bigint,
    COALESCE(SUM(active), 0)::bigint,
    COALESCE(SUM(span), 0)::bigint,
    GREATEST(0, COALESCE(SUM(span), 0) - COALESCE(SUM(active), 0))::bigint,
    MIN(b_start) FILTER (WHERE span >= 300),
    MAX(b_end) FILTER (WHERE span >= 300)
  FROM blocks GROUP BY uid, d
$$;
