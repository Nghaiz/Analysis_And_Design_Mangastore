// Chuẩn hoá tên tác giả: tách chuỗi nhiều tác giả, gộp biến thể chính tả theo khoá bỏ dấu
// (thứ tự từ không quan trọng: "Aoyama Gosho" = "Gosho Aoyama"), nối bằng ", ".
import { cleanLine, foldKey } from './text.mjs';

export const AUTHOR_SEPARATOR = ', ';
const SPLIT = /\s*(?:[,;/&|]|\s-\s|\svà\s|\sand\s)\s*/i;
const ROLE_PREFIX = /^(?:tác giả|tranh|lời|minh hoạ|minh họa|author)\s*:\s*/i;

/** Khoá gộp biến thể: bỏ dấu, chữ thường, sắp các từ. */
export function authorKey(name) {
  return foldKey(name).split(' ').filter(Boolean).sort().join(' ');
}

export function splitAuthors(list) {
  const out = [];
  for (const item of list ?? []) {
    for (const part of String(item).split(SPLIT)) {
      const name = cleanLine(part?.replace(ROLE_PREFIX, ''));
      if (name) out.push(name);
    }
  }
  return out;
}

function isAllCaps(name) {
  return name === name.toUpperCase() && name !== name.toLowerCase();
}

/**
 * Bảng chính tả chuẩn cho một bộ: khoá → cách viết.
 * `preferred` (Wikidata cấp bộ) thắng; còn lại lấy cách viết gặp đầu tiên theo thứ tự đã cho,
 * cách viết toàn chữ hoa bị thay bởi cách viết thường gặp sau đó.
 */
export function buildAuthorSpelling(preferred, others) {
  const table = new Map();
  for (const name of splitAuthors(preferred)) {
    const key = authorKey(name);
    if (key && !table.has(key)) table.set(key, { name, locked: true });
  }
  for (const name of splitAuthors(others)) {
    const key = authorKey(name);
    if (!key) continue;
    const current = table.get(key);
    if (!current) table.set(key, { name, locked: false });
    else if (!current.locked && isAllCaps(current.name) && !isAllCaps(name)) current.name = name;
  }
  return new Map([...table].map(([key, value]) => [key, value.name]));
}

/** Danh sách tác giả → một chuỗi, mỗi người một lần, theo cách viết chuẩn. */
export function formatAuthors(list, spelling) {
  const seen = new Set();
  const names = [];
  for (const name of splitAuthors(list)) {
    const key = authorKey(name);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    names.push(spelling.get(key) ?? name);
  }
  return names.join(AUTHOR_SEPARATOR);
}
