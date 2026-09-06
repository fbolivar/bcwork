#!/usr/bin/env node
/**
 * Publica una versión del agente: los DOS artefactos, de una sola vez.
 *
 * El 2026-09-04 se publicó `update.msi` en 0.1.4 pero los ZIP por empresa
 * quedaron en 0.1.2, porque son dos caminos distintos y nada obliga a moverlos
 * juntos. Las instalaciones nuevas nacían viejas y solo se ponían al día horas
 * después. Este script existe para que eso no dependa de acordarse.
 *
 * Hace, en orden:
 *   1. Toma el MSI recién compilado y verifica que traiga el placeholder del
 *      token (si no, no sirve como base por-empresa).
 *   2. Lo deja como installers/update.msi  → canal de auto-actualización.
 *   3. Lo deja como scripts/base-installer.msi → base de instaladores nuevos.
 *   4. Registra version + sha256 en agent_release.
 *   5. Por cada empresa activa: hornea un token nuevo (vence a los 90 dias),
 *      arma el ZIP, registra el hash y revoca los tokens anteriores de esa
 *      empresa — el ZIP vigente es el nuevo.
 *
 * Uso:
 *   node scripts/publish-agent.mjs [--msi <ruta>] [--notes "..."] [--dry-run]
 *
 * Sin --msi busca el bundle de la versión que declara tauri.conf.json.
 * Lee credenciales de apps/web/.env.local (SUPABASE_SERVICE_ROLE_KEY).
 *
 * NO firma el MSI ni despliega: después hay que commitear los binarios y hacer
 * el deploy para que el servidor los sirva.
 */
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync, copyFileSync, mkdtempSync, rmSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const RAIZ = resolve(import.meta.dirname, '..')
const PLACEHOLDER = 'BCWORK_TENANT_TOKEN_PLACEHOLDER_00000000000000000000000000000000'

function arg(nombre, porDefecto = null) {
  const i = process.argv.indexOf(`--${nombre}`)
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : porDefecto
}
const dryRun = process.argv.includes('--dry-run')

function env() {
  const txt = readFileSync(join(RAIZ, 'apps/web/.env.local'), 'utf8')
  return Object.fromEntries(
    txt
      .split('\n')
      .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
      .map((l) => {
        const i = l.indexOf('=')
        return [l.slice(0, i).trim(), l.slice(i + 1).trim()]
      }),
  )
}

function versionDeclarada() {
  const conf = JSON.parse(readFileSync(join(RAIZ, 'apps/agent/src-tauri/tauri.conf.json'), 'utf8'))
  return conf.version
}

function zipear(dirOrigen, destino) {
  // Compress-Archive: el repo se compila en Windows (el build del MSI es .ps1).
  execFileSync(
    'powershell',
    [
      '-NoProfile',
      '-Command',
      `Compress-Archive -Path '${dirOrigen}\\*' -DestinationPath '${destino}' -Force`,
    ],
    { stdio: 'inherit' },
  )
}

