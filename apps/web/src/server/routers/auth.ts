import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, publicProcedure, protectedProcedure } from '../trpc'
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '@/lib/auth/jwt'
import {
  hashPassword,
  verifyPassword,
  isPasswordInHistory,
  validatePasswordPolicy,
} from '@/lib/auth/password'
import {
  generateTotpSecret,
  verifyTotp,
  encryptSecret,
  decryptSecret,
  generateQrDataUrl,
} from '@/lib/auth/mfa'
import { logAudit } from '@/lib/auth/audit'
import { getDb, setTenantContext } from '@/lib/db'
import {
  loginSchema,
  signupTenantSchema,
  passwordSchema,
  ROLES,
  MAX_FAILED_LOGIN_ATTEMPTS,
  LOCKOUT_MINUTES,
  PASSWORD_MAX_AGE_DAYS,
} from '@bcwork/shared'
import { randomUUID } from 'crypto'

// Helper: verifica si la cuenta está bloqueada
function isLocked(lockedUntil: string | null): boolean {
  if (!lockedUntil) return false
  return new Date(lockedUntil) > new Date()
}

export const authRouter = router({
  // ─── SIGNUP TENANT ─────────────────────────────────────────────────────────
  signupTenant: publicProcedure.input(signupTenantSchema).mutation(async ({ input, ctx }) => {
    const db = getDb()

    // Verificar email no duplicado
    const { data: existing } = await db
      .from('users')
      .select('id')
      .eq('email', input.contact_email)
      .is('tenant_id', null)
      .maybeSingle()

    if (existing) {
      throw new TRPCError({ code: 'CONFLICT', message: 'Email ya registrado' })
    }

    // Validar política de contraseña
    const policyError = validatePasswordPolicy(input.admin_password)
    if (policyError) throw new TRPCError({ code: 'BAD_REQUEST', message: policyError })

    // Obtener plan Pro por defecto para trial
    const { data: plan } = await db.from('plans').select('id').eq('code', 'pro').single()

    if (!plan) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Plan no encontrado' })

    const passwordHash = await hashPassword(input.admin_password)

    // Crear tenant
    const { data: tenant, error: tenantError } = await db
      .from('tenants')
      .insert({
        legal_name: input.legal_name,
        trade_name: input.trade_name ?? null,
        nit: input.nit,
        timezone: input.timezone,
        contact_email: input.contact_email,
        contact_phone: input.contact_phone ?? null,
        status: 'trial',
      })
      .select('id')
      .single()

    if (tenantError) {
      if (tenantError.code === '23505') {
        throw new TRPCError({ code: 'CONFLICT', message: 'NIT ya registrado' })
      }
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: tenantError.message })
    }

    // Crear licencia trial (14 días, 10 seats)
    const trialEnd = new Date()
    trialEnd.setDate(trialEnd.getDate() + 14)

    await db.from('licenses').insert({
      tenant_id: tenant.id,
      plan_id: plan.id,
      seats_total: 10,
      status: 'trial',
      starts_at: new Date().toISOString(),
      ends_at: trialEnd.toISOString(),
      trial_ends_at: trialEnd.toISOString(),
    })

    // Crear usuario admin
    const { data: user, error: userError } = await db
      .from('users')
      .insert({
        tenant_id: tenant.id,
        email: input.contact_email,
        password_hash: passwordHash,
        full_name: input.admin_full_name,
        role: ROLES.TENANT_ADMIN,
        status: 'active',
      })
      .select('id')
      .single()

    if (userError) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: userError.message })
    }

    // Guardar primer hash en historial
    await db.from('password_history').insert({
      user_id: user.id,
      tenant_id: tenant.id,
      password_hash: passwordHash,
    })

    // Consentimiento básico automático (el admin acepta los términos durante signup)
    await db.from('consents').insert({
      tenant_id: tenant.id,
      user_id: user.id,
      policy_version: '1.0',
      consent_type: 'data_processing',
      granted: true,
      ip_inet: ctx.ip,
      user_agent: ctx.userAgent,
    })

    await logAudit(db, {
      tenantId: tenant.id,
      actorUserId: user.id,
      action: 'tenant.created',
      entityType: 'tenant',
      entityId: tenant.id,
      ipInet: ctx.ip,
      userAgent: ctx.userAgent,
    })

    return { success: true, tenantId: tenant.id }
  }),

  // ─── LOGIN ──────────────────────────────────────────────────────────────────
  login: publicProcedure.input(loginSchema).mutation(async ({ input, ctx }) => {
    const db = getDb()

    // Buscar usuario por email (sin RLS — no hay contexto aún)
    const { data: user } = await db
      .from('users')
      .select(
        'id, tenant_id, email, password_hash, role, status, failed_login_attempts, locked_until, mfa_enabled, mfa_secret_encrypted, must_change_password, password_changed_at',
      )
      .eq('email', input.email.toLowerCase())
      .neq('role', 'platform_admin') // platform_admin usa endpoint separado
      .maybeSingle()

    // Respuesta genérica para no filtrar si el email existe
    if (!user || user.status === 'deleted') {
      throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Credenciales inválidas' })
    }

    if (user.status === 'disabled') {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Cuenta deshabilitada. Contacta a tu administrador.',
      })
    }

    if (isLocked(user.locked_until)) {
      const minutes = Math.ceil((new Date(user.locked_until!).getTime() - Date.now()) / 60000)
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: `Cuenta bloqueada por ${minutes} minuto(s). Intenta más tarde.`,
      })
    }

    const valid = await verifyPassword(input.password, user.password_hash)

    if (!valid) {
      const attempts = (user.failed_login_attempts ?? 0) + 1
      const updates: Record<string, unknown> = { failed_login_attempts: attempts }

      if (attempts >= MAX_FAILED_LOGIN_ATTEMPTS) {
        const lockUntil = new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000)
        updates['locked_until'] = lockUntil.toISOString()
        updates['failed_login_attempts'] = 0

        await logAudit(db, {
          tenantId: user.tenant_id ?? undefined,
          actorUserId: user.id,
          action: 'user.locked',
          ipInet: ctx.ip,
          userAgent: ctx.userAgent,
        })
      }

      await db.from('users').update(updates).eq('id', user.id)

      await logAudit(db, {
        tenantId: user.tenant_id ?? undefined,
        actorUserId: user.id,
        action: 'user.login_failed',
        ipInet: ctx.ip,
        userAgent: ctx.userAgent,
        after: { attempts },
      })

      throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Credenciales inválidas' })
    }

    // Verificar MFA si está habilitado
    if (user.mfa_enabled) {
      if (!input.mfa_code) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Código MFA requerido',
        })
      }

      if (!user.mfa_secret_encrypted) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'MFA mal configurado' })
      }

      const secret = decryptSecret(Buffer.from(user.mfa_secret_encrypted))
      const validMfa = verifyTotp(secret, input.mfa_code)
      if (!validMfa) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Código MFA inválido' })
      }
    }

    // Verificar caducidad de contraseña para admins
    if (
      (user.role === ROLES.TENANT_ADMIN || user.role === ROLES.PLATFORM_ADMIN) &&
      user.password_changed_at
    ) {
      const daysSinceChange = (Date.now() - new Date(user.password_changed_at).getTime()) / 86400000
      if (daysSinceChange > PASSWORD_MAX_AGE_DAYS) {
        // No bloquear — pero marcar para forzar cambio
        await db.from('users').update({ must_change_password: true }).eq('id', user.id)
      }
    }

    // Reset intentos fallidos
    await db
      .from('users')
      .update({
        failed_login_attempts: 0,
        locked_until: null,
        last_login_at: new Date().toISOString(),
      })
      .eq('id', user.id)

    // Crear sesión con refresh token
    const sessionId = randomUUID()
    const refreshToken = await signRefreshToken(user.id, sessionId)

    // Guardar hash del refresh token
    const { createHash } = await import('crypto')
    const refreshHash = createHash('sha256').update(refreshToken).digest('hex')

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    await db.from('auth_sessions').insert({
      id: sessionId,
      user_id: user.id,
      tenant_id: user.tenant_id,
      refresh_token_hash: refreshHash,
      ip_inet: ctx.ip,
      user_agent: ctx.userAgent,
      expires_at: expiresAt.toISOString(),
    })

    const accessToken = await signAccessToken({
      sub: user.id,
      tid: user.tenant_id ?? '',
      role: user.role as never,
      email: user.email,
    })

    await logAudit(db, {
      tenantId: user.tenant_id ?? undefined,
      actorUserId: user.id,
      action: 'user.login',
      ipInet: ctx.ip,
      userAgent: ctx.userAgent,
    })

    return {
      accessToken,
      refreshToken,
      mustChangePassword: user.must_change_password,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        tenantId: user.tenant_id,
        mfaEnabled: user.mfa_enabled,
      },
    }
  }),

  // ─── REFRESH ────────────────────────────────────────────────────────────────
  refresh: publicProcedure
    .input(z.object({ refreshToken: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb()

      let sessionId: string
      let userId: string
      try {
        const payload = await verifyRefreshToken(input.refreshToken)
        sessionId = payload.sid
        userId = payload.sub
      } catch {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Token inválido o expirado' })
      }

      const { createHash } = await import('crypto')
      const tokenHash = createHash('sha256').update(input.refreshToken).digest('hex')

      const { data: session } = await db
        .from('auth_sessions')
        .select('id, user_id, tenant_id, revoked_at, expires_at')
        .eq('id', sessionId)
        .eq('user_id', userId)
        .eq('refresh_token_hash', tokenHash)
        .maybeSingle()

      if (!session || session.revoked_at || new Date(session.expires_at) < new Date()) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Sesión inválida o revocada' })
      }

      const { data: user } = await db
        .from('users')
        .select('id, email, role, tenant_id, status')
        .eq('id', userId)
        .maybeSingle()

      if (!user || user.status !== 'active') {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Usuario inactivo' })
      }

      // Rotación: revocar token actual y emitir nuevo par
      const newSessionId = randomUUID()
      const newRefreshToken = await signRefreshToken(user.id, newSessionId)
      const newRefreshHash = createHash('sha256').update(newRefreshToken).digest('hex')

      await db
        .from('auth_sessions')
        .update({ revoked_at: new Date().toISOString() })
        .eq('id', sessionId)

      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      await db.from('auth_sessions').insert({
        id: newSessionId,
        user_id: user.id,
        tenant_id: session.tenant_id,
        refresh_token_hash: newRefreshHash,
        ip_inet: ctx.ip,
        user_agent: ctx.userAgent,
        expires_at: expiresAt.toISOString(),
      })

      const accessToken = await signAccessToken({
        sub: user.id,
        tid: session.tenant_id ?? '',
        role: user.role as never,
        email: user.email,
      })

      return { accessToken, refreshToken: newRefreshToken }
    }),

  // ─── LOGOUT ─────────────────────────────────────────────────────────────────
  logout: protectedProcedure
    .input(z.object({ refreshToken: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb()

      if (input.refreshToken) {
        const { createHash } = await import('crypto')
        const tokenHash = createHash('sha256').update(input.refreshToken).digest('hex')
        await db
          .from('auth_sessions')
          .update({ revoked_at: new Date().toISOString() })
          .eq('refresh_token_hash', tokenHash)
          .eq('user_id', ctx.user.sub)
      } else {
        // Revocar todas las sesiones del usuario
        await db
          .from('auth_sessions')
          .update({ revoked_at: new Date().toISOString() })
          .eq('user_id', ctx.user.sub)
          .is('revoked_at', null)
      }

      await logAudit(db, {
        tenantId: ctx.user.tid,
        actorUserId: ctx.user.sub,
        action: 'user.logout',
        ipInet: ctx.ip,
      })

      return { success: true }
    }),

  // ─── ME ─────────────────────────────────────────────────────────────────────
  me: protectedProcedure.query(async ({ ctx }) => {
    const db = ctx.db
    if (ctx.user.tid) await setTenantContext(db, ctx.user.tid, ctx.user.role)

    const { data: user } = await db
      .from('users')
      .select(
        'id, email, full_name, role, department, position, status, mfa_enabled, must_change_password, tenant_id',
      )
      .eq('id', ctx.user.sub)
      .single()

    if (!user) throw new TRPCError({ code: 'NOT_FOUND' })

    return user
  }),

  // ─── CAMBIAR CONTRASEÑA ──────────────────────────────────────────────────────
  changePassword: protectedProcedure
    .input(
      z.object({
        currentPassword: z.string(),
        newPassword: passwordSchema,
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const db = ctx.db

      const { data: user } = await db
        .from('users')
        .select('id, password_hash, tenant_id')
        .eq('id', ctx.user.sub)
        .single()

      if (!user) throw new TRPCError({ code: 'NOT_FOUND' })

      const valid = await verifyPassword(input.currentPassword, user.password_hash)
      if (!valid)
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Contraseña actual incorrecta' })

      const policyError = validatePasswordPolicy(input.newPassword)
      if (policyError) throw new TRPCError({ code: 'BAD_REQUEST', message: policyError })

      // Verificar historial
      const { data: history } = await db
        .from('password_history')
        .select('password_hash')
        .eq('user_id', ctx.user.sub)
        .order('created_at', { ascending: false })
        .limit(5)

      const hashes = (history ?? []).map((h) => h.password_hash)
      const inHistory = await isPasswordInHistory(input.newPassword, hashes)
      if (inHistory) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'No puedes reutilizar tus últimas 5 contraseñas',
        })
      }

      const newHash = await hashPassword(input.newPassword)

      await db
        .from('users')
        .update({
          password_hash: newHash,
          password_changed_at: new Date().toISOString(),
          must_change_password: false,
        })
        .eq('id', ctx.user.sub)

      await db.from('password_history').insert({
        user_id: ctx.user.sub,
        tenant_id: user.tenant_id,
        password_hash: newHash,
      })

      // Revocar todas las sesiones (excepto la actual) por seguridad
      await db
        .from('auth_sessions')
        .update({ revoked_at: new Date().toISOString() })
        .eq('user_id', ctx.user.sub)
        .is('revoked_at', null)

      await logAudit(db, {
        tenantId: ctx.user.tid,
        actorUserId: ctx.user.sub,
        action: 'user.password_changed',
        ipInet: ctx.ip,
      })

      return { success: true }
    }),

  // ─── SETUP MFA ───────────────────────────────────────────────────────────────
  setupMfa: protectedProcedure.mutation(async ({ ctx }) => {
    const db = ctx.db

    const { data: user } = await db
      .from('users')
      .select('email, mfa_enabled')
      .eq('id', ctx.user.sub)
      .single()

    if (!user) throw new TRPCError({ code: 'NOT_FOUND' })
    if (user.mfa_enabled) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'MFA ya está habilitado' })
    }

    const { secret, uri } = generateTotpSecret(user.email)
    const qrDataUrl = await generateQrDataUrl(uri)

    // Guardar secreto cifrado temporalmente (se confirma al verificar)
    const encrypted = encryptSecret(secret)
    await db.from('users').update({ mfa_secret_encrypted: encrypted }).eq('id', ctx.user.sub)

    return { secret, qrDataUrl }
  }),

  // ─── VERIFY MFA (activa MFA tras confirmar el código) ───────────────────────
  verifyMfa: protectedProcedure
    .input(z.object({ code: z.string().length(6) }))
    .mutation(async ({ input, ctx }) => {
      const db = ctx.db

      const { data: user } = await db
        .from('users')
        .select('mfa_secret_encrypted, mfa_enabled')
        .eq('id', ctx.user.sub)
        .single()

      if (!user || !user.mfa_secret_encrypted) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Ejecuta setupMfa primero' })
      }

      const secret = decryptSecret(Buffer.from(user.mfa_secret_encrypted))
      const valid = verifyTotp(secret, input.code)
      if (!valid) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Código inválido' })

      await db.from('users').update({ mfa_enabled: true }).eq('id', ctx.user.sub)

      await logAudit(db, {
        tenantId: ctx.user.tid,
        actorUserId: ctx.user.sub,
        action: 'user.mfa_enabled',
        ipInet: ctx.ip,
      })

      return { success: true }
    }),

  // ─── DISABLE MFA ─────────────────────────────────────────────────────────────
  disableMfa: protectedProcedure
    .input(z.object({ code: z.string().length(6) }))
    .mutation(async ({ input, ctx }) => {
      const db = ctx.db

      const { data: user } = await db
        .from('users')
        .select('mfa_secret_encrypted, mfa_enabled, role')
        .eq('id', ctx.user.sub)
        .single()

      if (!user?.mfa_enabled) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'MFA no está habilitado' })
      }

      // tenant_admin y platform_admin no pueden deshabilitar MFA
      if (user.role === ROLES.TENANT_ADMIN || user.role === ROLES.PLATFORM_ADMIN) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Los administradores no pueden deshabilitar MFA',
        })
      }

      const secret = decryptSecret(Buffer.from(user.mfa_secret_encrypted!))
      const valid = verifyTotp(secret, input.code)
      if (!valid) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Código inválido' })

      await db
        .from('users')
        .update({ mfa_enabled: false, mfa_secret_encrypted: null })
        .eq('id', ctx.user.sub)

      await logAudit(db, {
        tenantId: ctx.user.tid,
        actorUserId: ctx.user.sub,
        action: 'user.mfa_disabled',
        ipInet: ctx.ip,
      })

      return { success: true }
    }),
})
