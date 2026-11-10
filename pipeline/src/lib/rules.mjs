// Quy tắc số quyển và giá thuê (CONTRACT §5, brainstorm §6). Nguồn duy nhất cho docs/data-pipeline.md.
import { createHash } from 'node:crypto';

export const MIN_COPIES = 1;
export const MAX_COPIES = 5;
export const FEW_COPIES_MAX = 2;
export const MANY_COPIES_MIN = 4;

export const PRICE = Object.freeze({
  base: 3000,
  long: 5000,
  rareSurcharge: 1000,
  longPagesOver: 200,
  rareBeforeYear: 2005,
  rareCopies: 1,
});

/** Số quyển 1–5 cố định theo sha256(seriesKey|volume|variant). */
export function copiesFor({ seriesKey, volume, variant }) {
  const digest = createHash('sha256').update(`${seriesKey}|${volume}|${variant}`).digest();
  return MIN_COPIES + (digest.readUInt32BE(0) % (MAX_COPIES - MIN_COPIES + 1));
}

export function barcode(bookId, n) {
  return `DT${String(bookId).padStart(3, '0')}-${String(n).padStart(2, '0')}`;
}

export function isRare(book) {
  return (book.publishYear != null && book.publishYear < PRICE.rareBeforeYear) || book.copies === PRICE.rareCopies;
}

export function isLong(book, series) {
  return Boolean(series?.longStory) || book.variant === 'dac-biet' || (book.pages ?? 0) > PRICE.longPagesOver;
}

/** Giá thuê một ngày (đồng). */
export function priceFor(book, series) {
  const base = isLong(book, series) ? PRICE.long : PRICE.base;
  return base + (isRare(book) ? PRICE.rareSurcharge : 0);
}
