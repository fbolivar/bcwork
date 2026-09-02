#!/usr/bin/env node
/**
 * Chequeo de aislamiento entre tenants.
 *
 * El backend consulta Supabase con la SERVICE ROLE KEY, que tiene BYPASSRLS: las
 * politicas `tenant_isolation` de Postgres NO se aplican al trafico de la app.
 * El aislamiento depende por completo de que cada procedimiento filtre por
 * `tenant_id` (o se limite al propio usuario con `ctx.user.sub`).
 *
 * Este script falla si aparece un procedimiento de un router de tenant que toca
 * tablas sin ningun scope. No detecta todos los casos posibles — un id recibido
 * del cliente y no verificado se le escapa — pero corta la clase de error mas
 * grave y mas facil de cometer.
 */
import { readFileSync } from 'node:fs'

const ROUTERS = [
  'admin.ts',
  'manager.ts',
  'employee.ts',
  'billing.ts',
  'notifications.ts',
  'integrations.ts',
]

/** Tablas globales, sin `tenant_id` por diseño. */
const GLOBAL_TABLES = new Set(['agent_release', 'plans', 'app_catalog'])

const PROC = /^ {2}([A-Za-z0-9_]+):\s*([A-Za-z]+Procedure)/
const FROM = /\.from\(\s*['"]([a-zA-Z0-9_]+)['"]/g

const problems = []

for (const file of ROUTERS) {
  const path = `apps/web/src/server/routers/${file}`
  const lines = readFileSync(path, 'utf8').split('\n')

  const starts = []
  lines.forEach((line, i) => {
    const m = PROC.exec(line)
    if (m) starts.push({ line: i, name: m[1], kind: m[2] })
  })

  starts.forEach((proc, idx) => {
    // El platform_admin (super admin) es cross-tenant por diseño.
    if (proc.kind === 'platformAdminProcedure') return

    const end = idx + 1 < starts.length ? starts[idx + 1].line : lines.length
    const body = lines.slice(proc.line, end).join('\n')

    const tables = new Set()
    for (const m of body.matchAll(FROM)) {
      if (!GLOBAL_TABLES.has(m[1])) tables.add(m[1])
    }
    if (tables.size === 0) return

    const scoped = body.includes('tenant_id') || body.includes('tid')
    const selfScoped = body.includes('ctx.user!.sub') || body.includes('ctx.user.sub')
    if (scoped || selfScoped) return

    problems.push(
      `${path}:${proc.line + 1}  ${proc.name} (${proc.kind}) consulta ` +
        `${[...tables].sort().join(', ')} sin filtrar por tenant`,
    )
  })
}

if (problems.length > 0) {
  console.error('\nAislamiento entre tenants: procedimientos sin scope\n')
  for (const p of problems) console.error(`  ✗ ${p}`)
  console.error(
    '\nCada procedimiento debe filtrar por tenant_id, limitarse a ctx.user.sub, o ' +
      'validar los ids recibidos con los helpers de src/server/tenant-guard.ts.\n',
  )
  process.exit(1)
}

console.log('Aislamiento entre tenants: sin procedimientos desprotegidos.')
