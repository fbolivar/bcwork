-- Primer evento de cada persona: marca cuándo empezó a observarse su equipo.
-- Antes de esa fecha no hay "ausencia"; el primer día es la instalación.
CREATE OR REPLACE FUNCTION public.analyst_first_seen(p_user_ids uuid[])
RETURNS TABLE (user_id uuid, first_at timestamptz)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public, pg_temp AS $$
  SELECT ae.user_id, MIN(ae.started_at)
  FROM activity_events ae
  WHERE ae.user_id = ANY (p_user_ids)
  GROUP BY ae.user_id
$$;
