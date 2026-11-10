// Chuẩn hoá tên NXB theo tiền tố (CONTRACT §9): "Nhà Xuất Bản Kim Đồng", "NXB Kim Đồng" → "Kim Đồng";
// "Cty Phan Thị", "Công ty TNHH Văn hoá Phan Thị" → "Phan Thị". Không ghi cứng từng chuỗi.
import { cleanLine, foldKey } from './text.mjs';

// So khớp trên khoá bỏ dấu (foldKey): chữ thường, không dấu, chỉ chữ và số.
const PUBLISHER_PREFIXES = Object.freeze(['nha xuat ban', 'nxb']);
const COMPANY_PREFIXES = Object.freeze(['cong ty', 'cty']);
// Từ chỉ loại hình doanh nghiệp đứng sau "Công ty"/"Cty", bỏ cùng tiền tố.
const COMPANY_WORDS = Object.freeze(['tnhh', 'mtv', 'co phan', 'cp', 'van hoa', 'truyen thong', 'sach', 'phat hanh']);

/** Bỏ `count` từ đầu của chuỗi gốc (giữ nguyên dấu và hoa thường của phần còn lại). */
function dropWords(text, count) {
  return text.split(/\s+/).slice(count).join(' ');
}

function startsWithWords(key, phrase) {
  return key === phrase || key.startsWith(`${phrase} `);
}

function stripPrefixes(text) {
  let out = text.replace(/^[\s.:-]+/, '');
  let key = foldKey(out);
  const publisher = PUBLISHER_PREFIXES.find((p) => startsWithWords(key, p));
  if (publisher) return dropWords(out.replace(/^(\S+?)\.(?=\S)/, '$1 '), publisher.split(' ').length);
  const company = COMPANY_PREFIXES.find((p) => startsWithWords(key, p));
  if (!company) return out;
  out = dropWords(out, company.split(' ').length);
  for (let changed = true; changed; ) {
    key = foldKey(out);
    const word = COMPANY_WORDS.find((w) => startsWithWords(key, w));
    changed = Boolean(word);
    if (word) out = dropWords(out, word.split(' ').length);
  }
  return out;
}

/**
 * @param raw tên NXB của nguồn
 * @param known cách viết chuẩn đã biết (publisher của các bộ trong series.json); khớp đuôi thì dùng cách viết đó
 */
export function normalizePublisher(raw, known = []) {
  const text = cleanLine(raw);
  if (!text) return null;
  const stripped = cleanLine(stripPrefixes(text)) ?? text;
  const key = foldKey(stripped);
  const match = known.find((name) => {
    const k = foldKey(name);
    return k && (key === k || key.endsWith(` ${k}`));
  });
  return match ?? stripped;
}
