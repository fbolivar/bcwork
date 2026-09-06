-- Los tokens de aprovisionamiento vivian para siempre.
--
-- Cada publicacion del agente genera uno nuevo por empresa y los anteriores
-- quedaban validos indefinidamente: 13 activos con tres clientes, de los cuales
-- solo 3 se habian usado alguna vez. Cada uno es una credencial capaz de
-- enrolar un equipo nuevo en esa empresa, asi que la pila crece sola y no se
-- vacia nunca.
--
-- Con 3 clientes es inocuo; con 30 es una superficie de ataque que nadie mira.
ALTER TABLE public.agent_provisioning_tokens
  ADD COLUMN IF NOT EXISTS expires_at timestamptz;

COMMENT ON COLUMN public.agent_provisioning_tokens.expires_at IS
  'Vencimiento del token. NULL = sin vencimiento (solo tokens historicos).';

-- Los que ya existian: 90 dias desde su creacion.
UPDATE public.agent_provisioning_tokens
SET expires_at = created_at + interval '90 days'
WHERE expires_at IS NULL;

-- Revocar los superados: se conserva el mas reciente de cada empresa, que es el
-- que lleva el ZIP que hoy sirve /api/admin/installer.
WITH ranked AS (
  SELECT id, row_number() OVER (PARTITION BY tenant_id ORDER BY created_at DESC) AS n
  FROM public.agent_provisioning_tokens
  WHERE revoked_at IS NULL
)
UPDATE public.agent_provisioning_tokens p
SET revoked_at = now()
FROM ranked r
WHERE r.id = p.id AND r.n > 1;
