import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest'
import { mountIslands, STATE_ATTRIBUTE, type IslandModule } from '../../loader/mount-islands'
import SelectedStack from './index'
import { parseSelectedStackProps, type SelectedStackProps } from './types'

// Giỏ đúng kịch bản ch.2 mục 2.2: hai quyển Conan tập 1 (gộp thành một dòng, số lượng 2) và
// Doraemon tập 2; JSP đã gộp theo đầu truyện, thứ tự như trong cart.
const props: SelectedStackProps = {
  rows: [
    { bookId: 1, bookCode: 'DT001', name: 'Thám tử lừng danh Conan - Tập 1', author: 'Aoyama Gosho', quantity: 2, checked: false },
    { bookId: 20, bookCode: 'DT020', name: 'Doraemon - Tập 2', author: 'Fujiko F. Fujio', quantity: 1, checked: true },
  ],
  focusBookId: null,
}

// Cây HTML mà SearchBookView.jsp render (chạy được khi tắt JS): bản HTML trong phần tử
// `data-island-fallback`, div `data-island` ngoài nó, props trong script JSON.
function page(stackProps: unknown = props): string {
  return `
<form method="post" action="/SearchBookView.jsp" id="frmSelectedBook">
  <input type="hidden" name="csrf" value="token">
  <div id="fallback" data-island-fallback="SelectedStack">
    <table id="tblSelectedBook"><tbody>
      <tr><td><input type="checkbox" name="chkSelectedBook" value="1"></td><td>Thám tử lừng danh Conan - Tập 1</td><td>2</td>
          <td><button type="submit" name="lnkDeleteSelectedBook" value="1">Xoá</button></td></tr>
      <tr><td><input type="checkbox" name="chkSelectedBook" value="20" checked></td><td>Doraemon - Tập 2</td><td>1</td>
          <td><button type="submit" name="lnkDeleteSelectedBook" value="20">Xoá</button></td></tr>
    </tbody></table>
  </div>
  <div id="mount" data-island="SelectedStack" data-props="selected-stack-props"></div>
  <script type="application/json" id="selected-stack-props">${JSON.stringify(stackProps)}</script>
  <div id="create" data-island-fallback="SelectedStack">
    <button type="submit" name="btnCreateRentalBill" id="btnCreateRentalBill">Tạo phiếu mượn</button>
  </div>
</form>`
}

const REDUCE = '(prefers-reduced-motion: reduce)'

