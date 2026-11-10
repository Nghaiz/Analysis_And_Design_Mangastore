import { describe, expect, it } from 'vitest';
import { barcode, copiesFor, priceFor } from '../src/lib/rules.mjs';

const book = (overrides) => ({ variant: 'thuong', pages: 180, publishYear: 2020, copies: 3, ...overrides });

describe('copies', () => {
  it('1–5 quyển, cố định theo seed, đủ cả ít và nhiều', () => {
    const keys = Array.from({ length: 200 }, (_, i) => ({ seriesKey: 'conan', volume: i + 1, variant: 'thuong' }));
    const values = keys.map(copiesFor);
    expect(values.every((n) => n >= 1 && n <= 5)).toBe(true);
    expect(new Set(values)).toEqual(new Set([1, 2, 3, 4, 5]));
    expect(keys.map(copiesFor)).toEqual(values);
  });

  it('barcode DT{id:3}-{n:2}', () => {
    expect(barcode(5, 1)).toBe('DT005-01');
    expect(barcode(123, 12)).toBe('DT123-12');
  });
});

describe('price', () => {
  it.each([
    ['tập thường', book({}), {}, 3000],
    ['truyện dài', book({}), { longStory: true }, 5000],
    ['tập đặc biệt', book({ variant: 'dac-biet' }), {}, 5000],
    ['trên 200 trang', book({ pages: 201 }), {}, 5000],
    ['đúng 200 trang', book({ pages: 200 }), {}, 3000],
    ['xuất bản trước 2005', book({ publishYear: 2004 }), {}, 4000],
    ['năm 2005 không hiếm', book({ publishYear: 2005 }), {}, 3000],
    ['chỉ 1 quyển', book({ copies: 1 }), {}, 4000],
    ['thiếu năm không tính hiếm', book({ publishYear: null }), {}, 3000],
    ['dài và hiếm', book({ copies: 1 }), { longStory: true }, 6000],
  ])('%s', (_label, input, series, expected) => {
    expect(priceFor(input, series)).toBe(expected);
  });
});
