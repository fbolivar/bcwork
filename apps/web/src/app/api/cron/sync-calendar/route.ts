import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import {
  fetchGCalEvents,
  isAllDayEvent,
  getEventDates,
  daysBetween,
} from '@/lib/integrations/google-calendar'

export async function GET(req: NextRequest) {
  const secret = req.headers.get('authorization')
  if (secret !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const db = getDb()
  const { data: integrations } = await db
    .from('integrations')
    .select('tenant_id, config')
    .eq('type', 'google_calendar')
    .eq('active', true)

  let totalCreated = 0
  let totalErrors = 0

  for (const integration of integrations ?? []) {
    const config = integration.config as { calendar_id?: string; api_key?: string }
    if (!config.calendar_id || !config.api_key) continue

    try {
      const events = await fetchGCalEvents(config.calendar_id, config.api_key)
      const allDay = events.filter(isAllDayEvent)

      const { data: users } = await db
        .from('users')
        .select('id, email')
        .eq('tenant_id', integration.tenant_id)
        .eq('status', 'active')

      const emailToUserId = new Map((users ?? []).map((u) => [u.email as string, u.id as string]))

      for (const event of allDay) {
        const dates = getEventDates(event)
        if (!dates) continue

        const attendeeIds = (event.attendees ?? [])
          .map((a) => emailToUserId.get(a.email))
          .filter(Boolean) as string[]

        if (attendeeIds.length === 0) continue

        for (const userId of attendeeIds) {
          const { data: existing } = await db
            .from('absence_requests')
            .select('id')
            .eq('tenant_id', integration.tenant_id)
            .eq('employee_id', userId)
            .eq('start_date', dates.start)
            .eq('type', 'gcal_import')
            .maybeSingle()

          if (!existing) {
            const { error } = await db.from('absence_requests').insert({
              tenant_id: integration.tenant_id,
              employee_id: userId,
              type: 'gcal_import',
              start_date: dates.start,
              end_date: dates.end,
              days_count: daysBetween(dates.start, dates.end),
              reason: event.summary ?? 'Importado de Google Calendar',
              status: 'approved',
              reviewed_at: new Date().toISOString(),
            })
            if (!error) totalCreated++
          }
        }
      }
    } catch (e) {
      console.error(`[cron] sync-calendar failed for tenant ${integration.tenant_id}:`, e)
      totalErrors++
    }
  }

  console.log(`[cron] sync-calendar: ${totalCreated} ausencias creadas, ${totalErrors} errores`)
  return NextResponse.json({ ok: true, absences_created: totalCreated, errors: totalErrors })
}
