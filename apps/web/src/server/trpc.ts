import { initTRPC, TRPCError } from '@trpc/server'
import { ZodError } from 'zod'
import type { Context } from './context'

const t = initTRPC.context<Context>().create({
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError: error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    }
  },
})

export const router = t.router
export const publicProcedure = t.procedure

// Middleware: requiere JWT válido
const enforceAuth = t.middleware(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Sesión requerida' })
  }
  return next({ ctx: { ...ctx, user: ctx.user } })
})

export const protectedProcedure = t.procedure.use(enforceAuth)

// Middleware: requiere rol específico
export function requireRole(...roles: string[]) {
  return t.middleware(({ ctx, next }) => {
    if (!ctx.user || !roles.includes(ctx.user.role)) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Sin permisos suficientes' })
    }
    return next({ ctx: { ...ctx, user: ctx.user } })
  })
}

export const adminProcedure = t.procedure
  .use(enforceAuth)
  .use(requireRole('platform_admin', 'tenant_admin'))

export const platformAdminProcedure = t.procedure
  .use(enforceAuth)
  .use(requireRole('platform_admin'))
