import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { BookCover } from './BookCover'
import { ConditionTag } from './ConditionTag'
import { LedgerTable } from './LedgerTable'
import { MessageBox } from './MessageBox'
import { PaperCard } from './PaperCard'
import { Stamp } from './Stamp'
import { Ticket } from './Ticket'

afterEach(cleanup)

const CONAN = 'Thám tử lừng danh Conan - Tập 1'

function classesOf(element: Element | null | undefined): string[] {
  if (!element) throw new Error('element not rendered')
  return [...element.classList]
}

describe('Ticket', () => {
  it('prints the tt-ticket tree with title, code and body', () => {
    const { container } = render(
      <Ticket title="Phiếu mượn" code="PM0125">
        <p>thân</p>
      </Ticket>,
    )
    const root = container.firstElementChild
    expect(classesOf(root)).toEqual(['tt-ticket'])
    expect(root?.querySelector(':scope > .tt-ticket__perf')?.getAttribute('aria-hidden')).toBe('true')
    expect(root?.querySelector('.tt-ticket__head > .tt-ticket__title')?.textContent).toBe('Phiếu mượn')
    expect(root?.querySelector('.tt-ticket__head > .tt-ticket__code')?.textContent).toBe('PM0125')
    expect(root?.querySelector(':scope > .tt-ticket__body')?.textContent).toBe('thân')
  })

  it('omits the code when it is empty', () => {
    const { container } = render(<Ticket title="Phiếu mượn" code="" />)
    expect(container.querySelector('.tt-ticket__code')).toBeNull()
  })
})

describe('Stamp', () => {
  it.each([
    ['Chờ nhận', 'tt-stamp--pending', 'CHỜ NHẬN'],
    ['Đang cho thuê', 'tt-stamp--renting', 'ĐANG CHO THUÊ'],
    ['Đã huỷ', 'tt-stamp--cancelled', 'ĐÃ HUỶ'],
  ])('%s → %s with text %s', (status, modifier, text) => {
    const { container } = render(<Stamp status={status} />)
    expect(classesOf(container.firstElementChild)).toEqual(['tt-stamp', modifier])
    expect(container.textContent).toBe(text)
  })

  it('accepts a decomposed (NFD) status', () => {
    const { container } = render(<Stamp status={'Đã huỷ'.normalize('NFD')} />)
    expect(container.textContent).toBe('ĐÃ HUỶ')
  })

  it('throws on a status outside the contract (the "hủy" spelling included)', () => {
    expect(() => render(<Stamp status="Đã hủy" />)).toThrow(/Unknown rental bill status/)
  })
})

describe('ConditionTag', () => {
  it.each([
    [null, 'tt-condition-tag--none', '(chưa ghi nhận)'],
    ['', 'tt-condition-tag--none', '(chưa ghi nhận)'],
    ['Không có lỗi', 'tt-condition-tag--ok', 'Không có lỗi'],
    ['Rách bìa, Vết bẩn, viết vẽ', 'tt-condition-tag--damaged', 'Rách bìa, Vết bẩn, viết vẽ'],
  ])('%s → %s', (text, modifier, shown) => {
    const { container } = render(<ConditionTag text={text} />)
    expect(classesOf(container.firstElementChild)).toEqual(['tt-condition-tag', modifier])
    expect(container.textContent).toBe(shown)
  })
})

describe('PaperCard', () => {
  it('prints heading, body and the taped modifier', () => {
    const { container } = render(
      <PaperCard heading="Truyện đã chọn" taped>
        nội dung
      </PaperCard>,
    )
    const root = container.firstElementChild
    expect(classesOf(root)).toEqual(['tt-paper-card', 'tt-paper-card--taped'])
    expect(root?.querySelector('.tt-paper-card__heading')?.textContent).toBe('Truyện đã chọn')
    expect(root?.querySelector('.tt-paper-card__body')?.textContent).toBe('nội dung')
  })

  it('has no heading and no tape by default', () => {
    const { container } = render(<PaperCard>x</PaperCard>)
    expect(classesOf(container.firstElementChild)).toEqual(['tt-paper-card'])
    expect(container.querySelector('.tt-paper-card__heading')).toBeNull()
  })
})

describe('LedgerTable', () => {
  it('is a real table with its caption and the given rows', () => {
    render(
      <LedgerTable caption="Danh sách truyện thuê">
        <tbody>
          <tr>
            <td>DT001</td>
          </tr>
        </tbody>
      </LedgerTable>,
    )
    const table = screen.getByRole('table', { name: 'Danh sách truyện thuê' })
    expect(classesOf(table)).toEqual(['tt-ledger-table'])
    expect(classesOf(table.querySelector('caption'))).toEqual(['tt-ledger-table__caption'])
    expect(table.querySelector('tbody td')?.textContent).toBe('DT001')
  })
})

describe('BookCover', () => {
  it('builds the 160/320/640 srcset, alt and lazy loading', () => {
    const { container } = render(<BookCover bookId={1} name={CONAN} size="md" />)
    expect(classesOf(container.firstElementChild)).toEqual(['tt-book-cover', 'tt-book-cover--md'])
    const img = screen.getByRole('img', { name: CONAN })
    expect(img.getAttribute('src')).toBe('/covers/1/cover-320.webp')
    expect(img.getAttribute('srcset')).toBe(
      '/covers/1/cover-160.webp 160w, /covers/1/cover-320.webp 320w, /covers/1/cover-640.webp 640w',
    )
    expect(img.getAttribute('sizes')).toBe('320px')
    expect(img.getAttribute('width')).toBe('320')
    expect(img.getAttribute('height')).toBe('480')
    expect(img.getAttribute('loading')).toBe('lazy')
  })

  it('loads eagerly on request and honours coversBase without a doubled slash', () => {
    render(<BookCover bookId={42} name="Đôrêmon" size="sm" eager coversBase="http://127.0.0.1:8080/covers/" />)
    const img = screen.getByRole('img', { name: 'Đôrêmon' })
    expect(img.getAttribute('loading')).toBe('eager')
    expect(img.getAttribute('src')).toBe('http://127.0.0.1:8080/covers/42/cover-160.webp')
  })

  it('rejects a bookId that is not a positive integer', () => {
    expect(() => render(<BookCover bookId={0} name="x" size="sm" />)).toThrow(/positive integer bookId/)
  })
})

describe('MessageBox', () => {
  it.each([
    ['success', 'status'],
    ['info', 'status'],
    ['error', 'alert'],
  ] as const)('%s uses role %s and keeps the text verbatim', (kind, role) => {
    render(<MessageBox kind={kind} text="Đăng kí tài khoản thành công!" />)
    const box = screen.getByRole(role)
    expect(classesOf(box)).toEqual(['tt-message-box', `tt-message-box--${kind}`])
    expect(box.textContent).toBe('Đăng kí tài khoản thành công!')
  })
})
