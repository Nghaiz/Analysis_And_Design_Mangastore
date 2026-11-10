/// <reference types="vitest/config" />
import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// contract.md §5 and §10: Tomcat reads `<outDir>/.vite/manifest.json` through
// util/ViteManifest; the manifest keys must stay exactly these two source paths.
const ENTRY_LOADER = 'src/loader/island-loader.ts'
const ENTRY_STYLES = 'src/styles/app.css'

const DEV_SERVER_PORT = 5173
const DEV_SERVER_ORIGIN = `http://localhost:${DEV_SERVER_PORT}`
// The browser opens pages from Tomcat behind nginx (127.0.0.1:8080, contract.md §3)
// and loads modules from the Vite dev server, so that origin needs CORS.
const BACKEND_ORIGIN = 'http://localhost:8080'

export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  base: '/static/',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  // Top-level `input` (Vite 8) feeds build.rolldownOptions.input and optimizeDeps.entries.
  input: [ENTRY_LOADER, ENTRY_STYLES],
  server: {
    port: DEV_SERVER_PORT,
    strictPort: true,
    origin: DEV_SERVER_ORIGIN,
    cors: {
      origin: BACKEND_ORIGIN,
    },
  },
  build: {
    outDir: '../src/main/webapp/static',
    emptyOutDir: true,
    manifest: true,
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    restoreMocks: true,
  },
})