async function main() {
  const version = arg('version', versionDeclarada())
  const msiPath = resolve(
    arg(
      'msi',
      join(
        RAIZ,
        'apps/agent/src-tauri/target/release/bundle/msi',
        `BCWork Agent_${version}_x64_en-US.msi`,
      ),
    ),
  )

  if (!existsSync(msiPath)) {
    console.error(`No existe el MSI: ${msiPath}\nCompilá primero con apps/agent/scripts/build-installer.ps1`)
    process.exit(1)
  }

  const msi = readFileSync(msiPath)
  const apariciones = msi.toString('latin1').split(PLACEHOLDER).length - 1
  if (apariciones !== 1) {
    console.error(
      `El MSI tiene el placeholder ${apariciones} veces (se esperaba 1). ` +
        'Sin él no se puede hornear el token de cada empresa.',
    )
    process.exit(2)
  }

  const sha256 = createHash('sha256').update(msi).digest('hex')
  console.log(`\nVersión  ${version}`)
  console.log(`MSI      ${msiPath}`)
  console.log(`sha256   ${sha256}\n`)

  const e = env()
  const db = createClient(e.NEXT_PUBLIC_SUPABASE_URL, e.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  })

  // 'trial' cuenta: las dos empresas del piloto estan en trial, y filtrar por
  // status='active' las habria dejado con el instalador viejo — justo el error
  // que este script existe para evitar. Solo se excluye lo terminado.
  const { data: tenants, error: errT } = await db
    .from('tenants')
    .select('id, trade_name, status')
    .in('status', ['active', 'trial'])
  if (errT) throw new Error(`No se pudieron listar las empresas: ${errT.message}`)

  if (dryRun) {
    console.log('--dry-run: no se escribe nada.')
    console.log(`Se actualizarían update.msi, base-installer.msi y ${tenants.length} ZIP.`)
    return
  }

  // 2 y 3: los dos artefactos, siempre juntos.
  copyFileSync(msiPath, join(RAIZ, 'apps/web/installers/update.msi'))
  copyFileSync(msiPath, join(RAIZ, 'apps/agent/scripts/base-installer.msi'))
  console.log('✓ update.msi y base-installer.msi actualizados')

  const notes = arg('notes', `Agente ${version}`)
  const { error: errR } = await db
    .from('agent_release')
    .insert({ version, sha256, notes, published_at: new Date().toISOString() })
  if (errR) throw new Error(`No se pudo registrar la versión: ${errR.message}`)
  console.log('✓ agent_release registrado')

  for (const t of tenants) {
    const { data: admin } = await db
      .from('users')
      .select('id')
      .eq('tenant_id', t.id)
      .eq('role', 'tenant_admin')
      .eq('status', 'active')
      .limit(1)
      .maybeSingle()
    if (!admin) {
      console.log(`  ⚠ ${t.trade_name}: sin tenant_admin activo, se omite`)
      continue
    }

    const stage = mkdtempSync(join(tmpdir(), 'bcwork-pkg-'))
    try {
      const salida = join(stage, 'BCWork-Agent.msi')
      const out = execFileSync(
        process.execPath,
        [join(RAIZ, 'apps/agent/scripts/make-tenant-msi.mjs'), msiPath, salida],
        { encoding: 'utf8' },
      )
      const { token_hash, token_prefix } = JSON.parse(out)

      copyFileSync(join(RAIZ, 'certs/bcwork-codesign.cer'), join(stage, 'bcwork-codesign.cer'))
      copyFileSync(join(RAIZ, 'apps/agent/scripts/Instalar.bat'), join(stage, 'Instalar.bat'))
      zipear(stage, join(RAIZ, 'apps/web/installers', `${t.id}.zip`))

      // 90 días: un token de aprovisionamiento enrola equipos nuevos en la
      // empresa, y sin vencimiento un ZIP viejo queda siendo una credencial
      // valida para siempre.
      const vence = new Date(Date.now() + 90 * 86400000).toISOString()
      const { error } = await db.from('agent_provisioning_tokens').insert({
        tenant_id: t.id,
        token_hash,
        token_prefix,
        created_by: admin.id,
        expires_at: vence,
      })
      if (error) throw new Error(error.message)

      // Revocar los anteriores de esta empresa: el ZIP que se sirve es el nuevo,
      // y dejarlos vivos era lo que hacia crecer la pila publicacion tras
      // publicacion (13 activos con solo 3 clientes).
      const { data: revocados } = await db
        .from('agent_provisioning_tokens')
        .update({ revoked_at: new Date().toISOString() })
        .eq('tenant_id', t.id)
        .is('revoked_at', null)
        .neq('token_hash', token_hash)
        .select('token_prefix')

      const nRev = revocados?.length ?? 0
      console.log(
        `  ✓ ${t.trade_name} (${t.status}) — token ${token_prefix}` +
          (nRev > 0 ? `, ${nRev} anterior(es) revocado(s)` : ''),
      )
    } finally {
      rmSync(stage, { recursive: true, force: true })
    }
  }

  console.log(
    `\nListo. Falta: commitear los binarios (installers/ y base-installer.msi) y desplegar,\n` +
      `para que el servidor sirva la versión nueva. El MSI va SIN FIRMAR si no se firmó antes.\n`,
  )
}

main().catch((e) => {
  console.error(e.message ?? e)
  process.exit(1)
})
