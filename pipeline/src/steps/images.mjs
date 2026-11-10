// Bước images: clean.jsonl → images.jsonl, ảnh vào data/images/<run>/<bookId>/ (contract.md §6).
import { mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { exists, paths, readJsonl, readStage, writeStage } from '../lib/io.mjs';
import { outputNames, renderImage, sha256Hex, WIDTHS } from '../lib/render.mjs';

const OFFLINE_ERROR = 'OfflineError';

async function previousImages(ctx) {
  const file = paths.stageFile(ctx, 'images');
  if (!(await exists(file))) return new Map();
  return new Map((await readJsonl(file)).map((book) => [book.id, book.images]));
}

const signature = (images) => JSON.stringify(images.map((img) => [img.kind, img.n, img.sourceUrl, img.sha256]));

async function allFilesExist(dir, images) {
  for (const image of images) {
    if (image.sha256 == null || image.widths.length === 0) continue;
    for (const name of outputNames(image)) if (!(await exists(join(dir, name)))) return false;
  }
  return true;
}

async function download(ctx, url, failures, bookId) {
  try {
    return await ctx.http.getBuffer(url);
  } catch (err) {
    if (err?.name === OFFLINE_ERROR) throw err;
    failures.push({ bookId, url, reason: `tải lỗi: ${err.message}` });
    ctx.log(`[images] Book ${bookId}: không tải được ${url} (${err.message})`);
    return null;
  }
}

async function processBook(ctx, book, previous, counters) {
  const dir = join(paths.imagesDir(ctx), String(book.id));
  const fetched = [];
  for (const image of book.images) {
    const buffer = await download(ctx, image.sourceUrl, counters.failures, book.id);
    fetched.push({ image: { ...image, sha256: buffer ? sha256Hex(buffer) : null, widths: [] }, buffer });
  }
  const before = previous.get(book.id);
  if (before && signature(before) === signature(fetched.map((f) => f.image)) && (await allFilesExist(dir, before))) {
    counters.reused += 1;
    return { ...book, images: before };
  }
  await rm(dir, { recursive: true, force: true });
  const images = [];
  for (const { image, buffer } of fetched) {
    if (!buffer) {
      images.push(image);
      continue;
    }
    try {
      const outputs = await renderImage(buffer, image);
      await mkdir(dir, { recursive: true });
      for (const { name, data } of outputs) await writeFile(join(dir, name), data);
      images.push({ ...image, widths: [...WIDTHS] });
      counters.rendered += 1;
    } catch (err) {
      // Giữ sha256 để validate báo image-decode (CONTRACT §7b).
      counters.failures.push({ bookId: book.id, url: image.sourceUrl, reason: `giải mã lỗi: ${err.message}` });
      ctx.log(`[images] Book ${book.id}: ảnh hỏng ${image.sourceUrl} (${err.message})`);
      images.push(image);
    }
  }
  return { ...book, images };
}

async function removeStaleDirs(ctx, ids) {
  const root = paths.imagesDir(ctx);
  if (!(await exists(root))) return;
  for (const name of await readdir(root)) {
    if (!ids.has(name)) await rm(join(root, name), { recursive: true, force: true });
  }
}

export async function images(ctx) {
  const books = await readStage(ctx, 'clean');
  const previous = await previousImages(ctx);
  const counters = { rendered: 0, reused: 0, failures: [] };
  const out = [];
  for (const book of books) out.push(await processBook(ctx, book, previous, counters));
  await removeStaleDirs(ctx, new Set(books.map((book) => String(book.id))));
  await writeStage(ctx, 'images', out);
  const summary = {
    run: ctx.run,
    books: out.length,
    rendered: counters.rendered,
    reusedBooks: counters.reused,
    withCover: out.filter((b) => b.images[0]?.widths.length > 0).length,
    failures: counters.failures,
  };
  ctx.log(`[images] ${summary.rendered} ảnh mới, ${summary.reusedBooks} Book dùng lại, ${summary.failures.length} lỗi`);
  return { exitCode: 0, summary };
}
