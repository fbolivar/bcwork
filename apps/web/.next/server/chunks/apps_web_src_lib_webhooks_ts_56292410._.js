module.exports = [
"[project]/apps/web/src/lib/webhooks.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "dispatchWebhook",
    ()=>dispatchWebhook
]);
var __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/crypto [external] (crypto, cjs)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/src/lib/db.ts [app-route] (ecmascript)");
;
;
async function dispatchWebhook(tenantId, event, data) {
    const db = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getDb"])();
    const { data: hooks } = await db.from('webhooks').select('id, url, secret, events').eq('tenant_id', tenantId).eq('is_active', true);
    if (!hooks || hooks.length === 0) return;
    const payload = {
        event,
        timestamp: new Date().toISOString(),
        tenant_id: tenantId,
        data
    };
    const body = JSON.stringify(payload);
    await Promise.allSettled(hooks.filter((h)=>h.events.length === 0 || h.events.includes(event)).map(async (hook)=>{
        const headers = {
            'Content-Type': 'application/json',
            'User-Agent': 'BCWork-Webhook/1.0',
            'X-BCWork-Event': event,
            'X-BCWork-Timestamp': payload.timestamp
        };
        if (hook.secret) {
            const sig = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__["createHmac"])('sha256', hook.secret).update(body).digest('hex');
            headers['X-BCWork-Signature'] = `sha256=${sig}`;
        }
        let statusCode = null;
        let errorMsg = null;
        try {
            const res = await fetch(hook.url, {
                method: 'POST',
                headers,
                body,
                signal: AbortSignal.timeout(10000)
            });
            statusCode = res.status;
        } catch (err) {
            errorMsg = err instanceof Error ? err.message : String(err);
        }
        await Promise.all([
            db.from('webhook_deliveries').insert({
                webhook_id: hook.id,
                tenant_id: tenantId,
                event,
                payload,
                status_code: statusCode,
                error: errorMsg
            }),
            db.from('webhooks').update({
                last_called_at: new Date().toISOString(),
                last_status_code: statusCode
            }).eq('id', hook.id)
        ]);
    }));
}
}),
];

//# sourceMappingURL=apps_web_src_lib_webhooks_ts_56292410._.js.map