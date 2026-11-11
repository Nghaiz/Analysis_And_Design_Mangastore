// Xử lí chữ dùng chung cho các nguồn: gấp chữ (bỏ dấu), giải mã HTML, nhận combo,
// hàng cũ và số tập. Không chuẩn hoá dữ liệu ra (việc của clean), chỉ dùng để lọc/so khớp.

const NAMED_ENTITIES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '–', mdash: '—',
  lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”', hellip: '…', laquo: '«', raquo: '»',
};

const COMBINING = { acute: '́', grave: '̀', tilde: '̃', circ: '̂', uml: '̈' };

import { hasSetWord } from '../lib/set-word.mjs';

const HTML_TAG = /<[^>]*>/g;
const DECIMAL_RADIX = 10;
const HEX_RADIX = 16;

/** Giải mã thực thể HTML (có tên, số thập phân, số hex), kết quả NFC. */
export function decodeEntities(text) {
  return text
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, HEX_RADIX)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, DECIMAL_RADIX)))
    .replace(/&([a-zA-Z])(acute|grave|tilde|circ|uml);/g, (_, letter, mark) => `${letter}${COMBINING[mark]}`)
    .replace(/&([a-z]+);/gi, (whole, name) => NAMED_ENTITIES[name.toLowerCase()] ?? whole)
    .normalize('NFC');
}

/** Chữ trơn từ HTML: bỏ thẻ, giải mã, gộp khoảng trắng. */
export function htmlToText(html) {
  return decodeEntities(html.replace(HTML_TAG, ' ')).replace(/\s+/g, ' ').trim();
}

/** Gấp chữ để so khớp: thường, bỏ dấu, đ→d, bỏ dấu câu, gộp khoảng trắng. */
export function foldText(text) {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/**
 * Dấu hiệu combo/bộ nhiều tập (CONTRACT §5), so trên chữ đã gấp và có khoảng trắng hai đầu.
 * Chữ "bộ" không nằm ở đây: bỏ dấu thì trùng "bố", nên so trên chữ có dấu (`hasSetWord`).
 */
const COMBO_PATTERNS = [
  / combo /, / tron bo /, / set /, / box ?set /, / tu sach /,
  / \d+ (cuon|quyen|tap) /, / chon tap /, / tap \d+ (den|tap) \d+ /,
];

/** Khoảng tập trong tên gốc ("Tập 1 - 5", "Tập 66 – Tập 70", "tập 1 đến 10"). */
const VOLUME_RANGE = /tập\s*\d+\s*(?:[-–~]|đến)\s*(?:tập\s*)?\d+/iu;

/**
 * Sản phẩm "(Tập lẻ) ..." của Kim Đồng là trang chọn MỘT tập (mỗi biến thể một tập), tên hay kèm
 * "(24 tập)", nên chỉ loại khi có chữ combo/trọn bộ/box set rõ ràng.
 */
const SINGLE_VOLUME_LISTING = /^ tap le /;
const EXPLICIT_COMBO = [/ combo /, / tron bo /, / box ?set /];

export function isComboName(name) {
  const folded = ` ${foldText(name)} `;
  if (SINGLE_VOLUME_LISTING.test(folded)) return EXPLICIT_COMBO.some((re) => re.test(folded));
  return COMBO_PATTERNS.some((re) => re.test(folded)) || hasSetWord(name) || VOLUME_RANGE.test(name);
}

/** Hàng đã qua sử dụng: "cũ", "sách cũ", "like new", "đã qua sử dụng". */
const USED_GOODS = /(?:^|[\s([\-])(?:sách\s+)?cũ(?:$|[\s)\]\-,])|like\s*new|qua\s+sử\s+dụng/iu;

export function isUsedGoods(name) {
  return USED_GOODS.test(name.normalize('NFC'));
}

/** Tiền tố hay gặp trước tên bộ trên sàn ("Sách", "Truyện tranh", "Manga"). */
const NAME_PREFIXES = ['truyen tranh ', 'sach ', 'truyen ', 'manga ', 'comic '];

/** Số tập ngay sau tên bộ: "<bí danh> [- ] [tập|vol|số|quyển] <n>". */
const VOLUME_AFTER_ALIAS = /^(?:tap |t |vol |so |quyen )?(\d{1,3})(?: |$)/;

function stripPrefixes(folded) {
  let current = folded;
  for (let changed = true; changed;) {
    changed = false;
    for (const prefix of NAME_PREFIXES) {
      if (current.startsWith(prefix)) {
        current = current.slice(prefix.length);
        changed = true;
      }
    }
  }
  return current;
}

/**
 * Số tập nếu tên là MỘT tập của bộ (bí danh đứng đầu, ngay sau là số tập); ngược lại null.
 * Chặt có chủ đích: "Conan Hoạt Hình Màu ... Tập 2" là bộ khác nên trả null.
 */
export function matchVolume(name, aliases) {
  const folded = stripPrefixes(foldText(name));
  const ordered = aliases.map(foldText).sort((a, b) => b.length - a.length);
  for (const alias of ordered) {
    if (!alias || !folded.startsWith(`${alias} `)) continue;
    const m = folded.slice(alias.length + 1).match(VOLUME_AFTER_ALIAS);
    if (m) return Number(m[1]);
  }
  return null;
}

/** Ép URL ảnh về https (Sapo đôi khi trả "//host/..."); null nếu không dùng được. */
export function toHttps(url) {
  if (typeof url !== 'string' || !url) return null;
  if (url.startsWith('//')) return `https:${url}`;
  if (url.startsWith('http://')) return `https://${url.slice('http://'.length)}`;
  return url.startsWith('https://') ? url : null;
}
