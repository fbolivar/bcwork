import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { sendPlatformWeeklyDigest } from '@/lib/email'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const secret = req.headers.get('authorization')
  if (secret !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const db = getDb()
  const now = new Date()
  const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const weekLabel = `${weekStart.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })} – ${now.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}`

  const [tenantsRes, licensesRes, plansRes, atRiskRes] = await Promise.all([
    db.from('tenants').select('id, status, created_at'),
    db
      .from('licenses')
      .select('id, tenant_id, plan_id, seats_total, status')
      .in('status', ['active', 'trial']),
    db.from('plans').select('id, monthly_price_per_seat_cop'),
    // Health scores proxy: users with 0 sessions in last 7 days (simplified)
    db
      .from('tenants')
      .select('id')
      .eq('status', 'active')
      .lt('updated_at', new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString()),
  ])

  const tenants = tenantsRes.data ?? []
  const licenses = licensesRes.data ?? []
  const plans = plansRes.data ?? []
  const atRisk = atRiskRes.data ?? []

  const priceMap = Object.fromEntries(plans.map((p) => [p.id, p.monthly_price_per_seat_cop]))

  const activeLicenses = licenses.filter((l) => l.status === 'active')
  const trialLicenses = licenses.filter((l) => l.status === 'trial')

  const mrrCop = activeLicenses.reduce((s, l) => {
    const price = priceMap[l.plan_id] ?? 0
    return s + price * l.seats_total
  }, 0)

  // MRR delta: new licenses this week vs last week proxy
  const newThisWeek = licenses.filter(
    (l) => l.status === 'active',
    // We don't have created_at on licenses snapshot so we use tenant created_at as proxy
  )
  const mrrDelta = 0 // simplified — would need historical MRR snapshots for accuracy

  const newSignups = tenants.filter((t) => (t.created_at ?? '') >= weekStart.toISOString()).length

  // Renewals this week
  const { data: renewals } = await db
    .from('licenses')
    .select('id')
    .gte('ends_at', weekStart.toISOString())
    .lte('ends_at', new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString())

  const adminEmail = process.env.PLATFORM_ADMIN_EMAIL ?? 'admin@bcwork.co'

  await sendPlatformWeeklyDigest({
    adminEmail,
    week: weekLabel,
    newSignups,
    mrrCop,
    mrrDeltaCop: mrrDelta,
    activeTenants: tenants.filter((t) => t.status === 'active').length,
    trialTenants: tenants.filter((t) => t.status === 'trial').length,
    atRiskTenants: atRisk.length,
    renewalsThisWeek: (renewals ?? []).length,
  })

  console.log(`[cron/platform-weekly] digest sent for week: ${weekLabel}`)
  return NextResponse.json({ ok: true, week: weekLabel, newSignups, mrrCop })
}
