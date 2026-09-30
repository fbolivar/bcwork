-- El analista pasa de "semanas" a periodos (1h/24h/7d/30d/1y).
ALTER TABLE ai_analyses ADD COLUMN IF NOT EXISTS period text;
ALTER TABLE ai_analyses ALTER COLUMN weeks DROP NOT NULL;
