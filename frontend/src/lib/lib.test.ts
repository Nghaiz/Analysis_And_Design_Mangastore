import { describe, expect, it } from 'vitest'
import { bookCode, formatDate, formatMoney, rentalBillCode } from './format'
import { RENTAL_STATUS, rentalStatusKey } from './rental-status'

describe('format (docs/contracts.md §13)', () => {
  it.each([
    [0, '0đ'],
    [3000, '3.000đ'],
    [42000, '42.000đ'],
    [1234567, '1.234.567đ'],
    [2999.6, '3.000đ'],
  ])('formatMoney(%d) = %s', (amount, text) => {
    expect(formatMoney(amount)).toBe(text)
  })

  it('formats dates and codes', () => {
    expect(formatDate('2026-09-25')).toBe('25/09/2026')
    expect(bookCode(1)).toBe('DT001')
    expect(rentalBillCode(125)).toBe('PM0125')
  })

  it('throws on malformed input instead of printing garbage', () => {
    expect(() => formatDate('25/09/2026')).toThrow(/yyyy-MM-dd/)
    expect(() => formatMoney(Number.NaN)).toThrow(/finite/)
    expect(() => bookCode(1.5)).toThrow(/non-negative integer/)
  })
})

describe('rental status (docs/contracts.md §4)', () => {
  it('keeps the three exact NFC strings', () => {
    expect(Object.values(RENTAL_STATUS)).toEqual(['Chờ nhận', 'Đang cho thuê', 'Đã huỷ'])
    for (const status of Object.values(RENTAL_STATUS)) expect(status).toBe(status.normalize('NFC'))
  })

  it('maps each status to its key', () => {
    expect(rentalStatusKey('Chờ nhận')).toBe('pending')
    expect(rentalStatusKey('Đang cho thuê')).toBe('renting')
    expect(rentalStatusKey('Đã huỷ')).toBe('cancelled')
  })
})
