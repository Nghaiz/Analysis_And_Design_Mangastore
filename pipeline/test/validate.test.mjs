import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { addRaw, makeCtx, rawTemplate, runSteps } from './fixtures/records/harness.mjs';

const reportFile = (ctx, name) => join(ctx.dataDir, 'reports', ctx.run, name);

describe('validate', () => {
  it('dữ liệu mẫu sạch: exit 0, liệt kê thiếu bìa và cảnh báo, ghi md/json/html', async () => {
    const ctx = await makeCtx();
    const { validate } = await runSteps(ctx, 'validate');
    expect(validate.exitCode).toBe(0);
    const report = validate.summary;
    expect(report.blocking).toEqual([]);
    expect(report.books).toBe(6);
    expect(report.missingCover).toEqual([6]);
    expect(report.withCover).toEqual([1, 2, 3, 4, 5]);
    expect(report.sourceWins).toEqual({ kimdong: 4, tiki: 2, wikidata: 0 });
    expect(new Set(report.warnings.map((w) => w.code))).toEqual(new Set(['no-cover', 'no-year', 'no-description']));
    expect(JSON.parse(await readFile(reportFile(ctx, 'validate.json'), 'utf8'))).toEqual(report);
    const html = await readFile(reportFile(ctx, 'index.html'), 'utf8');
    expect(html.startsWith('<!doctype html>')).toBe(true);
    expect(html).toContain('name="viewport"');
    expect(html).toContain('src="../../images/trial/1/cover-320.webp"');
    expect(await readFile(reportFile(ctx, 'validate.md'), 'utf8')).toContain('Không có lỗi chặn');
  });

  it('bước làm đỏ: thêm một dòng combo thì validate exit 1, code combo, export dừng', async () => {
    const ctx = await makeCtx();
    await addRaw(ctx, rawTemplate({ name: 'Combo Thám tử lừng danh Conan Tập 4-6', sourceUrl: 'https://tiki.vn/api/v2/products/7777' }));
    const results = await runSteps(ctx, 'validate');
    expect(results.validate.exitCode).toBe(1);
    expect(results.validate.summary.blocking.map((b) => b.code)).toContain('combo');
    const { exportStep } = await import('../src/steps/export.mjs');
    expect((await exportStep(ctx)).exitCode).toBe(1);
  });

  it('ảnh hỏng là lỗi chặn image-decode', async () => {
    const ctx = await makeCtx();
    await addRaw(ctx, rawTemplate({ imageUrls: ['https://x.test/broken.jpg'] }));
    const { validate } = await runSteps(ctx, 'validate');
    expect(validate.exitCode).toBe(1);
    expect(validate.summary.blocking.map((b) => b.code)).toEqual(['image-decode']);
  });

  it('thiếu tác giả là missing-field (không báo trùng lỗi schema); run = full ngoài 300–500 Book là book-count', async () => {
    const ctx = await makeCtx({ run: 'full' });
    await addRaw(ctx, rawTemplate({ seriesKey: 'doraemon', name: 'Doraemon - Tập 2', authors: [], categoryHints: [] }));
    const { validate } = await runSteps(ctx, 'validate');
    const codes = validate.summary.blocking.map((b) => `${b.code}:${b.bookId}`);
    expect(codes).toContain('book-count:null');
    expect(codes).toContain('missing-field:5');
    expect(codes.filter((c) => c.startsWith('schema'))).toEqual([]);
  });
});
