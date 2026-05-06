'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { trpc } from '@/lib/trpc-client'
import { Coffee, LogOut, X, AlarmClockOff } from 'lucide-react'

// ─── Constants ────────────────────────────────────────────────────────────────

// If user is idle for more than this many ms, it counts as a break (resets break timer)
const IDLE_THRESHOLD_MS = 5 * 60 * 1000

// How often we tick to re-evaluate alert conditions (ms)
const TICK_INTERVAL_MS = 30 * 1000

// ─── Types ────────────────────────────────────────────────────────────────────

type AlertType = 'break' | 'end_of_day'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

/** Return current time in HH:MM format for the given timezone */
function localTime(timezone: string): string {
  return new Date().toLocaleTimeString('en-GB', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

/** Compare two HH:MM strings. Returns minutes difference (b - a). */
function minutesDiff(a: string, b: string): number {
  const toMins = (t: string) => {
    const [h, m] = t.split(':').map(Number)
    return (h ?? 0) * 60 + (m ?? 0)
  }
  return toMins(b) - toMins(a)
}

// ─── Alert Banner ─────────────────────────────────────────────────────────────

function AlertBanner({
  type,
  message,
  onDismiss,
  onSnooze,
}: {
  type: AlertType
  message: string
  onDismiss: () => void
  onSnooze?: () => void
}) {
  const isBreak = type === 'break'

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 flex w-full max-w-sm flex-col gap-3 rounded-2xl border p-5 shadow-2xl ${
        isBreak ? 'border-blue-200 bg-white' : 'border-amber-200 bg-amber-50'
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
            isBreak ? 'bg-blue-100' : 'bg-amber-100'
          }`}
        >
          {isBreak ? (
            <Coffee className={`h-5 w-5 text-blue-600`} />
          ) : (
            <LogOut className={`h-5 w-5 text-amber-600`} />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className={`text-sm font-semibold ${isBreak ? 'text-blue-900' : 'text-amber-900'}`}>
            {isBreak ? 'Hora de un descanso' : 'Fin de jornada'}
          </p>
          <p
            className={`mt-0.5 text-xs leading-relaxed ${isBreak ? 'text-blue-700' : 'text-amber-700'}`}
          >
            {message}
          </p>
        </div>
        <button
          type="button"
          title="Cerrar"
          onClick={onDismiss}
          className="rounded p-0.5 text-gray-400 hover:text-gray-600"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onDismiss}
          className={`flex-1 rounded-lg py-1.5 text-xs font-medium text-white ${
            isBreak ? 'bg-blue-600 hover:bg-blue-700' : 'bg-amber-500 hover:bg-amber-600'
          }`}
        >
          {isBreak ? 'Entendido, voy a descansar' : 'Entendido'}
        </button>
        {onSnooze && (
          <button
            type="button"
            onClick={onSnooze}
            title="Posponer 15 minutos"
            className="flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-50"
          >
            <AlarmClockOff className="h-3.5 w-3.5" />
            15 min
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function WorkplaceAlerts() {
  const { data: schedule } = trpc.employee.getMySchedule.useQuery()

  const [activeAlert, setActiveAlert] = useState<AlertType | null>(null)

  // Break tracking
  const lastActivityRef = useRef<number>(Date.now())
  const lastBreakRef = useRef<number>(Date.now())
  const snoozedUntilRef = useRef<number>(0)

  // EOD tracking: persist per day so it only fires once
  const eodShownRef = useRef<string | null>(
    typeof window !== 'undefined' ? localStorage.getItem('eod_alert_shown') : null,
  )

  // ── Activity listeners ────────────────────────────────────────────────────
  const onActivity = useCallback(() => {
    const now = Date.now()
    const idleDuration = now - lastActivityRef.current
    if (idleDuration >= IDLE_THRESHOLD_MS) {
      // User was idle long enough — counts as a break
      lastBreakRef.current = now
    }
    lastActivityRef.current = now
  }, [])

  useEffect(() => {
    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart']
    events.forEach((e) => window.addEventListener(e, onActivity, { passive: true }))
    return () => events.forEach((e) => window.removeEventListener(e, onActivity))
  }, [onActivity])

  // ── Tick: evaluate alert conditions ──────────────────────────────────────
  useEffect(() => {
    if (!schedule) return

    const tick = () => {
      const now = Date.now()

      // ── Break alert ──────────────────────────────────────────────────────
      if (schedule.break_alert_enabled && activeAlert !== 'break') {
        const intervalMs = schedule.break_alert_interval_minutes * 60 * 1000
        const continuousActiveMs = now - lastBreakRef.current

        const isSnoozed = now < snoozedUntilRef.current
        const isUserActive = now - lastActivityRef.current < IDLE_THRESHOLD_MS

        if (!isSnoozed && isUserActive && continuousActiveMs >= intervalMs) {
          setActiveAlert('break')
          return
        }
      }

      // ── End of day alert ─────────────────────────────────────────────────
      if (schedule.end_of_day_alert_enabled && activeAlert !== 'end_of_day') {
        const today = todayISO()
        const alreadyShownToday = eodShownRef.current === today
        if (alreadyShownToday) return

        const dayOfWeek = new Date().getDay()
        const isWorkDay = (schedule.days_of_week as number[]).includes(dayOfWeek)
        if (!isWorkDay || !schedule.end_time) return

        const tz = schedule.timezone ?? 'America/Bogota'
        const currentHHMM = localTime(tz)
        const offsetMins = schedule.end_of_day_alert_offset_minutes ?? 0

        // Calculate trigger time: end_time + offset (offset is negative, so end_time - |offset|)
        const endMins =
          Number(schedule.end_time.slice(0, 2)) * 60 + Number(schedule.end_time.slice(3, 5))
        const triggerMins = endMins + offsetMins
        const triggerHHMM = `${String(Math.floor(triggerMins / 60)).padStart(2, '0')}:${String(triggerMins % 60).padStart(2, '0')}`

        // Fire once when current time crosses the trigger threshold
        const diff = minutesDiff(triggerHHMM, currentHHMM)
        if (diff >= 0 && diff < 30) {
          setActiveAlert('end_of_day')
        }
      }
    }

    const id = setInterval(tick, TICK_INTERVAL_MS)
    tick() // run immediately on mount / schedule change
    return () => clearInterval(id)
  }, [schedule, activeAlert])

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleDismiss = () => {
    if (activeAlert === 'break') {
      lastBreakRef.current = Date.now()
    }
    if (activeAlert === 'end_of_day') {
      const today = todayISO()
      eodShownRef.current = today
      localStorage.setItem('eod_alert_shown', today)
    }
    setActiveAlert(null)
  }

  const handleSnooze = () => {
    // Snooze break alert for 15 minutes
    snoozedUntilRef.current = Date.now() + 15 * 60 * 1000
    lastBreakRef.current = Date.now()
    setActiveAlert(null)
  }

  if (!schedule || !activeAlert) return null

  const message =
    activeAlert === 'break' ? schedule.break_alert_message : schedule.end_of_day_alert_message

  return (
    <AlertBanner
      type={activeAlert}
      message={message}
      onDismiss={handleDismiss}
      onSnooze={activeAlert === 'break' ? handleSnooze : undefined}
    />
  )
}
