module.exports = [
"[project]/apps/web/.next-internal/server/app/api/trpc/[trpc]/route/actions.js [app-rsc] (server actions loader, ecmascript)", ((__turbopack_context__, module, exports) => {

}),
"[externals]/next/dist/compiled/next-server/app-route-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-route-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/next-server/app-page-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-page-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-unit-async-storage.external.js [external] (next/dist/server/app-render/work-unit-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-unit-async-storage.external.js", () => require("next/dist/server/app-render/work-unit-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-async-storage.external.js [external] (next/dist/server/app-render/work-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-async-storage.external.js", () => require("next/dist/server/app-render/work-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/shared/lib/no-fallback-error.external.js [external] (next/dist/shared/lib/no-fallback-error.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/shared/lib/no-fallback-error.external.js", () => require("next/dist/shared/lib/no-fallback-error.external.js"));

module.exports = mod;
}),
"[project]/apps/web/src/server/trpc.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "adminProcedure",
    ()=>adminProcedure,
    "managerProcedure",
    ()=>managerProcedure,
    "platformAdminProcedure",
    ()=>platformAdminProcedure,
    "protectedProcedure",
    ()=>protectedProcedure,
    "publicProcedure",
    ()=>publicProcedure,
    "requireRole",
    ()=>requireRole,
    "router",
    ()=>router,
    "tenantAdminProcedure",
    ()=>tenantAdminProcedure
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$trpc$2b$server$40$11$2e$17$2e$0_typescript$40$5$2e$9$2e$3$2f$node_modules$2f40$trpc$2f$server$2f$dist$2f$initTRPC$2d$BRf4imah$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/@trpc+server@11.17.0_typescript@5.9.3/node_modules/@trpc/server/dist/initTRPC-BRf4imah.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$trpc$2b$server$40$11$2e$17$2e$0_typescript$40$5$2e$9$2e$3$2f$node_modules$2f40$trpc$2f$server$2f$dist$2f$tracked$2d$DWInO6EQ$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/@trpc+server@11.17.0_typescript@5.9.3/node_modules/@trpc/server/dist/tracked-DWInO6EQ.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$ZodError$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/ZodError.js [app-route] (ecmascript)");
;
;
const t = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$trpc$2b$server$40$11$2e$17$2e$0_typescript$40$5$2e$9$2e$3$2f$node_modules$2f40$trpc$2f$server$2f$dist$2f$initTRPC$2d$BRf4imah$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["initTRPC"].context().create({
    errorFormatter ({ shape, error }) {
        return {
            ...shape,
            data: {
                ...shape.data,
                zodError: error.cause instanceof __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$ZodError$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ZodError"] ? error.cause.flatten() : null
            }
        };
    }
});
const router = t.router;
const publicProcedure = t.procedure;
// Middleware: requiere JWT válido
const enforceAuth = t.middleware(({ ctx, next })=>{
    if (!ctx.user) {
        throw new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$trpc$2b$server$40$11$2e$17$2e$0_typescript$40$5$2e$9$2e$3$2f$node_modules$2f40$trpc$2f$server$2f$dist$2f$tracked$2d$DWInO6EQ$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["TRPCError"]({
            code: 'UNAUTHORIZED',
            message: 'Sesión requerida'
        });
    }
    return next({
        ctx: {
            ...ctx,
            user: ctx.user
        }
    });
});
const protectedProcedure = t.procedure.use(enforceAuth);
function requireRole(...roles) {
    return t.middleware(({ ctx, next })=>{
        if (!ctx.user || !roles.includes(ctx.user.role)) {
            throw new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$trpc$2b$server$40$11$2e$17$2e$0_typescript$40$5$2e$9$2e$3$2f$node_modules$2f40$trpc$2f$server$2f$dist$2f$tracked$2d$DWInO6EQ$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["TRPCError"]({
                code: 'FORBIDDEN',
                message: 'Sin permisos suficientes'
            });
        }
        return next({
            ctx: {
                ...ctx,
                user: ctx.user
            }
        });
    });
}
const adminProcedure = t.procedure.use(enforceAuth).use(requireRole('tenant_admin', 'manager'));
const platformAdminProcedure = t.procedure.use(enforceAuth).use(requireRole('platform_admin'));
const tenantAdminProcedure = t.procedure.use(enforceAuth).use(requireRole('tenant_admin'));
const managerProcedure = t.procedure.use(enforceAuth).use(requireRole('tenant_admin', 'manager'));
}),
"[externals]/node:buffer [external] (node:buffer, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("node:buffer", () => require("node:buffer"));

module.exports = mod;
}),
"[externals]/node:crypto [external] (node:crypto, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("node:crypto", () => require("node:crypto"));

module.exports = mod;
}),
"[externals]/node:util [external] (node:util, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("node:util", () => require("node:util"));

module.exports = mod;
}),
"[project]/packages/shared/src/schemas.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "agentBatchSchema",
    ()=>agentBatchSchema,
    "emailSchema",
    ()=>emailSchema,
    "loginSchema",
    ()=>loginSchema,
    "passwordSchema",
    ()=>passwordSchema,
    "signupTenantSchema",
    ()=>signupTenantSchema
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/external.js [app-route] (ecmascript) <export * as z>");
;
const emailSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().email().toLowerCase();
const passwordSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().min(12, 'Mínimo 12 caracteres').regex(/[A-Z]/, 'Debe contener al menos una mayúscula').regex(/[a-z]/, 'Debe contener al menos una minúscula').regex(/[0-9]/, 'Debe contener al menos un número').regex(/[^A-Za-z0-9]/, 'Debe contener al menos un carácter especial');
const loginSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    email: emailSchema,
    password: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().min(1),
    mfa_code: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().length(6).optional()
});
const signupTenantSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    legal_name: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().min(2).max(200),
    trade_name: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().max(200).optional(),
    nit: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().regex(/^\d{9,10}-\d$/, 'NIT inválido (formato: 123456789-0)'),
    contact_email: emailSchema,
    contact_phone: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().max(20).optional(),
    timezone: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().default('America/Bogota'),
    admin_full_name: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().min(2).max(200),
    admin_password: passwordSchema
});
const agentBatchSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    batch_id: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().uuid(),
    events: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].array(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
        event_type: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].enum([
            'app_focus',
            'domain_visit',
            'idle_start',
            'idle_end',
            'pause',
            'resume'
        ]),
        app_identifier: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().max(255).optional(),
        domain: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().max(255).optional(),
        window_title: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().max(500).optional(),
        productivity: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].enum([
            'productive',
            'neutral',
            'non_productive'
        ]).optional(),
        started_at: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().datetime(),
        duration_seconds: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().int().min(0).max(86400),
        metadata: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].record(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].unknown()).optional()
    })).max(1000),
    session_state: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
        session_id: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().uuid().optional(),
        started_at: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().datetime(),
        ip: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().optional(),
        is_active: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].boolean(),
        active_seconds: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().int().min(0),
        idle_seconds: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().int().min(0)
    })
});
}),
"[project]/packages/shared/src/constants.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "AGENT_BATCH_INTERVAL_SECONDS",
    ()=>AGENT_BATCH_INTERVAL_SECONDS,
    "APP_NAME",
    ()=>APP_NAME,
    "APP_VERSION",
    ()=>APP_VERSION,
    "DISCONNECTION_GRACE_MINUTES",
    ()=>DISCONNECTION_GRACE_MINUTES,
    "EVENT_TYPES",
    ()=>EVENT_TYPES,
    "IDLE_THRESHOLD_MINUTES",
    ()=>IDLE_THRESHOLD_MINUTES,
    "JWT_EXPIRY_SECONDS",
    ()=>JWT_EXPIRY_SECONDS,
    "LICENSE_STATUS",
    ()=>LICENSE_STATUS,
    "LOCKOUT_MINUTES",
    ()=>LOCKOUT_MINUTES,
    "MAX_FAILED_LOGIN_ATTEMPTS",
    ()=>MAX_FAILED_LOGIN_ATTEMPTS,
    "PASSWORD_HISTORY_COUNT",
    ()=>PASSWORD_HISTORY_COUNT,
    "PASSWORD_MAX_AGE_DAYS",
    ()=>PASSWORD_MAX_AGE_DAYS,
    "PLANS",
    ()=>PLANS,
    "PRODUCTIVITY",
    ()=>PRODUCTIVITY,
    "REFRESH_TOKEN_EXPIRY_DAYS",
    ()=>REFRESH_TOKEN_EXPIRY_DAYS,
    "ROLES",
    ()=>ROLES
]);
const APP_NAME = 'BCWork';
const APP_VERSION = '0.1.0';
const ROLES = {
    PLATFORM_ADMIN: 'platform_admin',
    TENANT_ADMIN: 'tenant_admin',
    MANAGER: 'manager',
    EMPLOYEE: 'employee'
};
const LICENSE_STATUS = {
    TRIAL: 'trial',
    ACTIVE: 'active',
    PAST_DUE: 'past_due',
    SUSPENDED: 'suspended',
    CANCELLED: 'cancelled'
};
const PRODUCTIVITY = {
    PRODUCTIVE: 'productive',
    NEUTRAL: 'neutral',
    NON_PRODUCTIVE: 'non_productive'
};
const EVENT_TYPES = {
    APP_FOCUS: 'app_focus',
    DOMAIN_VISIT: 'domain_visit',
    IDLE_START: 'idle_start',
    IDLE_END: 'idle_end',
    PAUSE: 'pause',
    RESUME: 'resume'
};
const PLANS = {
    BASIC: 'basic',
    PRO: 'pro',
    ENTERPRISE: 'enterprise'
};
const DISCONNECTION_GRACE_MINUTES = 15;
const IDLE_THRESHOLD_MINUTES = 5;
const AGENT_BATCH_INTERVAL_SECONDS = 300 // 5 min
;
const JWT_EXPIRY_SECONDS = 15 * 60 // 15 min
;
const REFRESH_TOKEN_EXPIRY_DAYS = 7;
const MAX_FAILED_LOGIN_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;
const PASSWORD_HISTORY_COUNT = 5;
const PASSWORD_MAX_AGE_DAYS = 90;
}),
"[project]/packages/shared/src/types.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "err",
    ()=>err,
    "ok",
    ()=>ok
]);
function ok(value) {
    return {
        ok: true,
        value
    };
}
function err(error) {
    return {
        ok: false,
        error
    };
}
}),
"[project]/packages/shared/src/index.ts [app-route] (ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([]);
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$shared$2f$src$2f$schemas$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/shared/src/schemas.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$shared$2f$src$2f$constants$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/shared/src/constants.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$shared$2f$src$2f$types$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/shared/src/types.ts [app-route] (ecmascript)");
;
;
;
}),
"[project]/apps/web/src/lib/auth/jwt.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "signAccessToken",
    ()=>signAccessToken,
    "signRefreshToken",
    ()=>signRefreshToken,
    "verifyAccessToken",
    ()=>verifyAccessToken,
    "verifyRefreshToken",
    ()=>verifyRefreshToken
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$jose$40$5$2e$10$2e$0$2f$node_modules$2f$jose$2f$dist$2f$node$2f$esm$2f$jwt$2f$sign$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/jose@5.10.0/node_modules/jose/dist/node/esm/jwt/sign.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$jose$40$5$2e$10$2e$0$2f$node_modules$2f$jose$2f$dist$2f$node$2f$esm$2f$jwt$2f$verify$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/jose@5.10.0/node_modules/jose/dist/node/esm/jwt/verify.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$shared$2f$src$2f$index$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/packages/shared/src/index.ts [app-route] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$shared$2f$src$2f$constants$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/shared/src/constants.ts [app-route] (ecmascript)");
;
;
function getSecret(key) {
    const secret = process.env[key];
    if (!secret) throw new Error(`Missing env var: ${key}`);
    return new TextEncoder().encode(secret);
}
async function signAccessToken(payload) {
    return new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$jose$40$5$2e$10$2e$0$2f$node_modules$2f$jose$2f$dist$2f$node$2f$esm$2f$jwt$2f$sign$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["SignJWT"](payload).setProtectedHeader({
        alg: 'HS256'
    }).setIssuedAt().setExpirationTime(`${__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$shared$2f$src$2f$constants$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["JWT_EXPIRY_SECONDS"]}s`).sign(getSecret('JWT_SECRET'));
}
async function signRefreshToken(userId, sessionId) {
    return new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$jose$40$5$2e$10$2e$0$2f$node_modules$2f$jose$2f$dist$2f$node$2f$esm$2f$jwt$2f$sign$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["SignJWT"]({
        sub: userId,
        sid: sessionId,
        type: 'refresh'
    }).setProtectedHeader({
        alg: 'HS256'
    }).setIssuedAt().setExpirationTime(`${__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$shared$2f$src$2f$constants$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["REFRESH_TOKEN_EXPIRY_DAYS"]}d`).sign(getSecret('JWT_REFRESH_SECRET'));
}
async function verifyAccessToken(token) {
    const { payload } = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$jose$40$5$2e$10$2e$0$2f$node_modules$2f$jose$2f$dist$2f$node$2f$esm$2f$jwt$2f$verify$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["jwtVerify"])(token, getSecret('JWT_SECRET'));
    return payload;
}
async function verifyRefreshToken(token) {
    const { payload } = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$jose$40$5$2e$10$2e$0$2f$node_modules$2f$jose$2f$dist$2f$node$2f$esm$2f$jwt$2f$verify$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["jwtVerify"])(token, getSecret('JWT_REFRESH_SECRET'));
    if (payload['type'] !== 'refresh') throw new Error('Invalid token type');
    return {
        sub: payload.sub,
        sid: payload['sid']
    };
}
}),
"[externals]/crypto [external] (crypto, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("crypto", () => require("crypto"));

module.exports = mod;
}),
"[project]/apps/web/src/lib/auth/password.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "generateRandomPassword",
    ()=>generateRandomPassword,
    "hashPassword",
    ()=>hashPassword,
    "isPasswordInHistory",
    ()=>isPasswordInHistory,
    "validatePasswordPolicy",
    ()=>validatePasswordPolicy,
    "verifyPassword",
    ()=>verifyPassword
]);
var __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/crypto [external] (crypto, cjs)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$bcryptjs$40$2$2e$4$2e$3$2f$node_modules$2f$bcryptjs$2f$index$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/bcryptjs@2.4.3/node_modules/bcryptjs/index.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$shared$2f$src$2f$index$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/packages/shared/src/index.ts [app-route] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$shared$2f$src$2f$constants$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/shared/src/constants.ts [app-route] (ecmascript)");
;
;
;
const BCRYPT_COST = 12;
async function hashPassword(plain) {
    return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$bcryptjs$40$2$2e$4$2e$3$2f$node_modules$2f$bcryptjs$2f$index$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["default"].hash(plain, BCRYPT_COST);
}
async function verifyPassword(plain, hash) {
    return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$bcryptjs$40$2$2e$4$2e$3$2f$node_modules$2f$bcryptjs$2f$index$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["default"].compare(plain, hash);
}
async function isPasswordInHistory(plain, hashes) {
    const recent = hashes.slice(0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$shared$2f$src$2f$constants$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["PASSWORD_HISTORY_COUNT"]);
    const checks = await Promise.all(recent.map((h)=>__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$bcryptjs$40$2$2e$4$2e$3$2f$node_modules$2f$bcryptjs$2f$index$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["default"].compare(plain, h)));
    return checks.some(Boolean);
}
function generateRandomPassword() {
    const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lower = 'abcdefghijklmnopqrstuvwxyz';
    const digits = '0123456789';
    const symbols = '!@#$&*';
    const all = upper + lower + digits + symbols;
    const bytes = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__["randomBytes"])(16);
    const chars = [
        upper[bytes[0] % upper.length],
        lower[bytes[1] % lower.length],
        digits[bytes[2] % digits.length],
        symbols[bytes[3] % symbols.length],
        ...Array.from({
            length: 8
        }, (_, i)=>all[bytes[i + 4] % all.length])
    ];
    const shuffle = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__["randomBytes"])(12);
    for(let i = chars.length - 1; i > 0; i--){
        const j = shuffle[i] % (i + 1);
        const tmp = chars[i];
        chars[i] = chars[j];
        chars[j] = tmp;
    }
    return chars.join('');
}
function validatePasswordPolicy(password) {
    if (password.length < 12) return 'Mínimo 12 caracteres';
    if (!/[A-Z]/.test(password)) return 'Debe contener al menos una mayúscula';
    if (!/[a-z]/.test(password)) return 'Debe contener al menos una minúscula';
    if (!/[0-9]/.test(password)) return 'Debe contener al menos un número';
    if (!/[^A-Za-z0-9]/.test(password)) return 'Debe contener al menos un carácter especial';
    return null;
}
}),
"[externals]/fs [external] (fs, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("fs", () => require("fs"));

module.exports = mod;
}),
"[externals]/util [external] (util, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("util", () => require("util"));

module.exports = mod;
}),
"[externals]/stream [external] (stream, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("stream", () => require("stream"));

module.exports = mod;
}),
"[externals]/zlib [external] (zlib, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("zlib", () => require("zlib"));

module.exports = mod;
}),
"[externals]/assert [external] (assert, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("assert", () => require("assert"));

module.exports = mod;
}),
"[externals]/buffer [external] (buffer, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("buffer", () => require("buffer"));

