// Đọc thông tin từ tên sản phẩm: số tập, biến thể, năm tái bản, dấu hiệu combo (CONTRACT §5).
import { fold } from './text.mjs';

export const VARIANTS = Object.freeze(['thuong', 'dac-biet', 'mau', 'plus']);
export const DEFAULT_VARIANT = 'thuong';
export const MIN_YEAR = 1900;
export const MAX_YEAR = 2100;

// Thứ tự kiểm: đặc biệt, rồi màu (trên chữ có dấu), rồi plus.
const SPECIAL = /\b(dac biet|special)\b/;
const PLUS = /\bplus\b/;
// 'màu' kiểm trên chữ có dấu: bỏ dấu thì trùng với 'mẫu', 'mâu'.
const COLOR_WORD = /(?<!\p{L})màu(?!\p{L})/u;

const REPRINT = /\(?\s*tai ban(?: lan thu \d+)?(?: nam)?\s*(\d{4})\s*\)?/;
const VOLUME_PATTERNS = Object.freeze([
  /\btap\s*(\d+)\b/,
  /\bvol(?:ume)?\.?\s*(\d+)\b/,
  /#\s*(\d+)\b/,
  /\bquyen\s*(\d+)\b/,
]);

const COMBO_PATTERNS = Object.freeze([
  /\bcombo\b/,
  /\btron bo\b/,
  /\bbox set\b/,
  /\bbo\s/,
  /\bset\s/,
]);
const BOOKSHELF = /\btu sach\b/;
const MULTI_VOLUME = /\b(tap|vol)\s*\d+\s*(?:-|–|den|toi)\s*\d+\b|\b\d+\s*(?:cuon|tap|quyen)\b/;

/** Tên đã bỏ dấu, gom khoảng trắng, thêm khoảng trắng hai đầu để khớp mẫu có dấu cách sau từ. */
function foldedName(name) {
  return ` ${fold(name).replace(/\s+/g, ' ').trim()} `;
}

export function detectVariant(name) {
  const text = foldedName(name).replace(REPRINT, ' ');
  if (SPECIAL.test(text)) return 'dac-biet';
  if (COLOR_WORD.test(String(name).normalize('NFC').toLowerCase())) return 'mau';
  if (PLUS.test(text)) return 'plus';
  return DEFAULT_VARIANT;
}

export function parseVolume(name) {
  const text = foldedName(name).replace(REPRINT, ' ');
  for (const pattern of VOLUME_PATTERNS) {
    const match = text.match(pattern);
    if (match) return Number(match[1]);
  }
  return null;
}

/** Năm hợp lệ 1900–2100 hoặc null. */
export function validYear(value) {
  const year = Number(value);
  return Number.isInteger(year) && year >= MIN_YEAR && year <= MAX_YEAR ? year : null;
}

/** Năm từ chuỗi ngày của nguồn ('2023', '15/03/2020', '2020-03-15T...'). */
export function yearFromDate(publishedAt) {
  if (publishedAt == null) return null;
  const match = String(publishedAt).match(/(?<!\d)(\d{4})(?!\d)/);
  return match ? validYear(match[1]) : null;
}

/** Năm trong "(Tái bản YYYY)" của tên. */
export function yearFromReprint(name) {
  const match = foldedName(name).match(REPRINT);
  return match ? validYear(match[1]) : null;
}

/** Tên còn mang dấu hiệu combo/bộ/set (CONTRACT §5). */
export function isCombo(name) {
  const text = foldedName(name);
  if (COMBO_PATTERNS.some((pattern) => pattern.test(text))) return true;
  return BOOKSHELF.test(text) && MULTI_VOLUME.test(text);
}
