-- Agregar columna sent_by a notifications para rastrear quién envió la notificación
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS sent_by UUID REFERENCES users(id) ON DELETE SET NULL;
