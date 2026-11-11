import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest'
import ProcessBillDesk from './index'
import { hideServerFallback } from '@/lib/server-html'
import { parseProcessBillDeskProps, type ProcessBillDeskProps } from './types'

// Props đúng kịch bản ch.2 mục 2.3 (PM0125: hai quyển 3.000đ/ngày, 7 ngày, tổng 42.000đ).
const props: ProcessBillDeskProps = {
  rentalBillCode: 'PM0125',
  rows: [
    {
      bookId: 1,
      name: 'Thám tử lừng danh Conan - Tập 1',
      rentalPrice: 3000,
      copies: [{ barcode: 'DT001-03', received: true, conditionText: 'Rách bìa, Vết bẩn, viết vẽ' }],
    },
    {
      bookId: 20,
      name: 'Doraemon - Tập 2',
      rentalPrice: 3000,
      copies: [{ barcode: 'DT020-02', received: true, conditionText: null }],
    },
  ],
  borrowDate: '2026-09-25',
  dueDate: '2026-10-02',
  expectedDays: 7,
  discount: 0,
  note: null,
  collaterals: [
    { index: 1, collateralName: 'Căn cước công dân', value: '001099012345', note: null },
    { index: 2, collateralName: 'Tiền mặt', value: '100.000đ', note: 'Trả lại khi trả truyện' },
  ],
}

// Bản HTML mà ProcessRentalBillView.jsp render (chạy được khi tắt JS), rồi chỗ gắn island.
const PAGE = `
<form method="post" action="ProcessRentalBillView.jsp">
  <input type="hidden" name="csrf" value="token">
  <div id="fallback" data-island-fallback="ProcessBillDesk">
    <input type="checkbox" name="chkReceived" value="DT001-03" checked>
    <button type="submit" name="lnkAddCondition" value="DT001-03">Thêm tình trạng</button>
    <input type="checkbox" name="chkReceived" value="DT020-02" checked>
    <button type="submit" name="lnkAddCondition" value="DT020-02">Thêm tình trạng</button>
    <a id="edit" data-island-slot="ProcessBillDesk:edit-list" href="EditRentedBookListView.jsp">Chỉnh sửa danh sách truyện</a>
    <input name="txtBorrowDate" value="2026-09-25" readonly>
    <input type="date" name="txtDueDate" value="2026-10-02">
    <button type="submit" name="lnkDeleteRentalCollateral" value="1">Xoá</button>
    <button type="submit" name="lnkDeleteRentalCollateral" value="2">Xoá</button>
    <a id="add" data-island-slot="ProcessBillDesk:add-collateral" href="AddRentalCollateralView.jsp">Thêm khoản cọc</a>
    <input name="txtDiscount" value="0">
    <textarea id="note" name="txtNote" data-island-slot="ProcessBillDesk:note">khách quen</textarea>
    <button type="submit" name="btnConfirm" formaction="doUpdateRentalBill.jsp">Xác nhận và in phiếu mượn</button>
    <button type="submit" name="btnCancel">Huỷ phiếu mượn</button>
  </div>
  <div id="mount" data-island="ProcessBillDesk" data-props="process-bill-props"></div>
</form>`

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

function mount(overrides: Partial<ProcessBillDeskProps> = {}) {
  const container = real<HTMLElement>('#mount')
  return render(<ProcessBillDesk {...props} {...overrides} />, { container })
}

beforeEach(() => {
  setMedia(['(prefers-reduced-motion: reduce)'])
  document.body.innerHTML = PAGE
  form = document.querySelector('form') as HTMLFormElement
  submit = vi.spyOn(form, 'requestSubmit').mockImplementation(() => {})
  fetchSpy = vi.spyOn(globalThis, 'fetch')
  xhrSpy = vi.spyOn(XMLHttpRequest.prototype, 'open')
})

afterEach(() => {
  cleanup()
  expect(fetchSpy).not.toHaveBeenCalled()
  expect(xhrSpy).not.toHaveBeenCalled()
  Reflect.deleteProperty(window, 'matchMedia')
  document.body.innerHTML = ''
})

