/**
 * Seed: crea el usuario platform_admin inicial
 * Uso: npx tsx scripts/seed-platform-admin.ts
 *
 * Variables requeridas en .env.local:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'
import * as readline from 'readline/promises'
import { stdin as input, stdout as output } from 'process'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌  Faltan variables de entorno. Asegúrate de tener .env.local en apps/web/')
  process.exit(1)
}

const db = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
})

async function main() {
  const rl = readline.createInterface({ input, output })

  console.log('\n🔐  BCWork — Crear usuario Platform Admin\n')

  // Verificar si ya existe uno
  const { data: existing } = await db
    .from('users')
    .select('id, email')
    .eq('role', 'platform_admin')
    .maybeSingle()

  if (existing) {
    console.log(`⚠️   Ya existe un platform_admin: ${existing.email}`)
    const overwrite = await rl.question('¿Crear uno nuevo de todas formas? (s/N): ')
    if (overwrite.toLowerCase() !== 's') {
      console.log('Cancelado.')
      rl.close()
      process.exit(0)
    }
  }

  const email = await rl.question('Email: ')
  const fullName = await rl.question('Nombre completo: ')
  const password = await rl.question('Contraseña (mín. 12 chars, mayús, núm, símbolo): ')

  // Validar política
  const policyErrors: string[] = []
  if (password.length < 12) policyErrors.push('Mínimo 12 caracteres')
  if (!/[A-Z]/.test(password)) policyErrors.push('Debe contener al menos una mayúscula')
  if (!/[a-z]/.test(password)) policyErrors.push('Debe contener al menos una minúscula')
  if (!/[0-9]/.test(password)) policyErrors.push('Debe contener al menos un número')
  if (!/[^A-Za-z0-9]/.test(password))
    policyErrors.push('Debe contener al menos un carácter especial')

  if (policyErrors.length) {
    console.error('\n❌  Contraseña inválida:')
    policyErrors.forEach((e) => console.error(`   • ${e}`))
    rl.close()
    process.exit(1)
  }

  rl.close()

  console.log('\n⏳  Creando usuario...')

  const passwordHash = await bcrypt.hash(password, 12)

  const { data: user, error } = await db
    .from('users')
    .insert({
      email: email.trim().toLowerCase(),
      full_name: fullName.trim(),
      password_hash: passwordHash,
      role: 'platform_admin',
      status: 'active',
      tenant_id: null,
    })
    .select('id, email')
    .single()

  if (error) {
    if (error.code === '23505') {
      console.error(`❌  El email ${email} ya está registrado.`)
    } else {
      console.error('❌  Error al crear usuario:', error.message)
    }
    process.exit(1)
  }

  // Guardar en historial de contraseñas
  await db.from('password_history').insert({
    user_id: user.id,
    tenant_id: null,
    password_hash: passwordHash,
  })

  console.log(`\n✅  Platform admin creado:`)
  console.log(`   ID:    ${user.id}`)
  console.log(`   Email: ${user.email}`)
  console.log(`   URL:   ${SUPABASE_URL!.replace('https://', '').split('.')[0]}.supabase.co`)
  console.log(`\n→  Ingresa en /login con esas credenciales.\n`)
}

main().catch((e) => {
  console.error('Error fatal:', e)
  process.exit(1)
})
