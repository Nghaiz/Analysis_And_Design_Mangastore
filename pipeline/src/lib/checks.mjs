// Các kiểm của validate (CONTRACT §7b). Mỗi hàm trả mảng { code, bookId, message }.
import { join } from 'node:path';
import { exists } from './io.mjs';
import { mergeKey } from './merge.mjs';
import { decodeFile, outputNames } from './render.mjs';
import { schemaErrors } from './schema.mjs';
import { isCombo } from './title.mjs';

export const BOOK_COUNT = Object.freeze({ min: 300, max: 500 });
const REQUIRED = Object.freeze(['name', 'author', 'publisher', 'category', 'rentalPrice']);

const issue = (code, bookId, message) => ({ code, bookId, message });

export function missingFields(book, categories) {
  const out = [];
  for (const field of REQUIRED) {
    const value = book[field];
    if (value == null || value === '') out.push(issue('missing-field', book.id, `thiếu ${field}`));
  }
  if (book.category && !categories.has(book.category)) {
    out.push(issue('missing-field', book.id, `category "${book.category}" không có trong categories.json`));
  }
  return out;
}

/** Lỗi schema, trừ lỗi ở trường đã báo thiếu (tránh báo hai lần một chuyện). */
export function schemaIssues(book, validate, missing) {
  const skip = new Set(REQUIRED.filter((field) => missing.some((m) => m.message === `thiếu ${field}`)).map((f) => `/${f}`));
  return schemaErrors(validate, book)
    .filter((err) => !skip.has(err.path))
    .map((err) => issue('schema', book.id ?? null, err.message));
}

export function duplicateKeys(books) {
  const out = [];
  const seen = { id: new Map(), key: new Map(), isbn13: new Map(), name: new Map() };
  const keyOf = { id: (b) => b.id, key: (b) => mergeKey(b), isbn13: (b) => b.isbn13, name: (b) => b.name };
  for (const book of books) {
    for (const kind of Object.keys(seen)) {
      const value = keyOf[kind](book);
      if (value == null) continue;
      if (seen[kind].has(value)) {
        out.push(issue('duplicate-key', book.id, `trùng ${kind} "${value}" với Book ${seen[kind].get(value)}`));
      } else seen[kind].set(value, book.id);
    }
  }
  return out;
}

export function comboIssues(book) {
  return isCombo(book.name) ? [issue('combo', book.id, `tên còn dấu hiệu combo/bộ/set: "${book.name}"`)] : [];
}

export async function imageIssues(book, imagesDir) {
  const out = [];
  for (const image of book.images ?? []) {
    if (image.sha256 == null) continue;
    const label = image.kind === 'cover' ? 'bìa' : `ảnh phụ ${image.n}`;
    if (image.widths.length === 0) {
      out.push(issue('image-decode', book.id, `${label} không giải mã được: ${image.sourceUrl}`));
      continue;
    }
    for (const name of outputNames(image)) {
      const file = join(imagesDir, String(book.id), name);
      if (!(await exists(file))) {
        out.push(issue('image-decode', book.id, `thiếu file ${name}`));
        continue;
      }
      try {
        await decodeFile(file);
      } catch (err) {
        out.push(issue('image-decode', book.id, `${name} không giải mã được (${err.message})`));
      }
    }
  }
  return out;
}

export function bookCountIssues(run, count) {
  if (run !== 'full' || (count >= BOOK_COUNT.min && count <= BOOK_COUNT.max)) return [];
  return [issue('book-count', null, `${count} Book, ngoài khoảng ${BOOK_COUNT.min}–${BOOK_COUNT.max}`)];
}

export function hasCover(book) {
  const cover = book.images?.[0];
  return cover?.kind === 'cover' && cover.sha256 != null && cover.widths.length > 0;
}

export function warningIssues(book) {
  const out = [];
  if (!hasCover(book)) out.push(issue('no-cover', book.id, 'thiếu bìa (nginx trả ảnh dự phòng)'));
  if (book.publishYear == null) out.push(issue('no-year', book.id, 'thiếu năm xuất bản'));
  if (book.description == null) out.push(issue('no-description', book.id, 'mô tả rỗng'));
  return out;
}
