/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const target = env.VITE_TRACCAR_TARGET || 'https://demo4.traccar.org'

  return {
    plugins: [react()],
    server: {
      // Same-origin proxy: avoids Traccar CORS and keeps the JSESSIONID cookie first-party.
      proxy: {
        '/api': { target, changeOrigin: true, secure: true, ws: true },
      },
    },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./src/setupTests.tsx'],
    },
  }
})