describe('ProcessBillDesk island: display', () => {
  it('shows the ledger grouped by title with §13 money, dates and condition tags', () => {
    mount()
    expect(screen.getByText('DT001-03')).toBeTruthy()
    expect(screen.getByText('Thám tử lừng danh Conan - Tập 1')).toBeTruthy()
    expect(screen.getAllByText('3.000đ')).toHaveLength(2)
    expect(screen.getByTestId('line-total-1').textContent).toBe('21.000đ')
    expect(screen.getByTestId('line-total-20').textContent).toBe('21.000đ')
    expect(screen.getByText('Rách bìa, Vết bẩn, viết vẽ').className).toContain('tt-condition-tag--damaged')
    expect(screen.getByText('(chưa ghi nhận)').className).toContain('tt-condition-tag--none')
    expect(screen.getByTestId('borrow-date').textContent).toBe('25/09/2026')
    expect(screen.getByTestId('total-copies').textContent).toBe('2')
    expect(screen.getByTestId('total-amount').textContent).toBe('42.000đ')
    expect(screen.getByText('Căn cước công dân')).toBeTruthy()
    expect(screen.getByText('Trả lại khi trả truyện')).toBeTruthy()
  })

  it('hides the server twin, adopts the JSP-owned controls in page order and gives both back on unmount', () => {
    const view = mount()
    const desk = screen.getByRole('region', { name: 'Bàn quầy xử lí phiếu PM0125' })
    expect(real<HTMLElement>('#fallback').hidden).toBe(true)
    for (const id of ['#edit', '#add', '#note']) expect(desk.contains(real(id))).toBe(true)
    // Thứ tự §9.2: sửa danh sách → ngày → khoản cọc → thêm khoản cọc → giảm giá → ghi chú → tổng.
    const order = ['#edit', '#add', '#note'].map((id) => real(id))
    expect(order[0]?.compareDocumentPosition(order[1] as Node)).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
    expect(order[1]?.compareDocumentPosition(order[2] as Node)).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
    // Ô thật vẫn nằm trong form nên vẫn được gửi.
    expect(form.elements.namedItem('txtDueDate')).toBeTruthy()

    view.unmount()
    expect(real<HTMLElement>('#fallback').hidden).toBe(false)
    expect(real('#fallback').contains(real('#edit'))).toBe(true)
    expect(real('#fallback').contains(real('#note'))).toBe(true)
  })

  it('renders no control of its own with a name, so the form never posts a field twice', () => {
    mount()
    const desk = screen.getByRole('region', { name: /Bàn quầy/ })
    const named = Array.from(desk.querySelectorAll('[name]'))
    expect(named.every((element) => element.closest('[data-island-slot]') !== null)).toBe(true)
  })

  it('refuses a fallback marker that wraps the mount point', () => {
    const anchor = real<HTMLElement>('#mount')
    anchor.setAttribute('data-island-fallback', 'ProcessBillDesk')
    expect(() => hideServerFallback(form, 'ProcessBillDesk', anchor)).toThrow(/contains the island itself/)
  })

  it('rejects props that break §11.2', () => {
    expect(() => parseProcessBillDeskProps({ ...props, discount: '0' })).toThrow(/props\.discount/)
    expect(() =>
      parseProcessBillDeskProps({ ...props, rows: [{ ...props.rows[0], copies: [] }] }),
    ).toThrow(/rows\[0\]\.copies/)
    expect(() => parseProcessBillDeskProps({ ...props, dueDate: '02/10/2026' })).toThrow(/props\.dueDate/)
  })
})