function setMedia(matching: string[]): void {
  window.matchMedia = ((query: string) => ({
    matches: matching.includes(query),
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia
}

let form: HTMLFormElement
let submit: MockInstance<HTMLFormElement['requestSubmit']>
let fetchSpy: MockInstance
let xhrSpy: MockInstance

function real<T extends Element>(selector: string): T {
  const found = form.querySelector<T>(selector)
  if (!found) throw new Error(`test page has no ${selector}`)
  return found
}

function realCheck(bookId: number): HTMLInputElement {
  return real<HTMLInputElement>(`input[name="chkSelectedBook"][value="${bookId}"]`)
}

function mount(overrides: Partial<SelectedStackProps> = {}) {
  return render(<SelectedStack {...props} {...overrides} />, { container: real<HTMLElement>('#mount') })
}

function setPage(stackProps: unknown = props): void {
  document.body.innerHTML = page(stackProps)
  form = document.querySelector('form') as HTMLFormElement
  submit = vi.spyOn(form, 'requestSubmit').mockImplementation(() => {})
}

beforeEach(() => {
  setMedia([REDUCE])
  setPage()
  fetchSpy = vi.spyOn(globalThis, 'fetch')
  xhrSpy = vi.spyOn(XMLHttpRequest.prototype, 'open')
})

afterEach(() => {
  cleanup()
  expect(fetchSpy).not.toHaveBeenCalled()
  expect(xhrSpy).not.toHaveBeenCalled()
  vi.restoreAllMocks()
  Reflect.deleteProperty(window, 'matchMedia')
  document.body.innerHTML = ''
})

describe('SelectedStack island: display', () => {
  it('shows one spine per title with its name, code, author and grouped quantity, in cart order', () => {
    mount()
    const rows = within(screen.getByTestId('selected-stack')).getAllByRole('row').slice(1)
    expect(rows.map((row) => row.getAttribute('data-book-id'))).toEqual(['1', '20'])
    const stack = within(screen.getByTestId('selected-stack'))
    expect(stack.getByText('Thám tử lừng danh Conan - Tập 1')).toBeTruthy()
    expect(stack.getByText('DT001')).toBeTruthy()
    expect(screen.getByTestId('quantity-1').textContent).toBe('2')
    expect(screen.getByTestId('quantity-20').textContent).toBe('1')
    expect(screen.getAllByRole('columnheader').map((th) => th.textContent)).toEqual([
      'Chọn',
      'Tên đầu truyện',
      'Số lượng',
      'Thao tác',
    ])
  })

  it('shows an empty stack (header only, no twine) when the cart is empty, as ch.2 starts', () => {
    setPage({ rows: [], focusBookId: null })
    form.querySelectorAll('#tblSelectedBook tr').forEach((row) => row.remove())
    const view = mount({ rows: [] })
    expect(within(screen.getByTestId('selected-stack')).getAllByRole('row')).toHaveLength(1)
    expect(view.container.querySelector('[aria-hidden="true"]')).toBeNull()
    expect(screen.getByRole('button', { name: 'Tạo phiếu mượn' })).toBeTruthy()
  })

  it('hides every server twin while mounted and gives them back on unmount', () => {
    const view = mount()
    expect(real<HTMLElement>('#fallback').hidden).toBe(true)
    expect(real<HTMLElement>('#create').hidden).toBe(true)
    // Ô thật vẫn trong form nên vẫn được gửi.
    expect(form.elements.namedItem('btnCreateRentalBill')).toBeTruthy()
    view.unmount()
    expect(real<HTMLElement>('#fallback').hidden).toBe(false)
    expect(real<HTMLElement>('#create').hidden).toBe(false)
  })

  it('renders no control with a name, so the form never posts a field twice', () => {
    const view = mount()
    expect(view.container.querySelectorAll('[name]')).toHaveLength(0)
  })
})

describe('SelectedStack island: form bridge', () => {
  it('makes the real checkboxes match the props on mount', () => {
    realCheck(1).checked = true // trạng thái trình duyệt tự khôi phục, lệch với session
    mount()
    expect(realCheck(1).checked).toBe(false)
    expect(realCheck(20).checked).toBe(true)
    expect(screen.getByRole('checkbox', { name: 'Chọn Doraemon - Tập 2' })).toHaveProperty('checked', true)
  })

  it('ticking a spine ticks the real chkSelectedBook with value = bookId and does not submit', async () => {
    const user = userEvent.setup()
    mount()
    await user.click(screen.getByRole('checkbox', { name: 'Chọn Thám tử lừng danh Conan - Tập 1' }))
    expect(realCheck(1).checked).toBe(true)
    await user.click(screen.getByRole('checkbox', { name: 'Chọn Doraemon - Tập 2' }))
    expect(realCheck(20).checked).toBe(false)
    expect(submit).not.toHaveBeenCalled()
  })

  it('Xoá submits with the real lnkDeleteSelectedBook of that title as submitter', async () => {
    const user = userEvent.setup()
    mount()
    await user.click(screen.getByRole('button', { name: 'Xoá Doraemon - Tập 2 khỏi truyện đã chọn' }))
    expect(submit).toHaveBeenCalledTimes(1)
    expect(submit).toHaveBeenCalledWith(real('button[name="lnkDeleteSelectedBook"][value="20"]'))
  })

  it('Tạo phiếu mượn submits with the real btnCreateRentalBill after the ticks are on the real inputs', async () => {
    const user = userEvent.setup()
    mount()
    await user.click(screen.getByRole('checkbox', { name: 'Chọn Thám tử lừng danh Conan - Tập 1' }))
    await user.click(screen.getByRole('button', { name: 'Tạo phiếu mượn' }))
    expect(submit).toHaveBeenCalledTimes(1)
    expect(submit).toHaveBeenCalledWith(real('#btnCreateRentalBill'))
    expect(new FormData(form).getAll('chkSelectedBook')).toEqual(['1', '20'])
  })
})

describe('SelectedStack island: focus and motion', () => {
  it('puts focus back on the spine of focusBookId after the page reloads', () => {
    mount({ focusBookId: 20 })
    expect(document.activeElement).toBe(screen.getByRole('checkbox', { name: 'Chọn Doraemon - Tập 2' }))
  })

  it('does not take focus away from an element that already has it (the message OK button)', () => {
    const ok = document.createElement('button')
    document.body.append(ok)
    ok.focus()
    mount({ focusBookId: 20 })
    expect(document.activeElement).toBe(ok)
  })

  it('leaves focus alone when focusBookId is null or no longer in the stack', () => {
    mount({ focusBookId: 99 })
    expect(document.activeElement).toBe(document.body)
  })

  it('with reduced motion has no transition and no shift, even while a spine is being removed', async () => {
    const user = userEvent.setup()
    const view = mount()
    expect(view.container.querySelector('[data-motion]')?.getAttribute('data-motion')).toBe('reduced')
    await user.click(screen.getByRole('button', { name: 'Xoá Doraemon - Tập 2 khỏi truyện đã chọn' }))
    const spines = Array.from(view.container.querySelectorAll('tr[data-book-id]'))
    expect(spines.map((spine) => spine.className)).toEqual(['', 'opacity-60'])
  })

  it('without reduced motion the spines transition and the removed one slides off', async () => {
    setMedia([])
    const user = userEvent.setup()
    const view = mount()
    expect(view.container.querySelector('[data-motion]')?.getAttribute('data-motion')).toBe('full')
    await user.click(screen.getByRole('button', { name: 'Xoá Thám tử lừng danh Conan - Tập 1 khỏi truyện đã chọn' }))
    const spine = view.container.querySelector('tr[data-book-id="1"]')
    expect(spine?.className).toContain('motion-safe:transition')
    expect(spine?.className).toContain('translate-x-8')
  })
})

describe('SelectedStack props and server HTML', () => {
  it.each([
    [{ focusBookId: null }, 'props.rows must be an array'],
    [{ rows: [{ ...props.rows[0], quantity: 0 }], focusBookId: null }, 'props.rows[0].quantity must be an integer >= 1'],
    [{ rows: [{ ...props.rows[0], checked: 'yes' }], focusBookId: null }, 'props.rows[0].checked must be a boolean'],
    [{ rows: [{ ...props.rows[0], name: ' ' }], focusBookId: null }, 'props.rows[0].name must be a non-empty string'],
    [{ rows: [props.rows[0], props.rows[0]], focusBookId: null }, 'props.rows[1].bookId repeats 1'],
    [{ rows: [] }, 'props.focusBookId must be an integer >= 1'],
  ])('rejects bad props and names the field (%#)', (raw, message) => {
    expect(() => parseSelectedStackProps(raw as Record<string, unknown>)).toThrow(message)
  })

  it('refuses to replace the server HTML when a real control of a row is missing', () => {
    real('button[name="lnkDeleteSelectedBook"][value="20"]').remove()
    vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => mount()).toThrow('lnkDeleteSelectedBook')
  })
})

describe('SelectedStack through the island loader', () => {
  const registry = new Map([['SelectedStack', () => import('./index') as Promise<IslandModule>]])

  it(`marks the island ${STATE_ATTRIBUTE}="mounted" and hides the server twin`, async () => {
    const reportError = vi.fn()
    const report = await mountIslands({ registry, reportError })
    expect(report.mounted).toEqual(['SelectedStack'])
    expect(real('#mount').getAttribute(STATE_ATTRIBUTE)).toBe('mounted')
    await vi.waitFor(() => expect(real<HTMLElement>('#fallback').hidden).toBe(true))
    expect(reportError).not.toHaveBeenCalled()
  })

  it(`marks it "failed", reports once and keeps the server HTML when the props are wrong`, async () => {
    setPage({ rows: [{ ...props.rows[0], bookId: 'một' }], focusBookId: null })
    const reportError = vi.fn()
    vi.spyOn(console, 'error').mockImplementation(() => {})
    await mountIslands({ registry, reportError })
    await vi.waitFor(() => expect(real('#mount').getAttribute(STATE_ATTRIBUTE)).toBe('failed'))
    expect(reportError).toHaveBeenCalledTimes(1)
    expect(String(reportError.mock.calls[0]?.[1])).toContain('props.rows[0].bookId')
    expect(real<HTMLElement>('#fallback').hidden).toBe(false)
    expect(real<HTMLElement>('#create').hidden).toBe(false)
  })
})
