// Dựng một bản ghi Book (clean-record.schema.json) từ một nhóm bản ghi thô đã gộp.
import { AUTHOR_SEPARATOR, formatAuthors, splitAuthors } from './authors.mjs';
import { stripLeadingTitle } from './name.mjs';
import { normalizePublisher } from './publisher.mjs';
import { cleanLine, clip, foldKey, htmlToText, truncateAtSentence } from './text.mjs';
import { yearFromDate } from './title.mjs';

export const NAME_MAX = 255;
export const AUTHOR_MAX = 100;
export const PUBLISHER_MAX = 100;
export const CATEGORY_MAX = 50;
export const DESCRIPTION_MAX = 255;

/** Bỏ bớt tác giả cuối danh sách cho vừa cột; một tên dài quá thì cắt. */
function fitAuthors(joined, max) {
  const names = joined.split(AUTHOR_SEPARATOR).filter(Boolean);
  while (names.length > 1 && names.join(AUTHOR_SEPARATOR).length > max) names.pop();
  return clip(names.join(AUTHOR_SEPARATOR), max);
}

const firstOf = (items, pick) => {
  for (const item of items) {
    const value = pick(item);
    if (value != null && value !== '') return value;
  }
  return null;
};

function pickCategory(series, raws, categories) {
  if (series.category && categories.has(series.category)) return series.category;
  const byKey = new Map([...categories].map((name) => [foldKey(name), name]));
  return firstOf(raws.flatMap((raw) => raw.categoryHints ?? []), (hint) => byKey.get(foldKey(hint))) ?? '';
}

function pickImages(raws) {
  const owner = raws.find((raw) => (raw.imageUrls ?? []).length > 0);
  if (!owner) return { images: [], imageSource: null };
  const urls = [...new Set(owner.imageUrls)];
  const images = urls.map((sourceUrl, i) => ({
    kind: i === 0 ? 'cover' : 'extra',
    n: i,
    sourceUrl,
    sha256: null,
    widths: [],
  }));
  return { images, imageSource: owner.source };
}

/**
 * @param group entry đã sắp, phần tử đầu là nguồn thắng (lib/merge.mjs)
 * @param context { series, seriesAuthors, spelling, categories, knownPublishers }
 *   seriesAuthors: tác giả cấp bộ (series.json `author`, rồi Wikidata), dùng khi mọi nguồn để trống/chung chung
 */
export function buildBook(group, { series, seriesAuthors, spelling, categories, knownPublishers }) {
  const head = group[0];
  const winner = head.raw;
  const raws = group.map((entry) => entry.raw);
  const authorList = firstOf(raws, (raw) => (splitAuthors(raw.authors).length ? raw.authors : null)) ?? seriesAuthors;
  const titles = group.flatMap((entry) => [cleanLine(entry.raw.name), entry.name]);
  const description = firstOf(raws, (raw) => stripLeadingTitle(htmlToText(raw.descriptionHtml), titles));
  // publishYear là năm của ấn bản tiệm có (CONTRACT §9, #98): năm in trong tên sản phẩm ("Tái bản 2025",
  // "(2026)") nói đúng ấn bản đang bán nên thắng ngày của nguồn (Tiki hay để ngày mặc định của người bán);
  // xét từng bản ghi theo thứ tự gộp, nguồn thắng trước. Không nguồn nào có năm thì null, không bịa.
  const publishYear = firstOf(group, (entry) => entry.nameYear ?? yearFromDate(entry.raw.publishedAt));
  const publisher =
    firstOf(raws, (raw) => normalizePublisher(raw.publisher, knownPublishers)) ??
    normalizePublisher(series.publisher, knownPublishers) ??
    '';
  const { images, imageSource } = pickImages(raws);
  const book = {
    id: 0,
    name: clip(head.name, NAME_MAX),
    author: fitAuthors(formatAuthors(authorList, spelling), AUTHOR_MAX),
    publisher: clip(publisher, PUBLISHER_MAX),
    publishYear,
    category: clip(pickCategory(series, raws, categories), CATEGORY_MAX),
    description: truncateAtSentence(description, DESCRIPTION_MAX),
    rentalPrice: null,
    seriesKey: winner.seriesKey,
    volume: head.volume,
    variant: head.variant,
    isbn13: firstOf(group, (entry) => entry.isbn13),
    pages: firstOf(raws, (raw) => raw.pages),
    source: winner.source,
    sourceUrl: winner.sourceUrl,
    fetchedAt: winner.fetchedAt,
    mergedFrom: raws.map(({ source, sourceUrl, fetchedAt }) => ({ source, sourceUrl, fetchedAt })),
    images,
    copies: null,
  };
  return { book, key: head.key, imageSource };
}