describe('ProcessBillDesk island: form bridge', () => {
  it('unticking "Nhận" unticks the real chkReceived, updates the total at once and posts back without submitter', async () => {
    const user = userEvent.setup()
    mount()
    await user.click(screen.getByRole('checkbox', { name: 'Nhận DT020-02' }))

    expect(real<HTMLInputElement>('input[name="chkReceived"][value="DT020-02"]').checked).toBe(false)
    expect(real<HTMLInputElement>('input[name="chkReceived"][value="DT001-03"]').checked).toBe(true)
    expect(screen.getByTestId('total-copies').textContent).toBe('1')
    expect(screen.getByTestId('total-amount').textContent).toBe('21.000đ')
    expect(screen.getByTestId('line-total-20').textContent).toBe('0đ')
    expect(submit).toHaveBeenCalledTimes(1)
    expect(submit).toHaveBeenCalledWith()
  })

  it('shows the discounted total while typing and writes txtDiscount only when the box is left', async () => {
    const user = userEvent.setup()
    mount()
    const discount = screen.getByLabelText('Giảm giá:')
    await user.clear(discount)
    await user.type(discount, '6.000')

    expect(screen.getByTestId('total-amount').textContent).toBe('36.000đ')
    expect(real<HTMLInputElement>('input[name="txtDiscount"]').value).toBe('0')
    expect(submit).not.toHaveBeenCalled()

    await user.tab()
    expect(real<HTMLInputElement>('input[name="txtDiscount"]').value).toBe('6000')
    expect(submit).toHaveBeenCalledTimes(1)
    expect(submit).toHaveBeenCalledWith()
  })

  it.each([
    ['', '42.000đ'],
    ['2.000', '40.000đ'],
    ['2000đ', '40.000đ'],
    ['2 000', '40.000đ'],
    ['42000', '0đ'],
  ])('reads the discount %j like the page does: total %s, box not flagged', (typed, total) => {
    mount()
    const discount = screen.getByLabelText('Giảm giá:')
    fireEvent.change(discount, { target: { value: typed } })
    expect(discount.getAttribute('aria-invalid')).toBeNull()
    expect(screen.getByTestId('total-amount').textContent).toBe(total)
  })

  it.each(['mười nghìn', '-1000', '1,5', '50000'])(
    'flags the discount %j, shows the undiscounted total and still posts it for the page to judge',
    (typed) => {
      mount({ discount: 2000 })
      const discount = screen.getByLabelText('Giảm giá:')
      fireEvent.change(discount, { target: { value: typed } })
      expect(discount.getAttribute('aria-invalid')).toBe('true')
      expect(screen.getByTestId('total-amount').textContent).toBe('42.000đ')

      fireEvent.blur(discount)
      expect(real<HTMLInputElement>('input[name="txtDiscount"]').value).toBe(typed)
      expect(submit).toHaveBeenCalledTimes(1)
    },
  )

  it('unticking every copy gives 0đ, and a session discount larger than that stops counting', async () => {
    const user = userEvent.setup()
    mount({ discount: 2000 })
    expect(screen.getByTestId('total-amount').textContent).toBe('40.000đ')
    await user.click(screen.getByRole('checkbox', { name: 'Nhận DT001-03' }))
    await user.click(screen.getByRole('checkbox', { name: 'Nhận DT020-02' }))

    expect(screen.getByTestId('total-copies').textContent).toBe('0')
    expect(screen.getByTestId('total-amount').textContent).toBe('0đ')
    expect(screen.getByLabelText('Giảm giá:').getAttribute('aria-invalid')).toBe('true')
    expect(submit).toHaveBeenCalledTimes(2)
  })

  it('renders a bill with no copies and no deposits', () => {
    mount({ rows: [], collaterals: [] })
    expect(screen.getByRole('table', { name: /Danh sách các quyển/ })).toBeTruthy()
    expect(screen.getByRole('table', { name: 'Các khoản đặt cọc:' })).toBeTruthy()
    expect(screen.getByTestId('total-copies').textContent).toBe('0')
    expect(screen.getByTestId('total-amount').textContent).toBe('0đ')
  })

  it('Enter in an island box commits and posts back instead of firing the first JSP submit button', () => {
    mount()
    const discount = screen.getByLabelText('Giảm giá:')
    fireEvent.change(discount, { target: { value: '1000' } })
    const enter = fireEvent.keyDown(discount, { key: 'Enter' })

    expect(enter).toBe(false)
    expect(real<HTMLInputElement>('input[name="txtDiscount"]').value).toBe('1000')
    expect(submit).toHaveBeenCalledWith()
  })

  it('a new due date re-counts the days (C3) and is written to txtDueDate on blur', () => {
    mount()
    const due = screen.getByLabelText('Ngày hẹn trả:')
    fireEvent.change(due, { target: { value: '2026-10-05' } })
    expect(screen.getByTestId('total-amount').textContent).toBe('60.000đ')

    fireEvent.blur(due)
    expect(real<HTMLInputElement>('input[name="txtDueDate"]').value).toBe('2026-10-05')
    expect(real<HTMLInputElement>('input[name="txtBorrowDate"]').value).toBe('2026-09-25')
    expect(submit).toHaveBeenCalledTimes(1)
  })

  it('a due date not after the borrow date is flagged and the total keeps the session dates', () => {
    mount()
    const due = screen.getByLabelText('Ngày hẹn trả:')
    fireEvent.change(due, { target: { value: '2026-09-20' } })
    expect(due.getAttribute('aria-invalid')).toBe('true')
    expect(screen.getByTestId('total-amount').textContent).toBe('42.000đ')
    fireEvent.change(due, { target: { value: '' } })
    expect(due.getAttribute('aria-invalid')).toBe('true')
    expect(screen.getByTestId('total-amount').textContent).toBe('42.000đ')
  })

  it('"Thêm tình trạng" presses the real lnkAddCondition of that copy', async () => {
    const user = userEvent.setup()
    mount()
    await user.click(screen.getByRole('button', { name: 'Thêm tình trạng DT001-03' }))
    expect(submit).toHaveBeenCalledWith(real('button[name="lnkAddCondition"][value="DT001-03"]'))
  })

  it('"Xoá" presses the real lnkDeleteRentalCollateral with the STT', async () => {
    const user = userEvent.setup()
    mount()
    const row = screen.getByText('Tiền mặt').closest('tr') as HTMLElement
    await user.click(within(row).getByRole('button', { name: 'Xoá khoản cọc 2' }))
    expect(submit).toHaveBeenCalledWith(real('button[name="lnkDeleteRentalCollateral"][value="2"]'))
  })

  it('confirm and cancel press btnConfirm and btnCancel, carrying the typed discount in one submit', async () => {
    const user = userEvent.setup()
    mount()
    const discount = screen.getByLabelText('Giảm giá:')
    await user.clear(discount)
    await user.type(discount, '2000')
    await user.click(screen.getByRole('button', { name: 'Xác nhận và in phiếu mượn' }))

    expect(submit).toHaveBeenCalledTimes(1)
    expect(submit).toHaveBeenCalledWith(real('button[name="btnConfirm"]'))
    expect(real<HTMLInputElement>('input[name="txtDiscount"]').value).toBe('2000')

    await user.click(screen.getByRole('button', { name: 'Huỷ phiếu mượn' }))
    expect(submit).toHaveBeenLastCalledWith(real('button[name="btnCancel"]'))
    expect(real<HTMLTextAreaElement>('textarea[name="txtNote"]').value).toBe('khách quen')
  })
})

describe('ProcessBillDesk island: reduced motion', () => {
  it('renders the ledger and the stuck tags in their final state with no transition', () => {
    mount()
    const desk = screen.getByRole('region', { name: /Bàn quầy/ })
    expect(desk.getAttribute('data-motion')).toBe('reduced')
    const animated = [screen.getByTestId('desk-ledger'), ...screen.getAllByTestId('stuck-tag')]
    for (const element of animated) {
      expect(element.className).not.toContain('transition')
      expect(element.className).toContain('opacity-100')
    }
  })

  it('opens the ledger and sticks the tags with a transition when motion is allowed', async () => {
    setMedia([])
    mount()
    const desk = screen.getByRole('region', { name: /Bàn quầy/ })
    expect(desk.getAttribute('data-motion')).toBe('full')
    const ledger = screen.getByTestId('desk-ledger')
    expect(ledger.className).toContain('motion-safe:transition')
    await waitFor(() => expect(ledger.className).toContain('opacity-100'))
    expect(screen.getAllByTestId('stuck-tag')[0]?.className).toContain('motion-safe:transition')
  })
})
