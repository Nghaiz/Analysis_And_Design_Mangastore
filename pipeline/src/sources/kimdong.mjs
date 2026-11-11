// Nguồn NXB Kim Đồng (Sapo): liệt kê qua sitemap (robots cấm /search), mỗi sản phẩm
// đọc /products/<alias>.json. Sản phẩm "(Tập lẻ)" có nhiều biến thể, mỗi biến thể một tập.

import { XMLParser } from 'fast-xml-parser';
import { HttpError } from '../fetch/errors.mjs';
import { decodeEntities, foldText, htmlToText, isComboName, matchVolume, toHttps } from './text.mjs';

export const KIMDONG_ORIGIN = 'https://nxbkimdong.com.vn';
export const KIMDONG_PUBLISHER = 'Kim Đồng';
const SITEMAP_INDEX = `${KIMDONG_ORIGIN}/sitemap.xml`;
const PRODUCT_SITEMAP = /\/sitemap_products_\d+\.xml$/;
const HTTP_NOT_FOUND = 404;
const HTTP_GONE = 410;
const YEAR = /^(19|20)\d{2}$/;
const VARIANT_VOLUME = /^tập\s*0*(\d+)/iu;
const VARIANT_YEAR = /\((\d{4})\)/;
const MIN_VOLUME_VARIANTS = 2;

const asArray = (v) => (v === undefined ? [] : [].concat(v));
const xml = new XMLParser({ ignoreAttributes: true, parseTagValue: false });

export const productJsonUrl = (alias) => `${KIMDONG_ORIGIN}/products/${alias}.json`;

/** Mọi sản phẩm trong sitemap: `{ alias, title }` (title lấy từ image:title, có thể rỗng). */
export async function listSitemapProducts(http) {
  const index = xml.parse(await http.getText(SITEMAP_INDEX));
  const maps = asArray(index.sitemapindex?.sitemap).map((s) => s.loc).filter((loc) => PRODUCT_SITEMAP.test(loc));
  if (!maps.length) throw new Error(`${SITEMAP_INDEX}: không thấy sitemap_products_*.xml`);
  const products = [];
  for (const loc of maps) {
    const doc = xml.parse(await http.getText(loc));
    for (const url of asArray(doc.urlset?.url)) {
      const alias = new URL(url.loc).pathname.replace(/^\/+/, '');
      if (!alias) continue;
      const title = asArray(url['image:image'])[0]?.['image:title'] ?? '';
      products.push({ alias, title: decodeEntities(String(title)) });
    }
  }
  return products;
}

/** Phần alias sau tiền tố: "<số>[-...]" là số tập; "" hoặc "-<số>" (hậu tố trùng tên của Sapo) cần đọc JSON. */
const ALIAS_VOLUME = /^(\d+)(?:-|$)/;
const ALIAS_DEDUP_SUFFIX = /^(?:-\d+)?$/;

/**
 * Sản phẩm khớp tiền tố của bộ, bỏ combo. Đuôi khác (ví dụ "tap-le-bluelock-episode-nagi"
 * với tiền tố "tap-le-bluelock") là bộ khác nên bị bỏ.
 */
export function kimdongCandidates(series, products) {
  const found = [];
  for (const { alias, title } of products) {
    const prefix = series.kimdongSlugPrefixes.find((p) => alias.startsWith(p));
    if (!prefix || isComboName(alias.replace(/-/g, ' ')) || (title && isComboName(title))) continue;
    const rest = alias.slice(prefix.length);
    const m = rest.match(ALIAS_VOLUME);
    if (!m && !ALIAS_DEDUP_SUFFIX.test(rest)) continue;
    found.push({ alias, title, volume: m ? Number(m[1]) : null });
  }
  return found.sort((a, b) => (a.volume ?? Infinity) - (b.volume ?? Infinity)
    || a.alias.length - b.alias.length || a.alias.localeCompare(b.alias));
}

async function loadProduct(http, alias, log) {
  try {
    return await http.getJson(productJsonUrl(alias));
  } catch (err) {
    if (err instanceof HttpError && [HTTP_NOT_FOUND, HTTP_GONE].includes(err.status)) {
      log(`kimdong: bỏ ${alias} (${err.message})`);
      return null;
    }
    throw err;
  }
}

/** Biến thể theo tập, mỗi tập một biến thể (bản in năm mới nhất thắng). */
function volumeVariants(product) {
  const byVolume = new Map();
  for (const v of product.variants ?? []) {
    const m = String(v.title ?? '').match(VARIANT_VOLUME);
    if (!m) continue;
    const volume = Number(m[1]);
    const year = Number(String(v.title).match(VARIANT_YEAR)?.[1] ?? 0);
    const prev = byVolume.get(volume);
    if (!prev || year > prev.year) byVolume.set(volume, { volume, year, variant: v });
  }
  return byVolume.size >= MIN_VOLUME_VARIANTS ? [...byVolume.values()] : [];
}

/**
 * Kế hoạch tập của bộ: `[{ volume, alias, variantId? }]` tăng dần, mỗi tập một mục.
 * Sản phẩm có số tập trong alias thắng biến thể của sản phẩm "(Tập lẻ)" (có ISBN).
 */
