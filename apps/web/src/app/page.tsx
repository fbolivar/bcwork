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
  MapPin,
  Zap,
  Lock,
  Building2,
  Briefcase,
  HeadphonesIcon,
  Code2,
} from 'lucide-react'
import { LandingNav } from '@/features/landing/LandingNav'
import { PricingSection } from '@/features/landing/PricingSection'
import { ROICalculator } from '@/features/landing/ROICalculator'

// ─── Datos ────────────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: Monitor,
    title: 'Monitoreo en tiempo real',
    desc: 'Visibilidad completa de la actividad de cada colaborador: sesiones, aplicaciones y productividad.',
    tint: 'bg-cyan-500/10 text-cyan-400',
  },
  {
    icon: BarChart2,
    title: 'Analytics de productividad',
    desc: 'Dashboards ejecutivos con tendencias, comparativas de equipos y alertas automáticas.',
    tint: 'bg-blue-500/10 text-blue-400',
  },
  {
    icon: Clock,
    title: 'Control de jornada',
    desc: 'Gestión de horarios, horas extra, ausencias y balance de PTO conforme a la ley colombiana.',
    tint: 'bg-emerald-500/10 text-emerald-400',
  },
  {
    icon: Shield,
    title: 'Cumplimiento normativo',
    desc: 'SGSST, HABEAS DATA, Ley 2191/2022 de desconexión digital. Todo documentado y auditable.',
    tint: 'bg-violet-500/10 text-violet-400',
  },
  {
    icon: Users,
    title: 'Gestión de equipos',
    desc: 'Organigramas, planes de carrera, objetivos, feedback 360° y reconocimientos.',
    tint: 'bg-amber-500/10 text-amber-400',
  },
  {
    icon: FileText,
    title: 'Nómina colombiana',
    desc: 'Colillas con prima, cesantías, ARL, EPS, pensión y parafiscales. Exportación CSV.',
    tint: 'bg-rose-500/10 text-rose-400',
  },
]

// Métricas defendibles (hechos del producto, no cifras de adopción inventadas).
const STATS = [
  { value: '100%', label: 'Datos alojados en Colombia' },
  { value: '3 leyes', label: 'Cubiertas: 1581 · 2191 · 1221' },
  { value: '< 10 min', label: 'Puesta en marcha' },
  { value: '99.9%', label: 'Uptime objetivo (SLA)' },
]

const DIFFERENTIATORS = [
  {
    icon: Shield,
    title: 'Cumplimiento de fábrica',
    desc: 'Ley 1581 (Habeas Data), 2191 (desconexión) y 1221 (teletrabajo) cubiertas, con consentimiento y aviso de privacidad integrados. Sin abogados extra.',
  },
  {
    icon: BarChart2,
    title: 'De planillas a control real',
    desc: 'Reemplaza hojas de cálculo dispersas por un tablero único de actividad, jornada y productividad — con datos, no suposiciones.',
  },
  {
    icon: Lock,
    title: 'Tus datos, en tu país',
    desc: 'Información procesada y almacenada en la región, bajo tu propia política de retención. Exportable en cualquier momento.',
  },
]

const SEGMENTS = [
  {
    icon: HeadphonesIcon,
    label: 'BPOs / Call Centers',
    desc: 'Control de agentes remotos, cumplimiento laboral y productividad por turno.',
  },
  {
    icon: Code2,
    label: 'Empresas de Software',
    desc: 'Visibilidad de equipos distribuidos sin microgestión.',
  },
  {
    icon: Briefcase,
    label: 'Consultoras y Contabilidad',
    desc: 'Facturación por horas y control de proyectos para cada cliente.',
  },
  {
    icon: Building2,
    label: 'Grandes Empresas',
    desc: 'SSO, API propia, SLA garantizado y gestor de cuenta dedicado.',
  },
]

