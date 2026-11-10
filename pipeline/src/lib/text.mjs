// Xử lí chữ: NFC, bỏ HTML, bỏ dấu, cắt theo câu.

const NAMED_ENTITIES = Object.freeze({
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  hellip: '…', ndash: '–', mdash: '—', laquo: '«', raquo: '»',
  ldquo: '“', rdquo: '”', lsquo: '‘', rsquo: '’',
});

const BLOCK_TAGS = /<\s*\/?\s*(br|p|div|li|ul|ol|h[1-6]|tr|table|blockquote)\b[^>]*>/gi;
const DROP_BLOCKS = /<\s*(script|style)\b[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi;
const ANY_TAG = /<[^>]*>/g;
const ELLIPSIS = '…';

export function decodeEntities(text) {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, body) => {
    if (body[0] === '#') {
      const code = body[1] === 'x' || body[1] === 'X' ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : whole;
    }
    return NAMED_ENTITIES[body.toLowerCase()] ?? whole;
  });
}

export function collapseSpaces(text) {
  return text.replace(/\s+/g, ' ').trim();
}

/** NFC + gom khoảng trắng; null/rỗng thành null. */
export function cleanLine(text) {
  if (text == null) return null;
  const out = collapseSpaces(String(text).normalize('NFC'));
  return out === '' ? null : out;
}

/** HTML → văn bản thuần NFC một dòng. */
export function htmlToText(html) {
  if (html == null) return null;
  const stripped = String(html).replace(DROP_BLOCKS, ' ').replace(BLOCK_TAGS, ' ').replace(ANY_TAG, '');
  return cleanLine(decodeEntities(stripped));
}

/** Bỏ dấu tiếng Việt, chữ thường, đ → d. Dùng để so khớp, không để hiển thị. */
export function fold(text) {
  return String(text ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
}

/** Khoá so khớp: bỏ dấu, chỉ giữ chữ số và chữ, gom khoảng trắng. */
export function foldKey(text) {
  return collapseSpaces(fold(text).replace(/[^a-z0-9]+/g, ' '));
}

/**
 * Cắt `text` ≤ `max` kí tự tại ranh giới câu cuối cùng còn vừa.
 * Câu đầu đã dài hơn `max` thì cắt tại ranh giới từ và thêm "…".
 */
export function truncateAtSentence(text, max) {
  if (text == null) return null;
  const chars = Array.from(text);
  if (chars.length <= max) return text;
  const head = chars.slice(0, max).join('');
  const sentenceEnd = /[.!?…](?:["”’»)]*)(?=\s|$)/g;
  let cut = -1;
  for (const match of head.matchAll(sentenceEnd)) cut = match.index + match[0].length;
  if (cut > 0) return head.slice(0, cut).trim();
  const room = Array.from(head).slice(0, max - ELLIPSIS.length).join('');
  const lastSpace = room.lastIndexOf(' ');
  const base = lastSpace > 0 ? room.slice(0, lastSpace) : room;
  return base.replace(/[\s,;:–—-]+$/, '') + ELLIPSIS;
}

/** Cắt cứng theo kí tự (cho cột varchar), không bao giờ vượt `max`. */
export function clip(text, max) {
  if (text == null) return null;
  const chars = Array.from(text);
  return chars.length <= max ? text : chars.slice(0, max).join('').trim();
}
