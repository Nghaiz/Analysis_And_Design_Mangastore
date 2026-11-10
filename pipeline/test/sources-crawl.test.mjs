import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';
import { describe, expect, it } from 'vitest';
import { parseArgs } from '../cli.mjs';
import { census } from '../src/sources/census.mjs';
import { crawl } from '../src/sources/crawl.mjs';
import { loadSeries, volumeQuotas } from '../src/sources/series.mjs';
import { fixtureClient, tempDir } from './fixtures/http/fake-net.mjs';
import { CONAN, DORA } from './sources.test.mjs';

const pipelineDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const validateRaw = new Ajv2020().compile(JSON.parse(readFileSync(join(pipelineDir, 'schema', 'raw-record.schema.json'), 'utf8')));

function fixtureCtx({ series = [CONAN, DORA], limit = null, offline = false, cacheDir, overrides } = {}) {
  const root = tempDir();
  const dir = join(root, 'pipeline');
  mkdirSync(join(dir, 'config'), { recursive: true });
  copyFileSync(join(pipelineDir, 'config', 'categories.json'), join(dir, 'config', 'categories.json'));
  writeFileSync(join(dir, 'config', 'series.json'), JSON.stringify(series));
  const net = fixtureClient({ offline, cacheDir, overrides });
  const ctx = {
    run: 'test', limit, offline, dryRun: false, json: true, series: null, project: 'tiemtruyen',
    rootDir: root, dataDir: join(root, 'data'), pipelineDir: dir, log: () => {}, http: net.http,
  };
  return { ctx, net };
}

const readJsonl = (path) => readFileSync(path, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l));

describe('crawl', () => {
  it('ghi raw/<run>/<nguồn>.jsonl đúng schema, thứ tự ổn định, chạy lại offline cho cùng kết quả', async () => {
    const { ctx, net } = fixtureCtx();
    const result = await crawl(ctx);
    expect(result.exitCode).toBe(0);
    expect(result.summary.series).toEqual({
      conan: { quota: 3, kimdong: 1, tiki: 1, wikidata: 0 }, // tập 1, 54, 77: chi tiết không có trong fixture (404) nên bị bỏ
      'doraemon-truyen-ngan': { quota: 2, kimdong: 2, tiki: 0, wikidata: 1 },
    });
    const dir = join(ctx.dataDir, 'raw', 'test');
    const all = ['kimdong', 'tiki', 'wikidata'].flatMap((s) => readJsonl(join(dir, `${s}.jsonl`)));
    for (const r of all) expect(validateRaw(r), JSON.stringify(validateRaw.errors)).toBe(true);
    const kd = readJsonl(join(dir, 'kimdong.jsonl'));
    expect(kd.map((r) => r.seriesKey)).toEqual(['conan', 'doraemon-truyen-ngan', 'doraemon-truyen-ngan']);
    const before = ['kimdong', 'tiki', 'wikidata'].map((s) => readFileSync(join(dir, `${s}.jsonl`), 'utf8'));

    const again = fixtureCtx({ offline: true, cacheDir: net.cacheDir });
    await crawl(again.ctx);
    const after = ['kimdong', 'tiki', 'wikidata'].map((s) => readFileSync(join(again.ctx.dataDir, 'raw', 'test', `${s}.jsonl`), 'utf8'));
    expect(after).toEqual(before);
    expect(again.net.calls).toHaveLength(0);
  });

  it('--limit chia đều theo thứ tự bộ, không vượt maxVolumes', async () => {
    expect(volumeQuotas([{ maxVolumes: 30 }, { maxVolumes: 1 }, { maxVolumes: 30 }], 10)).toEqual([4, 1, 3]);
    expect(volumeQuotas([{ maxVolumes: 5 }, { maxVolumes: 5 }], null)).toEqual([5, 5]);
    const { ctx } = fixtureCtx({ limit: 1 });
    const result = await crawl(ctx);
    expect(result.summary.series).toEqual({ conan: { quota: 1, kimdong: 1, tiki: 0, wikidata: 0 } });
  });

  it('--offline thiếu cache: OfflineError nêu URL', async () => {
    const { ctx } = fixtureCtx({ offline: true });
    await expect(crawl(ctx)).rejects.toThrow(/--offline: cache không có https:\/\/nxbkimdong\.com\.vn\/sitemap\.xml/);
  });
});

