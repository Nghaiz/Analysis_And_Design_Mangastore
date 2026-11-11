import { describe, expect, it, vi } from 'vitest'
import {
  IDLE_FALLBACK_DELAY_MS,
  IDLE_TIMEOUT_MS,
  INTERACTION_EVENTS,
  canRender3D,
  planUpgrade,
  probeWebGL,
  readEnvironment,
  scheduleUpgrade,
  type UpgradeEnvironment,
  type UpgradeHost,
} from './upgrade'

const desktop: UpgradeEnvironment = { reducedMotion: false, saveData: false, coarsePointer: false }

describe('planUpgrade (Deferred #16)', () => {
  it.each<[string, Partial<UpgradeEnvironment>, ReturnType<typeof planUpgrade>]>([
    ['desktop upgrades when the browser is idle', {}, 'on-idle'],
    ['coarse pointer waits for the first interaction', { coarsePointer: true }, 'on-interaction'],
    ['reduced motion keeps the static image', { reducedMotion: true }, 'static'],
    ['reduced motion wins over a coarse pointer', { reducedMotion: true, coarsePointer: true }, 'static'],
    ['save-data keeps the static image', { saveData: true }, 'static'],
  ])('%s', (_label, overrides, expected) => {
    expect(planUpgrade({ ...desktop, ...overrides })).toBe(expected)
  })
})

describe('canRender3D', () => {
  it('only renders on a hardware WebGL2 context', () => {
    expect(canRender3D('ok')).toBe(true)
    expect(canRender3D('weak')).toBe(false)
    expect(canRender3D('none')).toBe(false)
  })
})

function fakeDocument(contexts: Array<object | null | Error>): { doc: Document; requested: unknown[] } {
  const requested: unknown[] = []
  const doc = {
    createElement: () => ({
      getContext: (_type: string, options: unknown) => {
        requested.push(options)
        const next = contexts.shift()
        if (next instanceof Error) throw next
        return next ?? null
      },
    }),
  } as unknown as Document
  return { doc, requested }
}

describe('probeWebGL', () => {
  it('reports ok and releases the probe context when hardware WebGL2 exists', () => {
    const loseContext = vi.fn()
    const { doc, requested } = fakeDocument([{ getExtension: () => ({ loseContext }) }])
    expect(probeWebGL(doc)).toBe('ok')
    expect(requested).toEqual([{ failIfMajorPerformanceCaveat: true }])
    expect(loseContext).toHaveBeenCalledOnce()
  })

  it('reports weak when only a software context is available', () => {
    const { doc } = fakeDocument([null, { getExtension: () => null }])
    expect(probeWebGL(doc)).toBe('weak')
  })

  it('reports none when WebGL2 is missing or getContext throws', () => {
    expect(probeWebGL(fakeDocument([null, null]).doc)).toBe('none')
    expect(probeWebGL(fakeDocument([new Error('blocked'), new Error('blocked')]).doc)).toBe('none')
  })
})

describe('readEnvironment', () => {
  it('reads the media queries and save-data', () => {
    const queries: string[] = []
    const win = {
      matchMedia: (query: string) => {
        queries.push(query)
        return { matches: query === '(pointer: coarse)' }
      },
      navigator: { connection: { saveData: true } },
    } as unknown as Window
    expect(readEnvironment(win)).toEqual({ reducedMotion: false, saveData: true, coarsePointer: true })
    expect(queries).toEqual(['(prefers-reduced-motion: reduce)', '(pointer: coarse)'])
  })

  it('treats a browser without matchMedia as a desktop without preferences', () => {
    expect(readEnvironment({ navigator: {} } as unknown as Window)).toEqual(desktop)
  })
})

type Listener = () => void

function fakeHost(options: { loaded: boolean; idle: boolean }) {
  const listeners = new Map<string, Listener[]>()
  const idleCallbacks = new Map<number, Listener>()
  const timeouts = new Map<number, { callback: Listener; ms: number }>()
  let nextHandle = 1
  const host: UpgradeHost = {
    isLoaded: () => options.loaded,
    addEventListener: (type, listener) => listeners.set(type, [...(listeners.get(type) ?? []), listener]),
    removeEventListener: (type, listener) =>
      listeners.set(
        type,
        (listeners.get(type) ?? []).filter((l) => l !== listener),
      ),
    setTimeout: (callback, ms) => {
      timeouts.set(nextHandle, { callback, ms })
      return nextHandle++
    },
    clearTimeout: (handle) => timeouts.delete(handle),
  }
  const idleOptions: Array<IdleRequestOptions | undefined> = []
  if (options.idle) {
    host.requestIdleCallback = (callback, requestOptions) => {
      idleOptions.push(requestOptions)
      idleCallbacks.set(nextHandle, callback)
      return nextHandle++
    }
    host.cancelIdleCallback = (handle) => idleCallbacks.delete(handle)
  }
  const emit = (type: string): void => [...(listeners.get(type) ?? [])].forEach((listener) => listener())
  const count = (type: string): number => listeners.get(type)?.length ?? 0
  return { host, emit, count, idleCallbacks, idleOptions, timeouts }
}

describe('scheduleUpgrade', () => {
  it('on a coarse pointer starts on the first interaction only, once', () => {
    const fake = fakeHost({ loaded: true, idle: true })
    const start = vi.fn()
    scheduleUpgrade('on-interaction', fake.host, start)

    expect(start).not.toHaveBeenCalled()
    expect(fake.idleCallbacks.size).toBe(0)
    INTERACTION_EVENTS.forEach((type) => expect(fake.count(type)).toBe(1))

    fake.emit('touchstart')
    fake.emit('scroll')
    expect(start).toHaveBeenCalledOnce()
    INTERACTION_EVENTS.forEach((type) => expect(fake.count(type)).toBe(0))
  })

  it('on desktop waits for load, then for idle with a timeout', () => {
    const fake = fakeHost({ loaded: false, idle: true })
    const start = vi.fn()
    scheduleUpgrade('on-idle', fake.host, start)

    expect(fake.idleCallbacks.size).toBe(0)
    fake.emit('load')
    expect(fake.idleOptions).toEqual([{ timeout: IDLE_TIMEOUT_MS }])
    expect(start).not.toHaveBeenCalled()

    fake.idleCallbacks.forEach((callback) => callback())
    expect(start).toHaveBeenCalledOnce()
  })

  it('falls back to a timer after load when requestIdleCallback is missing', () => {
    const fake = fakeHost({ loaded: true, idle: false })
    const start = vi.fn()
    scheduleUpgrade('on-idle', fake.host, start)

    expect([...fake.timeouts.values()].map((t) => t.ms)).toEqual([IDLE_FALLBACK_DELAY_MS])
    fake.timeouts.forEach((t) => t.callback())
    expect(start).toHaveBeenCalledOnce()
  })

  it('cancel removes every pending trigger and never starts', () => {
    const touch = fakeHost({ loaded: true, idle: true })
    const idle = fakeHost({ loaded: true, idle: true })
    const waiting = fakeHost({ loaded: false, idle: true })
    const start = vi.fn()

    scheduleUpgrade('on-interaction', touch.host, start)()
    scheduleUpgrade('on-idle', idle.host, start)()
    scheduleUpgrade('on-idle', waiting.host, start)()

    INTERACTION_EVENTS.forEach((type) => expect(touch.count(type)).toBe(0))
    expect(idle.idleCallbacks.size).toBe(0)
    expect(waiting.count('load')).toBe(0)
    touch.emit('pointerdown')
    waiting.emit('load')
    expect(start).not.toHaveBeenCalled()
  })
})
