import { defineConfig } from 'wxt'

export default defineConfig({
  srcDir: 'src',
  manifest: {
    name: 'BCWork',
    description:
      'Informa al agente BCWork instalado en el equipo el sitio web activo (solo el dominio).',
    version: '0.2.0',
    // `tabs` da acceso a la URL de la pestaña activa; no se inyecta nada en
    // las páginas y no se habla con ningún servidor: solo con el agente local.
    permissions: ['tabs', 'alarms'],
    host_permissions: ['http://127.0.0.1:47831/*'],
    action: { default_popup: 'popup.html', default_title: 'BCWork' },
  },
})
