-- Cierra las funciones RPC expuestas via PostgREST.
--
-- Critico: `set_tenant_context` es SECURITY DEFINER y era ejecutable por `anon`,
-- lo que permitia a cualquiera con la anon key fijar `app.current_tenant_id`
-- y saltarse TODAS las politicas tenant_isolation. `delete_tenant_data` era
-- igualmente invocable por anon (destructivo).
--
-- Todas estas funciones se llaman solo desde el backend con
-- SUPABASE_SERVICE_ROLE_KEY, asi que basta con dejar el EXECUTE en service_role.

DO $$
DECLARE f text;
BEGIN
  FOREACH f IN ARRAY ARRAY[
    'public.set_tenant_context(uuid,text)',
    'public.delete_tenant_data(uuid)',
    'public.backfill_daily_metrics(integer,uuid)',
    'public.evaluate_alerts(date,uuid)',
    'public.get_weekly_digest(uuid,date,date)',
    'public.aggregate_daily_user_metrics(date,uuid)'
  ] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', f);
  END LOOP;
END $$;

-- search_path fijo (advisor: function_search_path_mutable)
ALTER FUNCTION public.set_tenant_context(uuid, text) SET search_path = public, pg_temp;
ALTER FUNCTION public.delete_tenant_data(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.aggregate_daily_user_metrics(date, uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.update_updated_at() SET search_path = public, pg_temp;
ALTER FUNCTION public.update_updated_at_column() SET search_path = public, pg_temp;
