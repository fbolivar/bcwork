import Link from 'next/link'
import { Shield } from 'lucide-react'

export const metadata = {
  title: 'Aviso de Privacidad — BCWork',
  description: 'Política de tratamiento de datos personales conforme a la Ley 1581 de 2012.',
}

export default function PrivacidadPage() {
  return (
    <div className="min-h-screen bg-white px-4 py-12">
      <div className="mx-auto max-w-3xl">
        {/* Encabezado */}
        <div className="mb-10 flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100">
            <Shield className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Aviso de Privacidad y Política de Tratamiento de Datos Personales
            </h1>
            <p className="mt-0.5 text-sm text-gray-500">
              BCWork · Versión 1.0 · Vigente desde 2025-01-01
            </p>
          </div>
        </div>

        <div className="prose prose-sm max-w-none text-gray-700">
          {/* 1 */}
          <Section title="1. Responsable del Tratamiento">
            <p>
              <strong>BC Fabric SAS</strong>, sociedad identificada con NIT 901.XXX.XXX-X,
              domiciliada en Bogotá D.C., Colombia, correo electrónico de contacto:{' '}
              <a href="mailto:privacidad@bcwork.co" className="text-blue-600 hover:underline">
                privacidad@bcwork.co
              </a>
              , actúa como Responsable del Tratamiento de los datos personales recopilados a través
              de la plataforma BCWork.
            </p>
          </Section>

          {/* 2 */}
          <Section title="2. Marco Legal">
            <p>Este aviso se rige por:</p>
            <ul>
              <li>
                <strong>Ley 1581 de 2012</strong> — Régimen general de protección de datos
                personales (HABEAS DATA).
              </li>
              <li>
                <strong>Decreto 1377 de 2013</strong> — Reglamentación parcial de la Ley 1581/2012.
              </li>
              <li>
                <strong>Ley 2121 de 2021</strong> — Régimen de trabajo remoto en Colombia.
              </li>
              <li>
                <strong>Ley 2191 de 2022</strong> — Derecho a la desconexión digital.
              </li>
            </ul>
          </Section>

          {/* 3 */}
          <Section title="3. Datos Personales Recopilados">
            <p>
              BCWork recopila únicamente los datos mínimos necesarios para el cumplimiento de las
              finalidades descritas:
            </p>
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="bg-gray-100 text-left">
                  <th className="border border-gray-200 px-3 py-2">Categoría</th>
                  <th className="border border-gray-200 px-3 py-2">Datos</th>
                  <th className="border border-gray-200 px-3 py-2">Recopilado por</th>
                </tr>
              </thead>
              <tbody>
                <Tr
                  a="Identificación"
                  b="Nombre, correo electrónico, cargo, área"
                  c="Administrador del empleador"
                />
                <Tr
                  a="Actividad laboral"
                  b="Nombre de aplicaciones/sitios usados, duración, clasificación de productividad"
                  c="Agente de escritorio BCWork"
                />
                <Tr
                  a="Sesiones de trabajo"
                  b="Hora de inicio/fin, estado (activo/inactivo), tipo de ubicación (remoto/oficina)"
                  c="Agente de escritorio BCWork"
                />
                <Tr
                  a="Dispositivo"
                  b="Nombre del equipo, plataforma (Windows/macOS/Linux), hostname"
                  c="Agente de escritorio BCWork"
                />
                <Tr a="Red" b="Dirección IP de la conexión al servidor" c="Servidor BCWork" />
                <Tr
                  a="Autenticación"
                  b="Registro de inicios y cierres de sesión, intentos fallidos"
                  c="Servidor BCWork"
                />
              </tbody>
            </table>
            <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-amber-800">
              <strong>BCWork NO recopila:</strong> capturas de pantalla, grabaciones de video, audio
              del micrófono, pulsaciones de teclado (keylogger), contenido de archivos personales ni
              ningún dato fuera de la jornada laboral configurada.
            </p>
          </Section>

          {/* 4 */}
          <Section title="4. Finalidades del Tratamiento">
            <ol>
              <li>
                <strong>Gestión del desempeño laboral:</strong> análisis de productividad,
                identificación de patrones de trabajo y generación de métricas para el empleador.
              </li>
              <li>
                <strong>Liquidación de nómina:</strong> cálculo de horas trabajadas, horas extras y
                cumplimiento del horario pactado.
              </li>
              <li>
                <strong>Seguridad informática:</strong> detección de accesos no autorizados y
                gestión de dispositivos corporativos.
              </li>
              <li>
                <strong>Cumplimiento legal:</strong> trazabilidad de auditoría exigida por la
                normativa colombiana en materia de trabajo remoto (Ley 2121/2021).
              </li>
              <li>
                <strong>Respeto a la desconexión digital:</strong> el sistema monitorea
                exclusivamente dentro de los horarios configurados por el empleador, conforme a la
                Ley 2191/2022.
              </li>
            </ol>
          </Section>

          {/* 5 */}
          <Section title="5. Derechos del Titular">
            <p>Como titular de los datos, usted tiene derecho a:</p>
            <ul>
              <li>
                <strong>Conocer</strong> los datos personales que BCWork tiene sobre usted.
              </li>
              <li>
                <strong>Actualizar y rectificar</strong> datos inexactos o incompletos.
              </li>
              <li>
                <strong>Suprimir</strong> sus datos cuando el tratamiento no sea necesario o haya
                finalizado la relación laboral.
              </li>
              <li>
                <strong>Revocar el consentimiento</strong> en cualquier momento sin efectos
                retroactivos.
              </li>
              <li>
                <strong>Acceder gratuitamente</strong> a sus datos al menos una vez al mes.
              </li>
              <li>
                <strong>Presentar quejas</strong> ante la Superintendencia de Industria y Comercio
                (SIC) si considera que sus derechos han sido vulnerados.
              </li>
            </ul>
            <p>
              Para ejercer estos derechos, contacte al administrador de su organización o escriba a{' '}
              <a href="mailto:privacidad@bcwork.co" className="text-blue-600 hover:underline">
                privacidad@bcwork.co
              </a>
              . Recibirá respuesta en un máximo de <strong>10 días hábiles</strong>.
            </p>
          </Section>

          {/* 6 */}
          <Section title="6. Seguridad de los Datos">
            <p>BCWork implementa las siguientes medidas técnicas y organizativas:</p>
            <ul>
              <li>Cifrado en tránsito (TLS 1.3) y en reposo (AES-256).</li>
              <li>Autenticación multifactor (MFA) disponible para todos los usuarios.</li>
              <li>Control de acceso basado en roles (RBAC) con segregación de funciones.</li>
              <li>Registro de auditoría inmutable de todas las acciones administrativas.</li>
              <li>Tokens de acceso de vida corta (15 minutos) con rotación de refresh tokens.</li>
              <li>Hash SHA-256 de evidencias de consentimiento para integridad jurídica.</li>
            </ul>
          </Section>

          {/* 7 */}
          <Section title="7. Retención y Eliminación">
            <p>Los datos se conservan por los siguientes períodos:</p>
            <ul>
              <li>
                <strong>Datos de actividad y sesiones:</strong> hasta 2 años tras la terminación de
                la relación laboral, o hasta que el titular solicite su supresión.
              </li>
              <li>
                <strong>Registros de auditoría:</strong> 5 años conforme a obligaciones legales.
              </li>
              <li>
                <strong>Evidencias de consentimiento:</strong> durante toda la vigencia del contrato
                y 2 años adicionales.
              </li>
            </ul>
            <p>Vencido el plazo, los datos son eliminados de forma segura e irreversible.</p>
          </Section>

          {/* 8 */}
          <Section title="8. Transferencias a Terceros">
            <p>
              BCWork no vende ni cede datos personales de empleados a terceros con fines
              comerciales. Los datos pueden ser compartidos únicamente con:
            </p>
            <ul>
              <li>
                <strong>Supabase Inc.</strong> — proveedor de base de datos en la nube (procesador,
                bajo acuerdo de confidencialidad y DPA).
              </li>
              <li>
                <strong>Autoridades competentes</strong> — cuando sea requerido por orden judicial o
                administrativa.
              </li>
            </ul>
          </Section>

          {/* 9 */}
          <Section title="9. Modificaciones a este Aviso">
            <p>
              BCWork puede actualizar esta política cuando sea necesario. Las modificaciones serán
              comunicadas a los titulares con al menos <strong>15 días de antelación</strong> y
              requerirán nuevo consentimiento cuando impliquen cambios sustanciales en las
              finalidades del tratamiento.
            </p>
          </Section>

          {/* 10 */}
          <Section title="10. Contacto y Reclamaciones">
            <p>
              Para cualquier consulta, ejercicio de derechos o reclamación relacionada con el
              tratamiento de datos personales:
            </p>
            <ul>
              <li>
                Correo electrónico:{' '}
                <a href="mailto:privacidad@bcwork.co" className="text-blue-600 hover:underline">
                  privacidad@bcwork.co
                </a>
              </li>
              <li>Término de respuesta: 10 días hábiles para consultas, 15 para reclamos.</li>
              <li>
                Autoridad de supervisión:{' '}
                <a
                  href="https://www.sic.gov.co"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  Superintendencia de Industria y Comercio (SIC)
                </a>
              </li>
            </ul>
          </Section>
        </div>

        {/* Footer de navegación */}
        <div className="mt-10 flex items-center justify-between border-t border-gray-100 pt-6">
          <p className="text-xs text-gray-400">
            Última actualización: 1 de enero de 2025 · Versión 1.0
          </p>
          <Link href="/consent" className="text-xs text-blue-600 hover:underline">
            Volver a la pantalla de consentimiento
          </Link>
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

function Tr({ a, b, c }: { a: string; b: string; c: string }) {
  return (
    <tr className="even:bg-gray-50">
      <td className="border border-gray-200 px-3 py-2">{a}</td>
      <td className="border border-gray-200 px-3 py-2">{b}</td>
      <td className="border border-gray-200 px-3 py-2">{c}</td>
    </tr>
  )
}
