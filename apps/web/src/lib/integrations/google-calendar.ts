export interface GCalEvent {
  id: string
  summary?: string
  description?: string
  start: { date?: string; dateTime?: string }
  end: { date?: string; dateTime?: string }
  attendees?: Array<{ email: string; responseStatus?: string }>
}

export async function fetchGCalEvents(
  calendarId: string,
  apiKey: string,
  daysAhead = 60,
): Promise<GCalEvent[]> {
  const timeMin = new Date().toISOString()
  const timeMax = new Date(Date.now() + daysAhead * 86400000).toISOString()
  const url = new URL(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
  )
  url.searchParams.set('key', apiKey)
  url.searchParams.set('timeMin', timeMin)
  url.searchParams.set('timeMax', timeMax)
  url.searchParams.set('singleEvents', 'true')
  url.searchParams.set('orderBy', 'startTime')
  url.searchParams.set('maxResults', '250')

  const res = await fetch(url.toString())
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(`Google Calendar API error: ${res.status} — ${JSON.stringify(err)}`)
  }
  const data = (await res.json()) as { items?: GCalEvent[] }
  return data.items ?? []
}

export function isAllDayEvent(event: GCalEvent): boolean {
  return !!event.start.date && !event.start.dateTime
}

// Google Calendar all-day end dates are exclusive — subtract one day to get inclusive end.
export function getEventDates(event: GCalEvent): { start: string; end: string } | null {
  const start = event.start.date ?? event.start.dateTime?.slice(0, 10)
  const rawEnd = event.end.date ?? event.end.dateTime?.slice(0, 10)
  if (!start || !rawEnd) return null
  const end = event.start.date
    ? new Date(new Date(rawEnd).getTime() - 86400000).toISOString().slice(0, 10)
    : rawEnd
  return { start, end: end < start ? start : end }
}

export function daysBetween(start: string, end: string): number {
  return Math.round((new Date(end).getTime() - new Date(start).getTime()) / 86400000) + 1
}
