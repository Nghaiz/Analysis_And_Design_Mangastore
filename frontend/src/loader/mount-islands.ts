import type { ComponentType, createElement } from 'react'
import type { createRoot } from 'react-dom/client'

/** Props an island receives: the JSON object from its `<script type="application/json">`. */
export type IslandProps = Record<string, unknown>

/** Shape of `src/islands/<Name>/index.tsx`: the component is the default export. */
export interface IslandModule {
  default: ComponentType<IslandProps>
}

export type IslandLoader = () => Promise<IslandModule>

/** Island name (the `data-island` value) mapped to its lazy chunk. */
export type IslandRegistry = ReadonlyMap<string, IslandLoader>

/** The two React functions the loader needs; injectable so tests can observe loading. */
export interface ReactRuntime {
  createElement: typeof createElement
  createRoot: typeof createRoot
}

export interface MountOptions {
  registry: IslandRegistry
  /** Where to look for islands. Defaults to `document`. */
  root?: ParentNode
  /** Loads React on demand. Defaults to dynamic `import('react')` + `import('react-dom/client')`. */
  loadRuntime?: () => Promise<ReactRuntime>
  /** Receives one message per failed island. Defaults to `console.error`. */
  reportError?: (message: string, cause?: unknown) => void
}

export interface IslandFailure {
  name: string
  element: HTMLElement
  message: string
}

export interface MountReport {
  mounted: string[]
  failed: IslandFailure[]
}

export const ISLAND_ATTRIBUTE = 'data-island'
export const PROPS_ATTRIBUTE = 'data-props'

const LOG_PREFIX = '[island-loader]'
const GLOB_KEY_PATTERN = /\/islands\/([^/]+)\/index\.tsx$/

/**
 * Turns the result of `import.meta.glob('../islands/*\/index.tsx')` into a registry keyed by
 * the folder name, which is the value JSP writes into `data-island`.
 */
export function registryFromGlob(modules: Record<string, IslandLoader>): IslandRegistry {
  const registry = new Map<string, IslandLoader>()
  for (const [path, loader] of Object.entries(modules)) {
    const match = GLOB_KEY_PATTERN.exec(path)
    if (!match?.[1]) {
      throw new Error(`${LOG_PREFIX} Cannot derive an island name from "${path}"; expected .../islands/<Name>/index.tsx`)
    }
    registry.set(match[1], loader)
  }
  return registry
}

export async function loadReactRuntime(): Promise<ReactRuntime> {
  const [react, reactDomClient] = await Promise.all([import('react'), import('react-dom/client')])
  return { createElement: react.createElement, createRoot: reactDomClient.createRoot }
}

interface PreparedIsland {
  name: string
  element: HTMLElement
  props: IslandProps
  loader: IslandLoader
}

/** Failure of one island; the message is already user-facing. */
class IslandError extends Error {}

/**
 * Mounts every `[data-island]` under `root`. Each island fails on its own: a bad name, bad props
 * or a chunk that will not load is reported and the remaining islands still mount. React is only
 * imported when at least one island passed the synchronous checks.
 */
export async function mountIslands(options: MountOptions): Promise<MountReport> {
  const root = options.root ?? document
  const reportError = options.reportError ?? defaultReportError
  const report: MountReport = { mounted: [], failed: [] }

  const fail = (name: string, element: HTMLElement, message: string, cause?: unknown): void => {
    report.failed.push({ name, element, message })
    reportError(`${LOG_PREFIX} ${message}`, cause)
  }

  const prepared: PreparedIsland[] = []
  for (const element of root.querySelectorAll<HTMLElement>(`[${ISLAND_ATTRIBUTE}]`)) {
    const name = element.getAttribute(ISLAND_ATTRIBUTE) ?? ''
    try {
      prepared.push(prepareIsland(name, element, options.registry))
    } catch (cause) {
      if (!(cause instanceof IslandError)) throw cause
      fail(name, element, cause.message, cause.cause)
    }
  }
  if (prepared.length === 0) return report

  const runtimePromise = (options.loadRuntime ?? loadReactRuntime)()
  const outcomes = await Promise.allSettled(prepared.map((island) => renderIsland(island, runtimePromise)))
  outcomes.forEach((outcome, index) => {
    const island = prepared[index]
    if (!island) return
    if (outcome.status === 'fulfilled') {
      report.mounted.push(island.name)
      return
    }
    fail(island.name, island.element, `Island "${island.name}" failed to mount.`, outcome.reason)
  })
  return report
}

function prepareIsland(name: string, element: HTMLElement, registry: IslandRegistry): PreparedIsland {
  if (name === '') {
    throw new IslandError(`An element has an empty ${ISLAND_ATTRIBUTE} attribute; set it to an island name.`)
  }
  const loader = registry.get(name)
  if (!loader) {
    const known = registry.size > 0 ? [...registry.keys()].join(', ') : '(none)'
    throw new IslandError(
      `Unknown island "${name}". Known islands: ${known}. Add frontend/src/islands/${name}/index.tsx or fix ${ISLAND_ATTRIBUTE}.`,
    )
  }
  return { name, element, loader, props: readProps(name, element) }
}

function readProps(name: string, element: HTMLElement): IslandProps {
  const propsId = element.getAttribute(PROPS_ATTRIBUTE)
  if (propsId === null) return {}

  const script = element.ownerDocument.getElementById(propsId)
  if (!(script instanceof HTMLScriptElement) || script.type !== 'application/json') {
    throw new IslandError(
      `Island "${name}": ${PROPS_ATTRIBUTE}="${propsId}" must reference a <script type="application/json" id="${propsId}">.`,
    )
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(script.textContent)
  } catch (cause) {
    throw new IslandError(`Island "${name}": props in #${propsId} are not valid JSON.`, { cause })
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new IslandError(`Island "${name}": props in #${propsId} must be a JSON object.`)
  }
  return parsed as IslandProps
}

async function renderIsland(island: PreparedIsland, runtimePromise: Promise<ReactRuntime>): Promise<void> {
  const [module, runtime] = await Promise.all([island.loader(), runtimePromise])
  if (module.default == null) {
    throw new Error(`frontend/src/islands/${island.name}/index.tsx has no default export.`)
  }
  runtime.createRoot(island.element).render(runtime.createElement(module.default, island.props))
}

function defaultReportError(message: string, cause?: unknown): void {
  if (cause === undefined) {
    console.error(message)
    return
  }
  console.error(message, cause)
}
