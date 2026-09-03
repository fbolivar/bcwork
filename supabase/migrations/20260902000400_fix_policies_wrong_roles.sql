-- Paso 2 del aislamiento estructural: corregir politicas que nombran roles
-- inexistentes.
--
-- Cuatro tablas tienen politicas escritas contra roles 'admin' / 'owner', que
-- NO existen en BCWork (los roles reales son tenant_admin, manager, employee y
-- platform_admin). Hoy no se nota porque la app entra con service_role y no
-- evalua politicas; el dia que el RLS aplique, los administradores se quedan
-- sin acceso a Anuncios, Calendario, Certificados y Proyectos.
--
-- `project_time_entries` ademas no filtraba por tenant: un manager veia los
-- registros de horas de TODAS las empresas. Se corrige aqui.

-- ── announcements ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS admins_manage_announcements ON public.announcements;
DROP POLICY IF EXISTS tenant_members_read_announcements ON public.announcements;

CREATE POLICY announcements_read ON public.announcements FOR SELECT
  USING (tenant_id = public.current_tenant_id() OR public.is_platform_admin());

CREATE POLICY announcements_manage ON public.announcements FOR ALL
  USING (
    (tenant_id = public.current_tenant_id()
     AND public.current_actor_role() IN ('tenant_admin', 'manager'))
    OR public.is_platform_admin()
  )
  WITH CHECK (
    (tenant_id = public.current_tenant_id()
     AND public.current_actor_role() IN ('tenant_admin', 'manager'))
    OR public.is_platform_admin()
  );

-- ── company_events ───────────────────────────────────────────────────────────
DROP POLICY IF EXISTS admins_manage_events ON public.company_events;
DROP POLICY IF EXISTS tenant_members_read_events ON public.company_events;

CREATE POLICY company_events_read ON public.company_events FOR SELECT
  USING (tenant_id = public.current_tenant_id() OR public.is_platform_admin());

CREATE POLICY company_events_manage ON public.company_events FOR ALL
  USING (
    (tenant_id = public.current_tenant_id()
     AND public.current_actor_role() IN ('tenant_admin', 'manager'))
    OR public.is_platform_admin()
  )
  WITH CHECK (
    (tenant_id = public.current_tenant_id()
     AND public.current_actor_role() IN ('tenant_admin', 'manager'))
    OR public.is_platform_admin()
  );

-- ── labor_certificates ───────────────────────────────────────────────────────
DROP POLICY IF EXISTS employee_own_certificates ON public.labor_certificates;

CREATE POLICY labor_certificates_access ON public.labor_certificates FOR ALL
  USING (
    (tenant_id = public.current_tenant_id()
     AND (employee_id = auth.uid()
          OR public.current_actor_role() IN ('tenant_admin', 'manager')))
    OR public.is_platform_admin()
  )
  WITH CHECK (
    (tenant_id = public.current_tenant_id()
     AND (employee_id = auth.uid()
          OR public.current_actor_role() IN ('tenant_admin', 'manager')))
    OR public.is_platform_admin()
  );

-- ── project_time_entries ─────────────────────────────────────────────────────
DROP POLICY IF EXISTS own_or_admin_project_time_entries ON public.project_time_entries;

CREATE POLICY project_time_entries_access ON public.project_time_entries FOR ALL
  USING (
    (tenant_id = public.current_tenant_id()
     AND (user_id = auth.uid()
          OR public.current_actor_role() IN ('tenant_admin', 'manager')))
    OR public.is_platform_admin()
  )
  WITH CHECK (
    (tenant_id = public.current_tenant_id()
     AND (user_id = auth.uid()
          OR public.current_actor_role() IN ('tenant_admin', 'manager')))
    OR public.is_platform_admin()
  );
