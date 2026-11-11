/// <reference types="vitest/config" />
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

// contract.md §6: the category list lives in pipeline/config/categories.json. JSP pages read
// it at runtime from the webapp (`/static/data/categories.json`, unhashed path) to fill
// ShelfScene props, since the WAR carries no pipeline files and no DAO lists categories.
const CATEGORIES_SRC = fileURLToPath(new URL('../pipeline/config/categories.json', import.meta.url))
const CATEGORIES_OUT = 'data/categories.json'

function emitCategories(): Plugin {
  return {
    name: 'tiem-emit-categories',
    apply: 'build',
    generateBundle() {
      const list: unknown = JSON.parse(readFileSync(CATEGORIES_SRC, 'utf8'))
      if (!Array.isArray(list) || list.length === 0 || !list.every((c) => typeof c === 'string')) {
        throw new Error(`${CATEGORIES_SRC} must be a non-empty array of strings`)
      }
      this.emitFile({ type: 'asset', fileName: CATEGORIES_OUT, source: `${JSON.stringify(list)}\n` })
    },
  }
}

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
  plugins: [react(), tailwindcss(), emitCategories()],
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
