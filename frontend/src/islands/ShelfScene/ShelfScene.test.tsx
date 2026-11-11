import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ShelfScene from './index'
import { followLoginLink } from './login-link'
import { parseShelfSceneProps } from './types'
import { IDLE_FALLBACK_DELAY_MS } from './upgrade'

// Cảnh 3D thật cần WebGL; ở đây chỉ cần biết island có nạp chunk 3D hay không.
const { sceneLoaded } = vi.hoisted(() => ({ sceneLoaded: vi.fn() }))
vi.mock('../../three/ShelfCanvas', () => {
  sceneLoaded()
  return { default: () => <p>cảnh 3D</p> }
})

const props = {
  loginHref: '/LoginView.jsp',
  posterSrc: '/static/img/shelf/shelf-static.webp',
  posterSrcSet: null,
  posterAlt: 'Kệ truyện gỗ dưới ánh đèn vàng: đăng nhập để thuê truyện',
  categories: ['Thiếu nhi', 'Trinh thám'],
}

function setMedia(matching: string[]): void {
  window.matchMedia = ((query: string) => ({
    matches: matching.includes(query),
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia
}

function stubWebGL(available: boolean): void {
  const context = available ? { getExtension: () => null } : null
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
    (() => context) as unknown as HTMLCanvasElement['getContext'],
  )
}

beforeEach(() => {
  vi.useFakeTimers()
  sceneLoaded.mockClear()
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  Reflect.deleteProperty(window, 'matchMedia')
})

async function idle(): Promise<void> {
  await act(async () => {
    vi.advanceTimersByTime(IDLE_FALLBACK_DELAY_MS)
    await vi.dynamicImportSettled()
  })
}

describe('ShelfScene island', () => {
  it('renders the static shelf inside a real link to the login page', () => {
    setMedia([])
    stubWebGL(false)
    render(<ShelfScene {...props} />)

    const image = screen.getByRole('img', { name: props.posterAlt })
    expect(image.getAttribute('src')).toBe(props.posterSrc)
    expect(image.closest('a')?.getAttribute('href')).toBe(props.loginHref)
  })

  it('keeps the static image under reduced motion and never loads three', async () => {
    setMedia(['(prefers-reduced-motion: reduce)'])
    stubWebGL(true)
    render(<ShelfScene {...props} />)
    await idle()

    expect(sceneLoaded).not.toHaveBeenCalled()
    expect(screen.queryByText('cảnh 3D')).toBeNull()
  })

  it('keeps the static image when WebGL2 is missing', async () => {
    setMedia([])
    stubWebGL(false)
    render(<ShelfScene {...props} />)
    await idle()

    expect(screen.queryByText('cảnh 3D')).toBeNull()
  })

  it('upgrades a desktop once the browser is idle', async () => {
    setMedia([])
    stubWebGL(true)
    render(<ShelfScene {...props} />)
    expect(screen.queryByText('cảnh 3D')).toBeNull()

    await idle()
    vi.useRealTimers() // findByText chờ bằng setTimeout thật
    expect(await screen.findByText('cảnh 3D')).toBeTruthy()
  })

  it('on a coarse pointer upgrades only after the first touch', async () => {
    setMedia(['(pointer: coarse)'])
    stubWebGL(true)
    render(<ShelfScene {...props} />)
    await idle()
    expect(screen.queryByText('cảnh 3D')).toBeNull()

    await act(async () => {
      window.dispatchEvent(new Event('touchstart'))
      await vi.dynamicImportSettled()
    })
    vi.useRealTimers() // findByText chờ bằng setTimeout thật
    expect(await screen.findByText('cảnh 3D')).toBeTruthy()
  })
})

describe('parseShelfSceneProps', () => {
  it('accepts the §11.4 shape', () => {
    expect(parseShelfSceneProps(props)).toEqual(props)
  })

  it.each([
    ['loginHref', { loginHref: '' }],
    ['posterSrcSet', { posterSrcSet: undefined }],
    ['categories', { categories: [] }],
    ['categories', { categories: ['Thiếu nhi', 3] }],
  ])('names the bad field %s', (field, override) => {
    expect(() => parseShelfSceneProps({ ...props, ...override })).toThrow(`props.${field}`)
  })
})

describe('followLoginLink', () => {
  it('clicks the real #lnkLogin link', () => {
    document.body.innerHTML = '<a id="lnkLogin" href="/LoginView.jsp">Đăng nhập</a>'
    const link = document.getElementById('lnkLogin') as HTMLAnchorElement
    const click = vi.spyOn(link, 'click').mockImplementation(() => {})

    followLoginLink(document, '/LoginView.jsp')
    expect(click).toHaveBeenCalledOnce()
    document.body.innerHTML = ''
  })
})
