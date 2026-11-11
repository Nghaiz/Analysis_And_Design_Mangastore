import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { exists, readJsonl } from '../src/lib/io.mjs';
import { MANIFEST_KEYS } from '../src/lib/manifest.mjs';
import { sqlString } from '../src/lib/sql.mjs';
import { exportStep } from '../src/steps/export.mjs';
import { FIXED_FETCHED_AT, makeCtx, runSteps } from './fixtures/records/harness.mjs';

async function exported() {
  const ctx = await makeCtx();
  const results = await runSteps(ctx, 'export');
  const dir = join(ctx.dataDir, 'export', ctx.run);
  const read = (name) => readFile(join(dir, name), 'utf8');
  return { ctx, result: results.export, dir, read };
}

describe('export', () => {
  it('chạy hai lần cho cùng mã băm; lần chạy thử ghi vào data/export/<run>/', async () => {
    const { ctx, result } = await exported();
    expect(result.exitCode).toBe(0);
    const second = await exportStep(ctx);
    expect(second.summary.files).toEqual(result.summary.files);
    expect(result.summary.files.every((f) => f.path.startsWith(join(ctx.dataDir, 'export', 'trial')))).toBe(true);
    const fresh = await exported();
    expect(fresh.result.summary.files.map((f) => f.sha256)).toEqual(result.summary.files.map((f) => f.sha256));
  });

  it('--dry-run không ghi file', async () => {
    const ctx = await makeCtx({ dryRun: true });
    const results = await runSteps(ctx, 'export');
    expect(results.export.exitCode).toBe(0);
    expect(await exists(join(ctx.dataDir, 'export'))).toBe(false);
    expect(ctx.logs.some((line) => line.includes('(dry-run) sẽ ghi'))).toBe(true);
  });

  it('V10 đủ Book, quyển, AUTO_INCREMENT; escape chuỗi MySQL', async () => {
    const { read, result } = await exported();
    const v10 = await read('V10__catalog_data.sql');
    expect(v10).not.toMatch(/\r/);
    expect(v10).toContain('INSERT INTO tblBook (id, name, author, publisher, publishYear, category, description, rentalPrice) VALUES');
    expect(v10).toContain("'DT001-01'");
    expect(v10).toContain('ALTER TABLE tblBook AUTO_INCREMENT = 7;');
    expect(v10).toContain(`ALTER TABLE tblBookCopy AUTO_INCREMENT = ${result.summary.copies + 1};`);
    expect(sqlString("O'Brien \\ x")).toBe("'O\\'Brien \\\\ x'");
  });

  it('manifest chỉ có khoá trong danh sách, không có nội dung, sắp theo bookId rồi kind rồi sourceUrl', async () => {
    const { dir } = await exported();
    const rows = await readJsonl(join(dir, 'manifest.jsonl'));
    for (const row of rows) expect(Object.keys(row)).toEqual(MANIFEST_KEYS);
    const book1 = rows.filter((r) => r.bookId === 1);
    expect(book1.map((r) => [r.kind, r.source, r.winner])).toEqual([
      ['book', 'kimdong', 'kimdong'],
      ['book', 'tiki', 'kimdong'],
      ['image', 'kimdong', 'kimdong'],
      ['image', 'kimdong', 'kimdong'],
    ]);
    expect(book1.filter((r) => r.kind === 'book').every((r) => r.sha256 === null)).toBe(true);
    expect(book1.filter((r) => r.kind === 'image').every((r) => /^[0-9a-f]{64}$/.test(r.sha256) && r.fetchedAt === FIXED_FETCHED_AT)).toBe(true);
    const order = rows.map((r) => `${String(r.bookId).padStart(4, '0')}|${r.kind}|${r.sourceUrl}`);
    expect(order).toEqual([...order].sort());
  });

  it('V11 chỉ tham chiếu tài khoản, giỏ, quyển, đồ cọc bằng truy vấn con theo khoá tự nhiên', async () => {
    const { read, result } = await exported();
    const v11 = await read('V11__sample_bills.sql');
    const v10 = await read('V10__catalog_data.sql');
    const wheres = [...v11.matchAll(/WHERE (\w+) = (\S+)/g)].map((m) => [m[1], m[2]]);
    expect(wheres.length).toBeGreaterThan(0);
    for (const [column, value] of wheres) {
      if (['username', 'barcode', 'name'].includes(column)) expect(value).toMatch(/^'/);
      else {
        expect(['userId', 'clientId']).toContain(column);
        expect(value).toBe('(SELECT');
      }
    }
    expect(v11).not.toMatch(/(?:Id|id)\s*=\s*\d/);
    const statuses = [...v11.matchAll(/, '([^']+)', NULL, \(SELECT userId FROM tblClient/g)].map((m) => m[1]);
    expect(new Set(statuses)).toEqual(new Set(['Chờ nhận', 'Đang cho thuê']));
    const held = result.summary.heldBookIds;
    expect(held.length).toBeGreaterThanOrEqual(3);
    expect(held.length).toBeLessThanOrEqual(5);
    for (const id of held) {
      const codes = [...v10.matchAll(new RegExp(`'(DT${String(id).padStart(3, '0')}-\\d{2})'`, 'g'))].map((m) => m[1]);
      for (const code of codes) expect(v11).toContain(`barcode = '${code}'`);
    }
    expect(v11).toMatch(/NOW\(\) - INTERVAL/);
    expect(v11).toContain("(SELECT id FROM tblCollateral WHERE name = 'Căn cước công dân')");
    expect(v11).toContain("(SELECT id FROM tblUser WHERE username = 'hant')");
  });
});
