import { Download, Monitor, Apple, Terminal } from 'lucide-react'

const GITHUB_REPO = 'fbolivar/bcwork'
const LATEST_TAG = 'agent-v1.0.0'

const DOWNLOADS = [
  {
    platform: 'Windows',
    icon: Monitor,
    color: 'bg-blue-50 text-blue-700 border-blue-200',
    iconColor: 'text-blue-600',
    files: [
      {
        label: 'Instalador (.exe)',
        description: 'Recomendado — NSIS installer',
        filename: `BCWork-Agent_${LATEST_TAG.replace('agent-v', '')}_x64-setup.exe`,
      },
      {
        label: 'MSI Package',
        description: 'Para despliegue empresarial (Group Policy)',
        filename: `BCWork-Agent_${LATEST_TAG.replace('agent-v', '')}_x64_en-US.msi`,
      },
    ],
  },
  {
    platform: 'Linux',
    icon: Terminal,
    color: 'bg-orange-50 text-orange-700 border-orange-200',
    iconColor: 'text-orange-600',
    files: [
      {
        label: 'Debian/Ubuntu (.deb)',
        description: 'Ubuntu 22.04+, Debian 11+',
        filename: `bcwork-agent_${LATEST_TAG.replace('agent-v', '')}_amd64.deb`,
      },
      {
        label: 'AppImage',
        description: 'Universal — cualquier distro Linux x64',
        filename: `bcwork-agent_${LATEST_TAG.replace('agent-v', '')}_amd64.AppImage`,
      },
    ],
  },
  {
    platform: 'macOS',
    icon: Apple,
    color: 'bg-gray-50 text-gray-700 border-gray-200',
    iconColor: 'text-gray-600',
    files: [
      {
        label: 'DMG (Apple Silicon)',
        description: 'macOS 12+ — Mac con chip M1/M2/M3',
        filename: `BCWork-Agent_${LATEST_TAG.replace('agent-v', '')}_aarch64.dmg`,
      },
    ],
  },
]

export default function DownloadsPage() {
  const baseUrl = `https://github.com/${GITHUB_REPO}/releases/download/${LATEST_TAG}`

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Descargas del Agente</h1>
        <p className="mt-1 text-sm text-gray-500">
          Instala BCWork Agent en los dispositivos de tus colaboradores para habilitar el monitoreo.
        </p>
      </div>

      {/* Instructions */}
      <div className="mb-8 rounded-xl border border-blue-100 bg-blue-50 p-5">
        <h2 className="mb-3 text-sm font-semibold text-blue-800">Cómo instalar</h2>
        <ol className="space-y-2 text-sm text-blue-700">
          <li>
            <strong>1.</strong> Descarga el instalador para tu sistema operativo.
          </li>
          <li>
            <strong>2.</strong> Instálalo en el PC del colaborador (requiere permisos de admin en
            Windows).
          </li>
          <li>
            <strong>3.</strong> El agente se abre automáticamente y pide un código de enrolamiento.
          </li>
          <li>
            <strong>4.</strong> Ve a <strong>Dispositivos → Generar código</strong>, selecciona al
            usuario y copia el código de 8 caracteres.
          </li>
          <li>
            <strong>5.</strong> El colaborador ingresa el código. ¡Listo! El agente comienza a
            monitorear.
          </li>
        </ol>
      </div>

      {/* Download cards */}
      <div className="space-y-4">
        {DOWNLOADS.map(({ platform, icon: Icon, color, iconColor, files }) => (
          <div key={platform} className={`rounded-xl border p-5 ${color}`}>
            <div className="mb-4 flex items-center gap-3">
              <Icon className={`h-5 w-5 ${iconColor}`} />
              <h2 className="font-semibold">{platform}</h2>
            </div>
            <div className="space-y-3">
              {files.map(({ label, description, filename }) => (
                <div
                  key={filename}
                  className="flex items-center justify-between rounded-lg bg-white/70 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">{label}</p>
                    <p className="text-xs text-gray-500">{description}</p>
                    <p className="mt-0.5 font-mono text-xs text-gray-400">{filename}</p>
                  </div>
                  <a
                    href={`${baseUrl}/${filename}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
                  >
                    <Download className="h-4 w-4" />
                    Descargar
                  </a>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Version info */}
      <div className="mt-6 flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3 text-sm">
        <span className="text-gray-500">
          Versión actual:{' '}
          <strong className="text-gray-700">{LATEST_TAG.replace('agent-', '')}</strong>
        </span>
        <a
          href={`https://github.com/${GITHUB_REPO}/releases`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline"
        >
          Ver todas las versiones →
        </a>
      </div>
    </div>
  )
}
