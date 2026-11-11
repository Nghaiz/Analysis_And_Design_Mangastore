import { describe, expect, it } from 'vitest'
import { computeTotals, daysBetween, isDueDateValid, isRealIsoDate, parseDiscount, rentalDays } from './totals'
import type { BillDeskBookRow } from './types'

const rows: BillDeskBookRow[] = [
  {
    bookId: 1,
    name: 'Thám tử lừng danh Conan - Tập 1',
    rentalPrice: 3000,
    copies: [{ barcode: 'DT001-03', received: true, conditionText: null }],
  },
  {
    bookId: 20,
    name: 'Đội quân Doraemon - Tập 2',
    rentalPrice: 3000,
    copies: [
      { barcode: 'DT020-02', received: true, conditionText: null },
      { barcode: 'DT020-05', received: true, conditionText: null },
    ],
  },
]

describe('rental days (C3)', () => {
  it('counts the days between borrow and due date, across a month end', () => {
    expect(daysBetween('2026-09-25', '2026-10-02')).toBe(7)
    expect(daysBetween('2026-10-02', '2026-09-25')).toBe(-7)
  })

  it('falls back to expectedDays only when a date is missing', () => {
    expect(rentalDays('2026-09-25', '2026-10-05', 7)).toBe(10)
    expect(rentalDays(null, '2026-10-05', 7)).toBe(7)
    expect(rentalDays('2026-09-25', null, 7)).toBe(7)
  })

  it('accepts a due date only when it is a full date after the borrow date', () => {
    expect(isDueDateValid('2026-09-25', '2026-09-26')).toBe(true)
    expect(isDueDateValid('2026-09-25', '2026-09-25')).toBe(false)
    expect(isDueDateValid('2026-09-25', '')).toBe(false)
    expect(isDueDateValid(null, '2026-09-01')).toBe(true)
  })

  it('rejects dates that do not exist', () => {
    expect(isRealIsoDate('2026-02-30')).toBe(false)
    expect(isRealIsoDate('2026-13-01')).toBe(false)
    expect(isRealIsoDate('2028-02-29')).toBe(true)
    expect(isDueDateValid('2026-02-01', '2026-02-30')).toBe(false)
  })
})

describe('discount parsing (C10)', () => {
  it('reads plain digits, grouped digits and an empty box', () => {
    expect(parseDiscount('6000')).toBe(6000)
    expect(parseDiscount(' 6.000đ ')).toBe(6000)
    expect(parseDiscount('2000đ')).toBe(2000)
    expect(parseDiscount('2000Đ')).toBe(2000)
    expect(parseDiscount('2 000')).toBe(2000)
    expect(parseDiscount('')).toBe(0)
    expect(parseDiscount('   ')).toBe(0)
  })

  it('rejects negatives, decimals, words and numbers past the safe range, without throwing', () => {
    expect(parseDiscount('-1000')).toBeNull()
    expect(parseDiscount('1,5')).toBeNull()
    expect(parseDiscount('mười nghìn')).toBeNull()
    expect(parseDiscount('đ')).toBe(0)
    expect(parseDiscount('99999999999999999999')).toBeNull()
  })
})

describe('totals (§13)', () => {
  it('prices each title by its received copies × days and subtracts the discount', () => {
    const all = new Set(['DT001-03', 'DT020-02', 'DT020-05'])
    expect(computeTotals(rows, all, 7, 5000)).toEqual({
      lineTotals: [21000, 42000],
      copies: 3,
      subtotal: 63000,
      amount: 58000,
    })
  })

  it('drops unticked copies from the line, the copy count and the sum', () => {
    const totals = computeTotals(rows, new Set(['DT020-05']), 7, 0)
    expect(totals.lineTotals).toEqual([0, 21000])
    expect(totals.copies).toBe(1)
    expect(totals.amount).toBe(21000)
  })

  it('never charges a negative number of days', () => {
    expect(computeTotals(rows, new Set(['DT001-03']), -3, 0).amount).toBe(0)
  })
})
