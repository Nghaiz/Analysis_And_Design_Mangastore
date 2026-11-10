// Bước validate: kiểm price.jsonl, ghi data/reports/<run>/validate.{md,json} và index.html (CONTRACT §7b).
import { join, relative } from 'node:path';
import {
  bookCountIssues,
  comboIssues,
  duplicateKeys,
  hasCover,
  imageIssues,
  missingFields,
  schemaIssues,
  warningIssues,
} from '../lib/checks.mjs';
import { loadCategories } from '../lib/config.mjs';
import { paths, readStage, writeText } from '../lib/io.mjs';
import { SOURCE_PRIORITY } from '../lib/merge.mjs';
import { renderHtml, renderMarkdown } from '../lib/report.mjs';
import { loadValidator } from '../lib/schema.mjs';

const CLEAN_SCHEMA = 'clean-record.schema.json';

/** Dựng báo cáo; không ghi file. */
export async function buildReport(ctx, books) {
  const categories = await loadCategories(ctx);
  const validateSchema = await loadValidator(ctx, CLEAN_SCHEMA);
  const imagesDir = paths.imagesDir(ctx);
  const blocking = [];
  const warnings = [];
  for (const book of books) {
    const missing = missingFields(book, categories);
    blocking.push(...missing, ...schemaIssues(book, validateSchema, missing), ...comboIssues(book));
    blocking.push(...(await imageIssues(book, imagesDir)));
    warnings.push(...warningIssues(book));
  }
  blocking.push(...duplicateKeys(books), ...bookCountIssues(ctx.run, books.length));
  const sourceWins = Object.fromEntries(SOURCE_PRIORITY.map((source) => [source, 0]));
  for (const book of books) sourceWins[book.source] = (sourceWins[book.source] ?? 0) + 1;
  return {
    run: ctx.run,
    books: books.length,
    copies: books.reduce((sum, book) => sum + (book.copies ?? 0), 0),
    blocking,
    warnings,
    missingCover: books.filter((book) => !hasCover(book)).map((book) => book.id),
    withCover: books.filter(hasCover).map((book) => book.id),
    sourceWins,
  };
}

export async function validate(ctx) {
  const books = await readStage(ctx, 'price');
  const report = await buildReport(ctx, books);
  const dir = paths.reportsDir(ctx);
  const imagesHref = relative(dir, paths.imagesDir(ctx)).split('\\').join('/');
  await writeText(join(dir, 'validate.json'), `${JSON.stringify(report, null, 2)}\n`);
  await writeText(join(dir, 'validate.md'), renderMarkdown(report));
  await writeText(join(dir, 'index.html'), renderHtml(report, books, imagesHref));
  ctx.log(
    `[validate] ${report.books} Book, ${report.blocking.length} lỗi chặn, ${report.warnings.length} cảnh báo; báo cáo ở ${dir}`,
  );
  return { exitCode: report.blocking.length ? 1 : 0, summary: report };
}
