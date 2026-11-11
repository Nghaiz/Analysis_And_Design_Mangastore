#!/usr/bin/env node
// Gzip budget of the Vite build (phase-05-ui-contract.md §6). Reads
// src/main/webapp/static/.vite/manifest.json and checks:
//   1. the loader entry chunk                                   ≤ 3 kB
//   2. the CSS a page loads up front (CSS of every entry and of
//      the chunks they import statically)                        ≤ 30 kB
//   3. every JS chunk except those reachable only through the
//      dynamic import of src/islands/ShelfScene/index.tsx         ≤ 120 kB
// kB = 1000 bytes, gzip at zlib's default level: the same numbers `vite build` prints.
// Exit 0 within budget, 1 with the offending chunk/file and its limit, 2 when the build is missing.
// Usage: node scripts/check-budget.mjs [--manifest <path to .vite/manifest.json>]
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { gzipSync } from 'node:zlib'

const KB = 1000
const LIMITS = { loader: 3 * KB, entryCss: 30 * KB, chunk: 120 * KB }
const LOADER_ENTRY = 'src/loader/island-loader.ts'
const SHELF_SCENE = 'src/islands/ShelfScene/index.tsx'

const FRONTEND = dirname(dirname(fileURLToPath(import.meta.url)))
const DEFAULT_MANIFEST = resolve(FRONTEND, '../src/main/webapp/static/.vite/manifest.json')

function manifestPath(argv) {
  const at = argv.indexOf('--manifest')
  if (at === -1) return DEFAULT_MANIFEST
  const value = argv[at + 1]
  if (!value) {
    console.error('[budget] --manifest needs a path')
    process.exit(2)
  }
  return resolve(value)
}

const fmt = (bytes) => `${(bytes / KB).toFixed(2)} kB`

/** Keys reachable from `starts` over static (and optionally dynamic) imports, never entering `skip`. */
function reachable(manifest, starts, { dynamic, skip = null }) {
  const seen = new Set()
  const stack = [...starts]
  while (stack.length > 0) {
    const key = stack.pop()
    if (key === skip || seen.has(key) || !manifest[key]) continue
    seen.add(key)
    const chunk = manifest[key]
    stack.push(...(chunk.imports ?? []), ...(dynamic ? (chunk.dynamicImports ?? []) : []))
  }
  return seen
}

function main() {
  const path = manifestPath(process.argv.slice(2))
  if (!existsSync(path)) {
    console.error(`[budget] missing ${path} → run: npm --prefix frontend run build`)
    process.exit(2)
  }
  const outDir = dirname(dirname(path))
  const manifest = JSON.parse(readFileSync(path, 'utf8'))
  const gzipCache = new Map()
  const gz = (file) => {
    if (!gzipCache.has(file)) {
      const full = join(outDir, file)
      if (!existsSync(full)) {
        console.error(`[budget] manifest lists ${file} but ${full} does not exist → rebuild`)
        process.exit(2)
      }
      gzipCache.set(file, gzipSync(readFileSync(full)).length)
    }
    return gzipCache.get(file)
  }

  const loader = manifest[LOADER_ENTRY]
  if (!loader) {
    console.error(`[budget] manifest has no "${LOADER_ENTRY}" entry → check input in frontend/vite.config.ts`)
    process.exit(2)
  }

  const violations = []
  const lines = []

  const loaderSize = gz(loader.file)
  lines.push(`loader ${loader.file}: ${fmt(loaderSize)} / ${fmt(LIMITS.loader)}`)
  if (loaderSize > LIMITS.loader) {
    violations.push(`loader entry ${loader.file} is ${fmt(loaderSize)} gzip, limit ${fmt(LIMITS.loader)}`)
  }

  const entries = Object.keys(manifest).filter((key) => manifest[key].isEntry)
  const upFront = reachable(manifest, entries, { dynamic: false })
  const cssFiles = new Set()
  for (const key of upFront) {
    const chunk = manifest[key]
    if (chunk.file.endsWith('.css')) cssFiles.add(chunk.file)
    for (const css of chunk.css ?? []) cssFiles.add(css)
  }
  const cssSize = [...cssFiles].reduce((sum, file) => sum + gz(file), 0)
  lines.push(`entry CSS (${[...cssFiles].join(', ') || 'none'}): ${fmt(cssSize)} / ${fmt(LIMITS.entryCss)}`)
  if (cssSize > LIMITS.entryCss) {
    violations.push(`entry CSS ${[...cssFiles].join(' + ')} is ${fmt(cssSize)} gzip, limit ${fmt(LIMITS.entryCss)}`)
  }

  // A chunk belongs to ShelfScene alone when nothing reaches it once ShelfScene's own node is cut out.
  const withoutShelf = reachable(manifest, entries, { dynamic: true, skip: SHELF_SCENE })
  const shelfOnly = new Set(
    [...reachable(manifest, [SHELF_SCENE], { dynamic: true })].filter((key) => !withoutShelf.has(key)),
  )
  let largest = { file: '(none)', size: 0 }
  for (const [key, chunk] of Object.entries(manifest)) {
    if (!chunk.file.endsWith('.js') || shelfOnly.has(key)) continue
    const size = gz(chunk.file)
    if (size > largest.size) largest = { file: chunk.file, size }
    if (size > LIMITS.chunk) {
      violations.push(`chunk ${chunk.file} (${key}) is ${fmt(size)} gzip, limit ${fmt(LIMITS.chunk)}`)
    }
  }
  lines.push(`largest JS chunk outside ShelfScene ${largest.file}: ${fmt(largest.size)} / ${fmt(LIMITS.chunk)}`)
  lines.push(`ShelfScene-only chunks (not budgeted): ${shelfOnly.size}`)

  for (const line of lines) console.log(`[budget] ${line}`)
  if (violations.length > 0) {
    for (const v of violations) console.error(`[budget] FAIL ${v}`)
    process.exit(1)
  }
  console.log('[budget] PASS')
}

main()
