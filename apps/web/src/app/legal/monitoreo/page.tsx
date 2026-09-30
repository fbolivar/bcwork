import { Monitor } from 'lucide-react'

export const metadata = {
  title: 'Política de Monitoreo — BCWork',
  description: 'Política de monitoreo de la actividad laboral en equipos corporativos.',
}

export default function MonitoreoPage() {
  return (
    <div className="min-h-screen bg-white px-4 py-12">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100">
            <Monitor className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Política de Monitoreo de la Actividad Laboral
            </h1>
            <p className="mt-0.5 text-sm text-gray-500">
              BCWork · Plantilla · Vigente desde 2026-10-01
            </p>
          </div>
        </div>

        <div className="mb-8 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Este es un modelo base. Cada empresa debe adaptarlo a su realidad y hacerlo revisar por su
          asesor laboral antes de aplicarlo. No constituye concepto jurídico.
        </div>

        <div className="prose prose-sm max-w-none text-gray-700">
          <Section title="1. Finalidad">
            <p>
              El monitoreo de la actividad en los equipos corporativos tiene como única finalidad la
              gestión del teletrabajo: medir tiempos de conexión, cumplimiento de la jornada,
              productividad y uso de las herramientas de trabajo, así como velar por la seguridad
              informática de la empresa. No se usa para vigilancia de la vida privada del
              trabajador.
            </p>
          </Section>

          <Section title="2. Marco legal">
            <ul>
              <li>
                <strong>Ley 1581 de 2012</strong> y Decreto 1377 de 2013 — protección de datos
                personales (habeas data).
              </li>
              <li>
                <strong>Ley 2121 de 2021</strong> — régimen de trabajo remoto.
              </li>
              <li>
                <strong>Ley 2191 de 2022</strong> — desconexión laboral.
              </li>
              <li>
                <strong>Ley 2101 de 2021</strong> — jornada laboral máxima.
              </li>
            </ul>
          </Section>

          <Section title="3. Qué se monitorea y qué no">
            <p>
              <strong>Se registra:</strong> tiempo activo e inactivo, aplicaciones de escritorio
              usadas, dominio de los sitios web visitados (no la dirección completa ni el
              contenido), sesiones de trabajo, ubicación de red (oficina/remoto) e inventario del
              equipo.
            </p>
            <p>
              <strong>No se registra:</strong> capturas de pantalla, audio, video, pulsaciones de
              teclado, contenido de archivos o mensajes, ni actividad fuera de la jornada
              configurada.
            </p>
          </Section>

          <Section title="4. Alcance y límites">
            <p>
              El monitoreo opera únicamente dentro del horario laboral definido para cada persona.
              Los datos son de uso exclusivo del empleador para las finalidades del punto 1, no se
              venden ni se comparten con terceros y se conservan por el tiempo definido en la
              política de tratamiento de datos.
            </p>
          </Section>

          <Section title="5. Acceso a la información">
            <p>
              Los informes con datos nominales (por persona) son de acceso restringido a Gestión
              Humana y al líder directo. La Gerencia recibe información agregada por área. El acceso
              queda registrado en la auditoría del sistema.
            </p>
          </Section>

          <Section title="6. Uso en decisiones laborales">
            <p>
              La información de monitoreo es un insumo de acompañamiento y conversación, nunca la
              prueba única para una decisión disciplinaria. Toda medida sigue el debido proceso del
              reglamento interno, con derecho de defensa. Antes de concluir sobre una persona se
              validan las condiciones técnicas (cobertura del agente, fallas de red o equipo) y las
              ausencias justificadas.
            </p>
          </Section>

          <Section title="7. Derechos del trabajador">
            <p>
              Conocer, actualizar, rectificar y suprimir sus datos, y revocar el consentimiento, en
              los términos de la Ley 1581 de 2012, contactando a Gestión Humana.
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
