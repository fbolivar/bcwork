-- Turnos: un horario asignado a equipos o personas con fechas concretas,
-- lugar de trabajo y horas minimas. Antes solo existian plantillas
-- (work_schedules) y la asignacion era un paso aparte sin fechas ni contexto.
--
-- Un turno sigue siendo un work_schedules + user_schedules por persona, para
-- que el cumplimiento, las alertas de desconexion (Ley 2191) y el agregado
-- diario funcionen igual. La diferencia es que los turnos puntuales se marcan
-- is_template = false y no aparecen en el selector de plantillas.

ALTER TABLE public.work_schedules
  ADD COLUMN IF NOT EXISTS is_template BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS min_daily_hours NUMERIC(4,2),
  ADD COLUMN IF NOT EXISTS work_from TEXT
    CHECK (work_from IS NULL OR work_from IN ('office', 'remote', 'hybrid')),
  ADD COLUMN IF NOT EXISTS description TEXT;

ALTER TABLE public.user_schedules
  ADD COLUMN IF NOT EXISTS note TEXT,
  ADD COLUMN IF NOT EXISTS work_from TEXT
    CHECK (work_from IS NULL OR work_from IN ('office', 'remote', 'hybrid')),
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();

COMMENT ON COLUMN public.work_schedules.is_template IS
  'true: aparece como plantilla reutilizable. false: turno puntual creado desde "Crear un horario".';

-- Un turno de un solo dia tiene effective_to = effective_from y el CHECK
-- original (>) lo rechazaba.
ALTER TABLE public.user_schedules DROP CONSTRAINT IF EXISTS effective_range;
ALTER TABLE public.user_schedules
  ADD CONSTRAINT effective_range CHECK (effective_to IS NULL OR effective_to >= effective_from);
