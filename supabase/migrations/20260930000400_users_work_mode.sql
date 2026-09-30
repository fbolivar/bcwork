-- Modo de trabajo: 'desktop' (labor en el computador) o 'field' (campo).
-- A los de campo pocas horas activas es normal: no entran en el promedio de
-- productividad ni reciben señales de bajo uso; se muestran aparte.
ALTER TABLE users ADD COLUMN IF NOT EXISTS work_mode text NOT NULL DEFAULT 'desktop';
