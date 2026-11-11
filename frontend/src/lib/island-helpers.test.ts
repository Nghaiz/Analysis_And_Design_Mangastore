// Helper dùng chung của island có form (SelectedStack, ProcessBillDesk, CollateralDrawer):
// chế độ chuyển động, lớp hoạt cảnh vào, ẩn/hiện bản HTML dự phòng của JSP, đọc props.
import { describe, expect, it } from 'vitest'
import { ENTRANCE_TRANSITION, entranceClasses, motionMode } from './motion'
import { propsReader } from './props-guard'
import { adoptServerNode, FALLBACK_MISUSE_REMEDY, hideServerFallback } from './server-html'

function formFrom(html: string): HTMLFormElement {
  document.body.innerHTML = `<form method="post">${html}</form>`
  return document.querySelector('form') as HTMLFormElement
}

describe('motion', () => {
  it('maps reduced motion to the data-motion value', () => {
    expect(motionMode(true)).toBe('reduced')
    expect(motionMode(false)).toBe('full')
  })

  it('adds no transition class under reduced motion', () => {
    expect(entranceClasses(true, false, 'opacity-0', 'opacity-100')).toBe('opacity-100')
    expect(entranceClasses(false, false, 'opacity-0', 'opacity-100')).toBe(`${ENTRANCE_TRANSITION} opacity-0`)
    expect(entranceClasses(false, true, 'opacity-0', 'opacity-100')).toBe(`${ENTRANCE_TRANSITION} opacity-100`)
  })
})

describe('server-html', () => {
  it('hides only the twins of the named island and restores exactly those', () => {
    const form = formFrom(`
      <div id="a" data-island-fallback="Desk"></div>
      <div id="b" data-island-fallback="Desk" hidden></div>
      <div id="c" data-island-fallback="Other"></div>
      <div id="mount"></div>`)
    const byId = (id: string) => document.getElementById(id) as HTMLElement
    const undo = hideServerFallback(form, 'Desk', byId('mount'))
    expect([byId('a').hidden, byId('b').hidden, byId('c').hidden]).toEqual([true, true, false])
    undo()
    // #b đã ẩn sẵn từ JSP: island không hiện nó ra khi gỡ.
    expect([byId('a').hidden, byId('b').hidden, byId('c').hidden]).toEqual([false, true, false])
  })

  it('names the misuse with the default remedy, or the remedy the island passes', () => {
    const form = formFrom('<div data-island-fallback="Desk"><div id="mount"></div></div>')
    const anchor = document.getElementById('mount') as HTMLElement
    const prefix = '[Desk] An element marked data-island-fallback="Desk" contains the island itself; '
    expect(() => hideServerFallback(form, 'Desk', anchor)).toThrow(prefix + FALLBACK_MISUSE_REMEDY)
    expect(() => hideServerFallback(form, 'Desk', anchor, 'custom remedy.')).toThrow(prefix + 'custom remedy.')
  })

  it('moves a slot node into the island and back to its place', () => {
    const form = formFrom('<span id="before"></span><button id="nav" data-island-slot="Desk:nav"></button><span id="after"></span>')
    const host = document.createElement('div')
    const undo = adoptServerNode(form, 'Desk', 'nav', host)
    expect(host.firstElementChild?.id).toBe('nav')
    undo()
    expect(document.getElementById('before')?.nextElementSibling?.id).toBe('nav')
  })
})

describe('props-guard', () => {
  const read = propsReader('Desk', '§11.9')

  it('throws with the island, the field path and the contract section', () => {
    expect(() => read.integer(0, 'rows[0].bookId', 1)).toThrow('[Desk] props.rows[0].bookId must be an integer >= 1 (docs/contracts.md §11.9).')
    expect(() => read.string(' ', 'name')).toThrow('[Desk] props.name must be a non-empty string (docs/contracts.md §11.9).')
    expect(() => read.record([], 'row')).toThrow('[Desk] props.row must be an object (docs/contracts.md §11.9).')
  })
})
