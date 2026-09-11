-- Proyectos y tareas al nivel de las herramientas del mercado.
--
-- projects solo tenia nombre, color y activo. Faltaba: quien puede verlo
-- (visibilidad) y de donde viene (integracion). project_tasks no tenia
-- responsable, etiqueta, urgencia ni estado, asi que "progreso" no se podia
-- calcular. project_members no existia.

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'all'
    CHECK (visibility IN ('all', 'limited')),
  ADD COLUMN IF NOT EXISTS integration TEXT
    CHECK (integration IS NULL OR integration IN ('jira', 'asana', 'trello', 'gitlab', 'zapier')),
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

ALTER TABLE public.project_tasks
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assignee_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS tag TEXT,
  ADD COLUMN IF NOT EXISTS priority TEXT NOT NULL DEFAULT 'medium'
    CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'todo'
    CHECK (status IN ('todo', 'in_progress', 'done')),
  ADD COLUMN IF NOT EXISTS due_date DATE,
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_project_tasks_project ON public.project_tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_project_tasks_assignee ON public.project_tasks(assignee_id);

-- Visibilidad limitada: solo estas personas ven el proyecto.
CREATE TABLE IF NOT EXISTS public.project_members (
  tenant_id  UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  added_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, user_id)
);

ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON public.project_members;
CREATE POLICY tenant_isolation ON public.project_members FOR ALL
  USING (tenant_id = public.current_tenant_id() OR public.is_platform_admin())
  WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_platform_admin());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_members TO authenticated;

-- projects.created_by apuntaba a auth.users (el auth de Supabase), pero
-- BCWork autentica con su propia tabla users: crear un proyecto nunca pudo
-- haber funcionado.
ALTER TABLE public.projects DROP CONSTRAINT IF EXISTS projects_created_by_fkey;
ALTER TABLE public.projects
  ADD CONSTRAINT projects_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;
