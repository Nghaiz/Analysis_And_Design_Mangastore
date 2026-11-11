import { afterEach, describe, expect, it } from 'vitest'
import { installMessageOk, MESSAGE_OK_ATTRIBUTE, MESSAGE_OK_CLASSES } from './message-ok'
import { mountIslands } from './mount-islands'

// Cây thẻ của <ui:message-box> (phase-05-ui-contract.md §3a) trên một trang có ô sai (C10).
const PAGE = `
<main>
  <p class="tt-message-box tt-message-box--error" role="alert">Số lượng phải là số nguyên lớn hơn hoặc bằng 1.</p>
  <form method="post" action="/BookDetailView.jsp">
    <input name="txtKeyword" id="txtKeyword">
    <input name="txtQuantity" id="txtQuantity" aria-invalid="true">
  </form>
</main>`

function box(): HTMLElement {
  const found = document.querySelector<HTMLElement>('.tt-message-box')
  if (!found) throw new Error('test page has no message box')
  return found
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('installMessageOk', () => {
  it('adds one OK button (type=button, phase 5 button utilities) to each message box and focuses it', () => {
    document.body.innerHTML = PAGE
    const [ok, ...rest] = installMessageOk(document)
    expect(rest).toHaveLength(0)
    expect(ok?.type).toBe('button')
    expect(ok?.textContent).toBe('OK')
    expect(ok?.className).toBe(MESSAGE_OK_CLASSES)
    expect(box().contains(ok ?? null)).toBe(true)
    expect(box().textContent).toBe('Số lượng phải là số nguyên lớn hơn hoặc bằng 1.OK')
    expect(document.activeElement).toBe(ok)
  })

  it('OK hides the box and returns focus to the first aria-invalid field', () => {
    document.body.innerHTML = PAGE
    const [ok] = installMessageOk(document)
    ok?.click()
    expect(box().hidden).toBe(true)
    expect(document.activeElement).toBe(document.getElementById('txtQuantity'))
  })

  it('OK with no invalid field just hides the box', () => {
    document.body.innerHTML = '<p class="tt-message-box tt-message-box--success" role="status">Đăng kí tài khoản thành công!</p>'
    const [ok] = installMessageOk(document)
    ok?.click()
    expect(box().hidden).toBe(true)
  })

  it('does nothing on a page without a message and adds no second button when called again', () => {
    document.body.innerHTML = '<form><input id="a"></form>'
    expect(installMessageOk(document)).toEqual([])
    expect(document.activeElement).toBe(document.body)

    document.body.innerHTML = PAGE
    installMessageOk(document)
    expect(installMessageOk(document)).toEqual([])
    expect(box().querySelectorAll(`[${MESSAGE_OK_ATTRIBUTE}]`)).toHaveLength(1)
  })
})

describe('loader wiring', () => {
  it('mountIslands adds the OK button even on a page with no island', async () => {
    document.body.innerHTML = PAGE
    await mountIslands({ registry: new Map(), reportError: () => {} })
    expect(box().querySelectorAll(`[${MESSAGE_OK_ATTRIBUTE}]`)).toHaveLength(1)
  })
})
