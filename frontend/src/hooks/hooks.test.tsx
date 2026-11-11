import { act, cleanup, fireEvent, render, renderHook, screen } from '@testing-library/react'
import { useEffect, useRef } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useFormBridge, type FormBridge } from './useFormBridge'
import { REDUCED_MOTION_QUERY, useReducedMotion } from './useReducedMotion'

interface FakeQuery {
  matches: boolean
  listeners: Set<() => void>
}

function stubMatchMedia(initial: boolean): FakeQuery {
  const state: FakeQuery = { matches: initial, listeners: new Set() }
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => {
      expect(query).toBe(REDUCED_MOTION_QUERY)
      return {
        get matches() {
          return state.matches
        },
        addEventListener: (_type: string, listener: () => void) => state.listeners.add(listener),
        removeEventListener: (_type: string, listener: () => void) => state.listeners.delete(listener),
      }
    }),
  )
  return state
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  document.body.innerHTML = ''
})

describe('useReducedMotion', () => {
  it('follows the media query and re-renders when the OS setting changes', () => {
    const query = stubMatchMedia(false)
    const { result, unmount } = renderHook(() => useReducedMotion())
    expect(result.current).toBe(false)

    act(() => {
      query.matches = true
      for (const listener of query.listeners) listener()
    })
    expect(result.current).toBe(true)

    unmount()
    expect(query.listeners.size).toBe(0)
  })

  it('answers "reduce" when matchMedia does not exist', () => {
    vi.stubGlobal('matchMedia', undefined)
    const { result } = renderHook(() => useReducedMotion())
    expect(result.current).toBe(true)
  })
})

// The JSP side of a page: a real form with the inputs the island may change (docs/contracts.md §11).
const FORM_HTML = `
  <form id="f" method="post" action="ProcessRentalBillView.jsp">
    <input type="checkbox" name="chkReceived" value="DT001-01">
    <input type="checkbox" name="chkReceived" value="DT001-02" checked>
    <input type="text" name="txtCollateralValue" value="">
    <input type="text" name="txtCollateralValue" value="">
    <button type="submit" name="lnkAddCondition" value="DT001-01">Thêm tình trạng</button>
    <button type="submit" name="lnkAddCondition" value="DT001-02">Thêm tình trạng</button>
    <button type="button" name="btnHelp">Trợ giúp</button>
    <div id="mount"></div>
  </form>`

function Probe({ onBridge }: { onBridge: (bridge: FormBridge) => void }) {
  const anchor = useRef<HTMLSpanElement>(null)
  const bridge = useFormBridge(anchor)
  useEffect(() => {
    onBridge(bridge)
  }, [bridge, onBridge])
  return <span ref={anchor}>island</span>
}

function renderProbe(container?: HTMLElement): FormBridge {
  let captured: FormBridge | null = null
  render(<Probe onBridge={(bridge) => (captured = bridge)} />, container ? { container } : undefined)
  if (!captured) throw new Error('Probe did not render')
  return captured
}

function mountProbe(): { form: HTMLFormElement; bridge: FormBridge } {
  document.body.innerHTML = FORM_HTML
  const form = document.getElementById('f') as HTMLFormElement
  return { form, bridge: renderProbe(document.getElementById('mount') as HTMLElement) }
}

function named<T extends Element>(form: HTMLFormElement, selector: string): T {
  const element = form.querySelector<T>(selector)
  if (!element) throw new Error(`missing ${selector}`)
  return element
}

describe('useFormBridge', () => {
  it('ticks the real checkbox chosen by value and fires input + change', () => {
    const { form, bridge } = mountProbe()
    const box = named<HTMLInputElement>(form, 'input[value="DT001-01"]')
    const events: string[] = []
    form.addEventListener('input', () => events.push('input'))
    form.addEventListener('change', () => events.push('change'))

    bridge.setChecked('chkReceived', 'DT001-01', true)
    bridge.setChecked('chkReceived', 'DT001-02', false)

    expect(box.checked).toBe(true)
    expect(named<HTMLInputElement>(form, 'input[value="DT001-02"]').checked).toBe(false)
    expect(events).toEqual(['input', 'change', 'input', 'change'])
    expect(new FormData(form).getAll('chkReceived')).toEqual(['DT001-01'])
  })

  it('sets the value of the n-th control with a shared name', () => {
    const { form, bridge } = mountProbe()
    bridge.setValue('txtCollateralValue', 'CCCD 001', 1)
    expect(new FormData(form).getAll('txtCollateralValue')).toEqual(['', 'CCCD 001'])
  })

  it('submits with the real button as submitter, or with none', () => {
    const { form, bridge } = mountProbe()
    const submit = vi.spyOn(form, 'requestSubmit').mockImplementation(() => {})
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)

    bridge.submit({ name: 'lnkAddCondition', value: 'DT001-02' })
    bridge.submit()

    expect(submit).toHaveBeenNthCalledWith(1, named(form, 'button[value="DT001-02"]'))
    expect(submit).toHaveBeenNthCalledWith(2)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('throws instead of guessing when a control or submitter is missing', () => {
    const { bridge } = mountProbe()
    expect(() => bridge.setChecked('chkReceived', 'DT999-01', true)).toThrow(/no checkbox or radio "chkReceived"/)
    expect(() => bridge.setValue('txtNope', 'x')).toThrow(/no control named "txtNope"/)
    expect(() => bridge.submit({ name: 'btnHelp' })).toThrow(/no submit button "btnHelp"/)
  })

  it('throws when the island is not inside a form', () => {
    const bridge = renderProbe()
    expect(() => bridge.submit()).toThrow(/not inside a <form>/)
  })

  it('works from an event handler of the island', () => {
    document.body.innerHTML = FORM_HTML
    const form = document.getElementById('f') as HTMLFormElement
    const submit = vi.spyOn(form, 'requestSubmit').mockImplementation(() => {})
    function Island() {
      const anchor = useRef<HTMLButtonElement>(null)
      const form = useFormBridge(anchor)
      return (
        <button
          ref={anchor}
          type="button"
          onClick={() => {
            form.setChecked('chkReceived', 'DT001-01', true)
            form.submit()
          }}
        >
          Nhận
        </button>
      )
    }
    render(<Island />, { container: document.getElementById('mount') as HTMLElement })

    fireEvent.click(screen.getByRole('button', { name: 'Nhận' }))

    expect(named<HTMLInputElement>(form, 'input[value="DT001-01"]').checked).toBe(true)
    expect(submit).toHaveBeenCalledTimes(1)
  })
})
