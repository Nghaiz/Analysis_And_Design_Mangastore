// Đọc độ rộng (advance width) của 10 chữ số 0–9 trong một file .woff hoặc .woff2, bằng Node thuần
// (node:zlib cho woff, brotli cho woff2), không thư viện đọc font. Dùng bởi check-font-subsets.mjs
// để kiểm font gán cho --font-num có chữ số mặc định cùng bề rộng (thẳng cột không cần tnum).
//
// Chỉ đọc ba bảng: head (không cần), hhea (numberOfHMetrics), hmtx (advance), cmap (mã → glyph).
// woff2 có thể "biến đổi" bảng hmtx (WOFF2 §5.4); gặp trường hợp đó hàm ném lỗi nói rõ để kiểm
// bằng file .woff cùng tên trong gói Fontsource.
import { readFileSync } from 'node:fs';
import { brotliDecompressSync, inflateSync } from 'node:zlib';

const DIGITS = '0123456789';

// Bảng tag đã biết của WOFF2 (WOFF2 §5.1), theo chỉ số trong 6 bit thấp của flags.
const WOFF2_KNOWN_TAGS = [
  'cmap', 'head', 'hhea', 'hmtx', 'maxp', 'name', 'OS/2', 'post', 'cvt ', 'fpgm', 'glyf', 'loca', 'prep',
  'CFF ', 'VORG', 'EBDT', 'EBLC', 'gasp', 'hdmx', 'kern', 'LTSH', 'PCLT', 'VDMX', 'vhea', 'vmtx', 'BASE',
  'GDEF', 'GPOS', 'GSUB', 'EBSC', 'JSTF', 'MATH', 'CBDT', 'CBLC', 'COLR', 'CPAL', 'SVG ', 'sbix', 'acnt',
  'avar', 'bdat', 'bloc', 'bsln', 'cvar', 'fdsc', 'feat', 'fmtx', 'fvar', 'gvar', 'hsty', 'just', 'lcar',
  'mort', 'morx', 'opbd', 'prop', 'trak', 'Zapf', 'Silf', 'Glat', 'Gloc', 'Feat', 'Sill',
];
const WOFF_SIGNATURE = 0x774f4646; // 'wOFF'
const WOFF2_SIGNATURE = 0x774f4632; // 'wOF2'

/** .woff: thư mục bảng 20 byte mỗi bảng sau header 44 byte; bảng nén zlib khi compLength < origLength. */
function woffTables(buf) {
  const tables = {};
  const numTables = buf.readUInt16BE(12);
  for (let i = 0; i < numTables; i++) {
    const at = 44 + i * 20;
    const tag = buf.toString('latin1', at, at + 4);
    const offset = buf.readUInt32BE(at + 4);
    const compLength = buf.readUInt32BE(at + 8);
    const origLength = buf.readUInt32BE(at + 12);
    const raw = buf.subarray(offset, offset + compLength);
    tables[tag] = { data: compLength < origLength ? inflateSync(raw) : raw, transformed: false };
  }
  return tables;
}

/** .woff2: thư mục bảng (UIntBase128) sau header 48 byte, mọi bảng nối liền trong một khối brotli. */
function woff2Tables(buf) {
  let p = 48;
  const base128 = () => {
    let value = 0;
    for (let i = 0; i < 5; i++) {
      const byte = buf[p++];
      value = value * 128 + (byte & 0x7f);
      if (!(byte & 0x80)) return value;
    }
    throw new Error('UIntBase128 dài quá 5 byte');
  };
  const entries = [];
  const numTables = buf.readUInt16BE(12);
  for (let i = 0; i < numTables; i++) {
    const flags = buf[p++];
    let tag = WOFF2_KNOWN_TAGS[flags & 0x3f];
    if ((flags & 0x3f) === 0x3f) {
      tag = buf.toString('latin1', p, p + 4);
      p += 4;
    }
    const version = flags >> 6;
    const origLength = base128();
    // glyf/loca: version 0 = đã biến đổi; bảng khác: version 0 = giữ nguyên.
    const transformed = tag === 'glyf' || tag === 'loca' ? version === 0 : version !== 0;
    entries.push({ tag, length: transformed ? base128() : origLength, transformed });
  }
  const data = brotliDecompressSync(buf.subarray(p, p + buf.readUInt32BE(20)));
  const tables = {};
  let offset = 0;
  for (const e of entries) {
    tables[e.tag] = { data: data.subarray(offset, offset + e.length), transformed: e.transformed };
    offset += e.length;
  }
  return tables;
}

