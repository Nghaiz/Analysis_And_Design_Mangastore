// Sinh SQL MySQL tất định: chuỗi escape theo MySQL, LF, không dấu thời gian (CONTRACT §6).
import { barcode } from './rules.mjs';

const ROWS_PER_INSERT = 100;
const ESCAPES = Object.freeze({ '\\': '\\\\', "'": "\\'", '\0': '\\0', '\n': '\\n', '\r': '\\r', '\x1a': '\\Z' });

export function sqlString(value) {
  if (value == null) return 'NULL';
  return `'${String(value).replace(/[\\'\0\n\r\x1a]/g, (ch) => ESCAPES[ch])}'`;
}

export function sqlNumber(value) {
  if (value == null) return 'NULL';
  if (!Number.isFinite(value)) throw new Error(`Giá trị số không hợp lệ cho SQL: ${value}`);
  return String(value);
}

function inserts(table, columns, rows) {
  const out = [];
  for (let i = 0; i < rows.length; i += ROWS_PER_INSERT) {
    const chunk = rows.slice(i, i + ROWS_PER_INSERT).map((row) => `  (${row.join(', ')})`);
    out.push(`INSERT INTO ${table} (${columns.join(', ')}) VALUES\n${chunk.join(',\n')};`);
  }
  return out;
}

/** Danh sách quyển: id tăng dần theo (bookId, n) bắt đầu từ 1. */
export function copyRows(books) {
  const rows = [];
  const sorted = [...books].sort((a, b) => a.id - b.id);
  for (const book of sorted) {
    for (let n = 1; n <= book.copies; n += 1) rows.push({ id: rows.length + 1, barcode: barcode(book.id, n), bookId: book.id, n });
  }
  return rows;
}

const HEADER = '-- Sinh bởi pipeline (bước export). Không sửa tay; chạy lại pipeline để đổi.\n';

export function renderV10(books) {
  const sorted = [...books].sort((a, b) => a.id - b.id);
  const copies = copyRows(sorted);
  const bookRows = sorted.map((b) => [
    sqlNumber(b.id),
    sqlString(b.name),
    sqlString(b.author),
    sqlString(b.publisher),
    sqlNumber(b.publishYear),
    sqlString(b.category),
    sqlString(b.description),
    sqlNumber(b.rentalPrice),
  ]);
  const copyValues = copies.map((c) => [sqlNumber(c.id), sqlString(c.barcode), sqlNumber(c.bookId)]);
  const maxBookId = sorted.at(-1)?.id ?? 0;
  const parts = [
    HEADER + `-- ${sorted.length} Book, ${copies.length} quyển.`,
    ...inserts('tblBook', ['id', 'name', 'author', 'publisher', 'publishYear', 'category', 'description', 'rentalPrice'], bookRows),
    ...inserts('tblBookCopy', ['id', 'barcode', 'bookId'], copyValues),
    `ALTER TABLE tblBook AUTO_INCREMENT = ${maxBookId + 1};`,
    `ALTER TABLE tblBookCopy AUTO_INCREMENT = ${copies.length + 1};`,
  ];
  return `${parts.join('\n\n')}\n`;
}

export const SQL_HEADER = HEADER;