const FAQS = [
  {
    q: '¿Cómo funciona el precio por usuario?',
    a: 'Pagas únicamente por los usuarios activos que tienes en la plataforma cada mes. Si tienes 15 empleados en Growth, pagas 15 × $14.900 = $223.500/mes. Sin tarifas fijas por "rango de usuarios", sin sorpresas. El precio se ajusta automáticamente si agregas o retiras empleados.',
  },
  {
    q: '¿BCWork es legal en Colombia?',
    a: 'Sí. BCWork fue diseñado específicamente para cumplir con la Ley 1221/2008 (Teletrabajo), Ley 1581/2012 (HABEAS DATA) y la Ley 2191/2022 (Desconexión Digital). Cada empresa configura su política de consentimiento informado.',
  },
  {
    q: '¿Los empleados saben que los monitorean?',
    a: 'Absolutamente. BCWork requiere consentimiento explícito del empleado al instalar el agente. Los datos recopilados son transparentes y cada empleado puede ver su propia actividad en el portal /me.',
  },
  {
    q: '¿Vale la pena el plan anual?',
    a: 'Si tu equipo es estable, el plan anual equivale a pagar 10 meses y obtener 2 gratis — un ahorro del 16.7%. Además incluye soporte prioritario y onboarding personalizado sin costo adicional.',
  },
  {
    q: '¿Funciona con equipos fuera de Colombia?',
    a: 'Sí. BCWork admite múltiples zonas horarias, monedas y marcos normativos. El módulo de cumplimiento es configurable por país.',
  },
  {
    q: '¿Puedo migrar mis datos si cancelo?',
    a: 'Siempre. Exporta todo en un archivo .bcw (backup completo) o CSV en cualquier momento. Tus datos son tuyos y puedes llevarlos donde quieras.',
  },
]

// ─── Vista previa del producto (hero) ───────────────────────────────────────────

