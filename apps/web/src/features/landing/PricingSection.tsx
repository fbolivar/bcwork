'use client'

import { useState } from 'react'
import Link from 'next/link'
import { CheckCircle, Zap } from 'lucide-react'

const SEAT_PRICE = {
  starter: { monthly: 9900, minSeats: 5 },
  growth: { monthly: 14900, minSeats: 5 },
  enterprise: { monthly: 19900, minSeats: 10 },
}

const ANNUAL_DISCOUNT = 10 / 12 // 2 months free

function fmt(n: number) {
  return `$${n.toLocaleString('es-CO')}`
}

const PLANS = [
  {
    key: 'starter' as const,
    name: 'Starter',
    desc: 'Ideal para equipos pequeños que empiezan con el teletrabajo.',
    features: [
      'Monitoreo básico de actividad',
      'Control de jornada laboral',
      'Reportes mensuales',
      'Hasta 10 usuarios',
      'Soporte por email',
    ],
    cta: 'Empieza gratis',
    highlight: false,
    ctaLink: '/register',
  },
  {
    key: 'growth' as const,
    name: 'Growth',
    desc: 'Para equipos en crecimiento que necesitan control total.',
    features: [
      'Todo en Starter',
      'Analytics avanzados',
      'Gestión de ausencias',
      'Módulo manager',
      'Alertas automáticas',
      'Soporte prioritario',
      'Sin límite de usuarios',
    ],
    cta: 'Prueba 14 días gratis',
    highlight: true,
    ctaLink: '/register',
  },
  {
    key: 'enterprise' as const,
    name: 'Enterprise',
    desc: 'Para grandes organizaciones con necesidades específicas.',
    features: [
      'Todo en Growth',
      'SSO / SAML',
      'API propia',
      'SLA garantizado',
      'Gestor de cuenta dedicado',
      'Capacitación presencial',
    ],
    cta: 'Hablar con ventas',
    highlight: false,
    ctaLink: 'mailto:ventas@bcwork.co',
  },
]

export function PricingSection() {
  const [annual, setAnnual] = useState(false)

  function getPrice(key: 'starter' | 'growth' | 'enterprise') {
    if (key === 'enterprise') return null
    const base = SEAT_PRICE[key].monthly
    return annual ? Math.round(base * ANNUAL_DISCOUNT) : base
  }

  function getFrom(key: 'starter' | 'growth' | 'enterprise') {
    const price = getPrice(key)
    if (!price) return null
    return price * SEAT_PRICE[key].minSeats
  }

  return (
    <section id="pricing" className="bg-[#0f172a] px-6 py-24">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="mb-10 text-center">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-cyan-400">
            Precios
          </p>
          <h2 className="text-3xl font-bold text-white sm:text-4xl">Transparente. Por usuario.</h2>
          <p className="mt-3 text-gray-400">
            Precios en pesos colombianos · Sin costos ocultos · Crece cuando tú creces
          </p>

          {/* Toggle mensual/anual */}
          <div className="mt-6 inline-flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-1.5">
            <button
              type="button"
              onClick={() => setAnnual(false)}
              className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-all ${
                !annual ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              Mensual
            </button>
            <button
              type="button"
              onClick={() => setAnnual(true)}
              className={`relative flex items-center gap-2 rounded-lg px-4 py-1.5 text-sm font-medium transition-all ${
                annual ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              Anual
              <span className="rounded-full bg-cyan-500 px-2 py-0.5 text-[10px] font-bold text-white">
                2 MESES GRATIS
              </span>
            </button>
          </div>
        </div>

        {/* Cards */}
        <div className="grid gap-6 sm:grid-cols-3">
          {PLANS.map((plan) => {
            const seatPrice = getPrice(plan.key)
            const fromPrice = getFrom(plan.key)
            const isEnterprise = plan.key === 'enterprise'

            return (
              <div
                key={plan.key}
                className={`relative flex flex-col rounded-2xl border p-6 ${
                  plan.highlight
                    ? 'border-cyan-500 bg-gradient-to-b from-cyan-500/10 to-transparent shadow-xl shadow-cyan-500/10'
                    : 'border-white/10 bg-white/5'
                }`}
              >
                {plan.highlight && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-cyan-500 px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                    Más popular
                  </div>
                )}

                {/* Plan name */}
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">
                  {plan.name}
                </p>

                {/* Price block */}
                <div className="mb-1 mt-3">
                  {isEnterprise ? (
                    <div className="flex items-end gap-1">
                      <span className="text-3xl font-extrabold text-white">A medida</span>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-end gap-1.5">
                        <span className="text-3xl font-extrabold text-white">
                          {fmt(seatPrice!)}
                        </span>
                        <span className="mb-1.5 text-sm text-gray-400">/usuario/mes</span>
                      </div>
                      {annual && (
                        <p className="text-xs text-gray-500 line-through">
                          {fmt(SEAT_PRICE[plan.key].monthly)}/usuario/mes
                        </p>
                      )}
                    </>
                  )}
                </div>

                {/* From price */}
                {!isEnterprise && fromPrice && (
                  <div className="mb-2 inline-flex items-center gap-1.5 rounded-lg bg-white/5 px-2.5 py-1">
                    <span className="text-xs text-gray-400">desde</span>
                    <span className="text-sm font-bold text-cyan-400">{fmt(fromPrice)}/mes</span>
                    <span className="text-xs text-gray-500">
                      ({SEAT_PRICE[plan.key].minSeats} usuarios)
                    </span>
                  </div>
                )}

                {isEnterprise && (
                  <div className="mb-2 inline-flex items-center gap-1.5 rounded-lg bg-white/5 px-2.5 py-1">
                    <span className="text-xs text-gray-400">Usuarios ilimitados</span>
                  </div>
                )}

                <p className="mb-5 mt-2 text-sm text-gray-400">{plan.desc}</p>

                {/* Features */}
                <ul className="mb-6 flex-1 space-y-2.5">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-gray-300">
                      <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-cyan-400" />
                      {f}
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <Link
                  href={plan.ctaLink}
                  className={`block rounded-xl py-2.5 text-center text-sm font-semibold transition-all ${
                    plan.highlight
                      ? 'bg-cyan-500 text-white shadow-md shadow-cyan-500/30 hover:bg-cyan-400'
                      : 'border border-white/20 text-gray-300 hover:border-white/40 hover:text-white'
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            )
          })}
        </div>

        {/* Footer note */}
        <div className="mt-8 flex flex-col items-center gap-2 text-center text-xs text-gray-500 sm:flex-row sm:justify-center sm:gap-6">
          <span className="flex items-center gap-1.5">
            <CheckCircle className="h-3.5 w-3.5 text-cyan-500/60" />
            14 días de prueba gratuita sin tarjeta
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle className="h-3.5 w-3.5 text-cyan-500/60" />
            Cancela cuando quieras
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle className="h-3.5 w-3.5 text-cyan-500/60" />
            Factura electrónica incluida
          </span>
          <span className="flex items-center gap-1.5">
            <Zap className="h-3.5 w-3.5 text-cyan-500/60" />
            Precio fijo en COP — sin variación por TRM
          </span>
        </div>
      </div>
    </section>
  )
}
