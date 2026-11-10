// pipeline/manifest.jsonl (CONTRACT §8, contract.md §6): nguồn của từng Book và từng ảnh, không nội dung.

export const MANIFEST_KEYS = Object.freeze(['kind', 'bookId', 'source', 'sourceUrl', 'fetchedAt', 'winner', 'sha256']);
const KIND_ORDER = Object.freeze(['book', 'image']);

/** Dựng dòng theo đúng thứ tự khoá MANIFEST_KEYS. */
function line(values) {
  return Object.fromEntries(MANIFEST_KEYS.map((key) => [key, values[key] ?? null]));
}

/**
 * @param books bản ghi price.jsonl
 * @param imageSources Map bookId → nguồn của ảnh (data/stage/<run>/image-sources.jsonl)
 * @param fetchedAtOf (url) → string | null, từ cache HTTP của 4A
 */
export function buildManifest(books, imageSources, fetchedAtOf) {
  const rows = [];
  for (const book of books) {
    for (const from of book.mergedFrom) {
      rows.push(line({ kind: 'book', bookId: book.id, source: from.source, sourceUrl: from.sourceUrl, fetchedAt: from.fetchedAt, winner: book.source }));
    }
    const imageSource = imageSources.get(book.id) ?? book.source;
    for (const image of book.images) {
      if (image.sha256 == null) continue;
      rows.push(
        line({
          kind: 'image',
          bookId: book.id,
          source: imageSource,
          sourceUrl: image.sourceUrl,
          fetchedAt: fetchedAtOf(image.sourceUrl),
          winner: imageSource,
          sha256: image.sha256,
        }),
      );
    }
  }
  return rows.sort(
    (a, b) =>
      a.bookId - b.bookId ||
      KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind) ||
      (a.sourceUrl < b.sourceUrl ? -1 : a.sourceUrl > b.sourceUrl ? 1 : 0),
  );
}
