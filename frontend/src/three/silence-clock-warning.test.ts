import { Clock, getConsoleFunction, setConsoleFunction, warn } from 'three'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CLOCK_DEPRECATION_WARNING, installClockWarningFilter } from './silence-clock-warning'

let uninstall: (() => void) | null = null

afterEach(() => {
  uninstall?.()
  uninstall = null
})

describe('installClockWarningFilter', () => {
  it('without the filter, three 0.187 really warns when a Clock is created (the case being filtered)', () => {
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    new Clock()
    expect(consoleWarn).toHaveBeenCalledWith(CLOCK_DEPRECATION_WARNING)
  })

  it('drops exactly the Clock deprecation warning', () => {
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    uninstall = installClockWarningFilter()
    new Clock()
    expect(consoleWarn).not.toHaveBeenCalled()
  })

  it('lets every other three warning and error through to the console', () => {
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    uninstall = installClockWarningFilter()
    warn('WebGLRenderer: Texture marked for update but no image data found.')
    warn('Clock: something else entirely')
    expect(consoleWarn.mock.calls).toEqual([
      ['THREE.WebGLRenderer: Texture marked for update but no image data found.'],
      ['THREE.Clock: something else entirely'],
    ])
    expect(consoleError).not.toHaveBeenCalled()
  })

  it('forwards to a console function installed earlier, and restores it on uninstall', () => {
    const earlier = vi.fn()
    setConsoleFunction(earlier)
    uninstall = installClockWarningFilter()
    new Clock()
    warn('Other: kept')
    expect(earlier.mock.calls).toEqual([['warn', 'THREE.Other: kept']])

    uninstall()
    uninstall = null
    expect(getConsoleFunction()).toBe(earlier)
    setConsoleFunction(null as unknown as typeof earlier)
  })
})
