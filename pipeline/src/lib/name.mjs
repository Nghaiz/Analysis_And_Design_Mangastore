// Làm sạch tên sản phẩm thành tên đầu truyện (CONTRACT §9): bỏ "Sách - ", "(YYYY)", "(Tái bản YYYY)",
// "(Tặng ...)", "(N tập)", số tập đệm "Tập 01" → "Tập 1". Năm bỏ khỏi tên được trả lại để làm publishYear.
import { cleanLine, collapseSpaces, fold } from './text.mjs';
import { validYear } from './title.mjs';

const SHOP_PREFIX = /^(?:sách|sach)\s*[-–:]\s*/iu;
const REPRINT_PAREN = /\(\s*tái\s*bản\b[^)]*\)/giu;
const BARE_YEAR_PAREN = /\(\s*(\d{4})\s*\)/gu;
const GIFT_PAREN = /\(\s*tặng(?=[\s)])[^)]*\)/giu;
const COUNT_PAREN = /\(\s*\d+\s*(?:tập|cuốn|quyển)\s*\)/giu;
const PADDED_NUMBER = /(^|[\s(])(tập|quyển|vol\.?|#)\s*0+(\d)/giu;
const YEAR_IN = /(?<!\d)(\d{4})(?!\d)/u;
const DANGLING = /^[\s\-–—:,]+|[\s\-–—:,]+$/gu;

function yearsOf(matches) {
  return matches.map((m) => validYear(m.match(YEAR_IN)?.[1])).filter((y) => y != null);
}

/** Trả { name, year }: tên đã làm sạch và năm đầu tiên lấy được từ phần bị bỏ (hoặc null). */
export function cleanTitle(raw) {
  let name = cleanLine(raw) ?? '';
  const removed = [];
  const take = (pattern) => {
    name = name.replace(pattern, (whole) => {
      removed.push(whole);
      return ' ';
    });
  };
  name = name.replace(SHOP_PREFIX, '');
  take(REPRINT_PAREN);
  name = name.replace(BARE_YEAR_PAREN, (whole, digits) => {
    if (validYear(digits) == null) return whole;
    removed.push(whole);
    return ' ';
  });
  name = name.replace(GIFT_PAREN, ' ').replace(COUNT_PAREN, ' ');
  name = name.replace(PADDED_NUMBER, (_whole, before, label, digit) => `${before}${label} ${digit}`);
  name = collapseSpaces(name).replace(/\s+([-–—:,])\s*$/u, '').replace(DANGLING, '');
  const cleaned = collapseSpaces(name);
  return { name: cleaned || (cleanLine(raw) ?? ''), year: yearsOf(removed)[0] ?? null };
}

/**
 * Bỏ phần lặp lại tên ở đầu mô tả ("Nhóc Maruko - Tập 1 “Nhóc Maruko” ra đời..." → "“Nhóc Maruko” ra đời...").
 * So khớp không phân biệt hoa thường và dấu; chỉ bỏ khi phần còn lại không rỗng.
 */
export function stripLeadingTitle(text, candidates) {
  if (text == null) return null;
  const sorted = [...new Set(candidates.filter(Boolean))].sort((a, b) => b.length - a.length);
  for (const candidate of sorted) {
    const head = text.slice(0, candidate.length);
    if (fold(head) !== fold(candidate)) continue;
    const next = text.charAt(candidate.length);
    if (next && /[\p{L}\p{N}]/u.test(next)) continue;
    const rest = text.slice(candidate.length).replace(/^[\s\-–—:.,|]+/u, '');
    if (rest) return rest;
  }
  return text;
}
