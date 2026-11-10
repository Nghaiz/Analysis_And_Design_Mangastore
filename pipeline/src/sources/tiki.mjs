// Nguồn Tiki: tìm qua /api/v2/products?q= (robots không cấm), chi tiết /api/v2/products/<id>.
// Mỗi tập chọn một sản phẩm: bỏ combo và hàng cũ, ưu tiên bản thường, Tiki Trading,
// rồi NXB khớp `publisher` của bộ (xem chi tiết tối đa MAX_DETAIL_TRIES sản phẩm).

import { HttpError } from '../fetch/errors.mjs';
import { foldText, isComboName, isUsedGoods, matchVolume, toHttps } from './text.mjs';

export const TIKI_ORIGIN = 'https://tiki.vn';
export const TIKI_PAGE_SIZE = 40;
export const TIKI_MAX_SEARCH_PAGES = 6;
const MAX_DETAIL_TRIES = 2;
const TIKI_TRADING_SELLER_ID = 1;
const EDITION_MARKERS = ['ban nang cap', 'dac biet', 'gioi han', 'bia gap', 'special', 'tang kem', 'ban mau'];
const GONE_STATUSES = [404, 410];
const PUBLISHER_CODES = ['manufacturer', 'publisher_vn', 'Organization_name'];

export function tikiSearchUrl(query, page = 1) {
  const base = `${TIKI_ORIGIN}/api/v2/products?limit=${TIKI_PAGE_SIZE}&q=${encodeURIComponent(query.normalize('NFC'))}`;
  return page > 1 ? `${base}&page=${page}` : base;
}

export const tikiDetailUrl = (id) => `${TIKI_ORIGIN}/api/v2/products/${id}`;

/** Ứng viên một trang tìm kiếm: `[{ id, name, volume, sellerId, sold }]` đã lọc. */
export function tikiCandidates(series, searchJson) {
  const out = [];
  for (const p of searchJson.data ?? []) {
    const name = String(p.name ?? '');
    if (!name || isComboName(name) || isUsedGoods(name)) continue;
    const volume = matchVolume(name, series.aliases);
    if (volume === null) continue;
    out.push({ id: p.id, name, volume, sellerId: p.seller_id ?? null, sold: p.quantity_sold?.value ?? 0 });
  }
  return out;
}

/** Tìm nhiều trang cho tới khi đủ `need` tập ngoài `exclude`; trả Map volume → ứng viên. */
export async function searchTiki(http, series, { need = Infinity, exclude = new Set(), maxPages = TIKI_MAX_SEARCH_PAGES } = {}) {
  const byVolume = new Map();
  if (!series.tikiQuery.trim()) return byVolume;
  for (let page = 1; page <= maxPages; page += 1) {
    const json = await http.getJson(tikiSearchUrl(series.tikiQuery, page));
    for (const c of tikiCandidates(series, json)) {
      if (!byVolume.has(c.volume)) byVolume.set(c.volume, []);
      byVolume.get(c.volume).push(c);
    }
    const useful = [...byVolume.keys()].filter((v) => !exclude.has(v)).length;
    const lastPage = json.paging?.last_page ?? page;
    if (useful >= need || page >= lastPage) break;
  }
  return byVolume;
}

function editionPenalty(series, name) {
  const folded = foldText(name);
  const aliases = series.aliases.map(foldText);
  return EDITION_MARKERS.some((m) => folded.includes(m) && !aliases.some((a) => a.includes(m))) ? 1 : 0;
}

/** Thứ tự ưu tiên ứng viên của một tập (ổn định: cuối cùng theo id). */
export function rankCandidates(series, candidates) {
  return [...candidates].sort((a, b) => editionPenalty(series, a.name) - editionPenalty(series, b.name)
    || Number(b.sellerId === TIKI_TRADING_SELLER_ID) - Number(a.sellerId === TIKI_TRADING_SELLER_ID)
    || b.sold - a.sold || a.id - b.id);
}

function attributes(detail) {
  return (detail.specifications ?? []).flatMap((group) => group.attributes ?? []);
}

/** NXB của sản phẩm: giá trị spec khớp NXB của bộ nếu có, ngược lại "Nhà xuất bản". */
export function tikiPublisher(series, detail) {
  const attrs = attributes(detail);
  const wanted = foldText(series.publisher);
  const values = PUBLISHER_CODES.map((code) => attrs.find((a) => a.code === code)?.value).filter(Boolean);
  return values.find((v) => foldText(v).includes(wanted)) ?? values[0] ?? null;
}

export const publisherMatches = (series, detail) => {
  const p = tikiPublisher(series, detail);
  return p !== null && foldText(p).includes(foldText(series.publisher));
};

/** Chi tiết sản phẩm; null khi sản phẩm đã gỡ (404/410). */
async function loadDetail(http, id, log) {
  try {
    return await http.getJson(tikiDetailUrl(id));
  } catch (err) {
    if (err instanceof HttpError && GONE_STATUSES.includes(err.status)) {
      log(`tiki: bỏ sản phẩm ${id} (${err.message})`);
      return null;
    }
    throw err;
  }
}

/** Chi tiết sản phẩm thắng của một tập, hoặc null nếu không ứng viên nào tải được. */
export async function pickTikiProduct(http, series, candidates, log = () => {}) {
  let fallback = null;
  for (const c of rankCandidates(series, candidates).slice(0, MAX_DETAIL_TRIES)) {
    const detail = await loadDetail(http, c.id, log);
    if (!detail) continue;
    if (isComboName(detail.name ?? '') || isUsedGoods(detail.name ?? '')) continue;
    if (publisherMatches(series, detail)) return detail;
    fallback ??= detail;
  }
  return fallback;
}

/** Bản ghi thô (raw-record.schema.json) từ chi tiết sản phẩm Tiki. */
export function tikiRecord(http, series, detail) {
  const attrs = attributes(detail);
  const attr = (code) => attrs.find((a) => a.code === code)?.value ?? null;
  const isbn = attrs.find((a) => /isbn/i.test(a.code ?? ''))?.value ?? null;
  const path = String(detail.url_path ?? `p${detail.id}.html`).split('?')[0];
  const crumbs = (detail.breadcrumbs ?? []).slice(0, -1).map((b) => String(b.name).trim()).filter(Boolean);
  return {
    source: 'tiki', level: 'volume', seriesKey: series.key, sourceId: String(detail.id),
    sourceUrl: `${TIKI_ORIGIN}/${path}`, fetchedAt: http.fetchedAt(tikiDetailUrl(detail.id)),
    name: String(detail.name).trim(),
    authors: (detail.authors ?? []).map((a) => String(a.name ?? '').trim()).filter(Boolean),
    publisher: tikiPublisher(series, detail),
    publishedAt: attr('publication_date'),
    pages: Number.parseInt(attr('number_of_page'), 10) || null,
    isbn: isbn ? String(isbn).trim() : null,
    categoryHints: crumbs,
    descriptionHtml: detail.description ? String(detail.description) : null,
    imageUrls: (detail.images ?? []).map((img) => toHttps(img.base_url)).filter(Boolean),
  };
}
