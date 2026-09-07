-- El CHECK de scheduled_reports.report_type admitia ('daily','weekly','monthly',
-- 'payroll'): es decir, la columna guardaba una FRECUENCIA, no un tipo de
-- informe. La frecuencia ya vive en cron_expression, asi que la restriccion
-- impedia guardar cualquiera de los informes que el constructor genera
-- realmente. La tabla estaba vacia -- nadie escribio nunca en ella, porque no
-- existia ni la interfaz para crear programaciones ni el proceso que las
-- enviara -- de modo que no hay filas que migrar.

ALTER TABLE scheduled_reports
  DROP CONSTRAINT IF EXISTS scheduled_reports_report_type_check;

ALTER TABLE scheduled_reports
  ADD CONSTRAINT scheduled_reports_report_type_check
  CHECK (report_type IN ('overview', 'attendance', 'productivity', 'absences', 'payroll'));

-- El envio adjunta un .xlsx; el defecto 'pdf' dejaba las filas describiendo un
-- formato que no es el que se manda.
ALTER TABLE scheduled_reports ALTER COLUMN format SET DEFAULT 'xlsx';

COMMENT ON COLUMN scheduled_reports.report_type IS
  'Tipo de informe del constructor. La frecuencia va en cron_expression.';
