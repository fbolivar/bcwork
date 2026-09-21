-- Las politicas RLS llamaban a current_tenant_id() / is_platform_admin() /
-- current_actor_role() / auth.uid() "a pelo". Como esas funciones llevan
-- SET search_path, Postgres no las puede inlinear y las evalua UNA VEZ POR
-- FILA: con 35.000 eventos diarios por empresa, un informe semanal tardaba
-- 10,7 s y moria por statement_timeout (8 s). Envueltas en (SELECT ...) se
-- evaluan una vez por consulta: la misma consulta baja a 0,25 s.
-- Se reescriben todas las politicas del esquema public con esa sustitucion;
-- la logica de acceso no cambia.

DO $$
DECLARE
  p record;
  q text;
  w text;
  sql text;
BEGIN
  FOR p IN
    SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (COALESCE(qual, '') || COALESCE(with_check, ''))
          ~ '(current_tenant_id|is_platform_admin|current_actor_role|current_user_id|auth\.uid|auth\.role|auth\.jwt)\(\)'
  LOOP
    q := p.qual;
    w := p.with_check;
    FOREACH sql IN ARRAY ARRAY['current_tenant_id()', 'is_platform_admin()', 'current_actor_role()', 'current_user_id()', 'auth.uid()', 'auth.role()', 'auth.jwt()'] LOOP
      -- No volver a envolver lo que ya esta envuelto.
      q := replace(q, '(SELECT ' || sql || ')', sql);
      q := replace(q, '(select ' || sql || ')', sql);
      q := replace(q, sql, '(SELECT ' || sql || ')');
      IF w IS NOT NULL THEN
        w := replace(w, '(SELECT ' || sql || ')', sql);
        w := replace(w, '(select ' || sql || ')', sql);
        w := replace(w, sql, '(SELECT ' || sql || ')');
      END IF;
    END LOOP;

    sql := format('ALTER POLICY %I ON %I.%I', p.policyname, p.schemaname, p.tablename);
    IF q IS NOT NULL THEN
      sql := sql || ' USING (' || q || ')';
    END IF;
    IF w IS NOT NULL THEN
      sql := sql || ' WITH CHECK (' || w || ')';
    END IF;
    EXECUTE sql;
  END LOOP;
END $$;
