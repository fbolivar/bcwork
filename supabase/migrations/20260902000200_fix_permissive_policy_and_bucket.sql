-- Corrige los WARN restantes del linter de seguridad.

-- ---------------------------------------------------------------------------
-- 1) tenant_communications: la politica "Platform admin full access" estaba
--    creada para el rol `public` con USING (true) / WITH CHECK (true), es decir
--    lectura y escritura libres con la anon key. Se restringe a service_role,
--    mismo patron que public.tenant_notes (`service_role_all`).
--    La app solo toca esta tabla desde el backend con la service role key.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Platform admin full access to tenant_communications" ON public.tenant_communications;
DROP POLICY IF EXISTS service_role_all ON public.tenant_communications;
CREATE POLICY service_role_all ON public.tenant_communications FOR ALL
  TO service_role USING (true) WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- 2) bucket `tenant-logos`: al ser un bucket publico, los objetos se sirven por
--    URL (/storage/v1/object/public/...) sin pasar por RLS. La politica SELECT
--    sobre storage.objects solo habilitaba LISTAR todos los archivos del bucket.
--    Se elimina: los logos se siguen viendo por URL (getPublicUrl) y las subidas
--    se hacen con service_role.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS logos_public_read ON storage.objects;

-- ---------------------------------------------------------------------------
-- 3) pg_trgm fuera del schema public. No hay indices trgm ni consultas que la
--    usen, asi que el movimiento no rompe nada.
--    NOTA: `citext` se deja en public a proposito — users.email y
--    tenants.contact_email son de ese tipo y mover la extension arriesga la
--    resolucion de operadores (login) a cambio de un warning cosmetico.
-- ---------------------------------------------------------------------------
ALTER EXTENSION pg_trgm SET SCHEMA extensions;
