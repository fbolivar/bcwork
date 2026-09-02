-- Habilita RLS en las 11 tablas que quedaron expuestas via PostgREST
-- (advisor: rls_disabled_in_public / sensitive_columns_exposed).
--
-- El backend (apps/web) usa SUPABASE_SERVICE_ROLE_KEY, que hace BYPASSRLS,
-- por lo que estas politicas NO afectan a la app: solo cierran el acceso
-- directo con la anon key.
--
-- Patron: mismo `tenant_isolation` del schema inicial, pero con NULLIF para
-- que un valor vacio (sesion sin tenant) devuelva NULL en vez de fallar el
-- cast a uuid.

-- ---------------------------------------------------------------------------
-- tenants: el propio id es el tenant
-- ---------------------------------------------------------------------------
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON public.tenants;
CREATE POLICY tenant_isolation ON public.tenants FOR ALL
  USING (
    id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
    OR current_setting('app.current_role', true) = 'platform_admin'
  );

-- ---------------------------------------------------------------------------
-- licenses / billing_events / audit_logs: aislamiento por tenant_id
-- ---------------------------------------------------------------------------
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'licenses', 'billing_events', 'audit_logs',
    'activity_events_2026_05', 'activity_events_2026_06',
    'activity_events_2026_07', 'activity_events_2026_08',
    'activity_events_2026_09', 'activity_events_2026_10'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON public.%I', t);
    EXECUTE format($f$
      CREATE POLICY tenant_isolation ON public.%I FOR ALL
        USING (
          tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
          OR current_setting('app.current_role', true) = 'platform_admin'
        )
    $f$, t);
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- plans: catalogo global (no tiene tenant_id). Solo lectura para usuarios
-- autenticados; las escrituras quedan reservadas al service_role.
-- ---------------------------------------------------------------------------
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS read_all ON public.plans;
CREATE POLICY read_all ON public.plans FOR SELECT TO authenticated USING (true);

-- NOTA: al crear nuevas particiones de activity_events (activity_events_YYYY_MM)
-- hay que repetir ENABLE ROW LEVEL SECURITY + la politica tenant_isolation,
-- porque las particiones no heredan la RLS de la tabla padre cuando se
-- consultan directamente.
