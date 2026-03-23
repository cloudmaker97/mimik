import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  vite: () => ({
    plugins: [tailwindcss()],
  }),
  manifest: {
    name: 'Mimik',
    description: 'Auto-capture browser workflows and generate step-by-step guides with annotated screenshots.',
    permissions: ['storage', 'activeTab', 'tabs', 'scripting', 'unlimitedStorage', 'sidePanel', 'webNavigation'],
    host_permissions: ['<all_urls>'],
    minimum_chrome_version: '118',
    action: {},
    side_panel: {
      default_path: 'sidepanel/index.html',
    },
  },
});