function ProductPreview() {
  const bars = [
    { d: 'L', h: 52 },
    { d: 'M', h: 74 },
    { d: 'M', h: 63 },
    { d: 'J', h: 88 },
    { d: 'V', h: 79 },
    { d: 'S', h: 34 },
    { d: 'D', h: 18 },
  ]
  const apps = [
    { name: 'VS Code', pct: 92, tone: 'bg-emerald-400' },
    { name: 'Google Meet', pct: 71, tone: 'bg-cyan-400' },
    { name: 'Slack', pct: 58, tone: 'bg-blue-400' },
    { name: 'YouTube', pct: 21, tone: 'bg-rose-400' },
  ]
  return (
    <div className="overflow-hidden rounded-xl bg-[#0d1b3e] text-left">
      {/* chrome */}
      <div className="flex items-center gap-1.5 border-b border-white/10 bg-white/5 px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-red-500/60" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-500/60" />
        <span className="h-2.5 w-2.5 rounded-full bg-green-500/60" />
        <div className="ml-3 flex-1 rounded bg-white/10 px-3 py-0.5 text-[10px] text-gray-400">
          app.bcwork.co/admin/dashboard
        </div>
      </div>
      <div className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs font-semibold text-white">Panel de administración</p>
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> 24 en línea
          </span>
        </div>
        {/* stat row */}
        <div className="mb-3 grid grid-cols-3 gap-2.5">
          {[
            { label: 'Productividad', val: '78%', color: 'text-emerald-400' },
            { label: 'Horas hoy', val: '192h', color: 'text-cyan-400' },
            { label: 'Ausencias', val: '2', color: 'text-amber-400' },
          ].map((s) => (
            <div key={s.label} className="rounded-lg border border-white/10 bg-white/5 p-2.5">
              <p className="text-[10px] text-gray-400">{s.label}</p>
              <p className={`mt-0.5 text-lg font-bold ${s.color}`}>{s.val}</p>
            </div>
          ))}
        </div>
        {/* chart + list */}
        <div className="grid grid-cols-5 gap-2.5">
          <div className="col-span-3 rounded-lg border border-white/10 bg-white/5 p-3">
            <p className="mb-2 text-[10px] text-gray-400">Actividad del equipo</p>
            <div className="flex h-20 items-end gap-1.5">
              {bars.map((b, i) => (
                <div key={i} className="flex flex-1 flex-col items-center gap-1">
                  <div
                    className="w-full rounded-t bg-gradient-to-t from-cyan-500/40 to-cyan-400"
                    style={{ height: `${b.h}%` }}
                  />
                  <span className="text-[8px] text-gray-500">{b.d}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="col-span-2 rounded-lg border border-white/10 bg-white/5 p-3">
            <p className="mb-2 text-[10px] text-gray-400">Top aplicaciones</p>
            <div className="space-y-2">
              {apps.map((a) => (
                <div key={a.name}>
                  <div className="mb-0.5 flex justify-between text-[9px] text-gray-300">
                    <span>{a.name}</span>
                    <span className="text-gray-500">{a.pct}%</span>
                  </div>
                  <div className="h-1 overflow-hidden rounded-full bg-white/10">
                    <div
                      className={`h-full rounded-full ${a.tone}`}
                      style={{ width: `${a.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Secciones ──────────────────────────────────────────────────────────────────

function Hero() {
  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0b1220] px-6 pt-24">
      {/* Grid + glows para profundidad */}
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute inset-0 opacity-[0.15]"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgba(148,163,184,0.15) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,0.15) 1px, transparent 1px)',
            backgroundSize: '56px 56px',
            maskImage: 'radial-gradient(ellipse 80% 60% at 50% 0%, black 40%, transparent 100%)',
            WebkitMaskImage:
              'radial-gradient(ellipse 80% 60% at 50% 0%, black 40%, transparent 100%)',
          }}
        />
        <div className="absolute -top-40 left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-cyan-500/15 blur-3xl" />
        <div className="absolute bottom-10 right-0 h-[380px] w-[380px] rounded-full bg-blue-600/15 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-5xl text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-4 py-1.5 text-xs font-medium text-cyan-300">
          <Zap className="h-3 w-3" />
          Cumple con la Ley 2191/2022 · Hecho en Colombia
        </div>

        <h1 className="mb-6 text-4xl font-extrabold leading-[1.1] tracking-tight text-white sm:text-6xl">
          Teletrabajo bajo control.{' '}
          <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            Sin complicaciones.
          </span>
        </h1>

        <p className="mx-auto mb-10 max-w-2xl text-lg text-gray-300">
          Centraliza el monitoreo de teletrabajo, el cumplimiento normativo, la nómina y la gestión
          de equipos — en una sola plataforma colombiana.
        </p>

        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Link
            href="/register"
            className="flex items-center gap-2 rounded-xl bg-cyan-500 px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-cyan-500/30 transition-all hover:bg-cyan-400"
          >
            Empieza gratis — 14 días
            <ChevronRight className="h-4 w-4" />
          </Link>
          <a
            href="#roi"
            className="rounded-xl border border-white/20 px-8 py-3.5 text-base font-medium text-gray-200 transition-all hover:border-white/40 hover:bg-white/5 hover:text-white"
          >
            Calcular mi ROI
          </a>
        </div>

        <p className="mt-5 text-xs text-gray-400">
          Sin tarjeta de crédito · desde $9.900/usuario/mes · Datos almacenados en Colombia
        </p>

        {/* Preview */}
        <div className="relative mx-auto mt-16 max-w-3xl">
          <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-white/10 to-white/0 p-1.5 shadow-2xl">
            <ProductPreview />
          </div>
          <div className="absolute -inset-6 -z-10 rounded-[2rem] bg-cyan-500/10 blur-3xl" />
        </div>
      </div>
    </section>
  )
}

function Stats() {
  return (
    <section className="border-y border-white/10 bg-white/[0.03] py-12">
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
    <section id="features" className="relative bg-[#0f172a] px-6 py-24">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-cyan-500/[0.04] to-transparent" />
      <div className="relative mx-auto max-w-5xl">
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
          {FEATURES.map(({ icon: Icon, title, desc, tint }) => (
            <div
              key={title}
              className="group rounded-2xl border border-white/10 bg-white/5 p-6 transition-all duration-200 hover:-translate-y-1 hover:border-cyan-500/40 hover:bg-white/[0.07] hover:shadow-lg hover:shadow-cyan-500/5"
            >
              <div className={`mb-4 inline-flex rounded-xl p-3 ${tint}`}>
                <Icon className="h-6 w-6" />
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

function Segments() {
  return (
    <section className="bg-[#0a1020] px-6 py-20">
      <div className="mx-auto max-w-5xl">
        <div className="mb-10 text-center">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-cyan-400">
            ¿Para quién es BCWork?
          </p>
          <h2 className="text-2xl font-bold text-white sm:text-3xl">
            Construido para empresas colombianas
          </h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {SEGMENTS.map(({ icon: Icon, label, desc }) => (
            <div
              key={label}
              className="rounded-2xl border border-white/10 bg-white/5 p-5 text-center transition-colors hover:border-white/20"
            >
              <div className="mx-auto mb-3 inline-flex rounded-xl bg-cyan-500/10 p-3">
                <Icon className="h-5 w-5 text-cyan-400" />
              </div>
              <p className="mb-1 text-sm font-semibold text-white">{label}</p>
              <p className="text-xs leading-relaxed text-gray-400">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function Differentiators() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-[#0f172a] via-blue-950/40 to-[#0f172a] px-6 py-24">
      <div className="pointer-events-none absolute left-1/2 top-0 h-[400px] w-[700px] -translate-x-1/2 rounded-full bg-blue-600/10 blur-3xl" />
      <div className="relative mx-auto max-w-5xl">
        <div className="mb-12 text-center">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-cyan-400">
            Por qué BCWork
          </p>
          <h2 className="text-3xl font-bold text-white sm:text-4xl">
            Cumplimiento y control, sin la complejidad
          </h2>
        </div>
        <div className="grid gap-6 sm:grid-cols-3">
          {DIFFERENTIATORS.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="rounded-2xl border border-white/10 bg-white/5 p-7 backdrop-blur-sm"
            >
              <div className="mb-4 inline-flex rounded-xl bg-cyan-500/15 p-3">
                <Icon className="h-6 w-6 text-cyan-300" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-white">{title}</h3>
              <p className="text-sm leading-relaxed text-gray-300">{desc}</p>
            </div>
          ))}
        </div>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-gray-400">
          <span className="inline-flex items-center gap-1.5">
            <CheckCircle className="h-3.5 w-3.5 text-emerald-400" /> Consentimiento informado
          </span>
          <span className="inline-flex items-center gap-1.5">
            <CheckCircle className="h-3.5 w-3.5 text-emerald-400" /> Aviso de privacidad
          </span>
          <span className="inline-flex items-center gap-1.5">
            <CheckCircle className="h-3.5 w-3.5 text-emerald-400" /> Portal de transparencia /me
          </span>
          <span className="inline-flex items-center gap-1.5">
            <CheckCircle className="h-3.5 w-3.5 text-emerald-400" /> Exportación de datos
          </span>
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
              className="group rounded-xl border border-white/10 bg-white/5 px-5 py-4 open:border-cyan-500/40 open:bg-white/[0.07]"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-medium text-white">
                {q}
                <ChevronRight className="h-4 w-4 shrink-0 text-gray-400 transition-transform group-open:rotate-90" />
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-gray-300">{a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}

function CTA() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-r from-blue-900 to-cyan-900 px-6 py-24 text-center">
      <div className="pointer-events-none absolute inset-0 opacity-20">
        <div className="absolute -left-20 top-0 h-72 w-72 rounded-full bg-cyan-400/30 blur-3xl" />
        <div className="absolute -right-20 bottom-0 h-72 w-72 rounded-full bg-blue-400/30 blur-3xl" />
      </div>
      <div className="relative mx-auto max-w-2xl">
        <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-cyan-300">
          Empieza hoy
        </p>
        <h2 className="mb-4 text-3xl font-extrabold text-white sm:text-4xl">
          Ten visibilidad real sobre tu equipo remoto
        </h2>
        <p className="mb-8 text-gray-200">
          14 días gratis · Sin tarjeta de crédito · Configuración en menos de 10 minutos
        </p>
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/register"
            className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-3.5 text-base font-bold text-blue-900 shadow-xl transition-all hover:bg-cyan-50"
          >
            Crear cuenta gratis
            <ChevronRight className="h-4 w-4" />
          </Link>
          <a
            href="mailto:ventas@bcwork.co"
            className="inline-flex items-center gap-2 rounded-xl border border-white/30 px-8 py-3.5 text-base font-medium text-white transition-all hover:border-white/60 hover:bg-white/10"
          >
            Hablar con ventas
          </a>
        </div>
        <p className="mt-5 text-xs text-cyan-200/70">
          Precio fijo en COP · Sin variación por TRM · Factura electrónica
        </p>
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
                <a href="#roi" className="transition-colors hover:text-white">
                  Calculadora ROI
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
              <li>
                <a href="mailto:ventas@bcwork.co" className="transition-colors hover:text-white">
                  ventas@bcwork.co
                </a>
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
    <div className="min-h-screen bg-[#0b1220] text-white">
      <LandingNav />
      <Hero />
      <Stats />
      <Features />
      <Segments />
      <Differentiators />
      <div id="roi">
        <ROICalculator />
      </div>
      <PricingSection />
      <FAQ />
      <CTA />
      <Footer />
    </div>
  )
}
