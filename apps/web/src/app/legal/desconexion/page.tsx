import { Clock } from 'lucide-react'

export const metadata = {
  title: 'Política de Desconexión Laboral — BCWork',
  description: 'Política de desconexión laboral conforme a la Ley 2191 de 2022.',
}

export default function DesconexionPage() {
  return (
    <div className="min-h-screen bg-white px-4 py-12">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100">
            <Clock className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Política de Desconexión Laboral</h1>
            <p className="mt-0.5 text-sm text-gray-500">
              BCWork · Plantilla · Vigente desde 2026-10-01
            </p>
          </div>
        </div>

        <div className="mb-8 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Modelo base. Adáptelo a su empresa y hágalo revisar por su asesor laboral antes de
          aplicarlo. No constituye concepto jurídico.
        </div>

        <div className="prose prose-sm max-w-none text-gray-700">
          <Section title="1. Objeto">
            <p>
              Garantizar el derecho de los trabajadores a la desconexión laboral: no ser contactados
              ni requeridos para tareas por fuera de su jornada, en cumplimiento de la{' '}
              <strong>Ley 2191 de 2022</strong>.
            </p>
          </Section>

          <Section title="2. Alcance">
            <p>
              Aplica a todo el personal, en especial a quienes trabajan de forma remota o híbrida.
              Cubre correo, mensajería, llamadas y cualquier herramienta corporativa.
            </p>
          </Section>

          <Section title="3. Reglas">
            <ul>
              <li>
                Fuera del horario laboral, en descansos, licencias y vacaciones, el trabajador no
                está obligado a responder comunicaciones de trabajo.
              </li>
              <li>
                Los líderes evitan asignar tareas o enviar comunicaciones que exijan respuesta fuera
                de jornada, salvo casos de fuerza mayor debidamente justificados.
              </li>
              <li>
                El trabajo en fines de semana o en horario nocturno debe ser excepcional y acordado;
                no se espera ni se exige de forma habitual.
              </li>
            </ul>
          </Section>

          <Section title="4. Seguimiento con BCWork">
            <p>
              BCWork mide la actividad fuera de la jornada configurada como una señal preventiva
              para la empresa, no como un mérito. Cuando una persona registra actividad recurrente
              fuera de horario o en fin de semana, el líder y Gestión Humana revisan la carga de
              trabajo y los acuerdos de horario, y toman medidas para proteger la desconexión.
            </p>
          </Section>

          <Section title="5. Canal de reclamación">
            <p>
              Cualquier trabajador puede reportar a Gestión Humana el incumplimiento de esta
              política. La empresa atenderá el reporte sin represalias.
            </p>
          </Section>
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="mb-3 text-base font-semibold text-gray-900">{title}</h2>
      {children}
    </section>
  )
}
