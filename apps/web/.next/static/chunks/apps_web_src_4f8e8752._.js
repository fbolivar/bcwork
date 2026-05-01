(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/apps/web/src/lib/format.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "daysUntil",
    ()=>daysUntil,
    "formatCOP",
    ()=>formatCOP,
    "formatDate",
    ()=>formatDate,
    "formatDateTime",
    ()=>formatDateTime,
    "formatSeconds",
    ()=>formatSeconds,
    "pct",
    ()=>pct
]);
const COP = new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0
});
function formatCOP(value) {
    return COP.format(value);
}
const DATE_FMT = new Intl.DateTimeFormat('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'America/Bogota'
});
const DATETIME_FMT = new Intl.DateTimeFormat('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Bogota'
});
function formatDate(iso) {
    return DATE_FMT.format(new Date(iso));
}
function formatDateTime(iso) {
    return DATETIME_FMT.format(new Date(iso));
}
function daysUntil(iso) {
    return Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
}
function formatSeconds(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor(seconds % 3600 / 60);
    if (h > 0) return "".concat(h, "h ").concat(m, "m");
    return "".concat(m, "m");
}
function pct(value, total) {
    if (total === 0) return '0%';
    return "".concat(Math.round(value / total * 100), "%");
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/apps/web/src/features/platform/components/PlanEditor.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "PlanEditor",
    ()=>PlanEditor
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$15_$40$opentelemetry_def8fc46c0914663bed16e707dd599e8$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@15.5.15_@opentelemetry_def8fc46c0914663bed16e707dd599e8/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$15_$40$opentelemetry_def8fc46c0914663bed16e707dd599e8$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@15.5.15_@opentelemetry_def8fc46c0914663bed16e707dd599e8/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$lib$2f$trpc$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/src/lib/trpc-client.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$lib$2f$format$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/src/lib/format.ts [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
'use client';
;
;
;
const FEATURE_KEYS = [
    'office_vs_remote',
    'productivity_map',
    'scheduled_reports',
    'api_access',
    'payroll_export',
    'sso',
    'extended_retention'
];
function PlanEditor() {
    _s();
    const { data: plans, isLoading, refetch } = __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$lib$2f$trpc$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["trpc"].platform.listPlans.useQuery();
    const updateMutation = __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$lib$2f$trpc$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["trpc"].platform.updatePlan.useMutation({
        onSuccess: {
            "PlanEditor.useMutation[updateMutation]": ()=>refetch()
        }["PlanEditor.useMutation[updateMutation]"]
    });
    const [editing, setEditing] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$15_$40$opentelemetry_def8fc46c0914663bed16e707dd599e8$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [draft, setDraft] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$15_$40$opentelemetry_def8fc46c0914663bed16e707dd599e8$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])({});
    function startEdit(plan) {
        setEditing(plan.id);
        setDraft({
            name: plan.name,
            monthly_price_per_seat_cop: plan.monthly_price_per_seat_cop,
            features: {
                ...plan.features
            },
            is_active: plan.is_active
        });
    }
    function toggleFeature(key) {
        setDraft((d)=>{
            var _d_features;
            var _d_features1, _d_features_key;
            return {
                ...d,
                features: {
                    ...(_d_features1 = d.features) !== null && _d_features1 !== void 0 ? _d_features1 : {},
                    [key]: !((_d_features_key = (_d_features = d.features) === null || _d_features === void 0 ? void 0 : _d_features[key]) !== null && _d_features_key !== void 0 ? _d_features_key : false)
                }
            };
        });
    }
    if (isLoading) return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$15_$40$opentelemetry_def8fc46c0914663bed16e707dd599e8$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
        className: "text-sm text-gray-400",
        children: "Cargando planes..."
    }, void 0, false, {
        fileName: "[project]/apps/web/src/features/platform/components/PlanEditor.tsx",
        lineNumber: 49,
        columnNumber: 25
    }, this);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$15_$40$opentelemetry_def8fc46c0914663bed16e707dd599e8$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "grid gap-4 sm:grid-cols-3",
        children: (plans !== null && plans !== void 0 ? plans : []).map((plan)=>{
            const isEdit = editing === plan.id;
            const p = plan;
            var _draft_name, _draft_monthly_price_per_seat_cop;
            return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$15_$40$opentelemetry_def8fc46c0914663bed16e707dd599e8$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "rounded-xl border border-gray-200 bg-white p-5",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$15_$40$opentelemetry_def8fc46c0914663bed16e707dd599e8$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "mb-3 flex items-center justify-between",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$15_$40$opentelemetry_def8fc46c0914663bed16e707dd599e8$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "rounded bg-gray-100 px-2 py-0.5 text-xs font-bold uppercase tracking-wider",
                                children: plan.code
                            }, void 0, false, {
                                fileName: "[project]/apps/web/src/features/platform/components/PlanEditor.tsx",
                                lineNumber: 60,
                                columnNumber: 15
                            }, this),
                            !plan.is_active && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$15_$40$opentelemetry_def8fc46c0914663bed16e707dd599e8$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "rounded bg-red-100 px-1.5 py-0.5 text-xs text-red-600",
                                children: "Inactivo"
                            }, void 0, false, {
                                fileName: "[project]/apps/web/src/features/platform/components/PlanEditor.tsx",
                                lineNumber: 64,
                                columnNumber: 17
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/apps/web/src/features/platform/components/PlanEditor.tsx",
                        lineNumber: 59,
                        columnNumber: 13
                    }, this),
                    isEdit ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$15_$40$opentelemetry_def8fc46c0914663bed16e707dd599e8$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "space-y-3",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$15_$40$opentelemetry_def8fc46c0914663bed16e707dd599e8$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$15_$40$opentelemetry_def8fc46c0914663bed16e707dd599e8$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                        className: "mb-1 block text-xs font-medium text-gray-600",
                                        children: "Nombre"
                                    }, void 0, false, {
                                        fileName: "[project]/apps/web/src/features/platform/components/PlanEditor.tsx",
                                        lineNumber: 73,
                                        columnNumber: 19
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$15_$40$opentelemetry_def8fc46c0914663bed16e707dd599e8$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                        value: (_draft_name = draft.name) !== null && _draft_name !== void 0 ? _draft_name : '',
                                        onChange: (e)=>setDraft((d)=>({
                                                    ...d,
                                                    name: e.target.value
                                                })),
                                        className: "w-full rounded border px-2 py-1 text-sm"
                                    }, void 0, false, {
                                        fileName: "[project]/apps/web/src/features/platform/components/PlanEditor.tsx",
                                        lineNumber: 74,
                                        columnNumber: 19
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/apps/web/src/features/platform/components/PlanEditor.tsx",
                                lineNumber: 72,
                                columnNumber: 17
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$15_$40$opentelemetry_def8fc46c0914663bed16e707dd599e8$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$15_$40$opentelemetry_def8fc46c0914663bed16e707dd599e8$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                        className: "mb-1 block text-xs font-medium text-gray-600",
                                        children: "Precio COP/seat/mes"
                                    }, void 0, false, {
                                        fileName: "[project]/apps/web/src/features/platform/components/PlanEditor.tsx",
                                        lineNumber: 81,
                                        columnNumber: 19
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$15_$40$opentelemetry_def8fc46c0914663bed16e707dd599e8$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                        type: "number",
                                        value: (_draft_monthly_price_per_seat_cop = draft.monthly_price_per_seat_cop) !== null && _draft_monthly_price_per_seat_cop !== void 0 ? _draft_monthly_price_per_seat_cop : 0,
                                        onChange: (e)=>setDraft((d)=>({
                                                    ...d,
                                                    monthly_price_per_seat_cop: Number(e.target.value)
                                                })),
                                        className: "w-full rounded border px-2 py-1 text-sm"
                                    }, void 0, false, {
                                        fileName: "[project]/apps/web/src/features/platform/components/PlanEditor.tsx",
                                        lineNumber: 84,
                                        columnNumber: 19
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/apps/web/src/features/platform/components/PlanEditor.tsx",
                                lineNumber: 80,
                                columnNumber: 17
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$15_$40$opentelemetry_def8fc46c0914663bed16e707dd599e8$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$15_$40$opentelemetry_def8fc46c0914663bed16e707dd599e8$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "mb-1 text-xs font-medium text-gray-600",
                                        children: "Features"
                                    }, void 0, false, {
                                        fileName: "[project]/apps/web/src/features/platform/components/PlanEditor.tsx",
                                        lineNumber: 97,
                                        columnNumber: 19
                                    }, this),
                                    FEATURE_KEYS.map((key)=>{
                                        var _draft_features;
                                        var _draft_features_key;
                                        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$15_$40$opentelemetry_def8fc46c0914663bed16e707dd599e8$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                            className: "flex cursor-pointer items-center gap-2 py-0.5 text-xs",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$15_$40$opentelemetry_def8fc46c0914663bed16e707dd599e8$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                    type: "checkbox",
                                                    checked: (_draft_features_key = (_draft_features = draft.features) === null || _draft_features === void 0 ? void 0 : _draft_features[key]) !== null && _draft_features_key !== void 0 ? _draft_features_key : false,
                                                    onChange: ()=>toggleFeature(key),
                                                    className: "rounded"
                                                }, void 0, false, {
                                                    fileName: "[project]/apps/web/src/features/platform/components/PlanEditor.tsx",
                                                    lineNumber: 103,
                                                    columnNumber: 23
                                                }, this),
                                                key.replace(/_/g, ' ')
                                            ]
                                        }, key, true, {
                                            fileName: "[project]/apps/web/src/features/platform/components/PlanEditor.tsx",
                                            lineNumber: 99,
                                            columnNumber: 21
                                        }, this);
                                    })
                                ]
                            }, void 0, true, {
                                fileName: "[project]/apps/web/src/features/platform/components/PlanEditor.tsx",
                                lineNumber: 96,
                                columnNumber: 17
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$15_$40$opentelemetry_def8fc46c0914663bed16e707dd599e8$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex gap-2 pt-1",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$15_$40$opentelemetry_def8fc46c0914663bed16e707dd599e8$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        onClick: ()=>updateMutation.mutate({
                                                id: plan.id,
                                                name: draft.name,
                                                monthly_price_per_seat_cop: draft.monthly_price_per_seat_cop,
                                                features: draft.features
                                            }),
                                        disabled: updateMutation.isPending,
                                        className: "flex-1 rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50",
                                        children: "Guardar"
                                    }, void 0, false, {
                                        fileName: "[project]/apps/web/src/features/platform/components/PlanEditor.tsx",
                                        lineNumber: 114,
                                        columnNumber: 19
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$15_$40$opentelemetry_def8fc46c0914663bed16e707dd599e8$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        onClick: ()=>setEditing(null),
                                        className: "rounded border px-3 py-1.5 text-xs hover:bg-gray-50",
                                        children: "Cancelar"
                                    }, void 0, false, {
                                        fileName: "[project]/apps/web/src/features/platform/components/PlanEditor.tsx",
                                        lineNumber: 128,
                                        columnNumber: 19
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/apps/web/src/features/platform/components/PlanEditor.tsx",
                                lineNumber: 113,
                                columnNumber: 17
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/apps/web/src/features/platform/components/PlanEditor.tsx",
                        lineNumber: 71,
                        columnNumber: 15
                    }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$15_$40$opentelemetry_def8fc46c0914663bed16e707dd599e8$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$15_$40$opentelemetry_def8fc46c0914663bed16e707dd599e8$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$15_$40$opentelemetry_def8fc46c0914663bed16e707dd599e8$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-xl font-bold text-gray-900",
                                children: p.name
                            }, void 0, false, {
                                fileName: "[project]/apps/web/src/features/platform/components/PlanEditor.tsx",
                                lineNumber: 138,
                                columnNumber: 17
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$15_$40$opentelemetry_def8fc46c0914663bed16e707dd599e8$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "mb-3 text-sm text-gray-500",
                                children: [
                                    (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$lib$2f$format$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["formatCOP"])(p.monthly_price_per_seat_cop),
                                    "/seat/mes"
                                ]
                            }, void 0, true, {
                                fileName: "[project]/apps/web/src/features/platform/components/PlanEditor.tsx",
                                lineNumber: 139,
                                columnNumber: 17
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$15_$40$opentelemetry_def8fc46c0914663bed16e707dd599e8$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("ul", {
                                className: "mb-4 space-y-1",
                                children: FEATURE_KEYS.map((key)=>{
                                    var _this;
                                    const active = (_this = p.features) === null || _this === void 0 ? void 0 : _this[key];
                                    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$15_$40$opentelemetry_def8fc46c0914663bed16e707dd599e8$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                        className: "flex items-center gap-1.5 text-xs ".concat(active ? 'text-gray-700' : 'text-gray-300'),
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$15_$40$opentelemetry_def8fc46c0914663bed16e707dd599e8$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                children: active ? '✓' : '✗'
                                            }, void 0, false, {
                                                fileName: "[project]/apps/web/src/features/platform/components/PlanEditor.tsx",
                                                lineNumber: 150,
                                                columnNumber: 25
                                            }, this),
                                            key.replace(/_/g, ' ')
                                        ]
                                    }, key, true, {
                                        fileName: "[project]/apps/web/src/features/platform/components/PlanEditor.tsx",
                                        lineNumber: 146,
                                        columnNumber: 23
                                    }, this);
                                })
                            }, void 0, false, {
                                fileName: "[project]/apps/web/src/features/platform/components/PlanEditor.tsx",
                                lineNumber: 142,
                                columnNumber: 17
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$15_$40$opentelemetry_def8fc46c0914663bed16e707dd599e8$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                onClick: ()=>startEdit(p),
                                className: "w-full rounded border border-gray-200 px-3 py-1.5 text-xs hover:bg-gray-50",
                                children: "Editar"
                            }, void 0, false, {
                                fileName: "[project]/apps/web/src/features/platform/components/PlanEditor.tsx",
                                lineNumber: 156,
                                columnNumber: 17
                            }, this)
                        ]
                    }, void 0, true)
                ]
            }, plan.id, true, {
                fileName: "[project]/apps/web/src/features/platform/components/PlanEditor.tsx",
                lineNumber: 58,
                columnNumber: 11
            }, this);
        })
    }, void 0, false, {
        fileName: "[project]/apps/web/src/features/platform/components/PlanEditor.tsx",
        lineNumber: 52,
        columnNumber: 5
    }, this);
}
_s(PlanEditor, "4DUBJ34LQdbXJlsMqBFbfQijJV0=");
_c = PlanEditor;
var _c;
__turbopack_context__.k.register(_c, "PlanEditor");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=apps_web_src_4f8e8752._.js.map