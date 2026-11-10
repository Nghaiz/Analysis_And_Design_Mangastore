import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';
import { readJsonl } from '../src/lib/io.mjs';
import { images } from '../src/steps/images.mjs';
import { addRaw, makeCtx, rawTemplate, runSteps } from './fixtures/records/harness.mjs';

const imageDir = (ctx, id) => join(ctx.dataDir, 'images', ctx.run, String(id));

describe('images', () => {
  it('sinh WebP 160/320/640 và AVIF cho bìa, ảnh phụ chỉ WebP, sha256 của ảnh gốc', async () => {
    const ctx = await makeCtx();
    const { images: result } = await runSteps(ctx, 'images');
    expect(result.exitCode).toBe(0);
    const files = (await readdir(imageDir(ctx, 1))).sort();
    expect(files).toEqual(
      ['cover-160.avif', 'cover-160.webp', 'cover-320.avif', 'cover-320.webp', 'cover-640.avif', 'cover-640.webp',
        'extra-1-160.webp', 'extra-1-320.webp', 'extra-1-640.webp'].sort(),
    );
    const meta = await sharp(join(imageDir(ctx, 1), 'cover-320.webp')).metadata();
    expect([meta.format, meta.width, meta.height]).toEqual(['webp', 320, 480]);
    expect((await sharp(join(imageDir(ctx, 1), 'cover-640.avif')).metadata()).format).toBe('heif');
    const [book] = await readJsonl(join(ctx.dataDir, 'stage', ctx.run, 'images.jsonl'));
    const original = await ctx.http.getBuffer(book.images[0].sourceUrl);
    expect(book.images[0].sha256).toBe(createHash('sha256').update(original).digest('hex'));
    expect(book.images[0].widths).toEqual([160, 320, 640]);
  });

  it('không phóng to ảnh nhỏ, giữ tỉ lệ', async () => {
    const ctx = await makeCtx();
    await runSteps(ctx, 'images');
    const meta = await sharp(join(imageDir(ctx, 4), 'cover-640.webp')).metadata();
    expect([meta.width, meta.height]).toEqual([100, 150]);
  });

  it('chạy lại dùng lại ảnh đã sinh khi ảnh gốc không đổi', async () => {
    const ctx = await makeCtx();
    await runSteps(ctx, 'images');
    const again = await images(ctx);
    expect(again.summary.rendered).toBe(0);
    expect(again.summary.reusedBooks).toBe(6);
  });

  it('ảnh hỏng thì ghi nhận (sha256 có, widths rỗng), ảnh tải lỗi thì sha256 null', async () => {
    const ctx = await makeCtx();
    await addRaw(ctx, rawTemplate({ name: 'Thám tử lừng danh Conan - Tập 9', imageUrls: ['https://x.test/broken.jpg', 'https://x.test/missing.jpg'] }));
    const { images: result } = await runSteps(ctx, 'images');
    const books = await readJsonl(join(ctx.dataDir, 'stage', ctx.run, 'images.jsonl'));
    const book = books.find((b) => b.volume === 9);
    expect(book.images[0].sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(book.images[0].widths).toEqual([]);
    expect(book.images[1].sha256).toBeNull();
    expect(result.summary.failures.map((f) => f.reason.split(':')[0]).sort()).toEqual(['giải mã lỗi', 'tải lỗi']);
  });

  it('OfflineError không bị nuốt', async () => {
    const ctx = await makeCtx();
    await runSteps(ctx, 'clean');
    const offline = Object.assign(new Error('thiếu cache'), { name: 'OfflineError' });
    ctx.http.getBuffer = async () => {
      throw offline;
    };
    await expect(images(ctx)).rejects.toBe(offline);
  });
});
