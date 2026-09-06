-- Cierre de las sesiones que el agente viejo dejó abiertas para siempre.
--
-- Hasta la version 0.1.4 el agente mandaba `session_id: null` e `is_active: true`
-- en cada lote: el servidor abria una sesion nueva por envio y ninguna recibia
-- ended_at. Quedaron 7.152 sesiones "en curso", la mas antigua del 1 de mayo,
-- que ensuciaban toda consulta sobre jornadas e inflaban el contador de tramos
-- en el panel de cada persona.
--
-- Se cierran con la hora del ultimo evento de esa sesion, acotada a 16 h: cinco
-- de ellas tenian eventos repartidos en semanas (la peor, 31 dias) y cerrarlas
-- con ese valor habria inventado jornadas imposibles. La cota es un limite
-- defendible, no una medicion.
--
-- Aplicado el 2026-09-06. Solo afecta sesiones de mas de 24 h sin cerrar, asi
-- que no toca las que el agente nuevo mantiene abiertas legitimamente.

WITH fin AS (
  SELECT ae.session_id,
         max(ae.started_at + make_interval(secs => coalesce(ae.duration_seconds, 0))) AS fin
  FROM activity_events ae
  WHERE ae.session_id IS NOT NULL
  GROUP BY ae.session_id
)
UPDATE work_sessions ws
SET ended_at = least(
      coalesce(
        f.fin,
        ws.started_at + make_interval(secs => coalesce(ws.active_seconds, 0) + coalesce(ws.idle_seconds, 0))
      ),
      ws.started_at + interval '16 hours'
    )
FROM fin f
WHERE f.session_id = ws.id
  AND ws.ended_at IS NULL
  AND ws.started_at < now() - interval '24 hours';

-- Las que no tienen ningun evento asociado: se cierran con sus contadores.
UPDATE work_sessions
SET ended_at = started_at + make_interval(secs => greatest(coalesce(active_seconds, 0) + coalesce(idle_seconds, 0), 0))
WHERE ended_at IS NULL
  AND started_at < now() - interval '24 hours';
