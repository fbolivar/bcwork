'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { trpc } from '@/lib/trpc-client'
import { Check, ChevronRight } from 'lucide-react'

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface StepProps {
  onNext: () => void
  onBack?: () => void
}

// ─── Wizard root ──────────────────────────────────────────────────────────────

const STEPS = ['Empresa', 'Protección datos', 'Horario laboral', '¡Listo!']

export function OnboardingWizard() {
  const [step, setStep] = useState(0)

  return (
    <div className="w-full max-w-lg">
      {/* Header */}
      <div className="mb-8 text-center">
        <span className="text-2xl font-bold tracking-tight text-blue-600">BCWork</span>
        <h1 className="mt-2 text-lg font-semibold text-gray-900">Configuración inicial</h1>
        <p className="mt-1 text-sm text-gray-400">
          Completemos la información básica de tu empresa
        </p>
      </div>

      {/* Steps indicator */}
      <div className="mb-8 flex items-center justify-center gap-0">
        {STEPS.map((label, i) => (
          <div key={i} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                  i < step
                    ? 'bg-blue-600 text-white'
                    : i === step
                      ? 'border-2 border-blue-600 bg-white text-blue-600'
                      : 'border-2 border-gray-200 bg-white text-gray-400'
                }`}
              >
                {i < step ? <Check className="h-4 w-4" /> : i + 1}
              </div>
              <span
                className={`mt-1 text-xs ${i === step ? 'font-medium text-blue-700' : 'text-gray-400'}`}
              >
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={`mb-4 h-px w-8 sm:w-12 ${i < step ? 'bg-blue-600' : 'bg-gray-200'}`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step content */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        {step === 0 && <StepEmpresa onNext={() => setStep(1)} />}
        {step === 1 && <StepHabeasData onNext={() => setStep(2)} onBack={() => setStep(0)} />}
        {step === 2 && <StepHorario onNext={() => setStep(3)} onBack={() => setStep(1)} />}
        {step === 3 && <StepFinal />}
      </div>
    </div>
  )
}

// ─── Step 1: Datos de la empresa ──────────────────────────────────────────────

function StepEmpresa({ onNext }: StepProps) {
  const { data: settings, isLoading } = trpc.admin.getSettings.useQuery()
  const update = trpc.admin.updateSettings.useMutation({ onSuccess: onNext })

  const [form, setForm] = useState({
    trade_name: '',
    contact_phone: '',
    timezone: 'America/Bogota',
  })

  if (isLoading) return <div className="h-48 animate-pulse rounded-lg bg-gray-100" />

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const payload = Object.fromEntries(Object.entries(form).filter(([, v]) => v !== ''))
    update.mutate(payload)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <h2 className="text-base font-semibold text-gray-900">Datos de tu empresa</h2>
        <p className="mt-1 text-sm text-gray-500">Verifica y completa la información básica.</p>
      </div>

      <div className="rounded-lg bg-gray-50 px-4 py-3 text-sm">
        <p className="text-gray-500">
          Razón social: <strong className="text-gray-800">{settings?.legal_name}</strong>
        </p>
        <p className="mt-1 text-gray-500">
          NIT: <strong className="font-mono text-gray-800">{settings?.nit}</strong>
        </p>
      </div>

      <Field label="Nombre comercial">
        <input
          type="text"
          defaultValue={settings?.trade_name ?? ''}
          placeholder={settings?.legal_name ?? ''}
          onChange={(e) => setForm((f) => ({ ...f, trade_name: e.target.value }))}
          className="input"
        />
      </Field>
      <Field label="Teléfono de contacto">
        <input
          type="tel"
          defaultValue={settings?.contact_phone ?? ''}
          onChange={(e) => setForm((f) => ({ ...f, contact_phone: e.target.value }))}
          className="input"
          placeholder="+57 300 000 0000"
        />
      </Field>
      <Field label="Zona horaria">
        <select
          defaultValue={settings?.timezone ?? 'America/Bogota'}
          onChange={(e) => setForm((f) => ({ ...f, timezone: e.target.value }))}
          className="input"
        >
          <option value="America/Bogota">América/Bogotá (UTC-5)</option>
          <option value="America/New_York">América/Nueva York (UTC-5/-4)</option>
          <option value="America/Mexico_City">América/Ciudad de México (UTC-6/-5)</option>
          <option value="America/Lima">América/Lima (UTC-5)</option>
          <option value="America/Santiago">América/Santiago (UTC-4/-3)</option>
          <option value="America/Buenos_Aires">América/Buenos Aires (UTC-3)</option>
          <option value="Europe/Madrid">Europa/Madrid (UTC+1/+2)</option>
        </select>
      </Field>

      {update.error && <p className="text-sm text-red-600">{update.error.message}</p>}

      <button
        type="submit"
        disabled={update.isPending}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {update.isPending ? (
          'Guardando...'
        ) : (
          <>
            Continuar <ChevronRight className="h-4 w-4" />
          </>
        )}
      </button>

      <style>{`.input { width: 100%; border-radius: 8px; border: 1px solid #d1d5db; padding: 10px 12px; font-size: 14px; outline: none; background: white; } .input:focus { box-shadow: 0 0 0 2px #3b82f6; border-color: transparent; }`}</style>
    </form>
  )
}

// ─── Step 2: HABEAS DATA ──────────────────────────────────────────────────────

function StepHabeasData({ onNext, onBack }: StepProps) {
  const update = trpc.admin.updateSettings.useMutation({ onSuccess: onNext })
  const [dpo, setDpo] = useState('')
  const [retention, setRetention] = useState(24)
  const [accepted, setAccepted] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!accepted) return
    update.mutate({
      data_protection_officer: dpo,
      data_retention_months: retention,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <h2 className="text-base font-semibold text-gray-900">Protección de datos personales</h2>
        <p className="mt-1 text-sm text-gray-500">Requerido por la Ley 1581/2012 (HABEAS DATA).</p>
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-700">
        BCWork recopila datos de actividad laboral de los empleados. Como responsable del
        tratamiento, tu empresa debe designar un oficial de protección de datos y definir por cuánto
        tiempo se conservan los registros.
      </div>

      <Field label="Oficial de Protección de Datos *">
        <input
          type="text"
          required
          value={dpo}
          onChange={(e) => setDpo(e.target.value)}
          className="input"
          placeholder="Nombre, cargo y email del responsable"
        />
      </Field>

      <Field label={`Período de retención: ${retention} meses`}>
        <input
          type="range"
          min={12}
          max={84}
          step={12}
          value={retention}
          onChange={(e) => setRetention(Number(e.target.value))}
          className="w-full accent-amber-500"
        />
        <div className="mt-1 flex justify-between text-xs text-gray-400">
          <span>12</span>
          <span>36</span>
          <span>60</span>
          <span>84 m</span>
        </div>
      </Field>

      <label className="flex cursor-pointer items-start gap-2.5">
        <input
          type="checkbox"
          checked={accepted}
          onChange={(e) => setAccepted(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded accent-blue-600"
          required
        />
        <span className="text-xs text-gray-600">
          Confirmo que he leído la Ley 1581/2012 y que mi empresa cumple con las obligaciones de
          tratamiento de datos personales de los empleados.
        </span>
      </label>

      {update.error && <p className="text-sm text-red-600">{update.error.message}</p>}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 rounded-lg border border-gray-300 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
        >
          Atrás
        </button>
        <button
          type="submit"
          disabled={update.isPending || !accepted}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {update.isPending ? (
            'Guardando...'
          ) : (
            <>
              Continuar <ChevronRight className="h-4 w-4" />
            </>
          )}
        </button>
      </div>

      <style>{`.input { width: 100%; border-radius: 8px; border: 1px solid #d1d5db; padding: 10px 12px; font-size: 14px; outline: none; background: white; } .input:focus { box-shadow: 0 0 0 2px #3b82f6; border-color: transparent; }`}</style>
    </form>
  )
}

// ─── Step 3: Horario laboral ──────────────────────────────────────────────────

const DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

function StepHorario({ onNext, onBack }: StepProps) {
  const create = trpc.admin.createSchedule.useMutation({ onSuccess: onNext })
  const [skip, setSkip] = useState(false)
  const [form, setForm] = useState({
    name: 'Horario estándar',
    timezone: 'America/Bogota',
    days_of_week: [1, 2, 3, 4, 5],
    start_time: '08:00',
    end_time: '18:00',
    disconnection_grace_minutes: 30,
  })

  const toggleDay = (d: number) =>
    setForm((f) => ({
      ...f,
      days_of_week: f.days_of_week.includes(d)
        ? f.days_of_week.filter((x) => x !== d)
        : [...f.days_of_week, d].sort((a, b) => a - b),
    }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (skip) {
      onNext()
      return
    }
    create.mutate(form)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <h2 className="text-base font-semibold text-gray-900">Horario laboral</h2>
        <p className="mt-1 text-sm text-gray-500">
          Define el horario base de tu empresa (Ley 2191/2022 — Desconexión Digital).
        </p>
      </div>

      {!skip && (
        <>
          <Field label="Nombre del horario">
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="input"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Hora inicio">
              <input
                type="time"
                value={form.start_time}
                onChange={(e) => setForm((f) => ({ ...f, start_time: e.target.value }))}
                className="input"
              />
            </Field>
            <Field label="Hora fin">
              <input
                type="time"
                value={form.end_time}
                onChange={(e) => setForm((f) => ({ ...f, end_time: e.target.value }))}
                className="input"
              />
            </Field>
          </div>
          <div>
            <label className="mb-2 block text-xs font-medium text-gray-600">Días laborales</label>
            <div className="flex flex-wrap gap-1.5">
              {DAYS.map((d, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => toggleDay(i)}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                    form.days_of_week.includes(i)
                      ? 'bg-blue-600 text-white'
                      : 'border border-gray-300 bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
          <Field label={`Gracia de desconexión: ${form.disconnection_grace_minutes} min`}>
            <input
              type="range"
              min={0}
              max={120}
              step={15}
              value={form.disconnection_grace_minutes}
              onChange={(e) =>
                setForm((f) => ({ ...f, disconnection_grace_minutes: Number(e.target.value) }))
              }
              className="w-full accent-blue-500"
            />
            <p className="mt-1 text-xs text-gray-400">
              Tiempo permitido fuera del horario antes de generar una alerta de desconexión.
            </p>
          </Field>
        </>
      )}

      <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-500">
        <input
          type="checkbox"
          checked={skip}
          onChange={(e) => setSkip(e.target.checked)}
          className="h-4 w-4 rounded accent-blue-600"
        />
        Omitir por ahora (puedo configurarlo después)
      </label>

      {create.error && <p className="text-sm text-red-600">{create.error.message}</p>}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 rounded-lg border border-gray-300 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
        >
          Atrás
        </button>
        <button
          type="submit"
          disabled={create.isPending}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {create.isPending ? (
            'Creando...'
          ) : (
            <>
              {skip ? 'Omitir' : 'Crear horario'} <ChevronRight className="h-4 w-4" />
            </>
          )}
        </button>
      </div>

      <style>{`.input { width: 100%; border-radius: 8px; border: 1px solid #d1d5db; padding: 10px 12px; font-size: 14px; outline: none; background: white; } .input:focus { box-shadow: 0 0 0 2px #3b82f6; border-color: transparent; }`}</style>
    </form>
  )
}

// ─── Step 4: Finalizar ────────────────────────────────────────────────────────

function StepFinal() {
  const router = useRouter()
  const complete = trpc.admin.completeOnboarding.useMutation({
    onSuccess: () => router.push('/admin/dashboard'),
  })

  return (
    <div className="space-y-6 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
        <Check className="h-8 w-8 text-green-600" />
      </div>
      <div>
        <h2 className="text-lg font-semibold text-gray-900">¡Todo listo!</h2>
        <p className="mt-2 text-sm text-gray-500">
          Tu empresa está configurada. Puedes agregar usuarios, equipos y más desde el panel de
          administración.
        </p>
      </div>
      <div className="space-y-1 rounded-lg bg-gray-50 px-4 py-3 text-left text-sm text-gray-600">
        <p>✓ Datos de empresa guardados</p>
        <p>✓ Cumplimiento HABEAS DATA configurado</p>
        <p>✓ Horario laboral definido</p>
      </div>
      <button
        onClick={() => complete.mutate()}
        disabled={complete.isPending}
        className="w-full rounded-lg bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {complete.isPending ? 'Finalizando...' : 'Ir al panel de administración →'}
      </button>
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-gray-600">{label}</label>
      {children}
    </div>
  )
}
