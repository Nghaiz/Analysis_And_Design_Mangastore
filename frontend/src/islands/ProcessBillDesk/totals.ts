// Số tạm của bàn quầy (docs/contracts.md §13, C3). Chỉ để hiện; giá trị trong session đổi qua lần
// gửi về trang, và trang tính lại bằng đúng các quy tắc này.
import type { BillDeskBookRow } from './types'

const MS_PER_DAY = 86_400_000
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/
const DIGITS = /^\d+$/
/** Phần trang trí người dùng có thể gõ trong ô giảm giá: dấu chấm ("2.000"), dấu cách ("2 000"), hậu tố đ ("2000đ"). */
const MONEY_DECORATION = /[.\s]|đ$/giu

function utcDay(isoDate: string): number {
  const match = ISO_DATE.exec(isoDate)
  if (!match) throw new Error(`Date must be yyyy-MM-dd, got "${isoDate}".`)
  const [, year, month, day] = match
  return Date.UTC(Number(year), Number(month) - 1, Number(day))
}

/** Số ngày từ `fromIso` tới `toIso` (âm khi `toIso` đứng trước). */
export function daysBetween(fromIso: string, toIso: string): number {
  return Math.round((utcDay(toIso) - utcDay(fromIso)) / MS_PER_DAY)
}

/** C3: có cả ngày mượn và ngày hẹn trả thì đếm ngày giữa hai ngày, thiếu một trong hai thì lấy `expectedDays`. */
export function rentalDays(borrowDate: string | null, dueDate: string | null, expectedDays: number): number {
  if (borrowDate === null || dueDate === null) return expectedDays
  return daysBetween(borrowDate, dueDate)
}

/** Chuỗi yyyy-MM-dd chỉ một ngày có thật ("2026-02-30" thì không). */
export function isRealIsoDate(text: string): boolean {
  const match = ISO_DATE.exec(text)
  if (!match) return false
  const [, year, month, day] = match
  const date = new Date(utcDay(text))
  return (
    date.getUTCFullYear() === Number(year) &&
    date.getUTCMonth() === Number(month) - 1 &&
    date.getUTCDate() === Number(day)
  )
}

/** Ngày hẹn trả hợp lệ: là ngày có thật và sau ngày mượn (điều kiện thứ tư của §10.2). */
export function isDueDateValid(borrowDate: string | null, dueDate: string): boolean {
  if (!isRealIsoDate(dueDate)) return false
  return borrowDate === null || dueDate > borrowDate
}

/**
 * Đọc ô giảm giá như trang đọc (phase-07-edge-cases.md): trống → 0; "2.000", "2000đ", "2 000" → 2000;
 * chữ, số âm, phần lẻ đồng ("1,5") hoặc số quá lớn → null. Không bao giờ ném lỗi.
 */
export function parseDiscount(text: string): number | null {
  const digits = text.trim().replace(MONEY_DECORATION, '')
  if (digits === '') return 0
  if (!DIGITS.test(digits)) return null
  const value = Number(digits)
  return Number.isSafeInteger(value) ? value : null
}

export interface DeskTotals {
  /** Tổng tiền từng dòng đầu truyện, cùng thứ tự `rows`. */
  lineTotals: number[]
  /** Tổng số quyển thuê: số quyển đang tích "Nhận". */
  copies: number
  /** Tổng tiền các dòng, chưa trừ giảm giá. */
  subtotal: number
  /** Tổng tiền thuê = tổng tiền các dòng − giảm giá. */
  amount: number
}

/** §13: tổng một dòng = giá thuê theo ngày × số quyển được tích "Nhận" × số ngày. */
export function computeTotals(
  rows: readonly BillDeskBookRow[],
  received: ReadonlySet<string>,
  days: number,
  discount: number,
): DeskTotals {
  const chargedDays = Math.max(days, 0)
  let copies = 0
  const lineTotals = rows.map((row) => {
    const count = row.copies.filter((copy) => received.has(copy.barcode)).length
    copies += count
    return row.rentalPrice * count * chargedDays
  })
  const subtotal = lineTotals.reduce((sum, line) => sum + line, 0)
  return { lineTotals, copies, subtotal, amount: subtotal - discount }
}
