import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest'
import CollateralDrawer from './index'
import { parseCollateralDrawerProps, type CollateralDrawerProps } from './types'

// Hai khoản cọc của kịch bản ch.2 mục 2.3; dòng 2 chưa nhập giá trị.
const props: CollateralDrawerProps = {
  rows: [
    {
      index: 1,
      collateralId: 1,
      collateralName: 'Căn cước công dân',
      collateralDescription: 'Bản gốc, trả lại khi trả truyện',
      value: '001099012345',
      note: null,
    },
    { index: 2, collateralId: 3, collateralName: 'Tiền mặt', collateralDescription: null, value: null, note: null },
  ],
}

// Bản HTML mà AddRentalCollateralView.jsp render (chạy được khi tắt JS), rồi chỗ gắn island.
const PAGE = `
<form method="post" action="AddRentalCollateralView.jsp">
  <input type="hidden" name="csrf" value="token">
  <input name="txtKeyword"><button type="submit" name="btnSearch">Tìm</button>
  <div id="fallback" data-island-fallback="CollateralDrawer">
    <input name="txtCollateralValue" value="001099012345"><input name="txtCollateralNote" value="">
    <button type="submit" name="lnkDeleteRentalCollateral" value="1">Xoá</button>
    <input name="txtCollateralValue" value=""><input name="txtCollateralNote" value="">
    <button type="submit" name="lnkDeleteRentalCollateral" value="2">Xoá</button>
    <button type="submit" name="btnSave">Lưu</button>
    <button id="back" type="submit" name="lnkBack" formaction="ProcessRentalBillView.jsp" data-island-slot="CollateralDrawer:back">Quay lại</button>
  </div>
  <div id="mount" data-island="CollateralDrawer" data-props="collateral-drawer-props"></div>
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

function realControls(name: string): HTMLInputElement[] {
  return Array.from(form.querySelectorAll<HTMLInputElement>(`[name="${name}"]`))
}

function real<T extends Element>(selector: string): T {
  const found = form.querySelector<T>(selector)
  if (!found) throw new Error(`test page has no ${selector}`)
  return found
}

function mount() {
  return render(<CollateralDrawer {...props} />, { container: real<HTMLElement>('#mount') })
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

describe('CollateralDrawer island', () => {
  it('lays every deposit out as a row with its kind, description and current value', () => {
    mount()
    expect(screen.getByRole('region', { name: 'Ngăn kéo đồ cọc' })).toBeTruthy()
    expect(screen.getByText('Căn cước công dân')).toBeTruthy()
    expect(screen.getByText('Bản gốc, trả lại khi trả truyện')).toBeTruthy()
    expect((screen.getByLabelText('Giá trị khoản cọc 1') as HTMLInputElement).value).toBe('001099012345')
    expect((screen.getByLabelText('Giá trị khoản cọc 2') as HTMLInputElement).value).toBe('')
  })

  it('hides the server table, keeps the real inputs in the form and adopts "Quay lại" after "Lưu"', () => {
    const view = mount()
    const drawer = screen.getByRole('region', { name: 'Ngăn kéo đồ cọc' })
    expect(real<HTMLElement>('#fallback').hidden).toBe(true)
    expect(drawer.contains(real('#back'))).toBe(true)
    const save = screen.getByRole('button', { name: 'Lưu' })
    expect(save.compareDocumentPosition(real('#back'))).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
    expect(realControls('txtCollateralValue')).toHaveLength(2)
    const named = Array.from(drawer.querySelectorAll('[name]'))
    expect(named.every((element) => element.closest('[data-island-slot]') !== null)).toBe(true)

    view.unmount()
    expect(real<HTMLElement>('#fallback').hidden).toBe(false)
    expect(real('#fallback').contains(real('#back'))).toBe(true)
  })

  it('"Lưu" writes each typed value and note into the matching real row, then presses btnSave', async () => {
    const user = userEvent.setup()
    mount()
    await user.type(screen.getByLabelText('Giá trị khoản cọc 2'), '100.000đ')
    await user.type(screen.getByLabelText('Ghi chú khoản cọc 2'), 'Trả lại khi trả truyện')
    await user.click(screen.getByRole('button', { name: 'Lưu' }))

    expect(realControls('txtCollateralValue').map((input) => input.value)).toEqual(['001099012345', '100.000đ'])
    expect(realControls('txtCollateralNote').map((input) => input.value)).toEqual(['', 'Trả lại khi trả truyện'])
    expect(submit).toHaveBeenCalledTimes(1)
    expect(submit).toHaveBeenCalledWith(real('button[name="btnSave"]'))
  })

  it('leaving a box writes the real input without posting the page', async () => {
    const user = userEvent.setup()
    mount()
    await user.type(screen.getByLabelText('Ghi chú khoản cọc 1'), 'Bản gốc')
    await user.tab()
    expect(realControls('txtCollateralNote')[0]?.value).toBe('Bản gốc')
    expect(submit).not.toHaveBeenCalled()
  })

  it('Enter writes the real input and does not fire the JSP "Tìm" button', () => {
    mount()
    const value = screen.getByLabelText('Giá trị khoản cọc 2')
    fireEvent.change(value, { target: { value: '50.000đ' } })
    expect(fireEvent.keyDown(value, { key: 'Enter' })).toBe(false)
    expect(realControls('txtCollateralValue')[1]?.value).toBe('50.000đ')
    expect(submit).not.toHaveBeenCalled()
  })

  it('"Xoá" keeps what was typed and presses the real lnkDeleteRentalCollateral with the STT', async () => {
    const user = userEvent.setup()
    mount()
    await user.type(screen.getByLabelText('Giá trị khoản cọc 2'), '100.000đ')
    await user.click(screen.getByRole('button', { name: 'Xoá khoản cọc 1' }))

    expect(realControls('txtCollateralValue')[1]?.value).toBe('100.000đ')
    expect(submit).toHaveBeenCalledWith(real('button[name="lnkDeleteRentalCollateral"][value="1"]'))
    expect(screen.getByText('Căn cước công dân').closest('tr')?.getAttribute('data-removing')).toBe('true')
  })

  it('does not count a value of only spaces as entered, and posts it unchanged for the page to judge', async () => {
    const user = userEvent.setup()
    mount()
    const value = screen.getByLabelText('Giá trị khoản cọc 2')
    expect(value.getAttribute('data-entered')).toBe('false')
    await user.type(value, '   ')
    expect(value.getAttribute('data-entered')).toBe('false')
    await user.click(screen.getByRole('button', { name: 'Lưu' }))
    expect(realControls('txtCollateralValue')[1]?.value).toBe('   ')
    expect(submit).toHaveBeenCalledWith(real('button[name="btnSave"]'))
    expect(screen.getByLabelText('Giá trị khoản cọc 1').getAttribute('data-entered')).toBe('true')
  })

  it('caps the boxes like the HTML (value 100, note 255) unless the page sent back longer text', () => {
    render(
      <CollateralDrawer
        rows={[{ ...props.rows[0], note: 'x'.repeat(300) }, props.rows[1]]}
      />,
      { container: real<HTMLElement>('#mount') },
    )
    expect(screen.getByLabelText('Giá trị khoản cọc 1').getAttribute('maxlength')).toBe('100')
    expect(screen.getByLabelText('Ghi chú khoản cọc 2').getAttribute('maxlength')).toBe('255')
    // 300 kí tự do trang giữ lại (INPUT_TOO_LONG): ô không được thành `tooLong` và chặn requestSubmit.
    expect(screen.getByLabelText('Ghi chú khoản cọc 1').hasAttribute('maxlength')).toBe(false)
  })

  it('renders an empty drawer and still presses btnSave', async () => {
    const user = userEvent.setup()
    render(<CollateralDrawer rows={[]} />, { container: real<HTMLElement>('#mount') })
    expect(screen.getByRole('table', { name: 'Các khoản cọc' }).querySelectorAll('tbody tr')).toHaveLength(0)
    await user.click(screen.getByRole('button', { name: 'Lưu' }))
    expect(submit).toHaveBeenCalledWith(real('button[name="btnSave"]'))
  })

  it('rejects rows whose STT is not 1, 2, 3… because the real inputs are matched by position', () => {
    const [first, second] = props.rows
    expect(() => parseCollateralDrawerProps({ rows: [second, first] })).toThrow(/rows\[0\]\.index/)
    expect(() => parseCollateralDrawerProps({ rows: [{ ...first, value: 5 }] })).toThrow(/rows\[0\]\.value/)
  })
})

describe('CollateralDrawer island: reduced motion', () => {
  it('shows the drawer already open, with no transition', () => {
    mount()
    expect(screen.getByRole('region', { name: 'Ngăn kéo đồ cọc' }).getAttribute('data-motion')).toBe('reduced')
    const tray = screen.getByTestId('drawer-tray')
    expect(tray.className).not.toContain('transition')
    expect(tray.className).toContain('translate-y-0')
  })

  it('slides the drawer open when motion is allowed', async () => {
    setMedia([])
    mount()
    const tray = screen.getByTestId('drawer-tray')
    expect(tray.className).toContain('motion-safe:transition')
    await waitFor(() => expect(tray.className).toContain('opacity-100'))
  })
})
