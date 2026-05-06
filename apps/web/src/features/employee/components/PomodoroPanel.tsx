'use client'

import { useState, useEffect, useCallback } from 'react'
import { Play, Pause, RotateCcw, Settings, X } from 'lucide-react'

type Phase = 'work' | 'short' | 'long'

const DEFAULTS = { work: 25, short: 5, long: 15 }
const PHASE_LABELS: Record<Phase, string> = {
  work: 'Enfoque',
  short: 'Pausa corta',
  long: 'Pausa larga',
}
const PHASE_COLORS: Record<Phase, string> = {
  work: 'from-blue-600 to-blue-700',
  short: 'from-green-500 to-green-600',
  long: 'from-purple-500 to-purple-600',
}

function pad(n: number) {
  return String(n).padStart(2, '0')
}

export function PomodoroPanel() {
  const [settings, setSettings] = useState(DEFAULTS)
  const [showSettings, setShowSettings] = useState(false)
  const [phase, setPhase] = useState<Phase>('work')
  const [secsLeft, setSecsLeft] = useState(DEFAULTS.work * 60)
  const [running, setRunning] = useState(false)
  const [rounds, setRounds] = useState(0)
  const [tempSettings, setTempSettings] = useState(DEFAULTS)

  const totalSecs = settings[phase] * 60
  const progress = ((totalSecs - secsLeft) / totalSecs) * 100

  const goToPhase = useCallback(
    (p: Phase, cfg = settings) => {
      setPhase(p)
      setSecsLeft(cfg[p] * 60)
      setRunning(false)
    },
    [settings],
  )

  useEffect(() => {
    if (!running) return
    const id = setInterval(() => {
      setSecsLeft((s) => {
        if (s <= 1) {
          setRunning(false)
          if (phase === 'work') {
            const next = (rounds + 1) % 4 === 0 ? 'long' : 'short'
            setRounds((r) => r + 1)
            setTimeout(() => goToPhase(next), 100)
          } else {
            setTimeout(() => goToPhase('work'), 100)
          }
          return 0
        }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [running, phase, rounds, goToPhase])

  const mins = Math.floor(secsLeft / 60)
  const secs = secsLeft % 60

  function handleSaveSettings() {
    setSettings(tempSettings)
    goToPhase(phase, tempSettings)
    setShowSettings(false)
  }

  const circumference = 2 * Math.PI * 54
  const dashOffset = circumference * (1 - progress / 100)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Temporizador Pomodoro</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            Trabaja en bloques de enfoque con pausas regulares
          </p>
        </div>
        <button
          type="button"
          title="Configuración"
          onClick={() => {
            setTempSettings(settings)
            setShowSettings(true)
          }}
          className="rounded-lg border border-gray-200 p-2 text-gray-500 hover:bg-gray-50"
        >
          <Settings className="h-4 w-4" />
        </button>
      </div>

      {/* Phase selector */}
      <div className="flex gap-1 rounded-lg border border-gray-200 bg-white p-1">
        {(['work', 'short', 'long'] as Phase[]).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => goToPhase(p)}
            className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-colors ${phase === p ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-100'}`}
          >
            {PHASE_LABELS[p]}
          </button>
        ))}
      </div>

      {/* Timer */}
      <div
        className={`flex flex-col items-center justify-center rounded-2xl bg-gradient-to-br ${PHASE_COLORS[phase]} py-10 text-white`}
      >
        <div className="relative flex h-36 w-36 items-center justify-center">
          <svg className="-rotate-90" width="136" height="136">
            <circle
              cx="68"
              cy="68"
              r="54"
              fill="none"
              stroke="rgba(255,255,255,0.2)"
              strokeWidth="8"
            />
            <circle
              cx="68"
              cy="68"
              r="54"
              fill="none"
              stroke="white"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              style={{ transition: 'stroke-dashoffset 0.5s ease' }}
            />
          </svg>
          <div className="absolute text-center">
            <p className="text-4xl font-bold tabular-nums">
              {pad(mins)}:{pad(secs)}
            </p>
            <p className="mt-0.5 text-xs text-white/70">{PHASE_LABELS[phase]}</p>
          </div>
        </div>
        <p className="mt-4 text-sm text-white/80">
          Ronda {Math.floor(rounds / 2) + 1} ·{' '}
          {rounds % 4 === 3
            ? 'Próxima: pausa larga'
            : `${3 - (rounds % 4)} pomodoros para pausa larga`}
        </p>
      </div>

      {/* Controls */}
      <div className="flex justify-center gap-3">
        <button
          type="button"
          title="Reiniciar"
          onClick={() => goToPhase(phase)}
          className="rounded-full border border-gray-200 p-3 text-gray-400 hover:bg-gray-50"
        >
          <RotateCcw className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={() => setRunning((r) => !r)}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700"
        >
          {running ? <Pause className="h-6 w-6" /> : <Play className="ml-0.5 h-6 w-6" />}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{rounds}</p>
          <p className="text-xs text-gray-500">Pomodoros completados</p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{rounds * settings.work}m</p>
          <p className="text-xs text-gray-500">Minutos de enfoque</p>
        </div>
      </div>

      {/* Settings modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-900">Configurar tiempos</h3>
              <button
                type="button"
                title="Cerrar"
                onClick={() => setShowSettings(false)}
                className="rounded p-1 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-4 space-y-3">
              {(
                [
                  ['work', 'Tiempo de enfoque (min)'],
                  ['short', 'Pausa corta (min)'],
                  ['long', 'Pausa larga (min)'],
                ] as [Phase, string][]
              ).map(([k, label]) => (
                <div key={k}>
                  <label htmlFor={`pom-${k}`} className="text-xs font-medium text-gray-700">
                    {label}
                  </label>
                  <input
                    id={`pom-${k}`}
                    type="number"
                    min={1}
                    max={120}
                    value={tempSettings[k]}
                    onChange={(e) =>
                      setTempSettings((s) => ({ ...s, [k]: Number(e.target.value) }))
                    }
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              ))}
            </div>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setShowSettings(false)}
                className="flex-1 rounded-lg border border-gray-200 py-2 text-sm text-gray-600 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveSettings}
                className="flex-1 rounded-lg bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
