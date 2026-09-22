-- Fase 1 de datos confiables.
--
-- 1. Muestras duplicadas: hasta el agente 0.1.10, cada reinicio del servicio
--    lanzaba otro helper sin cerrar el anterior y los dos muestreaban a la vez
--    (hasta 52 % de sobrantes en algunos dias de GVM). Se conserva UNA muestra
--    por dispositivo e intervalo de 10 s, prefiriendo la que trae dominio.
-- 2. Sesiones zombi: sin cierre, la inactividad se acumulaba dias enteros
--    (Paula 288 h). Ahora cada sesion registra su ultimo latido y una funcion
--    cierra las que llevan mas de dos horas sin el.
-- 3. Recalculo de las metricas diarias afectadas.

-- ── 1. Duplicados ──
DELETE FROM activity_events ae
USING (
  SELECT id
  FROM (
    SELECT id,
      ROW_NUMBER() OVER (
        PARTITION BY device_id, floor(extract(epoch FROM started_at) / 10)
        ORDER BY (domain IS NULL), id
      ) AS rn
    FROM activity_events
  ) d
  WHERE d.rn > 1
) dup
WHERE ae.id = dup.id;

-- ── 2. Sesiones ──
ALTER TABLE work_sessions ADD COLUMN IF NOT EXISTS last_seen_at timestamptz;
UPDATE work_sessions SET last_seen_at = COALESCE(ended_at, created_at) WHERE last_seen_at IS NULL;
ALTER TABLE work_sessions ALTER COLUMN last_seen_at SET DEFAULT now();

CREATE OR REPLACE FUNCTION public.close_stale_sessions(p_max_silence interval DEFAULT interval '2 hours')
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v integer;
BEGIN
  -- Se cierra en el ultimo latido, no "ahora": el tiempo sin latido no es jornada.
  -- La inactividad no puede superar lo que duro la sesion menos lo activo.
  UPDATE work_sessions
  SET ended_at = GREATEST(last_seen_at, started_at),
      status = 'closed',
      idle_seconds = LEAST(
        idle_seconds,
        GREATEST(0, extract(epoch FROM GREATEST(last_seen_at, started_at) - started_at)::int - active_seconds)
      )
  WHERE ended_at IS NULL
    AND COALESCE(last_seen_at, created_at) < now() - p_max_silence;
  GET DIAGNOSTICS v = ROW_COUNT;
  RETURN v;
END $$;
REVOKE ALL ON FUNCTION public.close_stale_sessions(interval) FROM public;

-- Las zombis de hoy: todo lo abierto con mas de dos horas de silencio.
SELECT public.close_stale_sessions();

-- Sesiones historicas ya cerradas con inactividad imposible (mas larga que la
-- propia sesion): se acota igual.
UPDATE work_sessions
SET idle_seconds = LEAST(idle_seconds, GREATEST(0, extract(epoch FROM ended_at - started_at)::int - active_seconds))
WHERE ended_at IS NOT NULL
  AND idle_seconds > GREATEST(0, extract(epoch FROM ended_at - started_at)::int - active_seconds);

-- ── 3. Metricas diarias de septiembre, con los datos limpios ──
DO $$
DECLARE d date;
BEGIN
  FOR d IN SELECT generate_series(date '2026-09-01', current_date, interval '1 day')::date LOOP
    PERFORM public.aggregate_daily_user_metrics(d, NULL);
  END LOOP;
END $$;

-- Ninguna sesion puede tener mas de 16 h de inactividad: las de antes del
-- cierre a medianoche (agente 0.1.9) arrastraban semanas.
UPDATE work_sessions SET idle_seconds = 16 * 3600 WHERE idle_seconds > 16 * 3600;
