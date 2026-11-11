// Chuẩn hoá tên tác giả: tách chuỗi nhiều tác giả, gộp biến thể chính tả theo khoá bỏ dấu
// (thứ tự từ không quan trọng: "Aoyama Gosho" = "Gosho Aoyama"), nối bằng ", ".
import { cleanLine, foldKey } from './text.mjs';

export const AUTHOR_SEPARATOR = ', ';
const SPLIT = /\s*(?:[,;/&|]|\s-\s|\svà\s|\sand\s)\s*/i;
const ROLE_PREFIX = /^(?:tác giả|tranh|lời|minh hoạ|minh họa|author)\s*:\s*/i;
// Chữ chung chung không phải tên người (so trên khoá bỏ dấu): coi như nguồn để trống.
const GENERIC_AUTHORS = Object.freeze(
  new Set(['nhieu tac gia', 'tap the tac gia', 'nhom tac gia', 'dang cap nhat', 'khong ro', 'various', 'various authors']),
);
const INITIAL = /^[A-Z]$/;

/** "Fujiko F Fujio" → "Fujiko F. Fujio": chữ cái đứng một mình giữa tên được thêm dấu chấm. */
function dotInitials(name) {
  const words = name.split(' ');
  return words.map((w, i) => (i > 0 && i < words.length - 1 && INITIAL.test(w) ? `${w}.` : w)).join(' ');
}

/** Khoá gộp biến thể: bỏ dấu, chữ thường, sắp các từ. */
export function authorKey(name) {
  return foldKey(name).split(' ').filter(Boolean).sort().join(' ');
}

export function splitAuthors(list) {
  const out = [];
  for (const item of list ?? []) {
    for (const part of String(item).split(SPLIT)) {
      const name = cleanLine(part?.replace(ROLE_PREFIX, ''));
      if (name && !GENERIC_AUTHORS.has(foldKey(name))) out.push(dotInitials(name));
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
