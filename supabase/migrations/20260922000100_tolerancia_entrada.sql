-- Tolerancia de entrada: con 0 minutos, abrir Excel a las 08:04 era "tarde" y
-- la mitad de las jornadas de GVM salian con retraso. 15 min es el uso normal.
ALTER TABLE work_schedules ALTER COLUMN flex_minutes SET DEFAULT 15;
UPDATE work_schedules SET flex_minutes = 15 WHERE COALESCE(flex_minutes, 0) = 0;
