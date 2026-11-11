import { createElement as reactCreateElement } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  mountIslands,
  registryFromGlob,
  type IslandLoader,
  type IslandModule,
  type IslandProps,
  type IslandRegistry,
  type ReactRuntime,
} from './mount-islands'

interface RenderCall {
  container: Element
  props: IslandProps
}

/** A React stand-in that records what would have been rendered where. */
function fakeRuntime(): { runtime: ReactRuntime; renders: RenderCall[] } {
  const renders: RenderCall[] = []
  const runtime: ReactRuntime = {
    mount: (container, _component, props) => {
      renders.push({ container, props })
    },
  }
  return { runtime, renders }
}

function islandModule(): IslandModule {
  return { default: () => null }
}

function registryOf(entries: Record<string, IslandLoader>): IslandRegistry {
  return new Map(Object.entries(entries))
}

function setBody(html: string): void {
  document.body.innerHTML = html
}

function containerIds(renders: RenderCall[]): string[] {
  return renders.map((call) => call.container.id)
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('mountIslands', () => {
  it('imports nothing when the page has no island', async () => {
    setBody('<form method="post" action="doSomething.jsp"><button>Gửi</button></form>')
    const loadRuntime = vi.fn()
    const loader = vi.fn()
    const reportError = vi.fn()

    const report = await mountIslands({ registry: registryOf({ SelectedStack: loader }), loadRuntime, reportError })

    expect(report).toEqual({ mounted: [], failed: [] })
    expect(loadRuntime).not.toHaveBeenCalled()
    expect(loader).not.toHaveBeenCalled()
    expect(reportError).not.toHaveBeenCalled()
  })

  it('mounts the default export with the JSON props from the referenced script', async () => {
    setBody(`
      <form><div id="stack" data-island="SelectedStack" data-props="stack-props"></div></form>
      <script type="application/json" id="stack-props">{"books":[{"id":7,"title":"Đôrêmon"}]}</script>
    `)
    const { runtime, renders } = fakeRuntime()

    const report = await mountIslands({
      registry: registryOf({ SelectedStack: () => Promise.resolve(islandModule()) }),
      loadRuntime: () => Promise.resolve(runtime),
      reportError: vi.fn(),
    })

    expect(report.mounted).toEqual(['SelectedStack'])
    expect(containerIds(renders)).toEqual(['stack'])
    expect(renders[0]?.props).toEqual({ books: [{ id: 7, title: 'Đôrêmon' }] })
  })

  it('reports bad JSON and an unknown name, and still mounts the healthy island', async () => {
    setBody(`
      <div id="broken" data-island="SelectedStack" data-props="broken-props"></div>
      <script type="application/json" id="broken-props">{"books": [</script>
      <div id="unknown" data-island="NoSuchIsland"></div>
      <div id="healthy" data-island="ProcessBillDesk" data-props="desk-props"></div>
      <script type="application/json" id="desk-props">{"billId":12}</script>
    `)
    const { runtime, renders } = fakeRuntime()
    const reportError = vi.fn()

    const report = await mountIslands({
      registry: registryOf({
        SelectedStack: () => Promise.resolve(islandModule()),
        ProcessBillDesk: () => Promise.resolve(islandModule()),
      }),
      loadRuntime: () => Promise.resolve(runtime),
      reportError,
    })

    expect(report.mounted).toEqual(['ProcessBillDesk'])
    expect(containerIds(renders)).toEqual(['healthy'])
    expect(report.failed.map((failure) => failure.element.id)).toEqual(['broken', 'unknown'])

    const messages = reportError.mock.calls.map(([message]) => String(message))
    expect(messages).toHaveLength(2)
    expect(messages[0]).toContain('"SelectedStack"')
    expect(messages[0]).toContain('not valid JSON')
    expect(messages[1]).toContain('Unknown island "NoSuchIsland"')
    expect(messages[1]).toContain('Known islands: SelectedStack, ProcessBillDesk')
  })

  it('does not load React when every island fails its checks', async () => {
    setBody('<div data-island="NoSuchIsland"></div>')
    const loadRuntime = vi.fn()
    const reportError = vi.fn()

    const report = await mountIslands({ registry: registryOf({}), loadRuntime, reportError })

    expect(loadRuntime).not.toHaveBeenCalled()
    expect(report.failed).toHaveLength(1)
    expect(String(reportError.mock.calls[0]?.[0])).toContain('Known islands: (none)')
  })

  it.each([
    ['a missing script', '<div data-island="A" data-props="nope"></div>', 'must reference a <script type="application/json"'],
    [
      'a script of the wrong type',
      '<div data-island="A" data-props="p"></div><script type="text/plain" id="p">{}</script>',
      'must reference a <script type="application/json"',
    ],
    [
      'a JSON array',
      '<div data-island="A" data-props="p"></div><script type="application/json" id="p">[1]</script>',
      'must be a JSON object',
    ],
    ['an empty name', '<div data-island=""></div>', 'empty data-island attribute'],
  ])('reports %s', async (_label, html, expected) => {
    setBody(html)
    const loadRuntime = vi.fn()
    const reportError = vi.fn()

    const report = await mountIslands({
      registry: registryOf({ A: () => Promise.resolve(islandModule()) }),
      loadRuntime,
      reportError,
    })

    expect(report.mounted).toEqual([])
    expect(loadRuntime).not.toHaveBeenCalled()
    expect(String(reportError.mock.calls[0]?.[0])).toContain(expected)
  })

  it('gives an island without data-props empty props', async () => {
    setBody('<div data-island="ShelfScene"></div>')
    const { runtime, renders } = fakeRuntime()

    await mountIslands({
      registry: registryOf({ ShelfScene: () => Promise.resolve(islandModule()) }),
      loadRuntime: () => Promise.resolve(runtime),
    })

    expect(renders[0]?.props).toEqual({})
  })

  it('reports a chunk that fails to load without blocking the other islands', async () => {
    setBody('<div id="a" data-island="A"></div><div id="b" data-island="B"></div>')
    const { runtime, renders } = fakeRuntime()
    const reportError = vi.fn()
    const chunkError = new Error('Failed to fetch dynamically imported module')

    const report = await mountIslands({
      registry: registryOf({ A: () => Promise.reject(chunkError), B: () => Promise.resolve(islandModule()) }),
      loadRuntime: () => Promise.resolve(runtime),
      reportError,
    })

    expect(report.mounted).toEqual(['B'])
    expect(containerIds(renders)).toEqual(['b'])
    expect(reportError).toHaveBeenCalledWith('[island-loader] Island "A" failed to mount.', chunkError)
  })

  it('renders a real React component with the default runtime', async () => {
    setBody(`
      <div data-island="Greeting" data-props="greeting-props"></div>
      <script type="application/json" id="greeting-props">{"name":"Nobita"}</script>
    `)
    const Greeting = ({ name }: IslandProps) => reactCreateElement('p', null, `Chào ${String(name)}`)

    const report = await mountIslands({
      registry: registryOf({ Greeting: () => Promise.resolve({ default: Greeting }) }),
    })

    expect(report.mounted).toEqual(['Greeting'])
    await vi.waitFor(() => expect(document.querySelector('[data-island] p')?.textContent).toBe('Chào Nobita'))
  })
})

describe('error boundary (default runtime)', () => {
  it('puts the server HTML back and logs exactly once when the island throws while rendering', async () => {
    setBody(`
      <form>
        <div id="host" data-island="Broken">
          <table id="server-table"><tbody><tr><td>Bản HTML của JSP</td></tr></tbody></table>
        </div>
      </form>
    `)
    const serverTable = document.getElementById('server-table')
    const Broken = (): never => {
      throw new Error('props sai')
    }
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    const report = await mountIslands({ registry: registryOf({ Broken: () => Promise.resolve({ default: Broken }) }) })

    await vi.waitFor(() => expect(report.failed.map((failure) => failure.name)).toEqual(['Broken']))
    await vi.waitFor(() => expect(document.getElementById('server-table')).toBe(serverTable))
    expect(document.getElementById('host')?.textContent).toContain('Bản HTML của JSP')
    expect(consoleError).toHaveBeenCalledTimes(1)
    expect(String(consoleError.mock.calls[0]?.[0])).toContain('[island-loader] Island "Broken" crashed while rendering')
    expect(document.getElementById('host')?.getAttribute('data-island-state')).toBe('failed')
  })

  it('keeps a healthy island mounted next to a crashed one', async () => {
    setBody('<div id="bad" data-island="Bad">giữ</div><div id="good" data-island="Good"></div>')
    const Bad = (): never => {
      throw new Error('hỏng')
    }
    const Good = () => reactCreateElement('p', null, 'chạy')
    vi.spyOn(console, 'error').mockImplementation(() => {})

    await mountIslands({
      registry: registryOf({
        Bad: () => Promise.resolve({ default: Bad }),
        Good: () => Promise.resolve({ default: Good }),
      }),
    })

    await vi.waitFor(() => expect(document.getElementById('good')?.textContent).toBe('chạy'))
    await vi.waitFor(() => expect(document.getElementById('bad')?.textContent).toBe('giữ'))
    expect(document.getElementById('good')?.getAttribute('data-island-state')).toBe('mounted')
    await vi.waitFor(() => expect(document.getElementById('bad')?.getAttribute('data-island-state')).toBe('failed'))
  })

  it('marks an island that fails its checks as failed and never as mounted', async () => {
    setBody('<div id="ghost" data-island="Ghost"></div>')
    vi.spyOn(console, 'error').mockImplementation(() => {})

    await mountIslands({ registry: registryOf({}) })

    expect(document.getElementById('ghost')?.getAttribute('data-island-state')).toBe('failed')
  })
})

describe('_demo island through the real glob registry', () => {
  it('mounts and renders the React style guide', async () => {
    setBody('<div id="demo" data-island="_demo"></div>')
    const registry = registryFromGlob(import.meta.glob<IslandModule>('../islands/*/index.tsx'))
    const consoleError = vi.spyOn(console, 'error')

    const report = await mountIslands({ registry })

    expect(report.mounted).toEqual(['_demo'])
    await vi.waitFor(() => expect(document.querySelector('#demo .tt-ticket')).not.toBeNull())
    expect(document.querySelectorAll('#demo .tt-stamp')).toHaveLength(3)
    expect(consoleError).not.toHaveBeenCalled()
  })
})

describe('registryFromGlob', () => {
  it('keys each island by its folder name', () => {
    const loader = (): Promise<IslandModule> => Promise.resolve(islandModule())

    const registry = registryFromGlob({
      '../islands/SelectedStack/index.tsx': loader,
      '../islands/ShelfScene/index.tsx': loader,
    })

    expect([...registry.keys()]).toEqual(['SelectedStack', 'ShelfScene'])
  })

  it('rejects a path that does not follow islands/<Name>/index.tsx', () => {
    expect(() => registryFromGlob({ '../islands/index.tsx': () => Promise.resolve(islandModule()) })).toThrow(
      /Cannot derive an island name/,
    )
  })
})

describe('island-loader entry', () => {
  it('boots on a page without islands and does not import React', async () => {
    vi.resetModules()
    const reactDomImported = vi.fn()
    vi.doMock('react-dom/client', () => {
      reactDomImported()
      return {}
    })
    const consoleError = vi.spyOn(console, 'error')

    await import('./island-loader')
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(reactDomImported).not.toHaveBeenCalled()
    expect(consoleError).not.toHaveBeenCalled()
    vi.doUnmock('react-dom/client')
  })
})
