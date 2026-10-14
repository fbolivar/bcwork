-- El Analista IA se caía con "canceling statement due to statement timeout"
-- al generar análisis de 30 días. Causa real (medida en producción, rol
-- authenticated con RLS, 20 personas de GVM):
--
--   work_day_blocks  7d  = 0.6 s   |  30d = 8.2 s (frío) -> supera el
--   statement_timeout de 8 s del rol y Postgres cancela la consulta.
--
-- work_day_blocks reconstruye la jornada a partir de TODOS los eventos del
-- rango (funciones de ventana sobre cada evento), así que su costo crece con
-- el tamaño de la ventana. 30d está en el límite y en frío lo pasa.
--
-- Arreglo en dos frentes:
-- 1) Dar margen real de tiempo a las funciones del analista. La ruta de Next
--    ya permite hasta 200 s; el cuello era el límite de 8 s de Postgres por
--    rol. Se sube a 30 s SOLO dentro de estas funciones (statement_timeout es
--    USERSET; no afecta al resto de la base).
-- 2) analyst_first_seen deja de hacer MIN(started_at) GROUP BY sobre todo el
--    historial y pasa a una sonda por persona (ORDER BY started_at LIMIT 1),
--    que usa el índice idx_events_user_time: de segundos a milisegundos.
--    Ahora devuelve una fila por id (first_at NULL si no hay eventos); el
--    consumidor ya ignora los NULL.

-- 1) Margen de tiempo para las funciones pesadas del analista.
ALTER FUNCTION public.work_day_blocks(timestamptz, timestamptz, uuid[], int, text)
  SET statement_timeout = '30s';
ALTER FUNCTION public.analyst_user_apps(timestamptz, timestamptz, uuid[], int)
  SET statement_timeout = '30s';
ALTER FUNCTION public.analyst_user_offhours(timestamptz, timestamptz, uuid[], text)
  SET statement_timeout = '30s';
ALTER FUNCTION public.report_time_profile(timestamptz, timestamptz, uuid[], int, text)
  SET statement_timeout = '30s';
ALTER FUNCTION public.analyst_usage(timestamptz, timestamptz, uuid[], int)
  SET statement_timeout = '30s';

-- 2) analyst_first_seen: sonda por persona en lugar de agregado sobre todo.
CREATE OR REPLACE FUNCTION public.analyst_first_seen(p_user_ids uuid[])
RETURNS TABLE (user_id uuid, first_at timestamptz)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public, pg_temp
SET statement_timeout = '30s' AS $$
  SELECT u.uid AS user_id,
         (
           SELECT ae.started_at
           FROM activity_events ae
           WHERE ae.user_id = u.uid
           ORDER BY ae.started_at ASC
           LIMIT 1
         ) AS first_at
  FROM unnest(p_user_ids) AS u(uid)
$$;
