import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';
import { readJsonl } from '../src/lib/io.mjs';
import { images } from '../src/steps/images.mjs';
import { paddingCropBox } from '../src/lib/trim.mjs';
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

  it('bìa vuông có viền đệm trắng được cắt về đúng tỉ lệ 2:3; sha256 vẫn của ảnh gốc', async () => {
    const inner = await sharp({ create: { width: 600, height: 900, channels: 3, background: { r: 200, g: 30, b: 30 } } }).png().toBuffer();
    const padded = await sharp({ create: { width: 900, height: 900, channels: 3, background: '#ffffff' } })
      .composite([{ input: inner, left: 150, top: 0 }])
      .jpeg()
      .toBuffer();
    const box = await paddingCropBox(padded);
    expect(box.width / box.height).toBeCloseTo(2 / 3, 1);
    const ctx = await makeCtx();
    await runSteps(ctx, 'clean');
    ctx.http.getBuffer = async () => padded;
    await images(ctx);
    const meta = await sharp(join(imageDir(ctx, 1), 'cover-320.webp')).metadata();
    expect([meta.width, meta.height]).toEqual([320, 480]);
    const extra = await sharp(join(imageDir(ctx, 1), 'extra-1-320.webp')).metadata();
    expect([extra.width, extra.height]).toEqual([320, 320]);
    const [book] = await readJsonl(join(ctx.dataDir, 'stage', ctx.run, 'images.jsonl'));
    expect(book.images[0].sha256).toBe(createHash('sha256').update(padded).digest('hex'));
  });

  it('bìa nền trắng không viền đệm thì không bị cắt', async () => {
    const block = await sharp({ create: { width: 200, height: 200, channels: 3, background: { r: 20, g: 60, b: 200 } } }).png().toBuffer();
    const whiteCover = await sharp({ create: { width: 400, height: 600, channels: 3, background: '#ffffff' } })
      .composite([{ input: block, left: 100, top: 200 }])
      .png()
      .toBuffer();
    expect(await paddingCropBox(whiteCover)).toBeNull();
    const smallContent = await sharp({ create: { width: 900, height: 900, channels: 3, background: '#ffffff' } })
      .composite([{ input: block, left: 350, top: 350 }])
      .png()
      .toBuffer();
    expect(await paddingCropBox(smallContent)).toBeNull();
    const ctx = await makeCtx();
    await runSteps(ctx, 'clean');
    ctx.http.getBuffer = async () => whiteCover;
    await images(ctx);
    const meta = await sharp(join(imageDir(ctx, 1), 'cover-320.webp')).metadata();
    expect([meta.width, meta.height]).toEqual([320, 480]);
  });

  describe('chọn bìa có màu', () => {
    const solid = (background) => sharp({ create: { width: 400, height: 600, channels: 3, background } }).png().toBuffer();
    const COVER_URL = 'https://bizweb.dktcdn.net/conan-1-cover.jpg';
    const BACK_URL = 'https://bizweb.dktcdn.net/conan-1-back.jpg';

    async function runWith(cover, back) {
      const ctx = await makeCtx();
      await runSteps(ctx, 'clean');
      const buffers = { [COVER_URL]: cover, [BACK_URL]: back };
      ctx.http.getBuffer = async (url) => buffers[url];
      const result = await images(ctx);
      const [book] = await readJsonl(join(ctx.dataDir, 'stage', ctx.run, 'images.jsonl'));
      return { ctx, result, book };
    }
    const sha = (buffer) => createHash('sha256').update(buffer).digest('hex');

    it('bìa xám + ảnh màu → ảnh màu làm bìa, bìa cũ thành ảnh phụ; sha256 theo ảnh sau khi đổi', async () => {
      const grey = await solid({ r: 90, g: 92, b: 90 });
      const red = await solid({ r: 200, g: 30, b: 30 });
      const { ctx, result, book } = await runWith(grey, red);
      expect(book.images.map((i) => [i.kind, i.n, i.sourceUrl, i.sha256])).toEqual([
        ['cover', 0, BACK_URL, sha(red)],
        ['extra', 1, COVER_URL, sha(grey)],
      ]);
      expect(result.summary.coverSwapped).toBe(1);
      const { channels } = await sharp(join(imageDir(ctx, 1), 'cover-160.webp')).stats();
      expect(channels[0].mean).toBeGreaterThan(channels[1].mean + 100);
      const results = await runSteps(ctx, 'export');
      expect(results.export.exitCode).toBe(0);
      const manifest = await readJsonl(join(ctx.dataDir, 'export', ctx.run, 'manifest.jsonl'));
      const imageRows = manifest.filter((r) => r.bookId === 1 && r.kind === 'image');
      expect(imageRows.map((r) => [r.sourceUrl, r.sha256])).toEqual([
        [BACK_URL, sha(red)],
        [COVER_URL, sha(grey)],
      ]);
    });

    it('bìa có màu → giữ nguyên thứ tự', async () => {
      const blue = await solid({ r: 30, g: 60, b: 200 });
      const red = await solid({ r: 200, g: 30, b: 30 });
      const { book, result } = await runWith(blue, red);
      expect(book.images.map((i) => [i.kind, i.sourceUrl])).toEqual([['cover', COVER_URL], ['extra', BACK_URL]]);
      expect(result.summary.coverSwapped).toBe(0);
    });

    it('mọi ảnh đều xám → giữ nguyên thứ tự', async () => {
      const { book } = await runWith(await solid({ r: 90, g: 90, b: 90 }), await solid({ r: 240, g: 240, b: 238 }));
      expect(book.images.map((i) => [i.kind, i.sourceUrl])).toEqual([['cover', COVER_URL], ['extra', BACK_URL]]);
    });
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