/** Mã Unicode → glyph id theo subtable cmap format 4 hoặc 12 (Unicode BMP / full). */
function glyphLookup(cmap) {
  const count = cmap.readUInt16BE(2);
  const subtables = [];
  for (let i = 0; i < count; i++) {
    const platform = cmap.readUInt16BE(4 + i * 8);
    const encoding = cmap.readUInt16BE(6 + i * 8);
    const offset = cmap.readUInt32BE(8 + i * 8);
    const unicode = platform === 0 || (platform === 3 && (encoding === 1 || encoding === 10));
    if (unicode) subtables.push(offset);
  }
  for (const so of subtables) {
    const format = cmap.readUInt16BE(so);
    if (format === 4) {
      const segX2 = cmap.readUInt16BE(so + 6);
      const ends = so + 14;
      const starts = ends + segX2 + 2;
      const deltas = starts + segX2;
      const rangeOffsets = deltas + segX2;
      return (code) => {
        for (let s = 0; s < segX2 / 2; s++) {
          if (cmap.readUInt16BE(ends + s * 2) < code) continue;
          const start = cmap.readUInt16BE(starts + s * 2);
          if (start > code) return 0;
          const delta = cmap.readInt16BE(deltas + s * 2);
          const ro = cmap.readUInt16BE(rangeOffsets + s * 2);
          if (ro === 0) return (code + delta) & 0xffff;
          const glyph = cmap.readUInt16BE(rangeOffsets + s * 2 + ro + (code - start) * 2);
          return glyph === 0 ? 0 : (glyph + delta) & 0xffff;
        }
        return 0;
      };
    }
    if (format === 12) {
      const groups = cmap.readUInt32BE(so + 12);
      return (code) => {
        for (let g = 0; g < groups; g++) {
          const at = so + 16 + g * 12;
          const start = cmap.readUInt32BE(at);
          if (code >= start && code <= cmap.readUInt32BE(at + 4)) return cmap.readUInt32BE(at + 8) + code - start;
        }
        return 0;
      };
    }
  }
  throw new Error('cmap không có subtable Unicode format 4 hay 12');
}

/**
 * Độ rộng của 0–9 trong file font: { '0': 600, …, '9': 600 }; chữ số không có trong file thì vắng
 * (subset vietnamese không chứa chữ số). Ném lỗi khi file không phải woff/woff2 hay hmtx đã biến đổi.
 */
export function digitAdvances(path) {
  const buf = readFileSync(path);
  const signature = buf.readUInt32BE(0);
  let tables;
  if (signature === WOFF_SIGNATURE) tables = woffTables(buf);
  else if (signature === WOFF2_SIGNATURE) tables = woff2Tables(buf);
  else throw new Error(`${path}: không phải .woff hay .woff2`);
  for (const tag of ['cmap', 'hhea', 'hmtx']) {
    if (!tables[tag]) throw new Error(`${path}: thiếu bảng ${tag}`);
  }
  if (tables.hmtx.transformed) throw new Error(`${path}: hmtx đã biến đổi (WOFF2 §5.4) → kiểm bằng file .woff cùng tên`);
  const lookup = glyphLookup(tables.cmap.data);
  const numberOfHMetrics = tables.hhea.data.readUInt16BE(34);
  const hmtx = tables.hmtx.data;
  const widths = {};
  for (const digit of DIGITS) {
    const glyph = lookup(digit.charCodeAt(0));
    if (glyph === 0) continue;
    widths[digit] = hmtx.readUInt16BE(4 * Math.min(glyph, numberOfHMetrics - 1));
  }
  return widths;
}
