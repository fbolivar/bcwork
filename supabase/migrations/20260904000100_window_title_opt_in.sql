-- Los titulos de ventana son el dato mas sensible que captura el agente: pueden
-- contener nombres de clientes, montos, asuntos de correo o datos de salud.
-- Habia 174.698 guardados, sin finalidad declarada en la politica de
-- tratamiento y sin aparecer en el panel del administrador. Valor cero, riesgo
-- alto (Ley 1581: principio de finalidad).
--
-- Pasa a ser una decision explicita de cada empresa, apagada por defecto.
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS capture_window_titles boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.tenants.capture_window_titles IS
  'Ley 1581 (finalidad): guardar titulos de ventana requiere decision explicita del responsable del tratamiento.';
