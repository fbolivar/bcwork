-- Informes → plantillas fallaba con:
--   column scheduled_reports.created_at does not exist
-- admin.listReportTemplates ordena por created_at, pero la tabla nunca tuvo esa
-- columna. Se agrega, en linea con el resto del esquema. La tabla esta vacia,
-- asi que no hay backfill que hacer.
ALTER TABLE public.scheduled_reports
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
