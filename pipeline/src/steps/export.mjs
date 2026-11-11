// Bước export: price.jsonl → V10__catalog_data.sql, V11__sample_bills.sql, manifest.jsonl (CONTRACT §6, §8).
// Tất định: cùng đầu vào cho cùng mã băm. --dry-run chỉ in việc sẽ làm ra stderr.
import { join } from 'node:path';
import { exists, paths, readJson, readStage, toJsonl, writeText } from '../lib/io.mjs';
import { buildManifest } from '../lib/manifest.mjs';
import { sha256Hex } from '../lib/render.mjs';
import { copyRows, renderV10 } from '../lib/sql.mjs';
import { renderV11 } from '../lib/v11.mjs';

export const V10_FILE = 'V10__catalog_data.sql';
export const V11_FILE = 'V11__sample_bills.sql';
const TRIAL_MANIFEST = 'manifest.jsonl';

/** Export chỉ chạy khi validate của cùng lần chạy đã sạch và khớp số Book. */
async function checkValidated(ctx, books) {
  const file = join(paths.reportsDir(ctx), 'validate.json');
  if (!(await exists(file))) return `chưa có ${file}: chạy validate trước`;
  const report = await readJson(file);
  if (report.blocking.length) return `validate còn ${report.blocking.length} lỗi chặn (${file})`;
  if (report.books !== books.length) return `validate.json (${report.books} Book) cũ hơn price.jsonl (${books.length} Book): chạy lại validate`;
  return null;
}

/** Nội dung các file xuất (không ghi). */
export async function buildExport(ctx, books) {
  const sourcesFile = paths.stageFile(ctx, 'imageSources');
  const sources = (await exists(sourcesFile)) ? await readStage(ctx, 'imageSources') : [];
  const imageSources = new Map(sources.map((row) => [row.bookId, row.source]));
  const fetchedAtOf = (url) => ctx.http?.fetchedAt?.(url) ?? null;
  const exportDir = paths.exportDir(ctx);
  const { sql: v11, heldBookIds } = renderV11(books);
  const files = [
    { path: join(exportDir, V10_FILE), text: renderV10(books) },
    { path: join(exportDir, V11_FILE), text: v11 },
    {
      path: ctx.run === 'full' ? paths.manifest(ctx) : join(exportDir, TRIAL_MANIFEST),
      text: toJsonl(buildManifest(books, imageSources, fetchedAtOf)),
    },
  ];
  return { files: files.map((f) => ({ ...f, sha256: sha256Hex(f.text) })), heldBookIds, copies: copyRows(books).length };
}

export async function exportStep(ctx) {
  const books = await readStage(ctx, 'price');
  const problem = await checkValidated(ctx, books);
  if (problem) {
    ctx.log(`[export] dừng: ${problem}`);
    return { exitCode: 1, summary: { run: ctx.run, error: problem } };
  }
  const { files, heldBookIds, copies } = await buildExport(ctx, books);
  for (const file of files) {
    if (ctx.dryRun) ctx.log(`[export] (dry-run) sẽ ghi ${file.path} sha256=${file.sha256}`);
    else await writeText(file.path, file.text);
  }
  if (!ctx.dryRun) ctx.log(`[export] đã ghi ${files.length} file vào ${paths.exportDir(ctx)}`);
  return {
    exitCode: 0,
    summary: {
      run: ctx.run,
      dryRun: Boolean(ctx.dryRun),
      books: books.length,
      copies,
      heldBookIds,
      files: files.map(({ path, sha256 }) => ({ path, sha256 })),
    },
  };
}
