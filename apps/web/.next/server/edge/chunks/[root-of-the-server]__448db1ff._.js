(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push(["chunks/[root-of-the-server]__448db1ff._.js",
"[externals]/node:buffer [external] (node:buffer, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("node:buffer", () => require("node:buffer"));

module.exports = mod;
}),
"[externals]/node:async_hooks [external] (node:async_hooks, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("node:async_hooks", () => require("node:async_hooks"));

module.exports = mod;
}),
"[project]/packages/shared/src/schemas.ts [middleware-edge] (ecmascript)", ((__turbopack_context__) => {
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
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/external.js [middleware-edge] (ecmascript) <export * as z>");
;
const emailSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().email().toLowerCase();
const passwordSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().min(12, 'Mínimo 12 caracteres').regex(/[A-Z]/, 'Debe contener al menos una mayúscula').regex(/[a-z]/, 'Debe contener al menos una minúscula').regex(/[0-9]/, 'Debe contener al menos un número').regex(/[^A-Za-z0-9]/, 'Debe contener al menos un carácter especial');
const loginSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    email: emailSchema,
    password: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().min(1),
    mfa_code: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().length(6).optional()
});
const signupTenantSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    legal_name: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().min(2).max(200),
    trade_name: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().max(200).optional(),
    nit: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().regex(/^\d{9,10}-\d$/, 'NIT inválido (formato: 123456789-0)'),
    contact_email: emailSchema,
    contact_phone: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().max(20).optional(),
    timezone: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().default('America/Bogota'),
    admin_full_name: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().min(2).max(200),
    admin_password: passwordSchema
});
const agentBatchSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    batch_id: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().uuid(),
    events: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].array(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
        event_type: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].enum([
            'app_focus',
            'domain_visit',
            'idle_start',
            'idle_end',
            'pause',
            'resume'
        ]),
        app_identifier: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().max(255).optional(),
        domain: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().max(255).optional(),
        window_title: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().max(500).optional(),
        productivity: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].enum([
            'productive',
            'neutral',
            'non_productive'
        ]).optional(),
        started_at: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().datetime(),
        duration_seconds: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().int().min(0).max(86400),
        metadata: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].record(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].unknown()).optional()
    })).max(1000),
    session_state: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
        session_id: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().uuid().optional(),
        started_at: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().datetime(),
        ip: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().optional(),
        is_active: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].boolean(),
        active_seconds: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().int().min(0),
        idle_seconds: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$zod$40$3$2e$25$2e$76$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().int().min(0)
    })
});
}),
"[project]/packages/shared/src/constants.ts [middleware-edge] (ecmascript)", ((__turbopack_context__) => {
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
"[project]/packages/shared/src/types.ts [middleware-edge] (ecmascript)", ((__turbopack_context__) => {
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
"[project]/packages/shared/src/index.ts [middleware-edge] (ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([]);
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$shared$2f$src$2f$schemas$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/shared/src/schemas.ts [middleware-edge] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$shared$2f$src$2f$constants$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/shared/src/constants.ts [middleware-edge] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$shared$2f$src$2f$types$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/shared/src/types.ts [middleware-edge] (ecmascript)");
;
;
;
}),
"[project]/apps/web/src/lib/auth/jwt.ts [middleware-edge] (ecmascript)", ((__turbopack_context__) => {
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
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$jose$40$5$2e$10$2e$0$2f$node_modules$2f$jose$2f$dist$2f$browser$2f$jwt$2f$sign$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/jose@5.10.0/node_modules/jose/dist/browser/jwt/sign.js [middleware-edge] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$jose$40$5$2e$10$2e$0$2f$node_modules$2f$jose$2f$dist$2f$browser$2f$jwt$2f$verify$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/jose@5.10.0/node_modules/jose/dist/browser/jwt/verify.js [middleware-edge] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$shared$2f$src$2f$index$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/packages/shared/src/index.ts [middleware-edge] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$shared$2f$src$2f$constants$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/shared/src/constants.ts [middleware-edge] (ecmascript)");
;
;
function getSecret(key) {
    const secret = process.env[key];
    if (!secret) throw new Error(`Missing env var: ${key}`);
    return new TextEncoder().encode(secret);
}
async function signAccessToken(payload) {
    return new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$jose$40$5$2e$10$2e$0$2f$node_modules$2f$jose$2f$dist$2f$browser$2f$jwt$2f$sign$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["SignJWT"](payload).setProtectedHeader({
        alg: 'HS256'
    }).setIssuedAt().setExpirationTime(`${__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$shared$2f$src$2f$constants$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["JWT_EXPIRY_SECONDS"]}s`).sign(getSecret('JWT_SECRET'));
}
async function signRefreshToken(userId, sessionId) {
    return new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$jose$40$5$2e$10$2e$0$2f$node_modules$2f$jose$2f$dist$2f$browser$2f$jwt$2f$sign$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["SignJWT"]({
        sub: userId,
        sid: sessionId,
        type: 'refresh'
    }).setProtectedHeader({
        alg: 'HS256'
    }).setIssuedAt().setExpirationTime(`${__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$shared$2f$src$2f$constants$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["REFRESH_TOKEN_EXPIRY_DAYS"]}d`).sign(getSecret('JWT_REFRESH_SECRET'));
}
async function verifyAccessToken(token) {
    const { payload } = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$jose$40$5$2e$10$2e$0$2f$node_modules$2f$jose$2f$dist$2f$browser$2f$jwt$2f$verify$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["jwtVerify"])(token, getSecret('JWT_SECRET'));
    return payload;
}
async function verifyRefreshToken(token) {
    const { payload } = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$jose$40$5$2e$10$2e$0$2f$node_modules$2f$jose$2f$dist$2f$browser$2f$jwt$2f$verify$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["jwtVerify"])(token, getSecret('JWT_REFRESH_SECRET'));
    if (payload['type'] !== 'refresh') throw new Error('Invalid token type');
    return {
        sub: payload.sub,
        sid: payload['sid']
    };
}
}),
"[project]/apps/web/src/lib/auth/session.ts [middleware-edge] (ecmascript)", ((__turbopack_context__) => {
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
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$shared$2f$src$2f$index$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/packages/shared/src/index.ts [middleware-edge] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$shared$2f$src$2f$constants$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/shared/src/constants.ts [middleware-edge] (ecmascript)");
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
        maxAge: __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$shared$2f$src$2f$constants$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["REFRESH_TOKEN_EXPIRY_DAYS"] * 24 * 60 * 60,
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
"[project]/apps/web/src/lib/rate-limit.ts [middleware-edge] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * Sliding-window rate limiter — in-process, per Edge worker.
 * Para escala multi-instancia, reemplazar con Upstash Redis.
 */ __turbopack_context__.s([
    "rateLimit",
    ()=>rateLimit
]);
const store = new Map();
const CLEANUP_INTERVAL = 60_000;
let lastCleanup = Date.now();
function cleanup() {
    const now = Date.now();
    if (now - lastCleanup < CLEANUP_INTERVAL) return;
    lastCleanup = now;
    for (const [key, win] of store){
        if (now > win.resetAt) store.delete(key);
    }
}
function rateLimit(key, limit, windowSeconds) {
    cleanup();
    const now = Date.now();
    const resetAt = now + windowSeconds * 1000;
    const win = store.get(key);
    if (!win || now > win.resetAt) {
        store.set(key, {
            count: 1,
            resetAt
        });
        return {
            success: true,
            limit,
            remaining: limit - 1,
            reset: Math.ceil(resetAt / 1000)
        };
    }
    win.count++;
    const remaining = Math.max(0, limit - win.count);
    return {
        success: win.count <= limit,
        limit,
        remaining,
        reset: Math.ceil(win.resetAt / 1000)
    };
}
}),
"[project]/apps/web/src/middleware.ts [middleware-edge] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "config",
    ()=>config,
    "middleware",
    ()=>middleware
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$15_$40$opentelemetry_def8fc46c0914663bed16e707dd599e8$2f$node_modules$2f$next$2f$dist$2f$esm$2f$api$2f$server$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@15.5.15_@opentelemetry_def8fc46c0914663bed16e707dd599e8/node_modules/next/dist/esm/api/server.js [middleware-edge] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$15_$40$opentelemetry_def8fc46c0914663bed16e707dd599e8$2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@15.5.15_@opentelemetry_def8fc46c0914663bed16e707dd599e8/node_modules/next/dist/esm/server/web/exports/index.js [middleware-edge] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$lib$2f$auth$2f$jwt$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/src/lib/auth/jwt.ts [middleware-edge] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$lib$2f$auth$2f$session$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/src/lib/auth/session.ts [middleware-edge] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$lib$2f$rate$2d$limit$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/src/lib/rate-limit.ts [middleware-edge] (ecmascript)");
;
;
;
;
// Rutas que NO requieren autenticación
const PUBLIC_PATHS = new Set([
    '/',
    '/login',
    '/signup',
    '/consent',
    '/api/trpc/auth.login',
    '/api/trpc/auth.signupTenant',
    '/api/trpc/auth.refresh',
    '/api/auth/set-session'
]);
// Rutas públicas por prefijo
const PUBLIC_PREFIXES = [
    '/api/trpc/auth.',
    '/api/v1/',
    '/api/ingest/',
    '/legal/'
];
// Rutas que solo platform_admin puede acceder
const PLATFORM_ADMIN_PATHS = [
    '/super-admin'
];
// Rutas por rol de tenant
const ROLE_PATHS = {
    tenant_admin: [
        '/admin',
        '/onboarding'
    ],
    manager: [
        '/manager'
    ],
    employee: [
        '/me'
    ]
};
// Rate limit: 60 req/min por IP para la API v1
const API_V1_LIMIT = {
    limit: 60,
    window: 60
};
// Rate limit: 120 req/min por IP para la API de ingest (el agente envía en batch)
const INGEST_LIMIT = {
    limit: 120,
    window: 60
};
function getClientIp(req) {
    return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? req.headers.get('x-real-ip') ?? 'unknown';
}
async function middleware(req) {
    const { pathname } = req.nextUrl;
    // Siempre permitir assets y rutas Next.js internas
    if (pathname.startsWith('/_next') || pathname.startsWith('/favicon') || pathname.startsWith('/api/health')) {
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$15_$40$opentelemetry_def8fc46c0914663bed16e707dd599e8$2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].next();
    }
    // OPTIONS (preflight CORS)
    if (req.method === 'OPTIONS' && pathname.startsWith('/api/v1/')) {
        return new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$15_$40$opentelemetry_def8fc46c0914663bed16e707dd599e8$2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"](null, {
            status: 204
        });
    }
    // Rate limiting en API v1
    if (pathname.startsWith('/api/v1/')) {
        const ip = getClientIp(req);
        const result = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$lib$2f$rate$2d$limit$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["rateLimit"])(`v1:${ip}`, API_V1_LIMIT.limit, API_V1_LIMIT.window);
        if (!result.success) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$15_$40$opentelemetry_def8fc46c0914663bed16e707dd599e8$2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: 'Too Many Requests'
            }, {
                status: 429,
                headers: {
                    'X-RateLimit-Limit': String(result.limit),
                    'X-RateLimit-Remaining': '0',
                    'X-RateLimit-Reset': String(result.reset),
                    'Retry-After': String(result.reset - Math.floor(Date.now() / 1000))
                }
            });
        }
    }
    // Rate limiting en ingest
    if (pathname.startsWith('/api/ingest/')) {
        const ip = getClientIp(req);
        const result = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$lib$2f$rate$2d$limit$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["rateLimit"])(`ingest:${ip}`, INGEST_LIMIT.limit, INGEST_LIMIT.window);
        if (!result.success) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$15_$40$opentelemetry_def8fc46c0914663bed16e707dd599e8$2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: 'Too Many Requests'
            }, {
                status: 429
            });
        }
    }
    // Rutas públicas — pasar sin verificar token
    if (PUBLIC_PATHS.has(pathname) || PUBLIC_PREFIXES.some((p)=>pathname.startsWith(p))) {
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$15_$40$opentelemetry_def8fc46c0914663bed16e707dd599e8$2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].next();
    }
    const token = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$lib$2f$auth$2f$session$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["getAccessToken"])(req);
    // Sin token → redirigir a login
    if (!token) {
        const loginUrl = new URL('/login', req.url);
        loginUrl.searchParams.set('callbackUrl', pathname);
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$15_$40$opentelemetry_def8fc46c0914663bed16e707dd599e8$2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].redirect(loginUrl);
    }
    try {
        const user = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$lib$2f$auth$2f$jwt$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["verifyAccessToken"])(token);
        // Verificar acceso por rol
        if (PLATFORM_ADMIN_PATHS.some((p)=>pathname.startsWith(p))) {
            if (user.role !== 'platform_admin') {
                return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$15_$40$opentelemetry_def8fc46c0914663bed16e707dd599e8$2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].redirect(new URL('/login', req.url));
            }
        }
        for (const [role, paths] of Object.entries(ROLE_PATHS)){
            if (paths.some((p)=>pathname.startsWith(p)) && user.role !== role) {
                return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$15_$40$opentelemetry_def8fc46c0914663bed16e707dd599e8$2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].redirect(new URL(getDashboardForRole(user.role), req.url));
            }
        }
        // Redirigir empleados sin consentimiento (solo aplica a rutas /me/*)
        // El chequeo real se hace en el layout del servidor para leer la DB
        const consentHeader = req.headers.get('x-consent-required');
        if (consentHeader === 'true' && pathname.startsWith('/me/') && pathname !== '/consent') {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$15_$40$opentelemetry_def8fc46c0914663bed16e707dd599e8$2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].redirect(new URL('/consent', req.url));
        }
        // Propagar identidad al request para server components
        const headers = new Headers(req.headers);
        headers.set('x-user-id', user.sub);
        headers.set('x-tenant-id', user.tid);
        headers.set('x-user-role', user.role);
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$15_$40$opentelemetry_def8fc46c0914663bed16e707dd599e8$2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].next({
            request: {
                headers
            }
        });
    } catch  {
        const refreshUrl = new URL('/api/auth/refresh-redirect', req.url);
        refreshUrl.searchParams.set('callbackUrl', pathname);
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$15_$40$opentelemetry_def8fc46c0914663bed16e707dd599e8$2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].redirect(refreshUrl);
    }
}
function getDashboardForRole(role) {
    switch(role){
        case 'platform_admin':
            return '/super-admin';
        case 'tenant_admin':
            return '/admin/dashboard';
        case 'manager':
            return '/manager/dashboard';
        case 'employee':
            return '/me/dashboard';
        default:
            return '/login';
    }
}
const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'
    ]
};
}),
]);

//# sourceMappingURL=%5Broot-of-the-server%5D__448db1ff._.js.map