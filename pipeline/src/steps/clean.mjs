// Bước clean: data/raw/<run>/*.jsonl → data/stage/<run>/clean.jsonl (CONTRACT §1, §5).
import { join } from 'node:path';
import { buildAuthorSpelling } from '../lib/authors.mjs';
import { buildBook } from '../lib/book.mjs';
import { loadCategories, loadSeries } from '../lib/config.mjs';
import { exists, paths, RAW_SOURCES, readJsonl, writeStage } from '../lib/io.mjs';
import { annotate, compareBooks, compareRaw, mergeEntries, roundRobinLimit } from '../lib/merge.mjs';
import { loadValidator, schemaErrors } from '../lib/schema.mjs';

const RAW_SCHEMA = 'raw-record.schema.json';
const MAX_REPORTED_ERRORS = 10;

async function readRaw(ctx) {
  const validate = await loadValidator(ctx, RAW_SCHEMA);
  const records = [];
  const counts = {};
  const errors = [];
  for (const source of RAW_SOURCES) {
    const file = join(paths.rawDir(ctx), `${source}.jsonl`);
    if (!(await exists(file))) continue;
    const rows = await readJsonl(file);
    counts[source] = rows.length;
    rows.forEach((row, i) => {
      for (const err of schemaErrors(validate, row)) errors.push(`${source}.jsonl:${i + 1} ${err.message}`);
      records.push(row);
    });
  }
  return { records, counts, errors };
}

function capVolumes(groups, series) {
  const kept = [];
  const perSeries = new Map();
  let dropped = 0;
  for (const group of groups) {
    const { seriesKey } = group[0].raw;
    const max = series.byKey.get(seriesKey).maxVolumes ?? Number.POSITIVE_INFINITY;
    const count = perSeries.get(seriesKey) ?? 0;
    if (count >= max) {
      dropped += 1;
      continue;
    }
    perSeries.set(seriesKey, count + 1);
    kept.push(group);
  }
  return { kept, dropped };
}

export async function clean(ctx) {
  const series = await loadSeries(ctx);
  const categories = await loadCategories(ctx);
  const { records, counts, errors } = await readRaw(ctx);
  if (records.length === 0) throw new Error(`Không có bản ghi thô trong ${paths.rawDir(ctx)}: chạy crawl trước`);
  if (errors.length) {
    errors.slice(0, MAX_REPORTED_ERRORS).forEach((line) => ctx.log(`[clean] sai raw-record.schema: ${line}`));
    return { exitCode: 1, summary: { run: ctx.run, error: 'raw-schema', count: errors.length } };
  }

  const known = records.filter((raw) => series.byKey.has(raw.seriesKey));
  const seriesLevel = known.filter((raw) => raw.level === 'series').sort(compareRaw);
  const entries = known.filter((raw) => raw.level === 'volume').map(annotate);
  const ordered = mergeEntries(entries).sort((a, b) => compareBooks(series.index)(a[0], b[0]));
  const { kept, dropped } = capVolumes(ordered, series);

  const spellingBySeries = new Map();
  const knownPublishers = [...new Set(series.list.map((s) => s.publisher).filter(Boolean))];
  const seriesAuthorsOf = (key) => [
    ...(series.byKey.get(key).author ? [series.byKey.get(key).author] : []),
    ...seriesLevel.filter((raw) => raw.seriesKey === key).flatMap((raw) => raw.authors),
  ];
  const spellingOf = (key) => {
    if (!spellingBySeries.has(key)) {
      const others = entries.filter((e) => e.raw.seriesKey === key).sort((a, b) => compareRaw(a.raw, b.raw));
      spellingBySeries.set(key, buildAuthorSpelling(seriesAuthorsOf(key), others.flatMap((e) => e.raw.authors)));
    }
    return spellingBySeries.get(key);
  };

  const built = kept.map((group) => {
    const key = group[0].raw.seriesKey;
    const context = {
      series: series.byKey.get(key),
      seriesAuthors: seriesAuthorsOf(key),
      spelling: spellingOf(key),
      categories,
      knownPublishers,
    };
    return { ...buildBook(group, context), seriesKey: key };
  });
  const limited = roundRobinLimit(built, series.list.map((s) => s.key), ctx.limit);
  limited.forEach((item, i) => (item.book.id = i + 1));

  await writeStage(ctx, 'clean', limited.map((item) => item.book));
  await writeStage(ctx, 'imageSources', limited.map((item) => ({ bookId: item.book.id, source: item.imageSource })));

  const summary = {
    run: ctx.run,
    raw: counts,
    unknownSeries: records.length - known.length,
    books: limited.length,
    mergedGroups: kept.filter((group) => group.length > 1).length,
    invalidIsbn: entries.filter((entry) => entry.invalidIsbn).length,
    droppedOverMaxVolumes: dropped,
    droppedByLimit: built.length - limited.length,
  };
  ctx.log(`[clean] ${summary.books} Book từ ${entries.length} bản ghi tập (${summary.mergedGroups} nhóm gộp)`);
  return { exitCode: 0, summary };
}
