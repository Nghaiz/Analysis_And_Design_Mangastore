// Gộp trùng (brainstorm §6): trước theo ISBN-13 đã kiểm checksum, rồi theo seriesKey|volume|variant.
// Nguồn thắng: Kim Đồng > Tiki > Wikidata; hoà thì sourceUrl nhỏ hơn.
import { toIsbn13 } from './isbn.mjs';
import { cleanTitle } from './name.mjs';
import { foldKey } from './text.mjs';
import { detectVariant, parseVolume, VARIANTS } from './title.mjs';

export const SOURCE_PRIORITY = Object.freeze(['kimdong', 'tiki', 'wikidata']);

export function compareRaw(a, b) {
  const bySource = SOURCE_PRIORITY.indexOf(a.source) - SOURCE_PRIORITY.indexOf(b.source);
  if (bySource !== 0) return bySource;
  return a.sourceUrl < b.sourceUrl ? -1 : a.sourceUrl > b.sourceUrl ? 1 : 0;
}

/** Khoá gộp thứ hai. Không có số tập thì dùng tên đã bỏ dấu thay chỗ số tập. */
export function mergeKey({ seriesKey, volume, variant, name }) {
  const middle = volume == null ? `~${foldKey(name)}` : String(volume);
  return `${seriesKey}|${middle}|${variant}`;
}

/** Thêm các trường suy ra từ bản ghi thô (không sửa bản ghi gốc); `name` là tên đã làm sạch; `series` từ series.json. */
export function annotate(raw, series = null) {
  const { name, year: nameYear } = cleanTitle(raw.name);
  const volume = parseVolume(name, series ? [series.name, ...(series.aliases ?? [])] : []);
  const variant = detectVariant(name);
  const isbn13 = toIsbn13(raw.isbn);
  const entry = { raw, name, nameYear, volume, variant, isbn13, invalidIsbn: raw.isbn != null && isbn13 == null };
  entry.key = mergeKey({ seriesKey: raw.seriesKey, volume, variant, name });
  return entry;
}

function groupBy(items, keyOf) {
  const groups = new Map();
  for (const item of items) {
    const key = keyOf(item);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  }
  return [...groups.values()];
}

function sortEntries(entries) {
  return [...entries].sort((a, b) => compareRaw(a.raw, b.raw));
}

/**
 * Trả mảng nhóm; mỗi nhóm là các entry đã sắp (phần tử đầu là nguồn thắng).
 * Bước 1 gom theo ISBN-13; bước 2 gom các nhóm theo khoá của nguồn thắng từng nhóm
 * (khoá của bản ghi thua không nối chuỗi, để một ISBN ghi nhầm không kéo hai tập vào nhau).
 */
export function mergeEntries(entries) {
  let unique = 0;
  const byIsbn = groupBy(entries, (entry) => entry.isbn13 ?? `#${(unique += 1)}`).map(sortEntries);
  return groupBy(byIsbn, (group) => group[0].key).map((groups) => sortEntries(groups.flat()));
}

/** Thứ tự gán id: thứ tự bộ, rồi tập (không số tập xếp cuối), rồi biến thể, rồi tên. */
export function compareBooks(seriesIndex) {
  return (a, b) => {
    const bySeries = seriesIndex.get(a.raw.seriesKey) - seriesIndex.get(b.raw.seriesKey);
    if (bySeries !== 0) return bySeries;
    const va = a.volume ?? Number.MAX_SAFE_INTEGER;
    const vb = b.volume ?? Number.MAX_SAFE_INTEGER;
    if (va !== vb) return va - vb;
    const byVariant = VARIANTS.indexOf(a.variant) - VARIANTS.indexOf(b.variant);
    if (byVariant !== 0) return byVariant;
    return a.key < b.key ? -1 : a.key > b.key ? 1 : 0;
  };
}

/**
 * --limit: lấy lần lượt từng bộ (vòng tròn theo thứ tự series.json) tới khi đủ n Book;
 * kết quả giữ thứ tự gốc của `books` để id vẫn theo bộ rồi tập.
 */
export function roundRobinLimit(books, seriesOrder, limit) {
  if (limit == null) return books;
  const queues = seriesOrder.map((key) => books.filter((book) => book.seriesKey === key));
  const picked = [];
  for (let round = 0; picked.length < limit && queues.some((q) => q.length > round); round += 1) {
    for (const queue of queues) {
      if (picked.length >= limit) break;
      if (queue[round]) picked.push(queue[round]);
    }
  }
  const chosen = new Set(picked);
  return books.filter((book) => chosen.has(book));
}