export async function planKimdong(http, series, products, log = () => {}) {
  const plan = new Map();
  const candidates = kimdongCandidates(series, products);
  for (const c of candidates) {
    if (c.volume !== null && !plan.has(c.volume)) plan.set(c.volume, { volume: c.volume, alias: c.alias });
  }
  for (const c of candidates.filter((x) => x.volume === null)) {
    const product = await loadProduct(http, c.alias, log);
    if (!product || isComboName(product.name)) continue;
    const variants = volumeVariants(product);
    for (const { volume, variant } of variants) {
      if (!plan.has(volume)) plan.set(volume, { volume, alias: c.alias, variantId: variant.id });
    }
    const volume = variants.length ? null : matchVolume(product.name, series.aliases);
    if (volume !== null && !plan.has(volume)) plan.set(volume, { volume, alias: c.alias });
  }
  return [...plan.values()].sort((a, b) => a.volume - b.volume);
}

/**
 * Các dòng "<li>Nhãn: giá trị</li>" của content: `{ text, html }` theo nhãn đã gấp chữ.
 * `html` là phần sau dấu ":" đầu tiên, giữ thẻ để tách nhiều người (mỗi người một <a>, cách bằng <br>).
 */
function specFields(content) {
  const fields = {};
  for (const li of content.split(/<li\b[^>]*>/i).slice(1)) {
    const html = li.split(/<hr\b/i)[0].replace(/<\/li>[\s\S]*$/i, '');
    const m = htmlToText(html).match(/^([^:]{1,40}):\s*(.*)$/);
    if (!m) continue;
    const colon = html.indexOf(':');
    fields[foldText(m[1])] = { text: m[2].trim(), html: colon >= 0 ? html.slice(colon + 1) : '' };
  }
  return fields;
}

const specText = (spec, key) => spec[key]?.text || null;

/** Ranh giới giữa hai người: <br>, mở/đóng <a>; rồi dấu phẩy, chấm phẩy, "&", " và ". */
const PERSON_BREAK = /<br\s*\/?>|<\/?a\b[^>]*>/gi;
const PERSON_SEPARATOR = /\s*(?:\||[,;]|\s&\s|\svà\s)\s*/u;

/** Danh sách người của một trường (tác giả), giữ thứ tự, bỏ trùng. */
export function splitPeople(field) {
  if (!field?.html) return [];
  const text = htmlToText(field.html.replace(PERSON_BREAK, ' | '));
  return [...new Set(text.split(PERSON_SEPARATOR).map((s) => s.trim()).filter(Boolean))];
}

function descriptionOf(content) {
  const hr = content.match(/<hr\b[^>]*>/i);
  if (!hr) return null;
  const html = content.slice(hr.index + hr[0].length).trim();
  return htmlToText(html) ? html : null;
}

/** Bản ghi thô (raw-record.schema.json) của một mục kế hoạch; null nếu không lấy được. */
export async function kimdongRecord(http, series, entry, log = () => {}) {
  const product = await loadProduct(http, entry.alias, log);
  if (!product) return null;
  const content = product.content ?? '';
  const spec = specFields(content);
  const tagYear = (product.tags ?? []).map(String).find((t) => YEAR.test(t)) ?? null;
  const base = {
    source: 'kimdong', level: 'volume', seriesKey: series.key,
    fetchedAt: http.fetchedAt(productJsonUrl(entry.alias)),
    authors: splitPeople(spec['tac gia']), publisher: KIMDONG_PUBLISHER,
    pages: Number.parseInt(specText(spec, 'so trang'), 10) || null,
    categoryHints: [product.product_type, specText(spec, 'doi tuong')].filter(Boolean).map((s) => String(s).trim()),
    descriptionHtml: descriptionOf(content),
  };
  if (entry.variantId === undefined) {
    if (isComboName(product.name)) return null;
    return {
      ...base, sourceId: entry.alias, sourceUrl: `${KIMDONG_ORIGIN}/${entry.alias}`,
      name: product.name.trim(), publishedAt: specText(spec, 'nam xuat ban') ?? tagYear,
      isbn: specText(spec, 'isbn'), imageUrls: (product.images ?? []).map(toHttps).filter(Boolean),
    };
  }
  const variant = (product.variants ?? []).find((v) => v.id === entry.variantId);
  if (!variant) throw new Error(`kimdong: ${entry.alias} không còn biến thể ${entry.variantId}`);
  const baseName = product.name.replace(/^\(\s*tập lẻ\s*\)\s*/iu, '').trim();
  const cover = toHttps(variant.featured_image?.src);
  return {
    ...base, sourceId: `${entry.alias}?variant=${variant.id}`,
    sourceUrl: `${KIMDONG_ORIGIN}/${entry.alias}?variant=${variant.id}`,
    name: `${baseName} - ${String(variant.title).trim()}`,
    publishedAt: String(variant.title).match(VARIANT_YEAR)?.[1] ?? tagYear,
    isbn: specText(spec, 'isbn'), imageUrls: cover ? [cover] : [],
  };
}
