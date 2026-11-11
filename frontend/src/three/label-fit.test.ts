import { describe, expect, it } from 'vitest'
import { LINE_PITCH, fitLabel, splitInTwo } from './label-fit'

/** Chữ giả: mỗi kí tự rộng 0,55 cỡ chữ. */
const measure = (text: string, size: number): number => text.length * size * 0.55
const box = { length: 300, thickness: 120, minSize: 16, maxSize: 76 }

describe('splitInTwo', () => {
  it('cuts at the space nearest the middle', () => {
    expect(splitInTwo('Khoa học viễn tưởng')).toEqual(['Khoa học', 'viễn tưởng'])
    expect(splitInTwo('Thiếu nhi')).toEqual(['Thiếu', 'nhi'])
    expect(splitInTwo('Truyện')).toBeNull()
  })
})

describe('fitLabel', () => {
  it('keeps a short label on one line at the largest size that fits', () => {
    const fit = fitLabel('Kì ảo', box, measure)
    expect(fit.lines).toEqual(['Kì ảo'])
    expect(fit.size).toBe(76)
  })

  it('breaks a long label in two when that gives bigger letters', () => {
    const single = Math.floor(300 / (19 * 0.55))
    const fit = fitLabel('Khoa học viễn tưởng', box, measure)
    expect(fit.lines).toEqual(['Khoa học', 'viễn tưởng'])
    expect(fit.size).toBeGreaterThan(single)
    expect(fit.size * (1 + LINE_PITCH)).toBeLessThanOrEqual(box.thickness)
    fit.lines.forEach((line) => expect(measure(line, fit.size)).toBeLessThanOrEqual(box.length))
  })

  it('never goes below minSize, even when nothing fits', () => {
    const fit = fitLabel('Một nhãn rất rất rất dài không thể nào vừa', { ...box, length: 40 }, measure)
    expect(fit.size).toBe(box.minSize)
  })
})