module.exports = mod;
}),
"[project]/apps/web/src/lib/auth/mfa.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "decryptSecret",
    ()=>decryptSecret,
    "encryptSecret",
    ()=>encryptSecret,
    "generateQrDataUrl",
    ()=>generateQrDataUrl,
    "generateTotpSecret",
    ()=>generateTotpSecret,
    "verifyTotp",
    ()=>verifyTotp
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$otpauth$40$9$2e$5$2e$1$2f$node_modules$2f$otpauth$2f$dist$2f$otpauth$2e$node$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/otpauth@9.5.1/node_modules/otpauth/dist/otpauth.node.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$qrcode$40$1$2e$5$2e$4$2f$node_modules$2f$qrcode$2f$lib$2f$index$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/qrcode@1.5.4/node_modules/qrcode/lib/index.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/crypto [external] (crypto, cjs)");
;
;
;
const ALGORITHM = 'aes-256-gcm';
function getEncryptionKey() {
    const hex = process.env.PII_ENCRYPTION_KEY;
    if (!hex || hex.length !== 64) throw new Error('PII_ENCRYPTION_KEY must be 32 bytes hex');
    return Buffer.from(hex, 'hex');
}
function encryptSecret(plain) {
    const key = getEncryptionKey();
    const iv = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__["randomBytes"])(12);
    const cipher = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__["createCipheriv"])(ALGORITHM, key, iv);
    const encrypted = Buffer.concat([
        cipher.update(plain, 'utf8'),
        cipher.final()
    ]);
    const tag = cipher.getAuthTag();
    // Layout: iv(12) + tag(16) + ciphertext
    return Buffer.concat([
        iv,
        tag,
        encrypted
    ]);
}
function decryptSecret(buf) {
    const key = getEncryptionKey();
    const iv = buf.subarray(0, 12);
    const tag = buf.subarray(12, 28);
    const ciphertext = buf.subarray(28);
    const decipher = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__["createDecipheriv"])(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    return decipher.update(ciphertext) + decipher.final('utf8');
}
function generateTotpSecret(userEmail) {
    const totp = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$otpauth$40$9$2e$5$2e$1$2f$node_modules$2f$otpauth$2f$dist$2f$otpauth$2e$node$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["TOTP"]({
        issuer: 'BCWork',
        label: userEmail,
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret: new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$otpauth$40$9$2e$5$2e$1$2f$node_modules$2f$otpauth$2f$dist$2f$otpauth$2e$node$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["Secret"]({
            size: 20
        })
    });
    return {
        secret: totp.secret.base32,
        uri: totp.toString()
    };
}
function verifyTotp(secret, token) {
    const totp = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$otpauth$40$9$2e$5$2e$1$2f$node_modules$2f$otpauth$2f$dist$2f$otpauth$2e$node$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["TOTP"]({
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$otpauth$40$9$2e$5$2e$1$2f$node_modules$2f$otpauth$2f$dist$2f$otpauth$2e$node$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["Secret"].fromBase32(secret)
    });
    const delta = totp.validate({
        token,
        window: 1
    });
    return delta !== null;
}
async function generateQrDataUrl(uri) {
    return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$qrcode$40$1$2e$5$2e$4$2f$node_modules$2f$qrcode$2f$lib$2f$index$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["default"].toDataURL(uri);
}
}),
"[project]/apps/web/src/lib/auth/audit.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "logAudit",
    ()=>logAudit
]);
async function logAudit(db, entry) {
    // Fire-and-forget: los errores de auditoría no deben romper el flujo principal
    db.from('audit_logs').insert({
        tenant_id: entry.tenantId ?? null,
        actor_user_id: entry.actorUserId ?? null,
        action: entry.action,
        entity_type: entry.entityType ?? null,
        entity_id: entry.entityId ?? null,
        ip_inet: entry.ipInet ?? null,
        user_agent: entry.userAgent ?? null,
        before_state: entry.before ?? null,
        after_state: entry.after ?? null
    }).then(({ error })=>{
        if (error) console.error('[audit] failed to log:', entry.action, error.message);
    });
}
}),
"[project]/apps/web/src/lib/db.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "getDb",
    ()=>getDb,
    "setTenantContext",
    ()=>setTenantContext
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$supabase$2b$supabase$2d$js$40$2$2e$105$2e$1$2f$node_modules$2f40$supabase$2f$supabase$2d$js$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/@supabase+supabase-js@2.105.1/node_modules/@supabase/supabase-js/dist/index.mjs [app-route] (ecmascript) <locals>");
;
function getDb() {
    const url = ("TURBOPACK compile-time value", "https://arixdgwvqiijllkrnihm.supabase.co");
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
        throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    }
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$supabase$2b$supabase$2d$js$40$2$2e$105$2e$1$2f$node_modules$2f40$supabase$2f$supabase$2d$js$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__["createClient"])(url, key, {
        auth: {
            persistSession: false,
            autoRefreshToken: false
        }
    });
}
async function setTenantContext(db, tenantId, role) {
    await db.rpc('set_tenant_context', {
        p_tenant: tenantId,
        p_role: role
    });
}
}),
"[project]/apps/web/src/server/routers/auth.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "authRouter",
    ()=>authRouter
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/external.js [app-route] (ecmascript) <export * as z>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$trpc$2b$server$40$11$2e$17$2e$0_typescript$40$5$2e$9$2e$3$2f$node_modules$2f40$trpc$2f$server$2f$dist$2f$tracked$2d$DWInO6EQ$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/@trpc+server@11.17.0_typescript@5.9.3/node_modules/@trpc/server/dist/tracked-DWInO6EQ.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$server$2f$trpc$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/src/server/trpc.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$lib$2f$auth$2f$jwt$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/src/lib/auth/jwt.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$lib$2f$auth$2f$password$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/src/lib/auth/password.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$lib$2f$auth$2f$mfa$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/src/lib/auth/mfa.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$lib$2f$auth$2f$audit$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/src/lib/auth/audit.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/src/lib/db.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$shared$2f$src$2f$index$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/packages/shared/src/index.ts [app-route] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$shared$2f$src$2f$schemas$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/shared/src/schemas.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$shared$2f$src$2f$constants$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/shared/src/constants.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/crypto [external] (crypto, cjs)");
;
;
;
;
;
;
;
;
;
;
// Helper: verifica si la cuenta está bloqueada
function isLocked(lockedUntil) {
    if (!lockedUntil) return false;
    return new Date(lockedUntil) > new Date();
}
const authRouter = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$server$2f$trpc$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["router"])({
    // ─── SIGNUP TENANT ─────────────────────────────────────────────────────────
    signupTenant: __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$server$2f$trpc$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["publicProcedure"].input(__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$shared$2f$src$2f$schemas$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["signupTenantSchema"]).mutation(async ({ input, ctx })=>{
        const db = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getDb"])();
        // Verificar email no duplicado
        const { data: existing } = await db.from('users').select('id').eq('email', input.contact_email).is('tenant_id', null).maybeSingle();
        if (existing) {
            throw new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$trpc$2b$server$40$11$2e$17$2e$0_typescript$40$5$2e$9$2e$3$2f$node_modules$2f40$trpc$2f$server$2f$dist$2f$tracked$2d$DWInO6EQ$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["TRPCError"]({
                code: 'CONFLICT',
                message: 'Email ya registrado'
            });
        }
        // Validar política de contraseña
        const policyError = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$lib$2f$auth$2f$password$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["validatePasswordPolicy"])(input.admin_password);
        if (policyError) throw new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$trpc$2b$server$40$11$2e$17$2e$0_typescript$40$5$2e$9$2e$3$2f$node_modules$2f40$trpc$2f$server$2f$dist$2f$tracked$2d$DWInO6EQ$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["TRPCError"]({
            code: 'BAD_REQUEST',
            message: policyError
        });
        // Obtener plan Pro por defecto para trial
        const { data: plan } = await db.from('plans').select('id').eq('code', 'pro').single();
        if (!plan) throw new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$trpc$2b$server$40$11$2e$17$2e$0_typescript$40$5$2e$9$2e$3$2f$node_modules$2f40$trpc$2f$server$2f$dist$2f$tracked$2d$DWInO6EQ$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["TRPCError"]({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Plan no encontrado'
        });
        const passwordHash = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$lib$2f$auth$2f$password$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["hashPassword"])(input.admin_password);
        // Crear tenant
        const { data: tenant, error: tenantError } = await db.from('tenants').insert({
            legal_name: input.legal_name,
            trade_name: input.trade_name ?? null,
            nit: input.nit,
            timezone: input.timezone,
            contact_email: input.contact_email,
            contact_phone: input.contact_phone ?? null,
            status: 'trial'
        }).select('id').single();
        if (tenantError) {
            if (tenantError.code === '23505') {
                throw new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$trpc$2b$server$40$11$2e$17$2e$0_typescript$40$5$2e$9$2e$3$2f$node_modules$2f40$trpc$2f$server$2f$dist$2f$tracked$2d$DWInO6EQ$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["TRPCError"]({
                    code: 'CONFLICT',
                    message: 'NIT ya registrado'
                });
            }
            throw new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$trpc$2b$server$40$11$2e$17$2e$0_typescript$40$5$2e$9$2e$3$2f$node_modules$2f40$trpc$2f$server$2f$dist$2f$tracked$2d$DWInO6EQ$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["TRPCError"]({
                code: 'INTERNAL_SERVER_ERROR',
                message: tenantError.message
            });
        }
        // Crear licencia trial (14 días, 10 seats)
        const trialEnd = new Date();
        trialEnd.setDate(trialEnd.getDate() + 14);
        await db.from('licenses').insert({
            tenant_id: tenant.id,
            plan_id: plan.id,
            seats_total: 10,
            status: 'trial',
            starts_at: new Date().toISOString(),
            ends_at: trialEnd.toISOString(),
            trial_ends_at: trialEnd.toISOString()
        });
        // Crear usuario admin
        const { data: user, error: userError } = await db.from('users').insert({
            tenant_id: tenant.id,
            email: input.contact_email,
            password_hash: passwordHash,
            full_name: input.admin_full_name,
            role: __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$shared$2f$src$2f$constants$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ROLES"].TENANT_ADMIN,
            status: 'active'
        }).select('id').single();
        if (userError) {
            throw new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$trpc$2b$server$40$11$2e$17$2e$0_typescript$40$5$2e$9$2e$3$2f$node_modules$2f40$trpc$2f$server$2f$dist$2f$tracked$2d$DWInO6EQ$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["TRPCError"]({
                code: 'INTERNAL_SERVER_ERROR',
                message: userError.message
            });
        }
        // Guardar primer hash en historial
        await db.from('password_history').insert({
            user_id: user.id,
            tenant_id: tenant.id,
            password_hash: passwordHash
        });
        // Consentimiento básico automático (el admin acepta los términos durante signup)
        await db.from('consents').insert({
            tenant_id: tenant.id,
            user_id: user.id,
            policy_version: '1.0',
            consent_type: 'data_processing',
            granted: true,
            ip_inet: ctx.ip,
            user_agent: ctx.userAgent
        });
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$lib$2f$auth$2f$audit$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["logAudit"])(db, {
            tenantId: tenant.id,
            actorUserId: user.id,
            action: 'tenant.created',
            entityType: 'tenant',
            entityId: tenant.id,
            ipInet: ctx.ip,
            userAgent: ctx.userAgent
        });
        return {
            success: true,
            tenantId: tenant.id
        };
    }),
    // ─── LOGIN ──────────────────────────────────────────────────────────────────
    login: __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$server$2f$trpc$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["publicProcedure"].input(__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$shared$2f$src$2f$schemas$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["loginSchema"]).mutation(async ({ input, ctx })=>{
        const db = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getDb"])();
        // Buscar usuario por email (sin RLS — no hay contexto aún)
        const { data: user } = await db.from('users').select('id, tenant_id, email, password_hash, role, status, failed_login_attempts, locked_until, mfa_enabled, mfa_secret_encrypted, must_change_password, password_changed_at').eq('email', input.email.toLowerCase()).maybeSingle();
        // Respuesta genérica para no filtrar si el email existe
        if (!user || user.status === 'deleted') {
            throw new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$trpc$2b$server$40$11$2e$17$2e$0_typescript$40$5$2e$9$2e$3$2f$node_modules$2f40$trpc$2f$server$2f$dist$2f$tracked$2d$DWInO6EQ$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["TRPCError"]({
                code: 'UNAUTHORIZED',
                message: 'Credenciales inválidas'
            });
        }
        if (user.status === 'disabled') {
            throw new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$trpc$2b$server$40$11$2e$17$2e$0_typescript$40$5$2e$9$2e$3$2f$node_modules$2f40$trpc$2f$server$2f$dist$2f$tracked$2d$DWInO6EQ$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["TRPCError"]({
                code: 'FORBIDDEN',
                message: 'Cuenta deshabilitada. Contacta a tu administrador.'
            });
        }
        if (isLocked(user.locked_until)) {
            const minutes = Math.ceil((new Date(user.locked_until).getTime() - Date.now()) / 60000);
            throw new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$trpc$2b$server$40$11$2e$17$2e$0_typescript$40$5$2e$9$2e$3$2f$node_modules$2f40$trpc$2f$server$2f$dist$2f$tracked$2d$DWInO6EQ$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["TRPCError"]({
                code: 'FORBIDDEN',
                message: `Cuenta bloqueada por ${minutes} minuto(s). Intenta más tarde.`
            });
        }
        const valid = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$lib$2f$auth$2f$password$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["verifyPassword"])(input.password, user.password_hash);
        if (!valid) {
            const attempts = (user.failed_login_attempts ?? 0) + 1;
            const updates = {
                failed_login_attempts: attempts
            };
            if (attempts >= __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$shared$2f$src$2f$constants$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["MAX_FAILED_LOGIN_ATTEMPTS"]) {
                const lockUntil = new Date(Date.now() + __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$shared$2f$src$2f$constants$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["LOCKOUT_MINUTES"] * 60 * 1000);
                updates['locked_until'] = lockUntil.toISOString();
                updates['failed_login_attempts'] = 0;
                await (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$lib$2f$auth$2f$audit$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["logAudit"])(db, {
                    tenantId: user.tenant_id ?? undefined,
                    actorUserId: user.id,
                    action: 'user.locked',
                    ipInet: ctx.ip,
                    userAgent: ctx.userAgent
                });
            }
            await db.from('users').update(updates).eq('id', user.id);
            await (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$lib$2f$auth$2f$audit$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["logAudit"])(db, {
                tenantId: user.tenant_id ?? undefined,
                actorUserId: user.id,
                action: 'user.login_failed',
                ipInet: ctx.ip,
                userAgent: ctx.userAgent,
                after: {
                    attempts
                }
            });
            throw new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$trpc$2b$server$40$11$2e$17$2e$0_typescript$40$5$2e$9$2e$3$2f$node_modules$2f40$trpc$2f$server$2f$dist$2f$tracked$2d$DWInO6EQ$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["TRPCError"]({
                code: 'UNAUTHORIZED',
                message: 'Credenciales inválidas'
            });
        }
        // Verificar MFA si está habilitado
        if (user.mfa_enabled) {
            if (!input.mfa_code) {
                throw new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$trpc$2b$server$40$11$2e$17$2e$0_typescript$40$5$2e$9$2e$3$2f$node_modules$2f40$trpc$2f$server$2f$dist$2f$tracked$2d$DWInO6EQ$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["TRPCError"]({
                    code: 'PRECONDITION_FAILED',
                    message: 'Código MFA requerido'
                });
            }
            if (!user.mfa_secret_encrypted) {
                throw new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$trpc$2b$server$40$11$2e$17$2e$0_typescript$40$5$2e$9$2e$3$2f$node_modules$2f40$trpc$2f$server$2f$dist$2f$tracked$2d$DWInO6EQ$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["TRPCError"]({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'MFA mal configurado'
                });
            }
            const secret = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$lib$2f$auth$2f$mfa$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["decryptSecret"])(Buffer.from(user.mfa_secret_encrypted));
            const validMfa = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$lib$2f$auth$2f$mfa$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["verifyTotp"])(secret, input.mfa_code);
            if (!validMfa) {
                throw new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$trpc$2b$server$40$11$2e$17$2e$0_typescript$40$5$2e$9$2e$3$2f$node_modules$2f40$trpc$2f$server$2f$dist$2f$tracked$2d$DWInO6EQ$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["TRPCError"]({
                    code: 'UNAUTHORIZED',
                    message: 'Código MFA inválido'
                });
            }
        }
        // Verificar caducidad de contraseña para admins
        if ((user.role === __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$shared$2f$src$2f$constants$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ROLES"].TENANT_ADMIN || user.role === __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$shared$2f$src$2f$constants$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ROLES"].PLATFORM_ADMIN) && user.password_changed_at) {
            const daysSinceChange = (Date.now() - new Date(user.password_changed_at).getTime()) / 86400000;
            if (daysSinceChange > __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$shared$2f$src$2f$constants$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["PASSWORD_MAX_AGE_DAYS"]) {
                // No bloquear — pero marcar para forzar cambio
                await db.from('users').update({
                    must_change_password: true
                }).eq('id', user.id);
            }
        }
        // Reset intentos fallidos
        await db.from('users').update({
            failed_login_attempts: 0,
            locked_until: null,
            last_login_at: new Date().toISOString()
        }).eq('id', user.id);
        // Crear sesión con refresh token
        const sessionId = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__["randomUUID"])();
        const refreshToken = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$lib$2f$auth$2f$jwt$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["signRefreshToken"])(user.id, sessionId);
        // Guardar hash del refresh token
        const { createHash } = await __turbopack_context__.A("[externals]/crypto [external] (crypto, cjs, async loader)");
        const refreshHash = createHash('sha256').update(refreshToken).digest('hex');
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        await db.from('auth_sessions').insert({
            id: sessionId,
            user_id: user.id,
            tenant_id: user.tenant_id,
            refresh_token_hash: refreshHash,
            ip_inet: ctx.ip,
            user_agent: ctx.userAgent,
            expires_at: expiresAt.toISOString()
        });
        const accessToken = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$lib$2f$auth$2f$jwt$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["signAccessToken"])({
            sub: user.id,
            tid: user.tenant_id ?? '',
            role: user.role,
            email: user.email
        });
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$lib$2f$auth$2f$audit$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["logAudit"])(db, {
            tenantId: user.tenant_id ?? undefined,
            actorUserId: user.id,
            action: 'user.login',
            ipInet: ctx.ip,
            userAgent: ctx.userAgent
        });
        return {
            accessToken,
            refreshToken,
            mustChangePassword: user.must_change_password,
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
                tenantId: user.tenant_id,
                mfaEnabled: user.mfa_enabled
            }
        };
    }),
    // ─── REFRESH ────────────────────────────────────────────────────────────────
    refresh: __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$server$2f$trpc$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["publicProcedure"].input(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
        refreshToken: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string()
    })).mutation(async ({ input, ctx })=>{
        const db = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getDb"])();
        let sessionId;
        let userId;
        try {
            const payload = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$lib$2f$auth$2f$jwt$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["verifyRefreshToken"])(input.refreshToken);
            sessionId = payload.sid;
            userId = payload.sub;
        } catch  {
            throw new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$trpc$2b$server$40$11$2e$17$2e$0_typescript$40$5$2e$9$2e$3$2f$node_modules$2f40$trpc$2f$server$2f$dist$2f$tracked$2d$DWInO6EQ$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["TRPCError"]({
                code: 'UNAUTHORIZED',
                message: 'Token inválido o expirado'
            });
        }
        const { createHash } = await __turbopack_context__.A("[externals]/crypto [external] (crypto, cjs, async loader)");
        const tokenHash = createHash('sha256').update(input.refreshToken).digest('hex');
        const { data: session } = await db.from('auth_sessions').select('id, user_id, tenant_id, revoked_at, expires_at').eq('id', sessionId).eq('user_id', userId).eq('refresh_token_hash', tokenHash).maybeSingle();
        if (!session || session.revoked_at || new Date(session.expires_at) < new Date()) {
            throw new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$trpc$2b$server$40$11$2e$17$2e$0_typescript$40$5$2e$9$2e$3$2f$node_modules$2f40$trpc$2f$server$2f$dist$2f$tracked$2d$DWInO6EQ$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["TRPCError"]({
                code: 'UNAUTHORIZED',
                message: 'Sesión inválida o revocada'
            });
        }
        const { data: user } = await db.from('users').select('id, email, role, tenant_id, status').eq('id', userId).maybeSingle();
        if (!user || user.status !== 'active') {
            throw new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$trpc$2b$server$40$11$2e$17$2e$0_typescript$40$5$2e$9$2e$3$2f$node_modules$2f40$trpc$2f$server$2f$dist$2f$tracked$2d$DWInO6EQ$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["TRPCError"]({
                code: 'UNAUTHORIZED',
                message: 'Usuario inactivo'
            });
        }
        // Rotación: revocar token actual y emitir nuevo par
        const newSessionId = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__["randomUUID"])();
        const newRefreshToken = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$lib$2f$auth$2f$jwt$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["signRefreshToken"])(user.id, newSessionId);
        const newRefreshHash = createHash('sha256').update(newRefreshToken).digest('hex');
        await db.from('auth_sessions').update({
            revoked_at: new Date().toISOString()
        }).eq('id', sessionId);
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        await db.from('auth_sessions').insert({
            id: newSessionId,
            user_id: user.id,
            tenant_id: session.tenant_id,
            refresh_token_hash: newRefreshHash,
            ip_inet: ctx.ip,
            user_agent: ctx.userAgent,
            expires_at: expiresAt.toISOString()
        });
        const accessToken = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$lib$2f$auth$2f$jwt$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["signAccessToken"])({
            sub: user.id,
            tid: session.tenant_id ?? '',
            role: user.role,
            email: user.email
        });
        return {
            accessToken,
            refreshToken: newRefreshToken
        };
    }),
    // ─── LOGOUT ─────────────────────────────────────────────────────────────────
    logout: __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$server$2f$trpc$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["protectedProcedure"].input(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
        refreshToken: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().optional()
    })).mutation(async ({ input, ctx })=>{
        const db = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getDb"])();
        if (input.refreshToken) {
            const { createHash } = await __turbopack_context__.A("[externals]/crypto [external] (crypto, cjs, async loader)");
            const tokenHash = createHash('sha256').update(input.refreshToken).digest('hex');
            await db.from('auth_sessions').update({
                revoked_at: new Date().toISOString()
            }).eq('refresh_token_hash', tokenHash).eq('user_id', ctx.user.sub);
        } else {
            // Revocar todas las sesiones del usuario
            await db.from('auth_sessions').update({
                revoked_at: new Date().toISOString()
            }).eq('user_id', ctx.user.sub).is('revoked_at', null);
        }
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$lib$2f$auth$2f$audit$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["logAudit"])(db, {
            tenantId: ctx.user.tid,
            actorUserId: ctx.user.sub,
            action: 'user.logout',
            ipInet: ctx.ip
        });
        return {
            success: true
        };
    }),
    // ─── ME ─────────────────────────────────────────────────────────────────────
    me: __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$server$2f$trpc$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["protectedProcedure"].query(async ({ ctx })=>{
        const db = ctx.db;
        if (ctx.user.tid) await (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["setTenantContext"])(db, ctx.user.tid, ctx.user.role);
        const { data: user } = await db.from('users').select('id, email, full_name, role, department, position, status, mfa_enabled, must_change_password, tenant_id').eq('id', ctx.user.sub).single();
        if (!user) throw new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$trpc$2b$server$40$11$2e$17$2e$0_typescript$40$5$2e$9$2e$3$2f$node_modules$2f40$trpc$2f$server$2f$dist$2f$tracked$2d$DWInO6EQ$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["TRPCError"]({
            code: 'NOT_FOUND'
        });
        return user;
    }),
    // ─── CAMBIAR CONTRASEÑA ──────────────────────────────────────────────────────
    changePassword: __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$server$2f$trpc$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["protectedProcedure"].input(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
        currentPassword: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
        newPassword: __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$shared$2f$src$2f$schemas$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["passwordSchema"]
    })).mutation(async ({ input, ctx })=>{
        const db = ctx.db;
        const { data: user } = await db.from('users').select('id, password_hash, tenant_id').eq('id', ctx.user.sub).single();
        if (!user) throw new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$trpc$2b$server$40$11$2e$17$2e$0_typescript$40$5$2e$9$2e$3$2f$node_modules$2f40$trpc$2f$server$2f$dist$2f$tracked$2d$DWInO6EQ$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["TRPCError"]({
            code: 'NOT_FOUND'
        });
        const valid = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$lib$2f$auth$2f$password$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["verifyPassword"])(input.currentPassword, user.password_hash);
        if (!valid) throw new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$trpc$2b$server$40$11$2e$17$2e$0_typescript$40$5$2e$9$2e$3$2f$node_modules$2f40$trpc$2f$server$2f$dist$2f$tracked$2d$DWInO6EQ$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["TRPCError"]({
            code: 'UNAUTHORIZED',
            message: 'Contraseña actual incorrecta'
        });
        const policyError = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$lib$2f$auth$2f$password$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["validatePasswordPolicy"])(input.newPassword);
        if (policyError) throw new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$trpc$2b$server$40$11$2e$17$2e$0_typescript$40$5$2e$9$2e$3$2f$node_modules$2f40$trpc$2f$server$2f$dist$2f$tracked$2d$DWInO6EQ$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["TRPCError"]({
            code: 'BAD_REQUEST',
            message: policyError
        });
        // Verificar historial
        const { data: history } = await db.from('password_history').select('password_hash').eq('user_id', ctx.user.sub).order('created_at', {
            ascending: false
        }).limit(5);
        const hashes = (history ?? []).map((h)=>h.password_hash);
        const inHistory = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$lib$2f$auth$2f$password$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["isPasswordInHistory"])(input.newPassword, hashes);
        if (inHistory) {
            throw new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$trpc$2b$server$40$11$2e$17$2e$0_typescript$40$5$2e$9$2e$3$2f$node_modules$2f40$trpc$2f$server$2f$dist$2f$tracked$2d$DWInO6EQ$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["TRPCError"]({
                code: 'BAD_REQUEST',
                message: 'No puedes reutilizar tus últimas 5 contraseñas'
            });
        }
        const newHash = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$lib$2f$auth$2f$password$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["hashPassword"])(input.newPassword);
        await db.from('users').update({
            password_hash: newHash,
            password_changed_at: new Date().toISOString(),
            must_change_password: false
        }).eq('id', ctx.user.sub);
        await db.from('password_history').insert({
            user_id: ctx.user.sub,
            tenant_id: user.tenant_id,
            password_hash: newHash
        });
        // Revocar todas las sesiones (excepto la actual) por seguridad
        await db.from('auth_sessions').update({
            revoked_at: new Date().toISOString()
        }).eq('user_id', ctx.user.sub).is('revoked_at', null);
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$lib$2f$auth$2f$audit$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["logAudit"])(db, {
            tenantId: ctx.user.tid,
            actorUserId: ctx.user.sub,
            action: 'user.password_changed',
            ipInet: ctx.ip
        });
        return {
            success: true
        };
    }),
    // ─── SETUP MFA ───────────────────────────────────────────────────────────────
    setupMfa: __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$server$2f$trpc$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["protectedProcedure"].mutation(async ({ ctx })=>{
        const db = ctx.db;
        const { data: user } = await db.from('users').select('email, mfa_enabled').eq('id', ctx.user.sub).single();
        if (!user) throw new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$trpc$2b$server$40$11$2e$17$2e$0_typescript$40$5$2e$9$2e$3$2f$node_modules$2f40$trpc$2f$server$2f$dist$2f$tracked$2d$DWInO6EQ$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["TRPCError"]({
            code: 'NOT_FOUND'
        });
        if (user.mfa_enabled) {
            throw new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$trpc$2b$server$40$11$2e$17$2e$0_typescript$40$5$2e$9$2e$3$2f$node_modules$2f40$trpc$2f$server$2f$dist$2f$tracked$2d$DWInO6EQ$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["TRPCError"]({
                code: 'BAD_REQUEST',
                message: 'MFA ya está habilitado'
            });
        }
        const { secret, uri } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$lib$2f$auth$2f$mfa$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["generateTotpSecret"])(user.email);
        const qrDataUrl = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$lib$2f$auth$2f$mfa$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["generateQrDataUrl"])(uri);
        // Guardar secreto cifrado temporalmente (se confirma al verificar)
        const encrypted = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$lib$2f$auth$2f$mfa$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["encryptSecret"])(secret);
        await db.from('users').update({
            mfa_secret_encrypted: encrypted
        }).eq('id', ctx.user.sub);
        return {
            secret,
            qrDataUrl
        };
    }),
    // ─── VERIFY MFA (activa MFA tras confirmar el código) ───────────────────────
    verifyMfa: __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$server$2f$trpc$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["protectedProcedure"].input(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
        code: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().length(6)
    })).mutation(async ({ input, ctx })=>{
        const db = ctx.db;
        const { data: user } = await db.from('users').select('mfa_secret_encrypted, mfa_enabled').eq('id', ctx.user.sub).single();
        if (!user || !user.mfa_secret_encrypted) {
            throw new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$trpc$2b$server$40$11$2e$17$2e$0_typescript$40$5$2e$9$2e$3$2f$node_modules$2f40$trpc$2f$server$2f$dist$2f$tracked$2d$DWInO6EQ$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["TRPCError"]({
                code: 'BAD_REQUEST',
                message: 'Ejecuta setupMfa primero'
            });
        }
        const secret = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$lib$2f$auth$2f$mfa$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["decryptSecret"])(Buffer.from(user.mfa_secret_encrypted));
        const valid = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$lib$2f$auth$2f$mfa$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["verifyTotp"])(secret, input.code);
        if (!valid) throw new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$trpc$2b$server$40$11$2e$17$2e$0_typescript$40$5$2e$9$2e$3$2f$node_modules$2f40$trpc$2f$server$2f$dist$2f$tracked$2d$DWInO6EQ$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["TRPCError"]({
            code: 'BAD_REQUEST',
            message: 'Código inválido'
        });
        await db.from('users').update({
            mfa_enabled: true
        }).eq('id', ctx.user.sub);
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$lib$2f$auth$2f$audit$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["logAudit"])(db, {
            tenantId: ctx.user.tid,
            actorUserId: ctx.user.sub,
            action: 'user.mfa_enabled',
            ipInet: ctx.ip
        });
        return {
            success: true
        };
    }),
    // ─── DISABLE MFA ─────────────────────────────────────────────────────────────
    disableMfa: __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$server$2f$trpc$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["protectedProcedure"].input(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
        code: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().length(6)
    })).mutation(async ({ input, ctx })=>{
        const db = ctx.db;
        const { data: user } = await db.from('users').select('mfa_secret_encrypted, mfa_enabled, role').eq('id', ctx.user.sub).single();
        if (!user?.mfa_enabled) {
            throw new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$trpc$2b$server$40$11$2e$17$2e$0_typescript$40$5$2e$9$2e$3$2f$node_modules$2f40$trpc$2f$server$2f$dist$2f$tracked$2d$DWInO6EQ$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["TRPCError"]({
                code: 'BAD_REQUEST',
                message: 'MFA no está habilitado'
            });
        }
        // tenant_admin y platform_admin no pueden deshabilitar MFA
        if (user.role === __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$shared$2f$src$2f$constants$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ROLES"].TENANT_ADMIN || user.role === __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$shared$2f$src$2f$constants$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ROLES"].PLATFORM_ADMIN) {
            throw new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$trpc$2b$server$40$11$2e$17$2e$0_typescript$40$5$2e$9$2e$3$2f$node_modules$2f40$trpc$2f$server$2f$dist$2f$tracked$2d$DWInO6EQ$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["TRPCError"]({
                code: 'FORBIDDEN',
                message: 'Los administradores no pueden deshabilitar MFA'
            });
        }
        const secret = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$lib$2f$auth$2f$mfa$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["decryptSecret"])(Buffer.from(user.mfa_secret_encrypted));
        const valid = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$lib$2f$auth$2f$mfa$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["verifyTotp"])(secret, input.code);
        if (!valid) throw new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$trpc$2b$server$40$11$2e$17$2e$0_typescript$40$5$2e$9$2e$3$2f$node_modules$2f40$trpc$2f$server$2f$dist$2f$tracked$2d$DWInO6EQ$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["TRPCError"]({
            code: 'BAD_REQUEST',
            message: 'Código inválido'
        });
        await db.from('users').update({
            mfa_enabled: false,
            mfa_secret_encrypted: null
        }).eq('id', ctx.user.sub);
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$lib$2f$auth$2f$audit$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["logAudit"])(db, {
            tenantId: ctx.user.tid,
            actorUserId: ctx.user.sub,
            action: 'user.mfa_disabled',
            ipInet: ctx.ip
        });
        return {
            success: true
        };
    })
});
}),
"[project]/apps/web/src/server/routers/platform.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "platformRouter",
    ()=>platformRouter
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/external.js [app-route] (ecmascript) <export * as z>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$trpc$2b$server$40$11$2e$17$2e$0_typescript$40$5$2e$9$2e$3$2f$node_modules$2f40$trpc$2f$server$2f$dist$2f$tracked$2d$DWInO6EQ$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/@trpc+server@11.17.0_typescript@5.9.3/node_modules/@trpc/server/dist/tracked-DWInO6EQ.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$server$2f$trpc$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/src/server/trpc.ts [app-route] (ecmascript)");
;
;
;
const platformRouter = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$server$2f$trpc$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["router"])({
    // ─── MÉTRICAS GLOBALES ────────────────────────────────────────────────────
    getMetrics: __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$server$2f$trpc$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["platformAdminProcedure"].query(async ({ ctx })=>{
        const db = ctx.db;
        const [tenantsRes, licensesRes, usersRes] = await Promise.all([
            db.from('tenants').select('id, status, created_at'),
            db.from('licenses').select('id, tenant_id, status, seats_total, plan_id, starts_at'),
            db.from('users').select('id, tenant_id, status').neq('role', 'platform_admin')
        ]);
        const tenants = tenantsRes.data ?? [];
        const licenses = licensesRes.data ?? [];
        const users = usersRes.data ?? [];
        // Obtener precios de planes para calcular MRR
        const { data: plans } = await db.from('plans').select('id, code, monthly_price_per_seat_cop');
        const priceMap = Object.fromEntries((plans ?? []).map((p)=>[
                p.id,
                p.monthly_price_per_seat_cop
            ]));
        const activeLicenses = licenses.filter((l)=>l.status === 'active');
        const trialLicenses = licenses.filter((l)=>l.status === 'trial');
        const mrr = activeLicenses.reduce((sum, l)=>{
            const price = priceMap[l.plan_id] ?? 0;
            return sum + price * l.seats_total;
        }, 0);
        // Churn: tenants cancelados en los últimos 30 días
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const churnedRecent = tenants.filter((t)=>t.status === 'cancelled' && t.created_at > thirtyDaysAgo).length;
        const activeUsers = users.filter((u)=>u.status === 'active' && u.tenant_id !== null).length;
        return {
            totalTenants: tenants.length,
            activeTenants: tenants.filter((t)=>t.status === 'active').length,
            trialTenants: tenants.filter((t)=>t.status === 'trial').length,
            suspendedTenants: tenants.filter((t)=>t.status === 'suspended').length,
            mrrCop: mrr,
            totalSeats: activeLicenses.reduce((s, l)=>s + l.seats_total, 0),
            trialSeats: trialLicenses.reduce((s, l)=>s + l.seats_total, 0),
            activeUsers,
            churnedLast30Days: churnedRecent
        };
    }),
    // ─── CREAR TENANT ────────────────────────────────────────────────────────
    createTenant: __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$server$2f$trpc$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["platformAdminProcedure"].input(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
        legal_name: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().min(2).max(200),
        trade_name: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().max(200).optional(),
        nit: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().regex(/^\d{9,10}-\d$/, 'NIT inválido (formato: 900123456-7)'),
        contact_email: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().email(),
        contact_phone: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().max(20).optional(),
        timezone: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().default('America/Bogota'),
        admin_full_name: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().min(2).max(200),
        admin_password: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().min(12),
        plan_code: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].enum([
            'basic',
            'pro',
            'enterprise'
        ]).default('pro'),
        seats: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().int().min(1).max(5000).default(10),
        status: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].enum([
            'trial',
            'active'
        ]).default('trial'),
        trial_days: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().int().min(1).max(365).default(14)
    })).mutation(async ({ input, ctx })=>{
        const db = ctx.db;
        const { hashPassword, validatePasswordPolicy } = await __turbopack_context__.A("[project]/apps/web/src/lib/auth/password.ts [app-route] (ecmascript, async loader)");
        const { ROLES } = await __turbopack_context__.A("[project]/packages/shared/src/index.ts [app-route] (ecmascript, async loader)");
        const { getDb } = await __turbopack_context__.A("[project]/apps/web/src/lib/db.ts [app-route] (ecmascript, async loader)");
        const adminDb = getDb();
        const policyError = validatePasswordPolicy(input.admin_password);
        if (policyError) throw new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$trpc$2b$server$40$11$2e$17$2e$0_typescript$40$5$2e$9$2e$3$2f$node_modules$2f40$trpc$2f$server$2f$dist$2f$tracked$2d$DWInO6EQ$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["TRPCError"]({
            code: 'BAD_REQUEST',
            message: policyError
        });
        // Verificar email no duplicado
        const { data: existing } = await adminDb.from('users').select('id').eq('email', input.contact_email).maybeSingle();
        if (existing) throw new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$trpc$2b$server$40$11$2e$17$2e$0_typescript$40$5$2e$9$2e$3$2f$node_modules$2f40$trpc$2f$server$2f$dist$2f$tracked$2d$DWInO6EQ$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["TRPCError"]({
            code: 'CONFLICT',
            message: 'Email ya registrado'
        });
        const { data: plan } = await adminDb.from('plans').select('id').eq('code', input.plan_code).single();
        if (!plan) throw new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$trpc$2b$server$40$11$2e$17$2e$0_typescript$40$5$2e$9$2e$3$2f$node_modules$2f40$trpc$2f$server$2f$dist$2f$tracked$2d$DWInO6EQ$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["TRPCError"]({
            code: 'NOT_FOUND',
            message: 'Plan no encontrado'
        });
        const passwordHash = await hashPassword(input.admin_password);
        const { data: tenant, error: tenantError } = await adminDb.from('tenants').insert({
            legal_name: input.legal_name,
            trade_name: input.trade_name ?? null,
            nit: input.nit,
            timezone: input.timezone,
            contact_email: input.contact_email,
            contact_phone: input.contact_phone ?? null,
            status: input.status
        }).select('id').single();
        if (tenantError) {
            if (tenantError.code === '23505') throw new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$trpc$2b$server$40$11$2e$17$2e$0_typescript$40$5$2e$9$2e$3$2f$node_modules$2f40$trpc$2f$server$2f$dist$2f$tracked$2d$DWInO6EQ$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["TRPCError"]({
                code: 'CONFLICT',
                message: 'NIT ya registrado'
            });
            throw new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$trpc$2b$server$40$11$2e$17$2e$0_typescript$40$5$2e$9$2e$3$2f$node_modules$2f40$trpc$2f$server$2f$dist$2f$tracked$2d$DWInO6EQ$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["TRPCError"]({
                code: 'INTERNAL_SERVER_ERROR',
                message: tenantError.message
            });
        }
        const trialEnd = new Date();
        trialEnd.setDate(trialEnd.getDate() + input.trial_days);
        await adminDb.from('licenses').insert({
            tenant_id: tenant.id,
            plan_id: plan.id,
            seats_total: input.seats,
            status: input.status,
            starts_at: new Date().toISOString(),
            ends_at: trialEnd.toISOString(),
            trial_ends_at: input.status === 'trial' ? trialEnd.toISOString() : null
        });
        const { data: user, error: userError } = await adminDb.from('users').insert({
            tenant_id: tenant.id,
            email: input.contact_email,
            password_hash: passwordHash,
            full_name: input.admin_full_name,
            role: ROLES.TENANT_ADMIN,
            status: 'active'
        }).select('id').single();
        if (userError) throw new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$trpc$2b$server$40$11$2e$17$2e$0_typescript$40$5$2e$9$2e$3$2f$node_modules$2f40$trpc$2f$server$2f$dist$2f$tracked$2d$DWInO6EQ$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["TRPCError"]({
            code: 'INTERNAL_SERVER_ERROR',
            message: userError.message
        });
        await adminDb.from('password_history').insert({
            user_id: user.id,
            tenant_id: tenant.id,
            password_hash: passwordHash
        });
        await db.from('audit_logs').insert({
            actor_user_id: ctx.user.sub,
            action: 'tenant.created',
            entity_type: 'tenant',
            entity_id: tenant.id,
            after_state: {
                legal_name: input.legal_name,
                plan: input.plan_code,
                seats: input.seats
            }
        });
        return {
            tenantId: tenant.id,
            adminUserId: user.id
        };
    }),
    // ─── TENANTS ──────────────────────────────────────────────────────────────
    listTenants: __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$server$2f$trpc$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["platformAdminProcedure"].input(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
        search: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().optional(),
        status: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].enum([
            'trial',
            'active',
            'suspended',
            'cancelled',
            'all'
        ]).default('all'),
        page: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().int().min(1).default(1),
        pageSize: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().int().min(1).max(100).default(20)
    })).query(async ({ input, ctx })=>{
        const db = ctx.db;
        const offset = (input.page - 1) * input.pageSize;
        let query = db.from('tenants').select(`id, legal_name, trade_name, nit, contact_email, status, created_at,
           licenses(id, status, seats_total, plan_id, ends_at, trial_ends_at,
             plans(code, name, monthly_price_per_seat_cop))`, {
            count: 'exact'
        }).order('created_at', {
            ascending: false
        }).range(offset, offset + input.pageSize - 1);
        if (input.status !== 'all') {
            query = query.eq('status', input.status);
        }
        if (input.search) {
            query = query.or(`legal_name.ilike.%${input.search}%,nit.ilike.%${input.search}%,contact_email.ilike.%${input.search}%`);
        }
        const { data, count, error } = await query;
        if (error) throw new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$trpc$2b$server$40$11$2e$17$2e$0_typescript$40$5$2e$9$2e$3$2f$node_modules$2f40$trpc$2f$server$2f$dist$2f$tracked$2d$DWInO6EQ$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["TRPCError"]({
            code: 'INTERNAL_SERVER_ERROR',
            message: error.message
        });
        return {
            data: data ?? [],
            total: count ?? 0,
            page: input.page,
            pageSize: input.pageSize
        };
    }),
    getTenant: __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$server$2f$trpc$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["platformAdminProcedure"].input(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
        id: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().uuid()
    })).query(async ({ input, ctx })=>{
        const db = ctx.db;
        const { data, error } = await db.from('tenants').select(`*, licenses(*, plans(code, name, monthly_price_per_seat_cop))`).eq('id', input.id).single();
        if (error || !data) throw new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$trpc$2b$server$40$11$2e$17$2e$0_typescript$40$5$2e$9$2e$3$2f$node_modules$2f40$trpc$2f$server$2f$dist$2f$tracked$2d$DWInO6EQ$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["TRPCError"]({
            code: 'NOT_FOUND'
        });
        // Contar usuarios activos
        const { count: userCount } = await db.from('users').select('id', {
            count: 'exact',
            head: true
        }).eq('tenant_id', input.id).eq('status', 'active');
        return {
            ...data,
            activeUserCount: userCount ?? 0
        };
    }),
    updateTenant: __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$server$2f$trpc$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["platformAdminProcedure"].input(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
        id: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().uuid(),
        data_retention_months: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().int().min(1).max(120).optional(),
        data_protection_officer: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().optional(),
        status: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].enum([
            'active',
            'suspended',
            'cancelled'
        ]).optional()
    })).mutation(async ({ input, ctx })=>{
        const db = ctx.db;
        const { id, ...updates } = input;
        const { error } = await db.from('tenants').update({
            ...updates,
            updated_at: new Date().toISOString()
        }).eq('id', id);
        if (error) throw new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$trpc$2b$server$40$11$2e$17$2e$0_typescript$40$5$2e$9$2e$3$2f$node_modules$2f40$trpc$2f$server$2f$dist$2f$tracked$2d$DWInO6EQ$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["TRPCError"]({
            code: 'INTERNAL_SERVER_ERROR',
            message: error.message
        });
        await ctx.db.from('audit_logs').insert({
            actor_user_id: ctx.user.sub,
            action: 'tenant.updated',
            entity_type: 'tenant',
            entity_id: id,
            after_state: updates
        });
        return {
            success: true
        };
    }),
    // ─── LICENCIAS ────────────────────────────────────────────────────────────
    updateLicense: __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$server$2f$trpc$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["platformAdminProcedure"].input(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
        licenseId: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().uuid(),
        status: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].enum([
            'active',
            'suspended',
            'cancelled'
        ]).optional(),
        seats_total: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().int().min(1).optional(),
        plan_id: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().uuid().optional(),
        ends_at: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().datetime().optional(),
        feature_overrides: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].record(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].boolean()).optional()
    })).mutation(async ({ input, ctx })=>{
        const db = ctx.db;
        const { licenseId, ...updates } = input;
        const { data: before } = await db.from('licenses').select('*').eq('id', licenseId).single();
        const { error } = await db.from('licenses').update({
            ...updates,
            updated_at: new Date().toISOString()
        }).eq('id', licenseId);
        if (error) throw new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$trpc$2b$server$40$11$2e$17$2e$0_typescript$40$5$2e$9$2e$3$2f$node_modules$2f40$trpc$2f$server$2f$dist$2f$tracked$2d$DWInO6EQ$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["TRPCError"]({
            code: 'INTERNAL_SERVER_ERROR',
            message: error.message
        });
        await db.from('audit_logs').insert({
            tenant_id: before?.tenant_id,
            actor_user_id: ctx.user.sub,
            action: 'license.updated',
            entity_type: 'license',
            entity_id: licenseId,
            before_state: before,
            after_state: updates
        });
        return {
            success: true
        };
    }),
    // ─── PLANES ───────────────────────────────────────────────────────────────
    listPlans: __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$server$2f$trpc$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["platformAdminProcedure"].query(async ({ ctx })=>{
        const { data, error } = await ctx.db.from('plans').select('*').order('monthly_price_per_seat_cop');
        if (error) throw new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$trpc$2b$server$40$11$2e$17$2e$0_typescript$40$5$2e$9$2e$3$2f$node_modules$2f40$trpc$2f$server$2f$dist$2f$tracked$2d$DWInO6EQ$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["TRPCError"]({
            code: 'INTERNAL_SERVER_ERROR',
            message: error.message
        });
        return data ?? [];
    }),
    updatePlan: __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$server$2f$trpc$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["platformAdminProcedure"].input(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
        id: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().uuid(),
        name: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().min(2).max(100).optional(),
        monthly_price_per_seat_cop: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().min(0).optional(),
        features: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].record(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].boolean()).optional(),
        is_active: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].boolean().optional()
    })).mutation(async ({ input, ctx })=>{
        const db = ctx.db;
        const { id, ...updates } = input;
        const { error } = await db.from('plans').update(updates).eq('id', id);
        if (error) throw new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$trpc$2b$server$40$11$2e$17$2e$0_typescript$40$5$2e$9$2e$3$2f$node_modules$2f40$trpc$2f$server$2f$dist$2f$tracked$2d$DWInO6EQ$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["TRPCError"]({
            code: 'INTERNAL_SERVER_ERROR',
            message: error.message
        });
        await db.from('audit_logs').insert({
            actor_user_id: ctx.user.sub,
            action: 'license.updated',
            entity_type: 'plan',
            entity_id: id,
            after_state: updates
        });
        return {
            success: true
        };
    }),
    // ─── AUDIT LOGS GLOBALES ─────────────────────────────────────────────────
    listAuditLogs: __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$server$2f$trpc$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["platformAdminProcedure"].input(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
        tenantId: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().uuid().optional(),
        action: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().optional(),
        fromDate: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().datetime().optional(),
        toDate: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().datetime().optional(),
        page: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().int().min(1).default(1),
        pageSize: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().int().min(1).max(100).default(50)
    })).query(async ({ input, ctx })=>{
        const db = ctx.db;
        const offset = (input.page - 1) * input.pageSize;
        let query = db.from('audit_logs').select('*', {
            count: 'exact'
        }).order('occurred_at', {
            ascending: false
        }).range(offset, offset + input.pageSize - 1);
        if (input.tenantId) query = query.eq('tenant_id', input.tenantId);
        if (input.action) query = query.ilike('action', `%${input.action}%`);
        if (input.fromDate) query = query.gte('occurred_at', input.fromDate);
        if (input.toDate) query = query.lte('occurred_at', input.toDate);
        const { data, count, error } = await query;
        if (error) throw new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$trpc$2b$server$40$11$2e$17$2e$0_typescript$40$5$2e$9$2e$3$2f$node_modules$2f40$trpc$2f$server$2f$dist$2f$tracked$2d$DWInO6EQ$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["TRPCError"]({
            code: 'INTERNAL_SERVER_ERROR',
            message: error.message
        });
        return {
            data: data ?? [],
            total: count ?? 0,
            page: input.page,
            pageSize: input.pageSize
        };
    })
});
}),
"[project]/apps/web/src/server/routers/admin.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "adminRouter",
    ()=>adminRouter
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/external.js [app-route] (ecmascript) <export * as z>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$trpc$2b$server$40$11$2e$17$2e$0_typescript$40$5$2e$9$2e$3$2f$node_modules$2f40$trpc$2f$server$2f$dist$2f$tracked$2d$DWInO6EQ$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/@trpc+server@11.17.0_typescript@5.9.3/node_modules/@trpc/server/dist/tracked-DWInO6EQ.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$server$2f$trpc$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/src/server/trpc.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$lib$2f$auth$2f$password$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/src/lib/auth/password.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$lib$2f$auth$2f$audit$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/src/lib/auth/audit.ts [app-route] (ecmascript)");
;
;
;
;
;
const adminRouter = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$server$2f$trpc$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["router"])({
    // ─── Dashboard ────────────────────────────────────────────────────────────
    getStats: __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$server$2f$trpc$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["protectedProcedure"].query(async ({ ctx })=>{
        const tenantId = ctx.user.tid;
        const [usersRes, teamsRes, schedulesRes, licenseRes, sessionsRes, tenantRes] = await Promise.all([
            ctx.db.from('users').select('id, status').eq('tenant_id', tenantId).neq('status', 'deleted'),
            ctx.db.from('teams').select('id', {
                count: 'exact',
                head: true
            }).eq('tenant_id', tenantId),
            ctx.db.from('work_schedules').select('id', {
                count: 'exact',
                head: true
            }).eq('tenant_id', tenantId),
            ctx.db.from('licenses').select('seats_total, status').eq('tenant_id', tenantId).in('status', [
                'active',
                'trial'
            ]).order('created_at', {
                ascending: false
            }).limit(1).maybeSingle(),
            ctx.db.from('work_sessions').select('id', {
                count: 'exact',
                head: true
            }).eq('tenant_id', tenantId).is('ended_at', null),
            ctx.db.from('tenants').select('onboarding_complete').eq('id', tenantId).single()
        ]);
        const users = usersRes.data ?? [];
        return {
            totalUsers: users.length,
            activeUsers: users.filter((u)=>u.status === 'active').length,
            teamsCount: teamsRes.count ?? 0,
            schedulesCount: schedulesRes.count ?? 0,
            licenseSeats: licenseRes.data?.seats_total ?? 0,
            licenseStatus: licenseRes.data?.status ?? 'none',
            activeSessions: sessionsRes.count ?? 0,
            onboardingComplete: tenantRes.data?.onboarding_complete ?? false
        };
    }),
    // ─── Usuarios ─────────────────────────────────────────────────────────────
    listUsers: __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$server$2f$trpc$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["adminProcedure"].input(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
        search: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().optional(),
        role: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].enum([
            'tenant_admin',
            'manager',
            'employee',
            'all'
        ]).default('all'),
        status: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].enum([
            'active',
            'disabled',
            'all'
        ]).default('all'),
        page: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().int().positive().default(1),
        pageSize: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().int().positive().max(100).default(20)
    })).query(async ({ ctx, input })=>{
        const tenantId = ctx.user.tid;
        const from = (input.page - 1) * input.pageSize;
        let query = ctx.db.from('users').select('id, email, full_name, role, status, department, position, mfa_enabled, last_login_at, created_at, must_change_password', {
            count: 'exact'
        }).eq('tenant_id', tenantId).neq('status', 'deleted').order('created_at', {
            ascending: false
        });
        if (input.search) {
            query = query.or(`email.ilike.%${input.search}%,full_name.ilike.%${input.search}%`);
        }
        if (input.role !== 'all') query = query.eq('role', input.role);
        if (input.status !== 'all') query = query.eq('status', input.status);
        const { data, count, error } = await query.range(from, from + input.pageSize - 1);
        if (error) throw new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$trpc$2b$server$40$11$2e$17$2e$0_typescript$40$5$2e$9$2e$3$2f$node_modules$2f40$trpc$2f$server$2f$dist$2f$tracked$2d$DWInO6EQ$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["TRPCError"]({
            code: 'INTERNAL_SERVER_ERROR',
            message: error.message
        });
        return {
            data: data ?? [],
            total: count ?? 0,
            page: input.page,
            pageSize: input.pageSize
        };
    }),
    inviteUser: __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$server$2f$trpc$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["adminProcedure"].input(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
        email: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().email(),
        full_name: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().min(2).max(100),
        role: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].enum([
            'manager',
            'employee'
        ]),
        department: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().max(100).optional(),
        position: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().max(100).optional()
    })).mutation(async ({ ctx, input })=>{
        const tenantId = ctx.user.tid;
        const { data: existing } = await ctx.db.from('users').select('id').eq('email', input.email.toLowerCase()).neq('status', 'deleted').limit(1).maybeSingle();
        if (existing) throw new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$trpc$2b$server$40$11$2e$17$2e$0_typescript$40$5$2e$9$2e$3$2f$node_modules$2f40$trpc$2f$server$2f$dist$2f$tracked$2d$DWInO6EQ$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["TRPCError"]({
            code: 'CONFLICT',
            message: 'Email ya registrado'
        });
        const { data: license } = await ctx.db.from('licenses').select('seats_total').eq('tenant_id', tenantId).in('status', [
            'active',
            'trial'
        ]).order('created_at', {
            ascending: false
        }).limit(1).maybeSingle();
        const { count: currentCount } = await ctx.db.from('users').select('id', {
            count: 'exact',
            head: true
        }).eq('tenant_id', tenantId).eq('status', 'active');
        if (license && (currentCount ?? 0) >= license.seats_total) {
            throw new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$trpc$2b$server$40$11$2e$17$2e$0_typescript$40$5$2e$9$2e$3$2f$node_modules$2f40$trpc$2f$server$2f$dist$2f$tracked$2d$DWInO6EQ$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["TRPCError"]({
                code: 'FORBIDDEN',
                message: 'Límite de seats alcanzado'
            });
        }
        const tempPassword = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$lib$2f$auth$2f$password$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["generateRandomPassword"])();
        const passwordHash = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$lib$2f$auth$2f$password$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["hashPassword"])(tempPassword);
        const insertData = {
            tenant_id: tenantId,
            email: input.email.toLowerCase(),
            full_name: input.full_name,
            role: input.role,
            password_hash: passwordHash,
            must_change_password: true,
            status: 'active'
        };
        if (input.department) insertData['department'] = input.department;
        if (input.position) insertData['position'] = input.position;
        const { data: newUser, error } = await ctx.db.from('users').insert(insertData).select('id, email').single();
        if (error ?? !newUser) throw new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$trpc$2b$server$40$11$2e$17$2e$0_typescript$40$5$2e$9$2e$3$2f$node_modules$2f40$trpc$2f$server$2f$dist$2f$tracked$2d$DWInO6EQ$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["TRPCError"]({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Error creando usuario'
        });
        await ctx.db.from('password_history').insert({
            user_id: newUser.id,
            tenant_id: tenantId,
            password_hash: passwordHash
        });
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$lib$2f$auth$2f$audit$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["logAudit"])(ctx.db, {
            tenantId: tenantId,
            actorUserId: ctx.user.sub,
            action: 'user.invited',
            entityType: 'user',
            entityId: newUser.id,
            ipInet: ctx.ip,
            userAgent: ctx.userAgent,
            after: {
                email: input.email,
                role: input.role
            }
        });
        return {
            id: newUser.id,
            email: newUser.email,
            tempPassword
        };
    }),
    updateUser: __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$server$2f$trpc$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["adminProcedure"].input(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
        id: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().uuid(),
        full_name: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().min(2).max(100).optional(),
        role: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].enum([
            'manager',
            'employee'
        ]).optional(),
        status: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].enum([
            'active',
            'disabled'
        ]).optional(),
        department: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().max(100).optional(),
        position: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().max(100).optional()
    })).mutation(async ({ ctx, input })=>{
        const { id, ...rest } = input;
        const tenantId = ctx.user.tid;
        const updates = Object.fromEntries(Object.entries(rest).filter(([, v])=>v !== undefined));
        const { error } = await ctx.db.from('users').update({
            ...updates,
            updated_at: new Date().toISOString()
        }).eq('id', id).eq('tenant_id', tenantId).neq('role', 'platform_admin');
        if (error) throw new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$trpc$2b$server$40$11$2e$17$2e$0_typescript$40$5$2e$9$2e$3$2f$node_modules$2f40$trpc$2f$server$2f$dist$2f$tracked$2d$DWInO6EQ$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["TRPCError"]({
            code: 'INTERNAL_SERVER_ERROR',
            message: error.message
        });
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$lib$2f$auth$2f$audit$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["logAudit"])(ctx.db, {
            tenantId: tenantId,
            actorUserId: ctx.user.sub,
            action: 'user.updated',
            entityType: 'user',
            entityId: id,
            ipInet: ctx.ip,
            userAgent: ctx.userAgent,
            after: updates
        });
        return {
            ok: true
        };
    }),
    // ─── Equipos ──────────────────────────────────────────────────────────────
    listTeams: __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$server$2f$trpc$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["protectedProcedure"].input(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
        page: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().int().positive().default(1),
        pageSize: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().int().positive().max(100).default(20)
    })).query(async ({ ctx, input })=>{
        const tenantId = ctx.user.tid;
        const from = (input.page - 1) * input.pageSize;
        const { data, count, error } = await ctx.db.from('teams').select('id, name, description, created_at', {
            count: 'exact'
        }).eq('tenant_id', tenantId).order('name', {
            ascending: true
        }).range(from, from + input.pageSize - 1);
        if (error) throw new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$trpc$2b$server$40$11$2e$17$2e$0_typescript$40$5$2e$9$2e$3$2f$node_modules$2f40$trpc$2f$server$2f$dist$2f$tracked$2d$DWInO6EQ$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["TRPCError"]({
            code: 'INTERNAL_SERVER_ERROR',
            message: error.message
        });
        return {
            data: data ?? [],
            total: count ?? 0,
            page: input.page,
            pageSize: input.pageSize
        };
    }),
    createTeam: __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$server$2f$trpc$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["adminProcedure"].input(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
        name: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().min(1).max(100),
        description: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().max(500).optional()
    })).mutation(async ({ ctx, input })=>{
        const tenantId = ctx.user.tid;
        const insertData = {
            tenant_id: tenantId,
            name: input.name
        };
        if (input.description) insertData['description'] = input.description;
        const { data, error } = await ctx.db.from('teams').insert(insertData).select('id, name').single();
        if (error ?? !data) throw new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$trpc$2b$server$40$11$2e$17$2e$0_typescript$40$5$2e$9$2e$3$2f$node_modules$2f40$trpc$2f$server$2f$dist$2f$tracked$2d$DWInO6EQ$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["TRPCError"]({
            code: 'INTERNAL_SERVER_ERROR',
            message: error?.message ?? 'Error'
        });
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$lib$2f$auth$2f$audit$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["logAudit"])(ctx.db, {
            tenantId: tenantId,
            actorUserId: ctx.user.sub,
            action: 'team.created',
            entityType: 'team',
            entityId: data.id,
            ipInet: ctx.ip,
            userAgent: ctx.userAgent,
            after: {
                name: input.name
            }
        });
        return data;
    }),
    updateTeam: __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$server$2f$trpc$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["adminProcedure"].input(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
        id: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().uuid(),
        name: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().min(1).max(100).optional(),
        description: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().max(500).optional()
    })).mutation(async ({ ctx, input })=>{
        const { id, ...rest } = input;
        const updates = Object.fromEntries(Object.entries(rest).filter(([, v])=>v !== undefined));
        const { error } = await ctx.db.from('teams').update({
            ...updates,
            updated_at: new Date().toISOString()
        }).eq('id', id).eq('tenant_id', ctx.user.tid);
        if (error) throw new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$trpc$2b$server$40$11$2e$17$2e$0_typescript$40$5$2e$9$2e$3$2f$node_modules$2f40$trpc$2f$server$2f$dist$2f$tracked$2d$DWInO6EQ$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["TRPCError"]({
            code: 'INTERNAL_SERVER_ERROR',
            message: error.message
        });
        return {
            ok: true
        };
    }),
    deleteTeam: __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$server$2f$trpc$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["adminProcedure"].input(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
        id: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().uuid()
    })).mutation(async ({ ctx, input })=>{
        const tenantId = ctx.user.tid;
        await ctx.db.from('team_members').delete().eq('team_id', input.id).eq('tenant_id', tenantId);
        const { error } = await ctx.db.from('teams').delete().eq('id', input.id).eq('tenant_id', tenantId);
        if (error) throw new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$trpc$2b$server$40$11$2e$17$2e$0_typescript$40$5$2e$9$2e$3$2f$node_modules$2f40$trpc$2f$server$2f$dist$2f$tracked$2d$DWInO6EQ$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["TRPCError"]({
            code: 'INTERNAL_SERVER_ERROR',
            message: error.message
        });
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$lib$2f$auth$2f$audit$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["logAudit"])(ctx.db, {
            tenantId: tenantId,
            actorUserId: ctx.user.sub,
            action: 'team.deleted',
            entityType: 'team',
            entityId: input.id,
            ipInet: ctx.ip,
            userAgent: ctx.userAgent
        });
        return {
            ok: true
        };
    }),
    listTeamMembers: __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$server$2f$trpc$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["protectedProcedure"].input(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
        teamId: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().uuid()
    })).query(async ({ ctx, input })=>{
        const { data, error } = await ctx.db.from('team_members').select('user_id, role, joined_at, users(id, email, full_name, role, department, position)').eq('team_id', input.teamId).eq('tenant_id', ctx.user.tid);
        if (error) throw new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$trpc$2b$server$40$11$2e$17$2e$0_typescript$40$5$2e$9$2e$3$2f$node_modules$2f40$trpc$2f$server$2f$dist$2f$tracked$2d$DWInO6EQ$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["TRPCError"]({
            code: 'INTERNAL_SERVER_ERROR',
            message: error.message
        });
        return data ?? [];
    }),
    addTeamMember: __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$server$2f$trpc$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["adminProcedure"].input(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
        teamId: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().uuid(),
        userId: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().uuid(),
        role: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].enum([
            'lead',
            'member'
        ]).default('member')
    })).mutation(async ({ ctx, input })=>{
        const { error } = await ctx.db.from('team_members').upsert({
            team_id: input.teamId,
            user_id: input.userId,
            tenant_id: ctx.user.tid,
            role: input.role
        }, {
            onConflict: 'team_id,user_id'
        });
        if (error) throw new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$trpc$2b$server$40$11$2e$17$2e$0_typescript$40$5$2e$9$2e$3$2f$node_modules$2f40$trpc$2f$server$2f$dist$2f$tracked$2d$DWInO6EQ$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["TRPCError"]({
            code: 'INTERNAL_SERVER_ERROR',
            message: error.message
        });
        return {
            ok: true
        };
    }),
    removeTeamMember: __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$server$2f$trpc$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["adminProcedure"].input(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
        teamId: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().uuid(),
        userId: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().uuid()
    })).mutation(async ({ ctx, input })=>{
        const { error } = await ctx.db.from('team_members').delete().eq('team_id', input.teamId).eq('user_id', input.userId).eq('tenant_id', ctx.user.tid);
        if (error) throw new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$trpc$2b$server$40$11$2e$17$2e$0_typescript$40$5$2e$9$2e$3$2f$node_modules$2f40$trpc$2f$server$2f$dist$2f$tracked$2d$DWInO6EQ$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["TRPCError"]({
            code: 'INTERNAL_SERVER_ERROR',
            message: error.message
        });
        return {
            ok: true
        };
    }),
    // ─── Horarios ─────────────────────────────────────────────────────────────
    listSchedules: __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$server$2f$trpc$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["protectedProcedure"].query(async ({ ctx })=>{
        const { data, error } = await ctx.db.from('work_schedules').select('id, name, timezone, days_of_week, start_time, end_time, disconnection_grace_minutes, created_at').eq('tenant_id', ctx.user.tid).order('name', {
            ascending: true
        });
        if (error) throw new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$trpc$2b$server$40$11$2e$17$2e$0_typescript$40$5$2e$9$2e$3$2f$node_modules$2f40$trpc$2f$server$2f$dist$2f$tracked$2d$DWInO6EQ$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["TRPCError"]({
            code: 'INTERNAL_SERVER_ERROR',
            message: error.message
        });
        return data ?? [];
    }),
    createSchedule: __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$server$2f$trpc$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["adminProcedure"].input(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
        name: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().min(1).max(100),
        timezone: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
        days_of_week: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].array(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().int().min(0).max(6)),
        start_time: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().regex(/^\d{2}:\d{2}$/),
        end_time: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().regex(/^\d{2}:\d{2}$/),
        disconnection_grace_minutes: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().int().min(0).max(120).default(30)
    })).mutation(async ({ ctx, input })=>{
        const { data, error } = await ctx.db.from('work_schedules').insert({
            ...input,
            tenant_id: ctx.user.tid
        }).select('id, name').single();
        if (error ?? !data) throw new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$trpc$2b$server$40$11$2e$17$2e$0_typescript$40$5$2e$9$2e$3$2f$node_modules$2f40$trpc$2f$server$2f$dist$2f$tracked$2d$DWInO6EQ$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["TRPCError"]({
            code: 'INTERNAL_SERVER_ERROR',
            message: error?.message ?? 'Error'
        });
        return data;
    }),
    updateSchedule: __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$server$2f$trpc$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["adminProcedure"].input(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
        id: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().uuid(),
        name: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().min(1).max(100).optional(),
        timezone: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().optional(),
        days_of_week: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].array(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().int().min(0).max(6)).optional(),
        start_time: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().regex(/^\d{2}:\d{2}$/).optional(),
        end_time: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().regex(/^\d{2}:\d{2}$/).optional(),
        disconnection_grace_minutes: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().int().min(0).max(120).optional()
    })).mutation(async ({ ctx, input })=>{
        const { id, ...rest } = input;
        const updates = Object.fromEntries(Object.entries(rest).filter(([, v])=>v !== undefined));
        const { error } = await ctx.db.from('work_schedules').update({
            ...updates,
            updated_at: new Date().toISOString()
        }).eq('id', id).eq('tenant_id', ctx.user.tid);
        if (error) throw new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$trpc$2b$server$40$11$2e$17$2e$0_typescript$40$5$2e$9$2e$3$2f$node_modules$2f40$trpc$2f$server$2f$dist$2f$tracked$2d$DWInO6EQ$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["TRPCError"]({
            code: 'INTERNAL_SERVER_ERROR',
            message: error.message
        });
        return {
            ok: true
        };
    }),
    deleteSchedule: __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$server$2f$trpc$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["adminProcedure"].input(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
        id: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().uuid()
    })).mutation(async ({ ctx, input })=>{
        const tenantId = ctx.user.tid;
        await ctx.db.from('user_schedules').delete().eq('schedule_id', input.id).eq('tenant_id', tenantId);
        const { error } = await ctx.db.from('work_schedules').delete().eq('id', input.id).eq('tenant_id', tenantId);
        if (error) throw new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$trpc$2b$server$40$11$2e$17$2e$0_typescript$40$5$2e$9$2e$3$2f$node_modules$2f40$trpc$2f$server$2f$dist$2f$tracked$2d$DWInO6EQ$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["TRPCError"]({
            code: 'INTERNAL_SERVER_ERROR',
            message: error.message
        });
        return {
            ok: true
        };
    }),
    assignSchedule: __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$server$2f$trpc$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["adminProcedure"].input(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
        userId: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().uuid(),
        scheduleId: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().uuid().nullable()
    })).mutation(async ({ ctx, input })=>{
        const tenantId = ctx.user.tid;
        const today = new Date().toISOString().split('T')[0];
        await ctx.db.from('user_schedules').update({
            effective_to: today
        }).eq('user_id', input.userId).eq('tenant_id', tenantId).is('effective_to', null);
        if (input.scheduleId) {
            await ctx.db.from('user_schedules').insert({
                user_id: input.userId,
                tenant_id: tenantId,
                schedule_id: input.scheduleId,
                effective_from: today
            });
        }
        return {
            ok: true
        };
    }),
    // ─── Catálogo de apps ─────────────────────────────────────────────────────
    listAppRules: __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$server$2f$trpc$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["adminProcedure"].query(async ({ ctx })=>{
        const tenantId = ctx.user.tid;
        const { data, error } = await ctx.db.from('app_catalog').select('id, name, process_name, category, rule, tenant_id, created_at').or(`tenant_id.eq.${tenantId},tenant_id.is.null`).order('category', {
            ascending: true
        }).order('name', {
            ascending: true
        });
        if (error) throw new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$trpc$2b$server$40$11$2e$17$2e$0_typescript$40$5$2e$9$2e$3$2f$node_modules$2f40$trpc$2f$server$2f$dist$2f$tracked$2d$DWInO6EQ$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["TRPCError"]({
            code: 'INTERNAL_SERVER_ERROR',
            message: error.message
        });
        return data ?? [];
    }),
    upsertAppRule: __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$server$2f$trpc$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["adminProcedure"].input(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
        id: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().uuid().optional(),
        name: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().min(1).max(100),
        process_name: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().max(200).optional(),
        category: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().max(50),
        rule: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].enum([
            'allow',
            'block',
            'monitor'
        ])
    })).mutation(async ({ ctx, input })=>{
        const tenantId = ctx.user.tid;
        const { id, ...rest } = input;
        const payload = Object.fromEntries(Object.entries(rest).filter(([, v])=>v !== undefined));
        if (id) {
            const { error } = await ctx.db.from('app_catalog').update(payload).eq('id', id).eq('tenant_id', tenantId);
            if (error) throw new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$trpc$2b$server$40$11$2e$17$2e$0_typescript$40$5$2e$9$2e$3$2f$node_modules$2f40$trpc$2f$server$2f$dist$2f$tracked$2d$DWInO6EQ$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["TRPCError"]({
                code: 'INTERNAL_SERVER_ERROR',
                message: error.message
            });
        } else {
            const { error } = await ctx.db.from('app_catalog').insert({
                ...payload,
                tenant_id: tenantId
            });
            if (error) throw new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$trpc$2b$server$40$11$2e$17$2e$0_typescript$40$5$2e$9$2e$3$2f$node_modules$2f40$trpc$2f$server$2f$dist$2f$tracked$2d$DWInO6EQ$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["TRPCError"]({
                code: 'INTERNAL_SERVER_ERROR',
                message: error.message
            });
        }
        return {
            ok: true
        };
    }),
    deleteAppRule: __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$server$2f$trpc$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["adminProcedure"].input(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
        id: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().uuid()
    })).mutation(async ({ ctx, input })=>{
        const { error } = await ctx.db.from('app_catalog').delete().eq('id', input.id).eq('tenant_id', ctx.user.tid);
        if (error) throw new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$trpc$2b$server$40$11$2e$17$2e$0_typescript$40$5$2e$9$2e$3$2f$node_modules$2f40$trpc$2f$server$2f$dist$2f$tracked$2d$DWInO6EQ$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["TRPCError"]({
            code: 'INTERNAL_SERVER_ERROR',
            message: error.message
        });
        return {
            ok: true
        };
    }),
    // ─── Rangos IP corporativos ────────────────────────────────────────────────
    listIpRanges: __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$server$2f$trpc$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["adminProcedure"].query(async ({ ctx })=>{
        const { data, error } = await ctx.db.from('corporate_ip_ranges').select('id, cidr, label, created_at').eq('tenant_id', ctx.user.tid).order('created_at', {
            ascending: false
        });
        if (error) throw new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$trpc$2b$server$40$11$2e$17$2e$0_typescript$40$5$2e$9$2e$3$2f$node_modules$2f40$trpc$2f$server$2f$dist$2f$tracked$2d$DWInO6EQ$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["TRPCError"]({
            code: 'INTERNAL_SERVER_ERROR',
            message: error.message
        });
        return data ?? [];
    }),
    addIpRange: __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$server$2f$trpc$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["adminProcedure"].input(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
        cidr: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().regex(/^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/, 'CIDR inválido (ej: 192.168.1.0/24)'),
        label: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().min(1).max(100)
    })).mutation(async ({ ctx, input })=>{
        const tenantId = ctx.user.tid;
        const { data, error } = await ctx.db.from('corporate_ip_ranges').insert({
            tenant_id: tenantId,
            cidr: input.cidr,
            label: input.label
        }).select('id').single();
        if (error) throw new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$trpc$2b$server$40$11$2e$17$2e$0_typescript$40$5$2e$9$2e$3$2f$node_modules$2f40$trpc$2f$server$2f$dist$2f$tracked$2d$DWInO6EQ$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["TRPCError"]({
            code: 'INTERNAL_SERVER_ERROR',
            message: error.message
        });
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$lib$2f$auth$2f$audit$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["logAudit"])(ctx.db, {
            tenantId: tenantId,
            actorUserId: ctx.user.sub,
            action: 'ip_range.added',
            entityType: 'ip_range',
            entityId: data?.id ?? '',
            ipInet: ctx.ip,
            userAgent: ctx.userAgent,
            after: {
                cidr: input.cidr,
                label: input.label
            }
        });
        return {
            ok: true
        };
    }),
    removeIpRange: __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$server$2f$trpc$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["adminProcedure"].input(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
        id: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().uuid()
    })).mutation(async ({ ctx, input })=>{
        const { error } = await ctx.db.from('corporate_ip_ranges').delete().eq('id', input.id).eq('tenant_id', ctx.user.tid);
        if (error) throw new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$trpc$2b$server$40$11$2e$17$2e$0_typescript$40$5$2e$9$2e$3$2f$node_modules$2f40$trpc$2f$server$2f$dist$2f$tracked$2d$DWInO6EQ$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["TRPCError"]({
            code: 'INTERNAL_SERVER_ERROR',
            message: error.message
        });
        return {
            ok: true
        };
    }),
    // ─── Configuración del tenant ─────────────────────────────────────────────
    getSettings: __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$server$2f$trpc$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["adminProcedure"].query(async ({ ctx })=>{
        const { data, error } = await ctx.db.from('tenants').select('legal_name, trade_name, nit, contact_email, contact_phone, timezone, data_retention_months, data_protection_officer, onboarding_complete').eq('id', ctx.user.tid).single();
        if (error ?? !data) throw new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$trpc$2b$server$40$11$2e$17$2e$0_typescript$40$5$2e$9$2e$3$2f$node_modules$2f40$trpc$2f$server$2f$dist$2f$tracked$2d$DWInO6EQ$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["TRPCError"]({
            code: 'NOT_FOUND',
            message: 'Empresa no encontrada'
        });
        return data;
    }),
    updateSettings: __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$server$2f$trpc$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["adminProcedure"].input(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
        trade_name: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().max(200).optional(),
        contact_email: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().email().optional(),
        contact_phone: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().max(20).optional(),
        timezone: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().optional(),
        data_retention_months: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().int().min(12).max(84).optional(),
        data_protection_officer: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().max(200).optional()
    })).mutation(async ({ ctx, input })=>{
        const tenantId = ctx.user.tid;
        const updates = Object.fromEntries(Object.entries(input).filter(([, v])=>v !== undefined));
        const { error } = await ctx.db.from('tenants').update({
            ...updates,
            updated_at: new Date().toISOString()
        }).eq('id', tenantId);
        if (error) throw new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$trpc$2b$server$40$11$2e$17$2e$0_typescript$40$5$2e$9$2e$3$2f$node_modules$2f40$trpc$2f$server$2f$dist$2f$tracked$2d$DWInO6EQ$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["TRPCError"]({
            code: 'INTERNAL_SERVER_ERROR',
            message: error.message
        });
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$lib$2f$auth$2f$audit$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["logAudit"])(ctx.db, {
            tenantId: tenantId,
            actorUserId: ctx.user.sub,
            action: 'tenant.settings_updated',
            entityType: 'tenant',
            entityId: tenantId,
            ipInet: ctx.ip,
            userAgent: ctx.userAgent,
            after: updates
        });
        return {
            ok: true
        };
    }),
    completeOnboarding: __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$server$2f$trpc$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["adminProcedure"].mutation(async ({ ctx })=>{
        const tenantId = ctx.user.tid;
        const { error } = await ctx.db.from('tenants').update({
            onboarding_complete: true,
            updated_at: new Date().toISOString()
        }).eq('id', tenantId);
        if (error) throw new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$trpc$2b$server$40$11$2e$17$2e$0_typescript$40$5$2e$9$2e$3$2f$node_modules$2f40$trpc$2f$server$2f$dist$2f$tracked$2d$DWInO6EQ$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["TRPCError"]({
            code: 'INTERNAL_SERVER_ERROR',
            message: error.message
        });
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$lib$2f$auth$2f$audit$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["logAudit"])(ctx.db, {
            tenantId: tenantId,
            actorUserId: ctx.user.sub,
            action: 'tenant.onboarding_completed',
            entityType: 'tenant',
            entityId: tenantId,
            ipInet: ctx.ip,
            userAgent: ctx.userAgent
        });
        return {
            ok: true
        };
    }),
    // ─── Reglas de dominio (extensión) ───────────────────────────────────────
    getDomainRules: __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$server$2f$trpc$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["adminProcedure"].query(async ({ ctx })=>{
        const { data, error } = await ctx.db.from('app_rules').select('identifier, productivity, rule_type').eq('tenant_id', ctx.user.tid).eq('rule_type', 'domain').order('created_at', {
            ascending: false
        });
        if (error) throw new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$trpc$2b$server$40$11$2e$17$2e$0_typescript$40$5$2e$9$2e$3$2f$node_modules$2f40$trpc$2f$server$2f$dist$2f$tracked$2d$DWInO6EQ$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["TRPCError"]({
            code: 'INTERNAL_SERVER_ERROR',
            message: error.message
        });
        // Devolver mapa domain → productivity para facilitar uso en extensión
        const rules = {};
        for (const row of data ?? []){
            rules[row.identifier] = row.productivity;
        }
        return rules;
    }),
    // ─── Agent Devices ────────────────────────────────────────────────────────
    generateEnrollmentCode: __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$server$2f$trpc$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["adminProcedure"].input(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
        userId: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().uuid()
    })).mutation(async ({ ctx, input })=>{
        const tenantId = ctx.user.tid;
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000) // 15 min
        ;
        // Invalidar códigos anteriores del usuario
        await ctx.db.from('enrollment_codes').update({
            used_at: new Date().toISOString()
        }).eq('tenant_id', tenantId).eq('user_id', input.userId).is('used_at', null);
        // Código de 8 chars alfanumérico mayúsculas
        const { randomBytes } = await __turbopack_context__.A("[externals]/crypto [external] (crypto, cjs, async loader)");
        const code = randomBytes(5).toString('base64url').toUpperCase().slice(0, 8);
        const { data, error } = await ctx.db.from('enrollment_codes').insert({
            tenant_id: tenantId,
            user_id: input.userId,
            code,
            expires_at: expiresAt.toISOString()
        }).select('id, code, expires_at').single();
        if (error) throw new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$trpc$2b$server$40$11$2e$17$2e$0_typescript$40$5$2e$9$2e$3$2f$node_modules$2f40$trpc$2f$server$2f$dist$2f$tracked$2d$DWInO6EQ$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["TRPCError"]({
            code: 'INTERNAL_SERVER_ERROR',
            message: error.message
        });
        return {
            code: data.code,
            expiresAt: data.expires_at
        };
    }),
    listDevices: __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$server$2f$trpc$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["adminProcedure"].input(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
        userId: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().uuid().optional(),
        page: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().int().min(1).default(1),
        pageSize: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().int().min(1).max(50).default(20)
    })).query(async ({ ctx, input })=>{
        const tenantId = ctx.user.tid;
        const offset = (input.page - 1) * input.pageSize;
        let query = ctx.db.from('agent_devices').select('id, user_id, name, platform, hostname, enrolled_at, last_seen_at, revoked_at', {
            count: 'exact'
        }).eq('tenant_id', tenantId).order('enrolled_at', {
            ascending: false
        }).range(offset, offset + input.pageSize - 1);
        if (input.userId) {
            query = query.eq('user_id', input.userId);
        }
        const { data, error, count } = await query;
        if (error) throw new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$trpc$2b$server$40$11$2e$17$2e$0_typescript$40$5$2e$9$2e$3$2f$node_modules$2f40$trpc$2f$server$2f$dist$2f$tracked$2d$DWInO6EQ$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["TRPCError"]({
            code: 'INTERNAL_SERVER_ERROR',
            message: error.message
        });
        return {
            data: data ?? [],
            total: count ?? 0,
            page: input.page,
            pageSize: input.pageSize
        };
    }),
    revokeDevice: __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$server$2f$trpc$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["adminProcedure"].input(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
        deviceId: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().uuid()
    })).mutation(async ({ ctx, input })=>{
        const tenantId = ctx.user.tid;
        const { data: device, error: fetchErr } = await ctx.db.from('agent_devices').select('id, user_id').eq('id', input.deviceId).eq('tenant_id', tenantId).is('revoked_at', null).single();
        if (fetchErr || !device) throw new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$trpc$2b$server$40$11$2e$17$2e$0_typescript$40$5$2e$9$2e$3$2f$node_modules$2f40$trpc$2f$server$2f$dist$2f$tracked$2d$DWInO6EQ$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["TRPCError"]({
            code: 'NOT_FOUND',
            message: 'Dispositivo no encontrado'
        });
        const { error } = await ctx.db.from('agent_devices').update({
            revoked_at: new Date().toISOString()
        }).eq('id', input.deviceId);
        if (error) throw new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$trpc$2b$server$40$11$2e$17$2e$0_typescript$40$5$2e$9$2e$3$2f$node_modules$2f40$trpc$2f$server$2f$dist$2f$tracked$2d$DWInO6EQ$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["TRPCError"]({
            code: 'INTERNAL_SERVER_ERROR',
            message: error.message
        });
        // Revocar api_keys asociadas al dispositivo
        await ctx.db.from('api_keys').update({
            revoked_at: new Date().toISOString()
        }).eq('tenant_id', tenantId).eq('user_id', device.user_id).eq('name', `agent:${input.deviceId}`).is('revoked_at', null);
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$lib$2f$auth$2f$audit$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["logAudit"])(ctx.db, {
            tenantId: tenantId,
            actorUserId: ctx.user.sub,
            action: 'device.revoked',
            entityType: 'agent_device',
            entityId: input.deviceId,
            ipInet: ctx.ip,
            userAgent: ctx.userAgent
        });
        return {
            ok: true
        };
    }),
    // ─── Métricas y KPIs ─────────────────────────────────────────────────────
    getProductivityTrend: __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$server$2f$trpc$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["adminProcedure"].input(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
        days: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().int().min(7).max(90).default(30),
        userId: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().uuid().optional()
    })).query(async ({ ctx, input })=>{
        const tenantId = ctx.user.tid;
        const from = new Date(Date.now() - input.days * 86400000).toISOString().slice(0, 10);
        let query = ctx.db.from('daily_user_metrics').select('metric_date, active_seconds, productive_seconds, non_productive_seconds, productivity_ratio, focus_score, overtime_seconds').eq('tenant_id', tenantId).gte('metric_date', from).order('metric_date', {
            ascending: true
        });
        if (input.userId) {
            query = query.eq('user_id', input.userId);
        }
        const { data, error } = await query;
        if (error) throw new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$trpc$2b$server$40$11$2e$17$2e$0_typescript$40$5$2e$9$2e$3$2f$node_modules$2f40$trpc$2f$server$2f$dist$2f$tracked$2d$DWInO6EQ$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["TRPCError"]({
            code: 'INTERNAL_SERVER_ERROR',
            message: error.message
        });
        // Si hay múltiples usuarios, agrupar por fecha y sumar
        if (!input.userId) {
            const byDate = new Map();
            for (const row of data ?? []){
                const existing = byDate.get(row.metric_date) ?? {
                    active: 0,
                    productive: 0,
                    non_productive: 0,
                    overtime: 0,
                    count: 0
                };
                byDate.set(row.metric_date, {
                    active: existing.active + (row.active_seconds ?? 0),
                    productive: existing.productive + (row.productive_seconds ?? 0),
                    non_productive: existing.non_productive + (row.non_productive_seconds ?? 0),
                    overtime: existing.overtime + (row.overtime_seconds ?? 0),
                    count: existing.count + 1
                });
            }
            return Array.from(byDate.entries()).map(([date, v])=>({
                    date,
                    active_seconds: v.active,
                    productive_seconds: v.productive,
                    non_productive_seconds: v.non_productive,
                    productivity_ratio: v.active > 0 ? v.productive / v.active : 0,
                    overtime_seconds: v.overtime,
                    user_count: v.count
                }));
        }
        return (data ?? []).map((row)=>({
                date: row.metric_date,
                active_seconds: row.active_seconds ?? 0,
                productive_seconds: row.productive_seconds ?? 0,
                non_productive_seconds: row.non_productive_seconds ?? 0,
                productivity_ratio: Number(row.productivity_ratio ?? 0),
                focus_score: row.focus_score != null ? Number(row.focus_score) : null,
                overtime_seconds: row.overtime_seconds ?? 0,
                user_count: 1
            }));
    }),
    getTopUsers: __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$server$2f$trpc$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["adminProcedure"].input(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
        days: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().int().min(1).max(90).default(7),
        metric: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].enum([
            'productivity_ratio',
            'active_seconds',
            'focus_score'
        ]).default('productivity_ratio'),
        limit: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().int().min(1).max(20).default(10)
    })).query(async ({ ctx, input })=>{
        const tenantId = ctx.user.tid;
        const from = new Date(Date.now() - input.days * 86400000).toISOString().slice(0, 10);
        const { data: metrics, error } = await ctx.db.from('daily_user_metrics').select('user_id, active_seconds, productive_seconds, non_productive_seconds, focus_score, overtime_seconds').eq('tenant_id', tenantId).gte('metric_date', from);
        if (error) throw new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$trpc$2b$server$40$11$2e$17$2e$0_typescript$40$5$2e$9$2e$3$2f$node_modules$2f40$trpc$2f$server$2f$dist$2f$tracked$2d$DWInO6EQ$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["TRPCError"]({
            code: 'INTERNAL_SERVER_ERROR',
            message: error.message
        });
        // Agregar por usuario
        const byUser = new Map();
        for (const row of metrics ?? []){
            const u = byUser.get(row.user_id) ?? {
                active: 0,
                productive: 0,
                non_productive: 0,
                focus: [],
                overtime: 0,
                days: 0
            };
            u.active += row.active_seconds ?? 0;
            u.productive += row.productive_seconds ?? 0;
            u.non_productive += row.non_productive_seconds ?? 0;
            u.overtime += row.overtime_seconds ?? 0;
            u.days += 1;
            if (row.focus_score != null) u.focus.push(Number(row.focus_score));
            byUser.set(row.user_id, u);
        }
        const userIds = Array.from(byUser.keys());
        const { data: users } = await ctx.db.from('users').select('id, full_name, email, department').in('id', userIds).eq('tenant_id', tenantId);
        const userMap = new Map((users ?? []).map((u)=>[
                u.id,
                u
            ]));
        const ranked = Array.from(byUser.entries()).map(([userId, v])=>{
            const ratio = v.active > 0 ? v.productive / v.active : 0;
            const focusAvg = v.focus.length > 0 ? v.focus.reduce((a, b)=>a + b, 0) / v.focus.length : 0;
            const u = userMap.get(userId);
            return {
                user_id: userId,
                full_name: u?.full_name ?? null,
                email: u?.email ?? '',
                department: u?.department ?? null,
                active_seconds: v.active,
                productive_seconds: v.productive,
                productivity_ratio: ratio,
                focus_score: focusAvg,
                overtime_seconds: v.overtime,
                days_active: v.days
            };
        });
        ranked.sort((a, b)=>{
            if (input.metric === 'active_seconds') return b.active_seconds - a.active_seconds;
            if (input.metric === 'focus_score') return b.focus_score - a.focus_score;
            return b.productivity_ratio - a.productivity_ratio;
        });
        return ranked.slice(0, input.limit);
    }),
    getTopDomains: __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$server$2f$trpc$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["adminProcedure"].input(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
        days: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().int().min(1).max(90).default(7)
    })).query(async ({ ctx, input })=>{
        const tenantId = ctx.user.tid;
        const from = new Date(Date.now() - input.days * 86400000).toISOString().slice(0, 10);
        const { data, error } = await ctx.db.from('daily_user_metrics').select('domains_top').eq('tenant_id', tenantId).gte('metric_date', from);
        if (error) throw new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$trpc$2b$server$40$11$2e$17$2e$0_typescript$40$5$2e$9$2e$3$2f$node_modules$2f40$trpc$2f$server$2f$dist$2f$tracked$2d$DWInO6EQ$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["TRPCError"]({
            code: 'INTERNAL_SERVER_ERROR',
            message: error.message
        });
        const domainTotals = new Map();
        for (const row of data ?? []){
            const domains = row.domains_top;
            for (const d of domains ?? []){
                domainTotals.set(d.domain, (domainTotals.get(d.domain) ?? 0) + d.secs);
            }
        }
        return Array.from(domainTotals.entries()).sort((a, b)=>b[1] - a[1]).slice(0, 15).map(([domain, secs])=>({
                domain,
                secs
            }));
    }),
    // ─── Audit log ────────────────────────────────────────────────────────────
    getAuditLogs: __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$server$2f$trpc$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["adminProcedure"].input(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
        page: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().int().min(1).default(1),
        pageSize: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().int().min(1).max(100).default(50),
        userId: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().uuid().optional(),
        action: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().optional(),
        from: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        to: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
    })).query(async ({ ctx, input })=>{
        const from = (input.page - 1) * input.pageSize;
        const to = from + input.pageSize - 1;
        let query = ctx.db.from('audit_logs').select('id, action, actor_id, actor_email, target_id, target_type, ip_address, metadata, created_at, users!audit_logs_actor_id_fkey(full_name)', {
            count: 'exact'
        }).eq('tenant_id', ctx.user.tid).order('created_at', {
            ascending: false
        }).range(from, to);
        if (input.userId) query = query.eq('actor_id', input.userId);
        if (input.action) query = query.eq('action', input.action);
        if (input.from) query = query.gte('created_at', input.from);
        if (input.to) query = query.lte('created_at', `${input.to}T23:59:59Z`);
        const { data, count, error } = await query;
        if (error) throw new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$trpc$2b$server$40$11$2e$17$2e$0_typescript$40$5$2e$9$2e$3$2f$node_modules$2f40$trpc$2f$server$2f$dist$2f$tracked$2d$DWInO6EQ$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["TRPCError"]({
            code: 'INTERNAL_SERVER_ERROR',
            message: error.message
        });
        return {
            logs: (data ?? []).map((l)=>({
                    id: l.id,
                    action: l.action,
                    actor_id: l.actor_id,
                    actor_email: l.actor_email,
                    actor_name: l.users?.full_name ?? null,
                    target_id: l.target_id,
                    target_type: l.target_type,
                    ip_address: l.ip_address,
                    metadata: l.metadata,
                    created_at: l.created_at
                })),
            total: count ?? 0,
            page: input.page,
            pageSize: input.pageSize
        };
    }),
    triggerAggregation: __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$server$2f$trpc$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["adminProcedure"].input(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
        date: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
    })).mutation(async ({ ctx, input })=>{
        const tenantId = ctx.user.tid;
        const date = input.date ?? new Date(Date.now() - 86400000).toISOString().slice(0, 10);
        const { data, error } = await ctx.db.rpc('aggregate_daily_user_metrics', {
            p_date: date,
            p_tenant_id: tenantId
        });
        if (error) throw new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$trpc$2b$server$40$11$2e$17$2e$0_typescript$40$5$2e$9$2e$3$2f$node_modules$2f40$trpc$2f$server$2f$dist$2f$tracked$2d$DWInO6EQ$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["TRPCError"]({
            code: 'INTERNAL_SERVER_ERROR',
            message: error.message
        });
        const result = data;
        return {
            ok: true,
            date,
            rows: result[0]?.rows_upserted ?? 0
        };
    })
});
}),
"[project]/apps/web/src/server/routers/manager.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "managerRouter",
    ()=>managerRouter
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/external.js [app-route] (ecmascript) <export * as z>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$trpc$2b$server$40$11$2e$17$2e$0_typescript$40$5$2e$9$2e$3$2f$node_modules$2f40$trpc$2f$server$2f$dist$2f$tracked$2d$DWInO6EQ$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/@trpc+server@11.17.0_typescript@5.9.3/node_modules/@trpc/server/dist/tracked-DWInO6EQ.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$server$2f$trpc$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/src/server/trpc.ts [app-route] (ecmascript)");
;
;
;
const managerProcedure = __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$server$2f$trpc$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["protectedProcedure"].use((0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$server$2f$trpc$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["requireRole"])('tenant_admin', 'manager'));
const managerRouter = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$server$2f$trpc$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["router"])({
    // ─── Equipo ───────────────────────────────────────────────────────────────
    getMyTeams: managerProcedure.query(async ({ ctx })=>{
        const tenantId = ctx.user.tid;
        const userId = ctx.user.sub;
        // Un manager ve sus equipos asignados; tenant_admin ve todos
        if (ctx.user.role === 'tenant_admin') {
            const { data, error } = await ctx.db.from('teams').select('id, name, description, created_at').eq('tenant_id', tenantId).order('name');
            if (error) throw new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$trpc$2b$server$40$11$2e$17$2e$0_typescript$40$5$2e$9$2e$3$2f$node_modules$2f40$trpc$2f$server$2f$dist$2f$tracked$2d$DWInO6EQ$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["TRPCError"]({
                code: 'INTERNAL_SERVER_ERROR',
                message: error.message
            });
            return data ?? [];
        }
        const { data, error } = await ctx.db.from('team_members').select('teams(id, name, description, created_at)').eq('tenant_id', tenantId).eq('user_id', userId).eq('role', 'manager');
        if (error) throw new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$trpc$2b$server$40$11$2e$17$2e$0_typescript$40$5$2e$9$2e$3$2f$node_modules$2f40$trpc$2f$server$2f$dist$2f$tracked$2d$DWInO6EQ$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["TRPCError"]({
            code: 'INTERNAL_SERVER_ERROR',
            message: error.message
        });
        return (data ?? []).map((r)=>r.teams).filter(Boolean);
    }),
    getTeamMembers: managerProcedure.input(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
        teamId: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().uuid()
    })).query(async ({ ctx, input })=>{
        const tenantId = ctx.user.tid;
        const { data, error } = await ctx.db.from('team_members').select('user_id, role, users(id, full_name, email, status, department, position, last_login_at, mfa_enabled)').eq('team_id', input.teamId).eq('tenant_id', tenantId);
        if (error) throw new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$trpc$2b$server$40$11$2e$17$2e$0_typescript$40$5$2e$9$2e$3$2f$node_modules$2f40$trpc$2f$server$2f$dist$2f$tracked$2d$DWInO6EQ$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["TRPCError"]({
            code: 'INTERNAL_SERVER_ERROR',
            message: error.message
        });
        return (data ?? []).map((m)=>({
                ...m.users,
                team_role: m.role
            }));
    }),
    // ─── Sesiones activas ─────────────────────────────────────────────────────
    getActiveSessions: managerProcedure.input(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
        teamId: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().uuid().optional()
    })).query(async ({ ctx, input })=>{
        const tenantId = ctx.user.tid;
        let memberIds = null;
        if (input.teamId) {
            const { data: members } = await ctx.db.from('team_members').select('user_id').eq('team_id', input.teamId).eq('tenant_id', tenantId);
            memberIds = (members ?? []).map((m)=>m.user_id);
            if (memberIds.length === 0) return [];
        }
        let query = ctx.db.from('work_sessions').select('id, user_id, started_at, active_seconds, idle_seconds, location_type, users(full_name, email)').eq('tenant_id', tenantId).is('ended_at', null).order('started_at', {
            ascending: false
        });
        if (memberIds) {
            query = query.in('user_id', memberIds);
        }
        const { data, error } = await query;
        if (error) throw new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$trpc$2b$server$40$11$2e$17$2e$0_typescript$40$5$2e$9$2e$3$2f$node_modules$2f40$trpc$2f$server$2f$dist$2f$tracked$2d$DWInO6EQ$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["TRPCError"]({
            code: 'INTERNAL_SERVER_ERROR',
            message: error.message
        });
        const now = Date.now();
        return (data ?? []).map((s)=>({
                id: s.id,
                user_id: s.user_id,
                full_name: s.users?.full_name ?? null,
                email: s.users?.email ?? '',
                started_at: s.started_at,
                elapsed_seconds: Math.round((now - new Date(s.started_at).getTime()) / 1000),
                active_seconds: s.active_seconds ?? 0,
                idle_seconds: s.idle_seconds ?? 0,
                location_type: s.location_type ?? 'remote'
            }));
    }),
    // ─── Métricas del equipo ──────────────────────────────────────────────────
    getTeamMetrics: managerProcedure.input(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
        teamId: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().uuid().optional(),
        days: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().int().min(1).max(90).default(7)
    })).query(async ({ ctx, input })=>{
        const tenantId = ctx.user.tid;
        const from = new Date(Date.now() - input.days * 86400000).toISOString().slice(0, 10);
        let memberIds = null;
        if (input.teamId) {
            const { data: members } = await ctx.db.from('team_members').select('user_id').eq('team_id', input.teamId).eq('tenant_id', tenantId);
            memberIds = (members ?? []).map((m)=>m.user_id);
            if (memberIds.length === 0) return {
                users: [],
                summary: null
            };
        }
        let query = ctx.db.from('daily_user_metrics').select('user_id, metric_date, active_seconds, productive_seconds, non_productive_seconds, productivity_ratio, overtime_seconds, focus_score').eq('tenant_id', tenantId).gte('metric_date', from).order('metric_date', {
            ascending: false
        });
        if (memberIds) {
            query = query.in('user_id', memberIds);
        }
        const { data: metrics, error } = await query;
        if (error) throw new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$trpc$2b$server$40$11$2e$17$2e$0_typescript$40$5$2e$9$2e$3$2f$node_modules$2f40$trpc$2f$server$2f$dist$2f$tracked$2d$DWInO6EQ$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["TRPCError"]({
            code: 'INTERNAL_SERVER_ERROR',
            message: error.message
        });
        const userIds = [
            ...new Set((metrics ?? []).map((m)=>m.user_id))
        ];
        const { data: users } = await ctx.db.from('users').select('id, full_name, email, department').in('id', userIds).eq('tenant_id', tenantId);
        const userMap = new Map((users ?? []).map((u)=>[
                u.id,
                u
            ]));
        const byUser = new Map();
        for (const m of metrics ?? []){
            const u = byUser.get(m.user_id) ?? {
                active: 0,
                productive: 0,
                overtime: 0,
                days: 0,
                ratios: []
            };
            u.active += m.active_seconds ?? 0;
            u.productive += m.productive_seconds ?? 0;
            u.overtime += m.overtime_seconds ?? 0;
            u.days += 1;
            if (m.productivity_ratio != null) u.ratios.push(Number(m.productivity_ratio));
            byUser.set(m.user_id, u);
        }
        const userStats = Array.from(byUser.entries()).map(([uid, v])=>{
            const info = userMap.get(uid);
            const avgRatio = v.ratios.length > 0 ? v.ratios.reduce((a, b)=>a + b, 0) / v.ratios.length : 0;
            return {
                user_id: uid,
                full_name: info?.full_name ?? null,
                email: info?.email ?? '',
                department: info?.department ?? null,
                active_seconds: v.active,
                productive_seconds: v.productive,
                productivity_ratio: avgRatio,
                overtime_seconds: v.overtime,
                days_active: v.days
            };
        }).sort((a, b)=>b.active_seconds - a.active_seconds);
        const totalActive = userStats.reduce((s, u)=>s + u.active_seconds, 0);
        const avgProductivity = userStats.length > 0 ? userStats.reduce((s, u)=>s + u.productivity_ratio, 0) / userStats.length : 0;
        return {
            users: userStats,
            summary: {
                total_active_seconds: totalActive,
                avg_productivity_ratio: avgProductivity,
                members_count: userStats.length,
                days: input.days
            }
        };
    }),
    getUserDetail: managerProcedure.input(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
        userId: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().uuid(),
        days: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().int().min(1).max(90).default(14)
    })).query(async ({ ctx, input })=>{
        const tenantId = ctx.user.tid;
        const from = new Date(Date.now() - input.days * 86400000).toISOString().slice(0, 10);
        const [userRes, metricsRes, devicesRes] = await Promise.all([
            ctx.db.from('users').select('id, full_name, email, status, department, position, last_login_at, mfa_enabled, must_change_password').eq('id', input.userId).eq('tenant_id', tenantId).single(),
            ctx.db.from('daily_user_metrics').select('metric_date, active_seconds, productive_seconds, non_productive_seconds, productivity_ratio, focus_score, overtime_seconds, apps_top, domains_top, location_type').eq('tenant_id', tenantId).eq('user_id', input.userId).gte('metric_date', from).order('metric_date', {
                ascending: true
            }),
            ctx.db.from('agent_devices').select('id, name, platform, hostname, last_seen_at, revoked_at').eq('tenant_id', tenantId).eq('user_id', input.userId).is('revoked_at', null)
        ]);
        if (userRes.error || !userRes.data) throw new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$trpc$2b$server$40$11$2e$17$2e$0_typescript$40$5$2e$9$2e$3$2f$node_modules$2f40$trpc$2f$server$2f$dist$2f$tracked$2d$DWInO6EQ$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["TRPCError"]({
            code: 'NOT_FOUND',
            message: 'Usuario no encontrado'
        });
        return {
            user: userRes.data,
            metrics: (metricsRes.data ?? []).map((m)=>({
                    ...m,
                    productivity_ratio: Number(m.productivity_ratio ?? 0),
                    focus_score: m.focus_score != null ? Number(m.focus_score) : null
                })),
            devices: devicesRes.data ?? []
        };
    })
});
}),
"[project]/apps/web/src/server/routers/employee.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "employeeRouter",
    ()=>employeeRouter
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/external.js [app-route] (ecmascript) <export * as z>");
var __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/crypto [external] (crypto, cjs)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$trpc$2b$server$40$11$2e$17$2e$0_typescript$40$5$2e$9$2e$3$2f$node_modules$2f40$trpc$2f$server$2f$dist$2f$tracked$2d$DWInO6EQ$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/@trpc+server@11.17.0_typescript@5.9.3/node_modules/@trpc/server/dist/tracked-DWInO6EQ.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$server$2f$trpc$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/src/server/trpc.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/src/lib/db.ts [app-route] (ecmascript)");
;
;
;
;
;
const POLICY_VERSION = '1.0';
const CONSENT_TYPE = 'monitoring';
const employeeRouter = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$server$2f$trpc$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["router"])({
    // ─── Mi perfil ────────────────────────────────────────────────────────────
    getMyProfile: __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$server$2f$trpc$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["protectedProcedure"].query(async ({ ctx })=>{
        const { data, error } = await ctx.db.from('users').select('id, full_name, email, role, status, department, position, last_login_at, mfa_enabled, must_change_password, created_at').eq('id', ctx.user.sub).single();
        if (error || !data) throw new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$trpc$2b$server$40$11$2e$17$2e$0_typescript$40$5$2e$9$2e$3$2f$node_modules$2f40$trpc$2f$server$2f$dist$2f$tracked$2d$DWInO6EQ$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["TRPCError"]({
            code: 'NOT_FOUND',
            message: 'Usuario no encontrado'
        });
        return data;
    }),
    // ─── Mi horario ───────────────────────────────────────────────────────────
    getMySchedule: __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$server$2f$trpc$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["protectedProcedure"].query(async ({ ctx })=>{
        const today = new Date().toISOString().slice(0, 10);
        const { data, error } = await ctx.db.from('user_schedules').select('effective_from, effective_to, work_schedules(name, weekly_hours, start_time, end_time, workdays, break_minutes, disconnection_grace_minutes)').eq('user_id', ctx.user.sub).lte('effective_from', today).or(`effective_to.is.null,effective_to.gte.${today}`).order('effective_from', {
            ascending: false
        }).limit(1).maybeSingle();
        if (error) throw new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$trpc$2b$server$40$11$2e$17$2e$0_typescript$40$5$2e$9$2e$3$2f$node_modules$2f40$trpc$2f$server$2f$dist$2f$tracked$2d$DWInO6EQ$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["TRPCError"]({
            code: 'INTERNAL_SERVER_ERROR',
            message: error.message
        });
        const ws = data?.work_schedules;
        const schedule = Array.isArray(ws) ? ws[0] ?? null : ws ?? null;
        return schedule;
    }),
    // ─── Mi sesión activa ─────────────────────────────────────────────────────
    getActiveSession: __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$server$2f$trpc$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["protectedProcedure"].query(async ({ ctx })=>{
        const { data } = await ctx.db.from('work_sessions').select('id, started_at, active_seconds, idle_seconds, productive_seconds, non_productive_seconds, location_type').eq('user_id', ctx.user.sub).eq('tenant_id', ctx.user.tid).is('ended_at', null).order('started_at', {
            ascending: false
        }).limit(1).maybeSingle();
        return data ?? null;
    }),
    // ─── Mis métricas (resumen de período) ────────────────────────────────────
    getMyMetrics: __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$server$2f$trpc$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["protectedProcedure"].input(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
        days: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().int().min(1).max(90).default(14)
    })).query(async ({ ctx, input })=>{
        const from = new Date(Date.now() - input.days * 86400000).toISOString().slice(0, 10);
        const { data, error } = await ctx.db.from('daily_user_metrics').select('metric_date, active_seconds, productive_seconds, non_productive_seconds, productivity_ratio, focus_score, overtime_seconds, apps_top, domains_top, location_type').eq('tenant_id', ctx.user.tid).eq('user_id', ctx.user.sub).gte('metric_date', from).order('metric_date', {
            ascending: true
        });
        if (error) throw new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$trpc$2b$server$40$11$2e$17$2e$0_typescript$40$5$2e$9$2e$3$2f$node_modules$2f40$trpc$2f$server$2f$dist$2f$tracked$2d$DWInO6EQ$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["TRPCError"]({
            code: 'INTERNAL_SERVER_ERROR',
            message: error.message
        });
        const rows = (data ?? []).map((m)=>({
                ...m,
                productivity_ratio: Number(m.productivity_ratio ?? 0),
                focus_score: m.focus_score != null ? Number(m.focus_score) : null
            }));
        const totalActive = rows.reduce((s, r)=>s + (r.active_seconds ?? 0), 0);
        const totalProductive = rows.reduce((s, r)=>s + (r.productive_seconds ?? 0), 0);
        const avgRatio = rows.length > 0 ? rows.reduce((s, r)=>s + r.productivity_ratio, 0) / rows.length : 0;
        const totalOvertime = rows.reduce((s, r)=>s + (r.overtime_seconds ?? 0), 0);
        return {
            series: rows,
            summary: {
                total_active_seconds: totalActive,
                total_productive_seconds: totalProductive,
                avg_productivity_ratio: avgRatio,
                total_overtime_seconds: totalOvertime,
                days_with_activity: rows.length
            }
        };
    }),
    // ─── Actividad de hoy ────────────────────────────────────────────────────
    getTodayActivity: __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$server$2f$trpc$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["protectedProcedure"].query(async ({ ctx })=>{
        const today = new Date().toISOString().slice(0, 10);
        const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
        const { data, error } = await ctx.db.from('activity_events').select('event_type, app_identifier, domain, productivity, started_at, duration_seconds').eq('tenant_id', ctx.user.tid).eq('user_id', ctx.user.sub).gte('started_at', today).lt('started_at', tomorrow).order('started_at', {
            ascending: true
        }).limit(200);
        if (error) throw new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$trpc$2b$server$40$11$2e$17$2e$0_typescript$40$5$2e$9$2e$3$2f$node_modules$2f40$trpc$2f$server$2f$dist$2f$tracked$2d$DWInO6EQ$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["TRPCError"]({
            code: 'INTERNAL_SERVER_ERROR',
            message: error.message
        });
        // Agrupar por app/dominio para resumen
        const byApp = new Map();
        for (const ev of data ?? []){
            const key = ev.app_identifier ?? ev.domain ?? 'Desconocido';
            const curr = byApp.get(key) ?? {
                secs: 0,
                productivity: ev.productivity
            };
            curr.secs += ev.duration_seconds ?? 0;
            byApp.set(key, curr);
        }
        const topApps = Array.from(byApp.entries()).sort((a, b)=>b[1].secs - a[1].secs).slice(0, 10).map(([name, v])=>({
                name,
                secs: v.secs,
                productivity: v.productivity
            }));
        const totalSecs = (data ?? []).reduce((s, e)=>s + (e.duration_seconds ?? 0), 0);
        const productiveSecs = (data ?? []).filter((e)=>e.productivity === 'productive').reduce((s, e)=>s + (e.duration_seconds ?? 0), 0);
        return {
            events: data ?? [],
            topApps,
            totalActiveSeconds: totalSecs,
            productiveSeconds: productiveSecs
        };
    }),
    // ─── Mis dispositivos ─────────────────────────────────────────────────────
    getMyDevices: __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$server$2f$trpc$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["protectedProcedure"].query(async ({ ctx })=>{
        const { data, error } = await ctx.db.from('agent_devices').select('id, name, platform, hostname, enrolled_at, last_seen_at, revoked_at').eq('tenant_id', ctx.user.tid).eq('user_id', ctx.user.sub).order('enrolled_at', {
            ascending: false
        });
        if (error) throw new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$trpc$2b$server$40$11$2e$17$2e$0_typescript$40$5$2e$9$2e$3$2f$node_modules$2f40$trpc$2f$server$2f$dist$2f$tracked$2d$DWInO6EQ$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["TRPCError"]({
            code: 'INTERNAL_SERVER_ERROR',
            message: error.message
        });
        return data ?? [];
    }),
    // ─── Consentimiento informado (Ley 1581/2012) ────────────────────────────
    hasConsented: __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$server$2f$trpc$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["protectedProcedure"].query(async ({ ctx })=>{
        const db = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getDb"])();
        const { data } = await db.from('consents').select('id').eq('user_id', ctx.user.sub).eq('tenant_id', ctx.user.tid).eq('consent_type', CONSENT_TYPE).eq('granted', true).is('revoked_at', null).maybeSingle();
        return {
            consented: !!data
        };
    }),
    grantConsent: __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$server$2f$trpc$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["protectedProcedure"].input(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
        userAgent: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().max(500)
    })).mutation(async ({ ctx, input })=>{
        const db = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getDb"])();
        const grantedAt = new Date().toISOString();
        const evidenceRaw = `${ctx.user.sub}:${CONSENT_TYPE}:${POLICY_VERSION}:${grantedAt}`;
        const evidenceHash = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__["createHash"])('sha256').update(evidenceRaw).digest('hex');
        const { error } = await db.from('consents').insert({
            tenant_id: ctx.user.tid,
            user_id: ctx.user.sub,
            policy_version: POLICY_VERSION,
            consent_type: CONSENT_TYPE,
            granted: true,
            granted_at: grantedAt,
            evidence_hash: evidenceHash,
            user_agent: input.userAgent.slice(0, 500)
        });
        if (error) throw new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$trpc$2b$server$40$11$2e$17$2e$0_typescript$40$5$2e$9$2e$3$2f$node_modules$2f40$trpc$2f$server$2f$dist$2f$tracked$2d$DWInO6EQ$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["TRPCError"]({
            code: 'INTERNAL_SERVER_ERROR',
            message: error.message
        });
        await db.from('audit_logs').insert({
            tenant_id: ctx.user.tid,
            actor_id: ctx.user.sub,
            action: 'consent.granted',
            target_type: 'consent'
        }).throwOnError();
        return {
            ok: true
        };
    })
});
}),
"[project]/apps/web/src/server/routers/notifications.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "notificationsRouter",
    ()=>notificationsRouter
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/external.js [app-route] (ecmascript) <export * as z>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$trpc$2b$server$40$11$2e$17$2e$0_typescript$40$5$2e$9$2e$3$2f$node_modules$2f40$trpc$2f$server$2f$dist$2f$tracked$2d$DWInO6EQ$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/@trpc+server@11.17.0_typescript@5.9.3/node_modules/@trpc/server/dist/tracked-DWInO6EQ.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$server$2f$trpc$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/src/server/trpc.ts [app-route] (ecmascript)");
;
;
;
const notificationsRouter = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$server$2f$trpc$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["router"])({
    // ─── Mis notificaciones ───────────────────────────────────────────────────
    getMyNotifications: __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$server$2f$trpc$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["protectedProcedure"].input(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
        limit: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().int().min(1).max(50).default(20),
        unreadOnly: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].boolean().default(false)
    })).query(async ({ ctx, input })=>{
        let query = ctx.db.from('alert_notifications').select('id, title, body, severity, read_at, created_at, subject_user_id, users!alert_notifications_subject_user_id_fkey(full_name, email)').eq('tenant_id', ctx.user.tid).eq('recipient_id', ctx.user.sub).order('created_at', {
            ascending: false
        }).limit(input.limit);
        if (input.unreadOnly) {
            query = query.is('read_at', null);
        }
        const { data, error } = await query;
        if (error) throw new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$trpc$2b$server$40$11$2e$17$2e$0_typescript$40$5$2e$9$2e$3$2f$node_modules$2f40$trpc$2f$server$2f$dist$2f$tracked$2d$DWInO6EQ$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["TRPCError"]({
            code: 'INTERNAL_SERVER_ERROR',
            message: error.message
        });
        return (data ?? []).map((n)=>({
                id: n.id,
                title: n.title,
                body: n.body,
                severity: n.severity,
                read_at: n.read_at,
                created_at: n.created_at,
                subject_name: n.users?.full_name ?? null
            }));
    }),
    getUnreadCount: __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$server$2f$trpc$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["protectedProcedure"].query(async ({ ctx })=>{
        const { count, error } = await ctx.db.from('alert_notifications').select('*', {
            count: 'exact',
            head: true
        }).eq('tenant_id', ctx.user.tid).eq('recipient_id', ctx.user.sub).is('read_at', null);
        if (error) throw new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$trpc$2b$server$40$11$2e$17$2e$0_typescript$40$5$2e$9$2e$3$2f$node_modules$2f40$trpc$2f$server$2f$dist$2f$tracked$2d$DWInO6EQ$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["TRPCError"]({
            code: 'INTERNAL_SERVER_ERROR',
            message: error.message
        });
        return {
            count: count ?? 0
        };
    }),
    markAsRead: __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$server$2f$trpc$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["protectedProcedure"].input(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
        ids: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].array(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().uuid()).min(1).max(50)
    })).mutation(async ({ ctx, input })=>{
        const { error } = await ctx.db.from('alert_notifications').update({
            read_at: new Date().toISOString()
        }).in('id', input.ids).eq('tenant_id', ctx.user.tid).eq('recipient_id', ctx.user.sub).is('read_at', null);
        if (error) throw new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$trpc$2b$server$40$11$2e$17$2e$0_typescript$40$5$2e$9$2e$3$2f$node_modules$2f40$trpc$2f$server$2f$dist$2f$tracked$2d$DWInO6EQ$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["TRPCError"]({
            code: 'INTERNAL_SERVER_ERROR',
            message: error.message
        });
        return {
            ok: true
        };
    }),
    markAllAsRead: __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$server$2f$trpc$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["protectedProcedure"].mutation(async ({ ctx })=>{
        const { error } = await ctx.db.from('alert_notifications').update({
            read_at: new Date().toISOString()
        }).eq('tenant_id', ctx.user.tid).eq('recipient_id', ctx.user.sub).is('read_at', null);
        if (error) throw new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$trpc$2b$server$40$11$2e$17$2e$0_typescript$40$5$2e$9$2e$3$2f$node_modules$2f40$trpc$2f$server$2f$dist$2f$tracked$2d$DWInO6EQ$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["TRPCError"]({
            code: 'INTERNAL_SERVER_ERROR',
            message: error.message
        });
        return {
            ok: true
        };
    }),
    // ─── Reglas de alerta (admin) ─────────────────────────────────────────────
    listAlertRules: __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$server$2f$trpc$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["adminProcedure"].query(async ({ ctx })=>{
        const { data, error } = await ctx.db.from('alert_rules').select('id, name, rule_type, threshold_value, consecutive_days, scope, scope_id, notify_manager, notify_admin, is_active, created_at').eq('tenant_id', ctx.user.tid).order('created_at', {
            ascending: false
        });
        if (error) throw new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$trpc$2b$server$40$11$2e$17$2e$0_typescript$40$5$2e$9$2e$3$2f$node_modules$2f40$trpc$2f$server$2f$dist$2f$tracked$2d$DWInO6EQ$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["TRPCError"]({
            code: 'INTERNAL_SERVER_ERROR',
            message: error.message
        });
        return data ?? [];
    }),
    createAlertRule: __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$server$2f$trpc$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["adminProcedure"].input(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
        name: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().min(1).max(100),
        rule_type: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].enum([
            'low_productivity',
            'overtime',
            'inactivity',
            'high_non_productive'
        ]),
        threshold_value: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().min(0).max(9999),
        consecutive_days: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().int().min(1).max(30).default(1),
        scope: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].enum([
            'all',
            'team',
            'user'
        ]).default('all'),
        scope_id: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().uuid().optional(),
        notify_manager: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].boolean().default(true),
        notify_admin: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].boolean().default(true)
    })).mutation(async ({ ctx, input })=>{
        const { data, error } = await ctx.db.from('alert_rules').insert({
            tenant_id: ctx.user.tid,
            created_by: ctx.user.sub,
            name: input.name,
            rule_type: input.rule_type,
            threshold_value: input.threshold_value,
            consecutive_days: input.consecutive_days,
            scope: input.scope,
            scope_id: input.scope_id ?? null,
            notify_manager: input.notify_manager,
            notify_admin: input.notify_admin
        }).select().single();
        if (error) throw new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$trpc$2b$server$40$11$2e$17$2e$0_typescript$40$5$2e$9$2e$3$2f$node_modules$2f40$trpc$2f$server$2f$dist$2f$tracked$2d$DWInO6EQ$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["TRPCError"]({
            code: 'INTERNAL_SERVER_ERROR',
            message: error.message
        });
        return data;
    }),
    updateAlertRule: __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$server$2f$trpc$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["adminProcedure"].input(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
        id: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().uuid(),
        name: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().min(1).max(100).optional(),
        threshold_value: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().min(0).max(9999).optional(),
        consecutive_days: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().int().min(1).max(30).optional(),
        notify_manager: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].boolean().optional(),
        notify_admin: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].boolean().optional(),
        is_active: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].boolean().optional()
    })).mutation(async ({ ctx, input })=>{
        const { id, ...fields } = input;
        const { error } = await ctx.db.from('alert_rules').update(fields).eq('id', id).eq('tenant_id', ctx.user.tid);
        if (error) throw new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$trpc$2b$server$40$11$2e$17$2e$0_typescript$40$5$2e$9$2e$3$2f$node_modules$2f40$trpc$2f$server$2f$dist$2f$tracked$2d$DWInO6EQ$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["TRPCError"]({
            code: 'INTERNAL_SERVER_ERROR',
            message: error.message
        });
        return {
            ok: true
        };
    }),
    deleteAlertRule: __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$server$2f$trpc$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["adminProcedure"].input(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
        id: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().uuid()
    })).mutation(async ({ ctx, input })=>{
        const { error } = await ctx.db.from('alert_rules').delete().eq('id', input.id).eq('tenant_id', ctx.user.tid);
        if (error) throw new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$trpc$2b$server$40$11$2e$17$2e$0_typescript$40$5$2e$9$2e$3$2f$node_modules$2f40$trpc$2f$server$2f$dist$2f$tracked$2d$DWInO6EQ$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["TRPCError"]({
            code: 'INTERNAL_SERVER_ERROR',
            message: error.message
        });
        return {
            ok: true
        };
    }),
    triggerAlertEvaluation: __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$server$2f$trpc$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["adminProcedure"].input(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
        date: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
    })).mutation(async ({ ctx, input })=>{
        const p_date = input.date ?? new Date().toISOString().slice(0, 10);
        const { data, error } = await ctx.db.rpc('evaluate_alerts', {
            p_date,
            p_tenant_id: ctx.user.tid
        });
        if (error) throw new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$trpc$2b$server$40$11$2e$17$2e$0_typescript$40$5$2e$9$2e$3$2f$node_modules$2f40$trpc$2f$server$2f$dist$2f$tracked$2d$DWInO6EQ$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["TRPCError"]({
            code: 'INTERNAL_SERVER_ERROR',
            message: error.message
        });
        return {
            notifications_created: data
        };
    })
});
}),
"[project]/apps/web/src/lib/api-auth.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "generateApiToken",
    ()=>generateApiToken,
    "hashApiToken",
    ()=>hashApiToken,
    "requireScope",
    ()=>requireScope,
    "verifyApiToken",
    ()=>verifyApiToken
]);
var __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/crypto [external] (crypto, cjs)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/src/lib/db.ts [app-route] (ecmascript)");
;
;
function generateApiToken() {
    const raw = `bcw_${(0, __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__["randomBytes"])(32).toString('hex')}`;
    const hash = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__["createHash"])('sha256').update(raw).digest('hex');
    return {
        raw,
        hash
    };
}
function hashApiToken(raw) {
    return (0, __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__["createHash"])('sha256').update(raw).digest('hex');
}
async function verifyApiToken(authHeader) {
    if (!authHeader?.startsWith('Bearer ')) return null;
    const raw = authHeader.slice(7);
    const hash = hashApiToken(raw);
    const db = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getDb"])();
    const { data } = await db.from('api_tokens').select('id, tenant_id, scopes, expires_at').eq('token_hash', hash).is('revoked_at', null).maybeSingle();
    if (!data) return null;
    if (data.expires_at && new Date(data.expires_at) < new Date()) return null;
    // Actualizar last_used_at de forma async (no bloqueante)
    void db.from('api_tokens').update({
        last_used_at: new Date().toISOString()
    }).eq('id', data.id);
    return {
        tokenId: data.id,
        tenantId: data.tenant_id,
        scopes: data.scopes
    };
}
function requireScope(payload, scope) {
    return payload.scopes.includes(scope) || payload.scopes.includes('*');
}
}),
"[project]/apps/web/src/server/routers/integrations.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "integrationsRouter",
    ()=>integrationsRouter
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/external.js [app-route] (ecmascript) <export * as z>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$trpc$2b$server$40$11$2e$17$2e$0_typescript$40$5$2e$9$2e$3$2f$node_modules$2f40$trpc$2f$server$2f$dist$2f$tracked$2d$DWInO6EQ$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/@trpc+server@11.17.0_typescript@5.9.3/node_modules/@trpc/server/dist/tracked-DWInO6EQ.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$server$2f$trpc$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/src/server/trpc.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$lib$2f$api$2d$auth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/src/lib/api-auth.ts [app-route] (ecmascript)");
;
;
;
;
const AVAILABLE_SCOPES = [
    'payroll:read',
    'users:read',
    'metrics:read',
    'sessions:read'
];
const integrationsRouter = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$server$2f$trpc$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["router"])({
    // ─── API Tokens ────────────────────────────────────────────────────────────
    listApiTokens: __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$server$2f$trpc$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["adminProcedure"].query(async ({ ctx })=>{
        const { data, error } = await ctx.db.from('api_tokens').select('id, name, scopes, last_used_at, expires_at, revoked_at, created_at').eq('tenant_id', ctx.user.tid).order('created_at', {
            ascending: false
        });
        if (error) throw new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$trpc$2b$server$40$11$2e$17$2e$0_typescript$40$5$2e$9$2e$3$2f$node_modules$2f40$trpc$2f$server$2f$dist$2f$tracked$2d$DWInO6EQ$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["TRPCError"]({
            code: 'INTERNAL_SERVER_ERROR',
            message: error.message
        });
        return data ?? [];
    }),
    createApiToken: __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$server$2f$trpc$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["adminProcedure"].input(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
        name: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().min(1).max(80),
        scopes: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].array(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].enum(AVAILABLE_SCOPES)).min(1),
        expires_days: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().int().min(1).max(3650).optional()
    })).mutation(async ({ ctx, input })=>{
        const { raw, hash } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$lib$2f$api$2d$auth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["generateApiToken"])();
        const expires_at = input.expires_days ? new Date(Date.now() + input.expires_days * 86400000).toISOString() : null;
        const { data, error } = await ctx.db.from('api_tokens').insert({
            tenant_id: ctx.user.tid,
            created_by: ctx.user.sub,
            name: input.name,
            token_hash: hash,
            scopes: input.scopes,
            expires_at
        }).select('id, name, scopes, expires_at, created_at').single();
        if (error) throw new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$trpc$2b$server$40$11$2e$17$2e$0_typescript$40$5$2e$9$2e$3$2f$node_modules$2f40$trpc$2f$server$2f$dist$2f$tracked$2d$DWInO6EQ$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["TRPCError"]({
            code: 'INTERNAL_SERVER_ERROR',
            message: error.message
        });
        return {
            ...data,
            raw_token: raw
        };
    }),
    revokeApiToken: __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$server$2f$trpc$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["adminProcedure"].input(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
        id: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().uuid()
    })).mutation(async ({ ctx, input })=>{
        const { error } = await ctx.db.from('api_tokens').update({
            revoked_at: new Date().toISOString()
        }).eq('id', input.id).eq('tenant_id', ctx.user.tid);
        if (error) throw new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$trpc$2b$server$40$11$2e$17$2e$0_typescript$40$5$2e$9$2e$3$2f$node_modules$2f40$trpc$2f$server$2f$dist$2f$tracked$2d$DWInO6EQ$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["TRPCError"]({
            code: 'INTERNAL_SERVER_ERROR',
            message: error.message
        });
        return {
            ok: true
        };
    }),
    // ─── Webhooks ──────────────────────────────────────────────────────────────
    listWebhooks: __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$server$2f$trpc$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["adminProcedure"].query(async ({ ctx })=>{
        const { data, error } = await ctx.db.from('webhooks').select('id, name, url, events, is_active, last_called_at, last_status_code, created_at').eq('tenant_id', ctx.user.tid).order('created_at', {
            ascending: false
        });
        if (error) throw new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$trpc$2b$server$40$11$2e$17$2e$0_typescript$40$5$2e$9$2e$3$2f$node_modules$2f40$trpc$2f$server$2f$dist$2f$tracked$2d$DWInO6EQ$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["TRPCError"]({
            code: 'INTERNAL_SERVER_ERROR',
            message: error.message
        });
        return data ?? [];
    }),
    createWebhook: __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$server$2f$trpc$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["adminProcedure"].input(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
        name: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().min(1).max(80),
        url: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().url(),
        secret: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().min(8).max(128).optional(),
        events: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].array(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string()).default([])
    })).mutation(async ({ ctx, input })=>{
        const { data, error } = await ctx.db.from('webhooks').insert({
            tenant_id: ctx.user.tid,
            created_by: ctx.user.sub,
            name: input.name,
            url: input.url,
            secret: input.secret ?? null,
            events: input.events
        }).select('id, name, url, events, is_active, created_at').single();
        if (error) throw new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$trpc$2b$server$40$11$2e$17$2e$0_typescript$40$5$2e$9$2e$3$2f$node_modules$2f40$trpc$2f$server$2f$dist$2f$tracked$2d$DWInO6EQ$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["TRPCError"]({
            code: 'INTERNAL_SERVER_ERROR',
            message: error.message
        });
        return data;
    }),
    updateWebhook: __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$server$2f$trpc$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["adminProcedure"].input(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
        id: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().uuid(),
        is_active: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].boolean().optional(),
        url: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().url().optional(),
        events: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].array(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string()).optional()
    })).mutation(async ({ ctx, input })=>{
        const { id, ...fields } = input;
        const { error } = await ctx.db.from('webhooks').update(fields).eq('id', id).eq('tenant_id', ctx.user.tid);
        if (error) throw new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$trpc$2b$server$40$11$2e$17$2e$0_typescript$40$5$2e$9$2e$3$2f$node_modules$2f40$trpc$2f$server$2f$dist$2f$tracked$2d$DWInO6EQ$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["TRPCError"]({
            code: 'INTERNAL_SERVER_ERROR',
            message: error.message
        });
        return {
            ok: true
        };
    }),
    deleteWebhook: __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$server$2f$trpc$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["adminProcedure"].input(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
        id: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().uuid()
    })).mutation(async ({ ctx, input })=>{
        const { error } = await ctx.db.from('webhooks').delete().eq('id', input.id).eq('tenant_id', ctx.user.tid);
        if (error) throw new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$trpc$2b$server$40$11$2e$17$2e$0_typescript$40$5$2e$9$2e$3$2f$node_modules$2f40$trpc$2f$server$2f$dist$2f$tracked$2d$DWInO6EQ$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["TRPCError"]({
            code: 'INTERNAL_SERVER_ERROR',
            message: error.message
        });
        return {
            ok: true
        };
    }),
    getWebhookDeliveries: __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$server$2f$trpc$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["adminProcedure"].input(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
        webhookId: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().uuid(),
        limit: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().int().min(1).max(50).default(20)
    })).query(async ({ ctx, input })=>{
        const { data, error } = await ctx.db.from('webhook_deliveries').select('id, event, status_code, error, created_at').eq('webhook_id', input.webhookId).eq('tenant_id', ctx.user.tid).order('created_at', {
            ascending: false
        }).limit(input.limit);
        if (error) throw new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$trpc$2b$server$40$11$2e$17$2e$0_typescript$40$5$2e$9$2e$3$2f$node_modules$2f40$trpc$2f$server$2f$dist$2f$tracked$2d$DWInO6EQ$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["TRPCError"]({
            code: 'INTERNAL_SERVER_ERROR',
            message: error.message
        });
        return data ?? [];
    }),
    testWebhook: __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$server$2f$trpc$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["adminProcedure"].input(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
        id: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().uuid()
    })).mutation(async ({ ctx, input })=>{
        const { data: hook, error } = await ctx.db.from('webhooks').select('url, secret').eq('id', input.id).eq('tenant_id', ctx.user.tid).single();
        if (error || !hook) throw new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$trpc$2b$server$40$11$2e$17$2e$0_typescript$40$5$2e$9$2e$3$2f$node_modules$2f40$trpc$2f$server$2f$dist$2f$tracked$2d$DWInO6EQ$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["TRPCError"]({
            code: 'NOT_FOUND',
            message: 'Webhook no encontrado'
        });
        const { dispatchWebhook } = await __turbopack_context__.A("[project]/apps/web/src/lib/webhooks.ts [app-route] (ecmascript, async loader)");
        await dispatchWebhook(ctx.user.tid, 'test', {
            message: 'BCWork webhook test',
            timestamp: new Date().toISOString()
        });
        return {
            ok: true
        };
    })
});
}),
"[project]/apps/web/src/server/routers/index.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "appRouter",
    ()=>appRouter
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$server$2f$trpc$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/src/server/trpc.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$server$2f$routers$2f$auth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/src/server/routers/auth.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$server$2f$routers$2f$platform$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/src/server/routers/platform.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$server$2f$routers$2f$admin$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/src/server/routers/admin.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$server$2f$routers$2f$manager$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/src/server/routers/manager.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$server$2f$routers$2f$employee$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/src/server/routers/employee.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$server$2f$routers$2f$notifications$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/src/server/routers/notifications.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$server$2f$routers$2f$integrations$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/src/server/routers/integrations.ts [app-route] (ecmascript)");
;
;
;
;
;
;
;
;
const appRouter = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$server$2f$trpc$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["router"])({
    auth: __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$server$2f$routers$2f$auth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["authRouter"],
    platform: __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$server$2f$routers$2f$platform$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["platformRouter"],
    admin: __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$server$2f$routers$2f$admin$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["adminRouter"],
    manager: __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$server$2f$routers$2f$manager$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["managerRouter"],
    employee: __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$server$2f$routers$2f$employee$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["employeeRouter"],
    notifications: __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$server$2f$routers$2f$notifications$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["notificationsRouter"],
    integrations: __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$server$2f$routers$2f$integrations$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["integrationsRouter"]
});
}),
"[project]/apps/web/src/lib/auth/session.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "clearAuthCookies",
    ()=>clearAuthCookies,
    "getAccessToken",
    ()=>getAccessToken,
    "getAccessTokenFromHeaders",
    ()=>getAccessTokenFromHeaders,
    "getRefreshToken",
    ()=>getRefreshToken,
    "setAuthCookies",
    ()=>setAuthCookies
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$shared$2f$src$2f$index$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/packages/shared/src/index.ts [app-route] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$shared$2f$src$2f$constants$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/shared/src/constants.ts [app-route] (ecmascript)");
;
const REFRESH_COOKIE = 'bcw_rt';
const ACCESS_COOKIE = 'bcw_at';
const COOKIE_BASE = {
    httpOnly: true,
    secure: ("TURBOPACK compile-time value", "development") === 'production',
    sameSite: 'strict',
    path: '/'
};
function setAuthCookies(res, accessToken, refreshToken) {
    res.cookies.set(ACCESS_COOKIE, accessToken, {
        ...COOKIE_BASE,
        maxAge: 15 * 60
    });
    res.cookies.set(REFRESH_COOKIE, refreshToken, {
        ...COOKIE_BASE,
        maxAge: __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$shared$2f$src$2f$constants$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["REFRESH_TOKEN_EXPIRY_DAYS"] * 24 * 60 * 60,
        path: '/api/trpc/auth.refresh'
    });
}
function clearAuthCookies(res) {
    res.cookies.delete(ACCESS_COOKIE);
    res.cookies.delete(REFRESH_COOKIE);
}
function getAccessToken(req) {
    return req.cookies.get(ACCESS_COOKIE)?.value;
}
function getRefreshToken(req) {
    return req.cookies.get(REFRESH_COOKIE)?.value;
}
function getAccessTokenFromHeaders(headers) {
    const auth = headers.get('authorization');
    if (auth?.startsWith('Bearer ')) return auth.slice(7);
    // También aceptar desde cookie en server components
    const cookie = headers.get('cookie');
    if (!cookie) return undefined;
    const match = cookie.match(new RegExp(`${ACCESS_COOKIE}=([^;]+)`));
    return match?.[1];
}
}),
"[project]/apps/web/src/server/context.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "createContext",
    ()=>createContext
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/src/lib/db.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$lib$2f$auth$2f$jwt$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/src/lib/auth/jwt.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$lib$2f$auth$2f$session$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/src/lib/auth/session.ts [app-route] (ecmascript)");
;
;
;
async function createContext(req) {
    const db = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getDb"])();
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '0.0.0.0';
    const userAgent = req.headers.get('user-agent') ?? '';
    const token = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$lib$2f$auth$2f$session$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getAccessTokenFromHeaders"])(req.headers);
    if (!token) return {
        db,
        user: null,
        ip,
        userAgent
    };
    try {
        const user = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$lib$2f$auth$2f$jwt$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["verifyAccessToken"])(token);
        // Setear contexto de tenant en Postgres para que RLS funcione
        if (user.tid) await (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["setTenantContext"])(db, user.tid, user.role);
        return {
            db,
            user,
            ip,
            userAgent
        };
    } catch  {
        return {
            db,
            user: null,
            ip,
            userAgent
        };
    }
}
}),
"[project]/apps/web/src/app/api/trpc/[trpc]/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "GET",
    ()=>handler,
    "POST",
    ()=>handler
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$trpc$2b$server$40$11$2e$17$2e$0_typescript$40$5$2e$9$2e$3$2f$node_modules$2f40$trpc$2f$server$2f$dist$2f$adapters$2f$fetch$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/@trpc+server@11.17.0_typescript@5.9.3/node_modules/@trpc/server/dist/adapters/fetch/index.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$server$2f$routers$2f$index$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/src/server/routers/index.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$server$2f$context$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/src/server/context.ts [app-route] (ecmascript)");
;
;
;
const handler = (req)=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$trpc$2b$server$40$11$2e$17$2e$0_typescript$40$5$2e$9$2e$3$2f$node_modules$2f40$trpc$2f$server$2f$dist$2f$adapters$2f$fetch$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["fetchRequestHandler"])({
        endpoint: '/api/trpc',
        req,
        router: __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$server$2f$routers$2f$index$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["appRouter"],
        createContext: ()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$server$2f$context$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["createContext"])(req),
        onError ({ path, error }) {
            if ("TURBOPACK compile-time truthy", 1) {
                console.error(`tRPC error on ${path ?? '<no-path>'}:`, error);
            }
        }
    });
;
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__c175382e._.js.map