import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  // Verify Vercel cron secret to prevent unauthorized calls
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = getDb()
  const now = new Date()
  const in3days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString()
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()

  const [expiringRes, churnedRes] = await Promise.all([
    db
      .from('licenses')
      .select(
        'id, tenant_id, ends_at, trial_ends_at, tenants(legal_name, trade_name, contact_email)',
      )
      .in('status', ['active', 'trial'])
      .not('ends_at', 'is', null)
      .lte('ends_at', in3days)
      .gte('ends_at', now.toISOString()),
    db
      .from('tenants')
      .select('id, legal_name, trade_name, contact_email, updated_at')
      .eq('status', 'cancelled')
      .gte('updated_at', yesterday),
  ])

  const expiring = expiringRes.data ?? []
  const churned = churnedRes.data ?? []

  if (expiring.length === 0 && churned.length === 0) {
    return NextResponse.json({ ok: true, sent: false, reason: 'nothing_to_alert' })
  }

  const { sendPlatformAdminAlert } = await import('@/lib/email')
  const adminEmail = process.env.PLATFORM_ADMIN_EMAIL
  if (!adminEmail) {
    return NextResponse.json({ ok: false, error: 'PLATFORM_ADMIN_EMAIL not set' }, { status: 500 })
  }

  await sendPlatformAdminAlert({ expiring, churned, adminEmail })

  return NextResponse.json({
    ok: true,
    sent: true,
    expiringCount: expiring.length,
    churnedCount: churned.length,
  })
}
