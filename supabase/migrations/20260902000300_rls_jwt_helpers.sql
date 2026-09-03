-- Paso 1 del aislamiento estructural: que las politicas RLS lean la identidad
-- desde el JWT de la peticion, para que sirvan cuando la app deje de consultar
-- con la service role key.
--
-- Hoy conviven TRES convenciones de tenant en las politicas:
--   1. current_setting('app.current_tenant_id')            (40 tablas)
--   2. auth.jwt() -> 'app_metadata' ->> 'tid'              (18 tablas)
--   3. users.id = auth.uid()                               (33 tablas)
--
-- Esta migracion introduce funciones canonicas y reescribe (1) y (2) para que
-- todas usen la misma fuente. La convencion (3) se deja intacta: funciona sola
-- en cuanto el JWT lleve `sub` = users.id.
--
-- No cambia el comportamiento actual: el trafico de la app sigue entrando con
-- service_role (BYPASSRLS) y no evalua ninguna politica.

-- ── Funciones canonicas de identidad ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.jwt_claims()
RETURNS jsonb LANGUAGE sql STABLE
SET search_path = public, pg_temp
AS $$
  SELECT COALESCE(NULLIF(current_setting('request.jwt.claims', true), '')::jsonb, '{}'::jsonb)
$$;

COMMENT ON FUNCTION public.jwt_claims() IS
  'Claims del JWT de la peticion, o {} si no hay. Base de current_tenant_id().';

CREATE OR REPLACE FUNCTION public.current_tenant_id()
RETURNS uuid LANGUAGE sql STABLE
SET search_path = public, pg_temp
AS $$
  SELECT COALESCE(
    NULLIF(public.jwt_claims() -> 'app_metadata' ->> 'tid', ''),
    NULLIF(public.jwt_claims() ->> 'tid', ''),
    NULLIF(current_setting('app.current_tenant_id', true), '')
  )::uuid
$$;

COMMENT ON FUNCTION public.current_tenant_id() IS
  'Tenant del actor: app_metadata.tid del JWT, tid del JWT, o el GUC heredado.';

CREATE OR REPLACE FUNCTION public.current_actor_role()
RETURNS text LANGUAGE sql STABLE
SET search_path = public, pg_temp
AS $$
  SELECT COALESCE(
    NULLIF(public.jwt_claims() -> 'app_metadata' ->> 'role', ''),
    NULLIF(public.jwt_claims() ->> 'user_role', ''),
    NULLIF(current_setting('app.current_role', true), '')
  )
$$;

CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS boolean LANGUAGE sql STABLE
SET search_path = public, pg_temp
AS $$
  SELECT public.current_actor_role() = 'platform_admin'
$$;

-- ── Reescritura de las politicas de tenant ───────────────────────────────────
--
-- Las politicas permisivas se combinan con OR, asi que NO se puede agregar un
-- `tenant_isolation` amplio a una tabla que ya tiene politicas por rol: eso
-- volveria visible, por ejemplo, la nomina de toda la empresa a cualquier
-- empleado. Por eso el reemplazo se hace en dos regimenes:
--
--   A) Tablas cuya unica proteccion era la convencion de tenant  -> se recrea
--      un `tenant_isolation` canonico (ahora con WITH CHECK, para que tampoco
--      se puedan INSERTAR filas de otro tenant).
--   B) Tablas que ademas tienen politicas finas por rol (users.id = auth.uid())
--      -> se elimina la politica de tenant redundante y mandan las finas, que
--      ya validan tenant Y rol.

DO $$
DECLARE
  r record;
  finas int;
BEGIN
  FOR r IN
    SELECT DISTINCT p.tablename AS t
    FROM pg_policies p
    WHERE p.schemaname = 'public'
      AND (p.qual LIKE '%app.current_tenant_id%' OR p.qual LIKE '%app_metadata%')
      AND EXISTS (
        SELECT 1 FROM information_schema.columns c
        WHERE c.table_schema = 'public' AND c.table_name = p.tablename
          AND c.column_name = 'tenant_id'
      )
  LOOP
    -- Fuera la politica de tenant en su forma vieja.
    EXECUTE (
      SELECT string_agg(format('DROP POLICY IF EXISTS %I ON public.%I;', policyname, r.t), ' ')
      FROM pg_policies
      WHERE schemaname = 'public' AND tablename = r.t
        AND (qual LIKE '%app.current_tenant_id%' OR qual LIKE '%app_metadata%')
    );

    SELECT count(*) INTO finas
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = r.t;

    IF finas = 0 THEN
      EXECUTE format($f$
        CREATE POLICY tenant_isolation ON public.%I FOR ALL
          USING (tenant_id = public.current_tenant_id() OR public.is_platform_admin())
          WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_platform_admin())
      $f$, r.t);
    END IF;
  END LOOP;
END $$;

-- tenants: el tenant es su propio id.
DROP POLICY IF EXISTS tenant_isolation ON public.tenants;
CREATE POLICY tenant_isolation ON public.tenants FOR ALL
  USING (id = public.current_tenant_id() OR public.is_platform_admin())
  WITH CHECK (id = public.current_tenant_id() OR public.is_platform_admin());

-- career_milestones no tiene tenant_id: hereda el tenant via career_plan_id.
DROP POLICY IF EXISTS career_milestones_via_plan ON public.career_milestones;
CREATE POLICY career_milestones_via_plan ON public.career_milestones FOR ALL
  USING (
    career_plan_id IN (
      SELECT id FROM public.career_plans
      WHERE tenant_id = public.current_tenant_id() OR public.is_platform_admin()
    )
  )
  WITH CHECK (
    career_plan_id IN (
      SELECT id FROM public.career_plans
      WHERE tenant_id = public.current_tenant_id() OR public.is_platform_admin()
    )
  );
