import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig(({ command }) => {
  const basePath =
    process.env.KARING_WEB_BASE_PATH ??
    (command === 'serve' ? '/' : '/web/');
  const apiBasePath =
    process.env.KARING_WEB_API_BASE ??
    (command === 'serve' ? '/api' : '/web/api');

  return {
    base: basePath,
    plugins: [svelte()],
    define: {
      __KARING_WEB_API_BASE__: JSON.stringify(apiBasePath)
    },
    server: {
      host: '0.0.0.0',
      port: 5173,
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:8080',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, '')
        }
      }
    }
  };
});