describe('census', () => {
  it('Tiki chặn: tiki = null (chưa biết), không gọi Tiki cho bộ sau, exit 1', async () => {
    const challenge = { status: 200, body: '<!DOCTYPE html>', contentType: 'text/html' };
    const search = 'https://tiki.vn/api/v2/products?limit=40&q=th%C3%A1m%20t%E1%BB%AD%20l%E1%BB%ABng%20danh%20conan%20t%E1%BA%ADp';
    const other = { ...DORA, key: 'khac', tikiQuery: 'bo khac tap', kimdongSlugPrefixes: [] };
    const { ctx, net } = fixtureCtx({ series: [CONAN, other], overrides: { [search]: challenge } });
    const result = await census(ctx);
    expect(result).toEqual({ exitCode: 1, summary: { conan: { kimdong: 1, tiki: null }, khac: { kimdong: 0, tiki: null } } });
    expect(net.calls.some((c) => c.url.includes('bo%20khac'))).toBe(false);
  });

  it('ghi census.json đúng hình { key: { kimdong, tiki } }', async () => {
    const { ctx } = fixtureCtx();
    const result = await census(ctx);
    const expected = { conan: { kimdong: 1, tiki: 4 }, 'doraemon-truyen-ngan': { kimdong: 3, tiki: 0 } };
    expect(result).toEqual({ exitCode: 0, summary: expected });
    expect(JSON.parse(readFileSync(join(ctx.dataDir, 'raw', 'test', 'census.json'), 'utf8'))).toEqual(expected);
  });
});

describe('series.json thật', () => {
  const series = loadSeries(pipelineDir);
  const byKey = Object.fromEntries(series.map((s) => [s.key, s]));

  it('20–40 bộ, có các bộ bắt buộc, tổng maxVolumes 350–450', () => {
    expect(series.length).toBeGreaterThanOrEqual(20);
    expect(series.length).toBeLessThanOrEqual(40);
    for (const key of ['conan', 'doraemon-truyen-ngan', 'doraemon-truyen-dai', 'than-dong-dat-viet', 'shin-cau-be-but-chi', 'nhoc-maruko', 'dragon-ball']) {
      expect(byKey[key], key).toBeDefined();
    }
    const total = series.reduce((sum, s) => sum + s.maxVolumes, 0);
    expect(total).toBeGreaterThanOrEqual(350);
    expect(total).toBeLessThanOrEqual(450);
  });

  it('author tuỳ chọn: chuỗi ≤ 100 kí tự; có cho các bộ nguồn hay ghi chung chung', () => {
    for (const s of series.filter((x) => 'author' in x)) {
      expect(typeof s.author, s.key).toBe('string');
      expect(s.author.trim().length, s.key).toBeGreaterThan(0);
      expect(s.author.length, s.key).toBeLessThanOrEqual(100);
    }
    expect(byKey['than-dong-dat-viet'].author).toBe('Lê Linh');
    expect(byKey['doraemon-truyen-ngan'].author).toBe('Fujiko F. Fujio');
  });

  it('series.json có author sai kiểu thì loadSeries báo lỗi rõ', () => {
    const dir = tempDir();
    mkdirSync(join(dir, 'config'));
    copyFileSync(join(pipelineDir, 'config', 'categories.json'), join(dir, 'config', 'categories.json'));
    writeFileSync(join(dir, 'config', 'series.json'), JSON.stringify([{ ...CONAN, author: '' }]));
    expect(() => loadSeries(dir)).toThrow(/author/);
  });

  it('Doraemon truyện dài là truyện dài; Thần đồng đất Việt lấy Tiki, không có tiền tố Kim Đồng', () => {
    expect(byKey['doraemon-truyen-dai'].longStory).toBe(true);
    expect(byKey['doraemon-truyen-ngan'].longStory).toBe(false);
    expect(byKey['than-dong-dat-viet']).toMatchObject({ preferredSource: 'tiki', kimdongSlugPrefixes: [] });
  });
});

describe('cli', () => {
  it('parseArgs: mặc định run, project; cờ lạ và thiếu giá trị là lỗi cách gọi', () => {
    expect(parseArgs(['crawl'])).toMatchObject({ command: 'crawl', run: 'full', project: 'tiemtruyen', limit: null });
    expect(parseArgs(['run', '--limit', '10', '--series', 'conan,shin-cau-be-but-chi'])).toMatchObject({
      run: 'trial', limit: 10, series: ['conan', 'shin-cau-be-but-chi'],
    });
    expect(() => parseArgs(['crawl', '--nope'])).toThrow(/cờ lạ/);
    expect(() => parseArgs(['crawl', '--limit'])).toThrow(/thiếu giá trị/);
    expect(() => parseArgs(['crawl', '--limit', '0'])).toThrow(/nguyên dương/);
  });

  it('exit 2 khi sai cách gọi, thông điệp ra stderr, stdout là JSON khi --json', () => {
    const cli = join(pipelineDir, 'cli.mjs');
    const bad = spawnSync(process.execPath, [cli, 'khong-co-lenh', '--json'], { encoding: 'utf8' });
    expect(bad.status).toBe(2);
    expect(bad.stderr).toMatch(/lệnh lạ/);
    expect(JSON.parse(bad.stdout)).toMatchObject({ error: 'UsageError' });
    const help = spawnSync(process.execPath, [cli, 'help'], { encoding: 'utf8' });
    expect(help.status).toBe(0);
    expect(help.stdout).toBe('');
    expect(help.stderr).toMatch(/census/);
  });
});
