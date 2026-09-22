-- Modulos opcionales por empresa. BCWork es un producto de productividad; los
-- ~30 modulos de talento humano (nomina, reclutamiento, beneficios, encuestas,
-- carrera...) quedan apagados por defecto y se activan por empresa cuando
-- alguien los pida. Las rutas y los datos no se tocan: solo el menu.
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS modules jsonb NOT NULL DEFAULT '{}'::jsonb;
