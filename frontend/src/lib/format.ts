// docs/contracts.md §13: display rules islands apply themselves (props carry raw numbers and
// ISO dates, never pre-formatted strings).

const BOOK_CODE_DIGITS = 3
const BILL_CODE_DIGITS = 4
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/

function requireNonNegativeInteger(value: number, what: string): number {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${what} must be a non-negative integer, got ${String(value)}.`)
  }
  return value
}

/** 3000 → "3.000đ"; rounds to the đồng, groups thousands with dots. */
export function formatMoney(amount: number): string {
  if (!Number.isFinite(amount)) throw new Error(`Amount must be a finite number, got ${String(amount)}.`)
  const rounded = Math.round(amount)
  const digits = Math.abs(rounded)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `${rounded < 0 ? '-' : ''}${digits}đ`
}

/** "2026-09-25" → "25/09/2026". */
export function formatDate(isoDate: string): string {
  const match = ISO_DATE.exec(isoDate)
  if (!match) throw new Error(`Date must be yyyy-MM-dd, got "${isoDate}".`)
  const [, year, month, day] = match
  return `${day}/${month}/${year}`
}

/** 1 → "DT001" (D8, display only). */
export function bookCode(bookId: number): string {
  return `DT${String(requireNonNegativeInteger(bookId, 'bookId')).padStart(BOOK_CODE_DIGITS, '0')}`
}

/** 125 → "PM0125" (D8, display only). */
export function rentalBillCode(rentalBillId: number): string {
  return `PM${String(requireNonNegativeInteger(rentalBillId, 'rentalBillId')).padStart(BILL_CODE_DIGITS, '0')}`
}
