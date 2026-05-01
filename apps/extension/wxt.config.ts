import { defineConfig } from 'wxt'

export default defineConfig({
  srcDir: 'src',
  extensionApi: 'chrome',
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'BCWork Monitor',
    description: 'Monitoreo de actividad web — BCWork',
    version: '0.1.0',
    permissions: ['tabs', 'storage', 'alarms', 'idle'],
    host_permissions: ['<all_urls>'],
    action: {
      default_popup: 'popup.html',
      default_title: 'BCWork Monitor',
    },
  },
})
