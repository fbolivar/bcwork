import Link from 'next/link'
import Image from 'next/image'
import {
  Monitor,
  BarChart2,
  Shield,
  Clock,
  Users,
  FileText,
  CheckCircle,
  ChevronRight,
  Star,
  MapPin,
  Zap,
  Lock,
} from 'lucide-react'

// ─── Datos ────────────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: Monitor,
    title: 'Monitoreo en tiempo real',
    desc: 'Visibilidad completa de la actividad de cada colaborador: sesiones, aplicaciones y productividad.',
  },
  {
    icon: BarChart2,
    title: 'Analytics de productividad',
    desc: 'Dashboards ejecutivos con tendencias, comparativas de equipos y alertas automáticas.',
  },
  {
    icon: Clock,
    title: 'Control de jornada',
    desc: 'Gestión de horarios, horas extra, ausencias y balance de PTO conforme a la ley colombiana.',
  },
  {
    icon: Shield,
    title: 'Cumplimiento normativo',
    desc: 'SGSST, HABEAS DATA, Ley 2191/2022 de desconexión digital. Todo documentado y auditable.',
  },
  {
    icon: Users,
    title: 'Gestión de equipos',
    desc: 'Organigramas, planes de carrera, objetivos, feedback 360° y reconocimientos.',
  },
  {
    icon: FileText,
    title: 'Nómina colombiana',
    desc: 'Colillas con prima, cesantías, ARL, EPS, pensión y parafiscales. Exportación CSV.',
  },
]

const STATS = [
  { value: '500+', label: 'Empresas activas' },
  { value: '12.000+', label: 'Empleados monitoreados' },
  { value: '2.4M+', label: 'Horas registradas' },
  { value: '99.9%', label: 'Uptime garantizado' },
]

const PLANS = [
  {
    name: 'Starter',
    price: '$49.000',
    period: '/mes',
    desc: 'Ideal para equipos pequeños que empiezan con el teletrabajo.',
    seats: 'Hasta 10 usuarios',
    features: ['Monitoreo básico', 'Reportes mensuales', 'Control de jornada', 'Soporte por email'],
    cta: 'Empieza gratis',
    highlight: false,
  },
  {
    name: 'Growth',
    price: '$149.000',
    period: '/mes',
    desc: 'Para equipos en crecimiento que necesitan control total.',
    seats: 'Hasta 50 usuarios',
    features: [
      'Todo en Starter',
      'Analytics avanzados',
      'Gestión de ausencias',
      'Módulo manager',
      'Alertas automáticas',
      'Soporte prioritario',
    ],
    cta: 'Prueba 14 días gratis',
    highlight: true,
  },
  {
    name: 'Enterprise',
    price: 'A medida',
    period: '',
    desc: 'Para grandes organizaciones con necesidades específicas.',
    seats: 'Usuarios ilimitados',
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
  },
]

const FAQS = [
  {
    q: '¿BCWork es legal en Colombia?',
    a: 'Sí. BCWork fue diseñado específicamente para cumplir con la Ley 1221/2008 (Teletrabajo), Ley 1581/2012 (HABEAS DATA) y la Ley 2191/2022 (Desconexión Digital). Cada tenant configura su política de consentimiento informado.',
  },
  {
    q: '¿Los empleados saben que los monitorean?',
    a: 'Absolutamente. BCWork requiere consentimiento explícito del empleado al instalar el agente. Los datos recopilados son transparentes y el empleado puede ver su propia actividad en el portal /me.',
  },
  {
    q: '¿Qué datos recopila el agente?',
    a: 'Tiempo activo/inactivo por sesión, aplicaciones y dominios visitados (categorías, no URLs exactas), ubicación por IP y capturas de pantalla opcionales con consentimiento.',
  },
  {
    q: '¿Funciona con equipos fuera de Colombia?',
    a: 'Sí. BCWork admite múltiples zonas horarias, monedas y marcos normativos. El módulo de cumplimiento es configurable por país.',
  },
  {
    q: '¿Puedo migrar mis datos si cancelo?',
    a: 'Siempre. Exporta todo en CSV o JSON en cualquier momento. Tus datos son tuyos.',
  },
]

