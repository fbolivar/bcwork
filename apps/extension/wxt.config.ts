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
    // Clave publica: fija el ID de la extension (jmgkilccochhonjojaikibplddahahon)
    // antes de publicarla, para que el agente pueda escribir la politica de
    // instalacion forzosa con un ID conocido. La privada esta en keys/*.pem,
    // fuera del repositorio.
    key: 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAwiW/IaifDUjcEdbOiFdqzEsqY7JMOyUEnNuiFW1BQwhFu5Gy7l1HlLbtv2RAoK6caqL9MdAaVjSFxdaDorDEuOkKVis+ltzJgmlFkqiGlEiEdNZi10ztc/MM00knNqTsmiIe2pIkh18boUfkoH/pTm+eJd9vgoTIcYl+SJO35rFK1MvxSXgma61j6VTGb155UBY7OZFz2UhlHk3SLoOiKQyZ7rZ/limkpr5fGYuRDyBnsWy1xxl31W/gnMgI+ystii4Ln/ZurNibtwcepLdmsfRP9Uf7EhUUio5LBLDBbmO8zo3FLTbVVwlw0OG54ofLpC6/Iw58NXWoYSTMHrPEsQIDAQAB',
  },
})
