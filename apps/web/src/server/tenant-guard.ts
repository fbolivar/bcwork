import { TRPCError } from '@trpc/server'
import type { getDb } from '@/lib/db'

type Db = ReturnType<typeof getDb>

/**
 * Guards de aislamiento entre tenants.
 *
 * IMPORTANTE: `ctx.db` usa la SERVICE ROLE KEY, que tiene BYPASSRLS. Las
 * politicas `tenant_isolation` de Postgres NO se aplican al trafico de la app,
 * asi que el aislamiento depende de que cada query filtre por `tenant_id`.
 *
 * Cuando una mutacion recibe un id de otra entidad desde el cliente
 * (`employee_id`, `career_plan_id`, ...), filtrar la tabla propia por tenant no
 * alcanza: hay que verificar que la entidad referenciada tambien sea del mismo
 * tenant. Para eso son estos helpers.
 */

/** Verifica que el usuario referenciado pertenezca al tenant del que llama. */
export async function assertUserInTenant(
  db: Db,
  userId: string,
  tenantId: string | null | undefined,
): Promise<void> {
  if (!tenantId) throw new TRPCError({ code: 'FORBIDDEN', message: 'Sesión sin empresa' })

  const { data } = await db
    .from('users')
    .select('id')
    .eq('id', userId)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (!data) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Colaborador no encontrado en tu empresa' })
  }
}

/**
 * Verifica que un plan de carrera sea del tenant del que llama y devuelve su id.
 * `career_milestones` no tiene `tenant_id`: hereda el tenant via `career_plan_id`.
 */
export async function assertCareerPlanInTenant(
  db: Db,
  careerPlanId: string,
  tenantId: string | null | undefined,
): Promise<void> {
  if (!tenantId) throw new TRPCError({ code: 'FORBIDDEN', message: 'Sesión sin empresa' })

  const { data } = await db
    .from('career_plans')
    .select('id')
    .eq('id', careerPlanId)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (!data) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Plan de carrera no encontrado' })
  }
}

/** Igual que el anterior, pero partiendo del hito en vez del plan. */
export async function assertMilestoneInTenant(
  db: Db,
  milestoneId: string,
  tenantId: string | null | undefined,
): Promise<void> {
  const { data: milestone } = await db
    .from('career_milestones')
    .select('career_plan_id')
    .eq('id', milestoneId)
    .maybeSingle()

  if (!milestone) throw new TRPCError({ code: 'NOT_FOUND', message: 'Hito no encontrado' })

  await assertCareerPlanInTenant(db, milestone.career_plan_id, tenantId)
}