// ─── Componentes ──────────────────────────────────────────────────────────────

function Navbar() {
  return (
    <nav className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-[#0f172a]/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <div className="flex items-center gap-2.5">
          <Image src="/brand/icon.svg" alt="BCWork" width={32} height={32} className="shrink-0" />
          <span className="text-lg font-bold tracking-tight text-white">BCWork</span>
        </div>
        <div className="hidden items-center gap-8 text-sm text-gray-400 sm:flex">
          <a href="#features" className="transition-colors hover:text-white">
            Características
          </a>
          <a href="#pricing" className="transition-colors hover:text-white">
            Precios
          </a>
          <a href="#faq" className="transition-colors hover:text-white">
            FAQ
          </a>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm text-gray-300 transition-colors hover:text-white">
            Ingresar
          </Link>
          <Link
            href="/register"
            className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-cyan-400"
          >
            Empieza gratis
          </Link>
        </div>
      </div>
    </nav>
  )
}

function Hero() {
  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0f172a] px-6 pt-20">
      {/* Gradient blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-[400px] w-[400px] rounded-full bg-blue-600/10 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-4xl text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-4 py-1.5 text-xs font-medium text-cyan-400">
          <Zap className="h-3 w-3" />
          Cumple con la Ley 2191/2022 — Desconexión Digital
        </div>

        <h1 className="mb-6 text-4xl font-extrabold leading-tight tracking-tight text-white sm:text-6xl">
          Teletrabajo bajo control.{' '}
          <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            Sin complicaciones.
          </span>
        </h1>

        <p className="mx-auto mb-10 max-w-2xl text-lg text-gray-400">
          BCWork es la plataforma SaaS colombiana que centraliza el monitoreo de teletrabajo,
          cumplimiento normativo, nómina y gestión de equipos — en un solo lugar.
        </p>

        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Link
            href="/register"
            className="flex items-center gap-2 rounded-xl bg-cyan-500 px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-cyan-500/30 transition-all hover:bg-cyan-400"
          >
            Empieza gratis — 14 días
            <ChevronRight className="h-4 w-4" />
          </Link>
          <Link
            href="/login"
            className="rounded-xl border border-white/20 px-8 py-3.5 text-base font-medium text-gray-300 transition-all hover:border-white/40 hover:text-white"
          >
            Ver demo
          </Link>
        </div>

        <p className="mt-5 text-xs text-gray-500">
          Sin tarjeta de crédito · Cancela cuando quieras · Datos en Colombia
        </p>

        {/* Mockup preview */}
        <div className="relative mx-auto mt-16 max-w-3xl">
          <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-white/5 to-white/0 p-1 shadow-2xl">
            <div className="overflow-hidden rounded-xl bg-[#0d1b3e]">
              {/* Browser chrome */}
              <div className="flex items-center gap-1.5 border-b border-white/10 bg-white/5 px-4 py-2.5">
                <span className="h-2.5 w-2.5 rounded-full bg-red-500/60" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500/60" />
                <span className="h-2.5 w-2.5 rounded-full bg-green-500/60" />
                <div className="ml-3 flex-1 rounded bg-white/10 px-3 py-0.5 text-[10px] text-gray-500">
                  bcwork.app/admin/dashboard
                </div>
              </div>
              {/* Dashboard preview */}
              <div className="grid grid-cols-3 gap-3 p-4">
                {[
                  { label: 'Empleados activos', val: '24', color: 'text-cyan-400' },
                  { label: 'Productividad prom.', val: '78%', color: 'text-green-400' },
                  { label: 'Horas hoy', val: '192h', color: 'text-blue-400' },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-lg border border-white/10 bg-white/5 p-3"
                  >
                    <p className="text-[10px] text-gray-500">{stat.label}</p>
                    <p className={`mt-1 text-xl font-bold ${stat.color}`}>{stat.val}</p>
                  </div>
                ))}
                <div className="col-span-3 h-24 rounded-lg border border-white/10 bg-white/5 p-3">
                  <div className="mb-2 text-[10px] text-gray-500">Actividad semanal</div>
                  <div className="flex h-12 items-end gap-1">
                    {[40, 65, 55, 80, 72, 90, 60].map((h, i) => (
                      <div
                        key={i}
                        className="flex-1 rounded-t bg-cyan-500/60"
                        style={{ height: `${h}%` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="absolute -inset-4 -z-10 rounded-3xl bg-cyan-500/5 blur-2xl" />
        </div>
      </div>
    </section>
  )
}

function Stats() {
  return (
    <section className="border-y border-white/10 bg-white/5 py-12">
      <div className="mx-auto max-w-5xl px-6">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          {STATS.map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-3xl font-extrabold text-white">{s.value}</p>
              <p className="mt-1 text-sm text-gray-400">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function Features() {
  return (
    <section id="features" className="bg-[#0f172a] px-6 py-24">
      <div className="mx-auto max-w-5xl">
        <div className="mb-14 text-center">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-cyan-400">
            Características
          </p>
          <h2 className="text-3xl font-bold text-white sm:text-4xl">
            Todo lo que necesita tu equipo remoto
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-gray-400">
            Una sola plataforma para cumplir la ley, gestionar el equipo y mejorar la productividad.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="hover:bg-white/8 group rounded-2xl border border-white/10 bg-white/5 p-6 transition-all hover:border-cyan-500/40"
            >
              <div className="mb-4 inline-flex rounded-xl bg-cyan-500/10 p-2.5">
                <Icon className="h-5 w-5 text-cyan-400" />
              </div>
              <h3 className="mb-2 text-base font-semibold text-white">{title}</h3>
              <p className="text-sm leading-relaxed text-gray-400">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function SocialProof() {
  return (
    <section className="bg-gradient-to-br from-[#0f172a] via-blue-950/50 to-[#0f172a] px-6 py-20">
      <div className="mx-auto max-w-4xl text-center">
        <div className="mb-3 flex justify-center gap-1">
          {[1, 2, 3, 4, 5].map((i) => (
            <Star key={i} className="h-5 w-5 fill-amber-400 text-amber-400" />
          ))}
        </div>
        <blockquote className="mx-auto max-w-2xl text-xl font-medium leading-relaxed text-white">
          "BCWork nos permitió cumplir con todas las obligaciones del teletrabajo en Colombia sin
          necesidad de contratar un equipo legal adicional. El retorno fue inmediato."
        </blockquote>
        <div className="mt-6 flex items-center justify-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan-500/20 text-sm font-bold text-cyan-400">
            CM
          </div>
          <div className="text-left">
            <p className="text-sm font-medium text-white">Carlos Martínez</p>
            <p className="text-xs text-gray-400">Director de RRHH · Empresa de 120 empleados</p>
          </div>
        </div>
      </div>
    </section>
  )
}

function Pricing() {
  return (
    <section id="pricing" className="bg-[#0f172a] px-6 py-24">
      <div className="mx-auto max-w-5xl">
        <div className="mb-14 text-center">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-cyan-400">
            Precios
          </p>
          <h2 className="text-3xl font-bold text-white sm:text-4xl">
            Elige el plan para tu equipo
          </h2>
          <p className="mt-4 text-gray-400">Precios en pesos colombianos · Sin costos ocultos</p>
        </div>

        <div className="grid gap-6 sm:grid-cols-3">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
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
              <div className="mb-5">
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">
                  {plan.name}
                </p>
                <div className="mt-2 flex items-end gap-1">
                  <span className="text-3xl font-extrabold text-white">{plan.price}</span>
                  {plan.period && <span className="mb-1 text-sm text-gray-400">{plan.period}</span>}
                </div>
                <p className="mt-1 text-xs text-gray-400">{plan.seats}</p>
                <p className="mt-2 text-sm text-gray-400">{plan.desc}</p>
              </div>

              <ul className="mb-6 flex-1 space-y-2.5">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-gray-300">
                    <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-cyan-400" />
                    {f}
                  </li>
                ))}
              </ul>

              <Link
                href="/register"
                className={`block rounded-xl py-2.5 text-center text-sm font-semibold transition-all ${
                  plan.highlight
                    ? 'bg-cyan-500 text-white shadow-md shadow-cyan-500/30 hover:bg-cyan-400'
                    : 'border border-white/20 text-gray-300 hover:border-white/40 hover:text-white'
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function FAQ() {
  return (
    <section id="faq" className="bg-[#0a1020] px-6 py-24">
      <div className="mx-auto max-w-3xl">
        <div className="mb-14 text-center">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-cyan-400">FAQ</p>
          <h2 className="text-3xl font-bold text-white">Preguntas frecuentes</h2>
        </div>

        <div className="space-y-4">
          {FAQS.map(({ q, a }) => (
            <details
              key={q}
              className="open:bg-white/8 group rounded-xl border border-white/10 bg-white/5 px-5 py-4 open:border-cyan-500/40"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-medium text-white">
                {q}
                <ChevronRight className="h-4 w-4 shrink-0 text-gray-400 transition-transform group-open:rotate-90" />
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-gray-400">{a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}

function CTA() {
  return (
    <section className="bg-gradient-to-r from-blue-900 to-cyan-900 px-6 py-20 text-center">
      <div className="mx-auto max-w-2xl">
        <h2 className="mb-4 text-3xl font-extrabold text-white sm:text-4xl">
          ¿Listo para llevar tu teletrabajo al siguiente nivel?
        </h2>
        <p className="mb-8 text-gray-300">
          14 días gratis. Sin tarjeta de crédito. Configuración en menos de 10 minutos.
        </p>
        <Link
          href="/register"
          className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-3.5 text-base font-bold text-blue-900 shadow-xl transition-all hover:bg-cyan-50"
        >
          Crear cuenta gratis
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="bg-[#0a1020] px-6 py-12 text-sm text-gray-500">
      <div className="mx-auto max-w-5xl">
        <div className="grid gap-8 sm:grid-cols-4">
          <div className="sm:col-span-2">
            <div className="mb-3 flex items-center gap-2">
              <Image src="/brand/icon.svg" alt="BCWork" width={28} height={28} />
              <span className="font-bold text-white">BCWork</span>
            </div>
            <p className="text-xs leading-relaxed text-gray-500">
              Plataforma SaaS colombiana de monitoreo y gestión de teletrabajo. Diseñada para
              cumplir con la legislación laboral colombiana.
            </p>
            <div className="mt-3 flex items-center gap-1 text-xs text-gray-600">
              <MapPin className="h-3 w-3" />
              Colombia · Datos almacenados en la región
            </div>
          </div>
          <div>
            <p className="mb-3 font-semibold text-gray-300">Producto</p>
            <ul className="space-y-2 text-xs">
              <li>
                <a href="#features" className="transition-colors hover:text-white">
                  Características
                </a>
              </li>
              <li>
                <a href="#pricing" className="transition-colors hover:text-white">
                  Precios
                </a>
              </li>
              <li>
                <Link href="/login" className="transition-colors hover:text-white">
                  Ingresar
                </Link>
              </li>
              <li>
                <Link href="/register" className="transition-colors hover:text-white">
                  Registrarse
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="mb-3 font-semibold text-gray-300">Legal</p>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/legal/privacy" className="transition-colors hover:text-white">
                  Política de privacidad
                </Link>
              </li>
              <li>
                <Link href="/legal/terms" className="transition-colors hover:text-white">
                  Términos de uso
                </Link>
              </li>
              <li>
                <span className="flex items-center gap-1">
                  <Lock className="h-3 w-3" /> Ley 1581/2012
                </span>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-10 border-t border-white/10 pt-6 text-center text-xs text-gray-600">
          © {new Date().getFullYear()} BCWork · Todos los derechos reservados ·{' '}
          <span className="text-cyan-600">bc-security.com</span>
        </div>
      </div>
    </footer>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0f172a] text-white">
      <Navbar />
      <Hero />
      <Stats />
      <Features />
      <SocialProof />
      <Pricing />
      <FAQ />
      <CTA />
      <Footer />
    </div>
  )
}
