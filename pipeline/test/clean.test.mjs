import { describe, expect, it } from 'vitest';
import { join } from 'node:path';
import { readFile } from 'node:fs/promises';
import { clean } from '../src/steps/clean.mjs';
import { readJsonl } from '../src/lib/io.mjs';
import { htmlToText } from '../src/lib/text.mjs';
import { addRaw, makeCtx, rawTemplate } from './fixtures/records/harness.mjs';

async function cleanBooks(options) {
  const ctx = await makeCtx(options);
  const result = await clean(ctx);
  const books = await readJsonl(join(ctx.dataDir, 'stage', ctx.run, 'clean.jsonl'));
  return { ctx, result, books, byName: (part) => books.find((b) => b.name.includes(part)) };
}

describe('clean', () => {
  it('gán id theo thứ tự bộ trong series.json, rồi tập, rồi biến thể', async () => {
    const { result, books } = await cleanBooks();
    expect(result.exitCode).toBe(0);
    expect(books.map((b) => [b.id, b.seriesKey, b.volume, b.variant])).toEqual([
      [1, 'conan', 1, 'thuong'],
      [2, 'conan', 2, 'thuong'],
      [3, 'conan', 3, 'dac-biet'],
      [4, 'doraemon', 1, 'thuong'],
      [5, 'than-dong-dat-viet', 1, 'thuong'],
      [6, 'than-dong-dat-viet', 2, 'thuong'],
    ]);
  });

  it('cắt mô tả dài ≤ 255 kí tự đúng ranh giới câu', async () => {
    const { byName } = await cleanBooks();
    const raw = (await readFile(new URL('./fixtures/records/raw/kimdong.jsonl', import.meta.url), 'utf8')).split('\n')[0];
    const full = htmlToText(JSON.parse(raw).descriptionHtml);
    const book = byName('Conan - Tập 1');
    expect(full.length).toBeGreaterThan(255);
    expect(book.description.length).toBeLessThanOrEqual(255);
    expect(full.startsWith(book.description)).toBe(true);
    expect(book.description).toMatch(/[.!?]$/);
    expect(full.slice(book.description.length)).toMatch(/^ \S/);
    expect(book.description).not.toMatch(/<|&amp;/);
  });

  it('gộp trùng hai nguồn theo ISBN-13 (ISBN-10 của Tiki đổi sang 13), Kim Đồng thắng', async () => {
    const { byName } = await cleanBooks();
    const book = byName('Conan - Tập 1');
    expect(book.isbn13).toBe('9786042123457');
    expect(book.source).toBe('kimdong');
    expect(book.mergedFrom.map((m) => m.source)).toEqual(['kimdong', 'tiki']);
    expect(book.publishYear).toBe(2020);
    expect(book.publisher).toBe('Kim Đồng');
    expect(book.author).toBe('Gosho Aoyama');
    expect(book.images.map((i) => [i.kind, i.n])).toEqual([['cover', 0], ['extra', 1]]);
  });

  it('ISBN sai checksum bị bỏ, bản ghi vẫn gộp theo bộ|tập|biến thể', async () => {
    const { byName, result } = await cleanBooks();
    const book = byName('Conan - Tập 2');
    expect(result.summary.invalidIsbn).toBe(1);
    expect(book.isbn13).toBe('9786042777025');
    expect(book.mergedFrom).toHaveLength(2);
    expect(book.author).toBe('Gosho Aoyama');
  });

  it('không bịa publishYear; lấy năm tái bản trong tên; publisher lấy từ series.json khi nguồn thiếu', async () => {
    const { byName, books } = await cleanBooks();
    expect(byName('Doraemon').publishYear).toBe(2019);
    const tdv = books.find((b) => b.seriesKey === 'than-dong-dat-viet' && b.volume === 2);
    expect(tdv.publishYear).toBeNull();
    expect(tdv.publisher).toBe('Phan Thị');
    expect(tdv.author).toBe('Lê Linh');
    expect(tdv.description).toBeNull();
    expect(tdv.images).toEqual([]);
  });

  it('--limit giữ tối đa n Book, chia đều theo thứ tự bộ', async () => {
    const { books, result } = await cleanBooks({ limit: 2 });
    expect(books.map((b) => [b.id, b.seriesKey, b.volume])).toEqual([
      [1, 'conan', 1],
      [2, 'doraemon', 1],
    ]);
    expect(result.summary.droppedByLimit).toBe(4);
  });

  it('id không phụ thuộc thứ tự dòng trong tệp thô', async () => {
    const ctx = await makeCtx();
    await addRaw(ctx, rawTemplate({ seriesKey: 'doraemon', name: 'Doraemon - Tập 2', sourceUrl: 'https://tiki.vn/api/v2/products/3002' }));
    await clean(ctx);
    const books = await readJsonl(join(ctx.dataDir, 'stage', ctx.run, 'clean.jsonl'));
    expect(books.find((b) => b.seriesKey === 'doraemon' && b.volume === 2).id).toBe(5);
    expect(books.map((b) => b.id)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('bản ghi sai raw-record.schema thì exit 1', async () => {
    const ctx = await makeCtx();
    await addRaw(ctx, { ...rawTemplate({}), extra: 'khoá lạ' });
    const result = await clean(ctx);
    expect(result.exitCode).toBe(1);
    expect(result.summary.error).toBe('raw-schema');
  });
});
