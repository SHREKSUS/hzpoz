import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Прокси /api на backend, чтобы фронт обращался к одному origin.
// Адрес бэкенда берётся из VITE_API_PROXY (по умолчанию localhost:4000).
export default defineConfig(() => {
  const apiTarget = process.env.VITE_API_PROXY || 'http://localhost:4000';
  return {
    plugins: [react()],
    server: {
      port: 5173,
      host: true,
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
        },
      },
    },
    preview: {
      port: 5173,
      host: true,
    },
  };
});
