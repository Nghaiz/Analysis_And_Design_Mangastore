// Nguồn Wikidata, cấp bộ (level = series), một request mỗi bộ có wikidataId.
// query.wikidata.org/robots.txt cấm /sparql với "User-agent: *", nên đọc
// Special:EntityData/<QID>.json (robots của www.wikidata.org cho phép "Special:EntityData/*.").

import { createHash } from 'node:crypto';

export const WIKIDATA_ORIGIN = 'https://www.wikidata.org';
const COMMONS_UPLOAD = 'https://upload.wikimedia.org/wikipedia/commons';
const PRECISION_YEAR = 9;
const PRECISION_DAY = 11;
const DATE_PROPS = ['P577', 'P571']; // ngày công bố, ngày ra đời
const IMAGE_PROP = 'P18';

export const entityDataUrl = (qid) => `${WIKIDATA_ORIGIN}/wiki/Special:EntityData/${qid}.json`;

/** "+1969-12-01T00:00:00Z" → "1969-12-01" (độ chính xác ngày) hoặc "1969" (năm). */
function formatTime({ time, precision }) {
  const m = String(time).match(/^[+-]?(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  if (precision >= PRECISION_DAY) return `${m[1]}-${m[2]}-${m[3]}`;
  return precision >= PRECISION_YEAR ? m[1] : null;
}

function firstValue(entity, prop) {
  const claim = (entity.claims?.[prop] ?? []).find((c) => c.mainsnak?.datavalue);
  return claim ? claim.mainsnak.datavalue.value : null;
}

/** URL tệp gốc trên Commons từ tên tệp P18 (đường dẫn theo md5 của tên). */
export function commonsFileUrl(fileName) {
  const name = fileName.replace(/ /g, '_');
  const md5 = createHash('md5').update(name).digest('hex');
  return `${COMMONS_UPLOAD}/${md5[0]}/${md5.slice(0, 2)}/${encodeURIComponent(name)}`;
}

export async function wikidataRecord(http, series) {
  const qid = series.wikidataId;
  const json = await http.getJson(entityDataUrl(qid));
  const entity = json.entities?.[qid] ?? Object.values(json.entities ?? {})[0];
  if (!entity) throw new Error(`wikidata: ${entityDataUrl(qid)} không có thực thể ${qid}`);
  const name = entity.labels?.vi?.value ?? entity.sitelinks?.viwiki?.title ?? entity.labels?.en?.value ?? series.name;
  const time = DATE_PROPS.map((p) => firstValue(entity, p)).find(Boolean);
  const image = firstValue(entity, IMAGE_PROP);
  return {
    source: 'wikidata', level: 'series', seriesKey: series.key, sourceId: entity.id ?? qid,
    sourceUrl: `${WIKIDATA_ORIGIN}/wiki/${entity.id ?? qid}`, fetchedAt: http.fetchedAt(entityDataUrl(qid)),
    name: String(name).trim(),
    authors: [], // P50 chỉ có QID; tra nhãn tốn thêm request mỗi tác giả
    publisher: null,
    publishedAt: time ? formatTime(time) : null,
    pages: null,
    isbn: null,
    categoryHints: [],
    descriptionHtml: entity.descriptions?.vi?.value ?? null,
    imageUrls: typeof image === 'string' ? [commonsFileUrl(image)] : [],
  };
}
