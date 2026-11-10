// Đọc/ghi tệp của pipeline: đường dẫn theo CONTRACT §1, JSONL tất định (LF, sắp sẵn).
import { mkdir, readFile, writeFile, readdir, stat } from 'node:fs/promises';
import { dirname, join } from 'node:path';

export const STAGE_FILES = Object.freeze({
  clean: 'clean.jsonl',
  images: 'images.jsonl',
  copies: 'copies.jsonl',
  price: 'price.jsonl',
  imageSources: 'image-sources.jsonl',
});

export const RAW_SOURCES = Object.freeze(['kimdong', 'tiki', 'wikidata']);

export const paths = {
  rawDir: (ctx) => join(ctx.dataDir, 'raw', ctx.run),
  stageFile: (ctx, key) => join(ctx.dataDir, 'stage', ctx.run, STAGE_FILES[key]),
  imagesDir: (ctx, run = ctx.run) => join(ctx.dataDir, 'images', run),
  reportsDir: (ctx) => join(ctx.dataDir, 'reports', ctx.run),
  exportDir: (ctx) => (ctx.run === 'full' ? join(ctx.dataDir, 'export') : join(ctx.dataDir, 'export', ctx.run)),
  manifest: (ctx) => join(ctx.pipelineDir, 'manifest.jsonl'),
  seriesConfig: (ctx) => join(ctx.pipelineDir, 'config', 'series.json'),
  categoriesConfig: (ctx) => join(ctx.pipelineDir, 'config', 'categories.json'),
  schema: (ctx, name) => join(ctx.pipelineDir, 'schema', name),
};

export async function exists(file) {
  try {
    await stat(file);
    return true;
  } catch (err) {
    if (err.code === 'ENOENT') return false;
    throw err;
  }
}

export async function readJson(file) {
  return JSON.parse(await readFile(file, 'utf8'));
}

export async function readJsonl(file) {
  const text = await readFile(file, 'utf8');
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, i) => {
      try {
        return JSON.parse(line);
      } catch (err) {
        throw new Error(`${file}:${i + 1}: JSON hỏng (${err.message})`);
      }
    });
}

/** Đọc tệp của bước trước; thiếu thì ném lỗi nêu bước cần chạy. */
export async function readStage(ctx, key) {
  const file = paths.stageFile(ctx, key);
  if (!(await exists(file))) {
    throw new Error(`Thiếu ${file}: chạy bước "${key}" của lần chạy "${ctx.run}" trước`);
  }
  return readJsonl(file);
}

export function toJsonl(rows) {
  return rows.map((row) => JSON.stringify(row)).join('\n') + (rows.length ? '\n' : '');
}

export async function writeText(file, text) {
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, text, 'utf8');
}

export async function writeStage(ctx, key, rows) {
  await writeText(paths.stageFile(ctx, key), toJsonl(rows));
}

export async function listFiles(dir) {
  if (!(await exists(dir))) return [];
  return (await readdir(dir)).sort();
}
