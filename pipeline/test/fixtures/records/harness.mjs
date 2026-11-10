// Dựng ctx giả cho test các bước của lane 4B: thư mục gốc tạm có pipeline/{config,schema} và data/raw/<run>/.
import { appendFile, cp, mkdir, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const here = dirname(fileURLToPath(import.meta.url));
const pipelineDir = join(here, '..', '..', '..');
export const FIXED_FETCHED_AT = '2026-11-11T05:00:00Z';
const COVER_SIZE = Object.freeze({ width: 400, height: 600 });
const SMALL_SIZE = Object.freeze({ width: 100, height: 150 });

/** Ảnh PNG tất định theo URL; URL có "broken" trả byte rác, "missing" ném lỗi 404. */
export function fakeHttp() {
  const calls = [];
  const imageFor = async (url) => {
    const size = url.includes('small') ? SMALL_SIZE : COVER_SIZE;
    const seed = [...url].reduce((sum, ch) => (sum * 31 + ch.charCodeAt(0)) % 256, 7);
    return sharp({ create: { ...size, channels: 3, background: { r: seed, g: 120, b: 255 - seed } } }).png().toBuffer();
  };
  return {
    calls,
    async getBuffer(url) {
      calls.push(url);
      if (url.includes('missing')) throw new Error(`HTTP 404 ${url}`);
      if (url.includes('broken')) return Buffer.from('không phải ảnh');
      return imageFor(url);
    },
    async getJson() {
      throw new Error('test không gọi getJson');
    },
    async getText() {
      throw new Error('test không gọi getText');
    },
    fetchedAt: () => FIXED_FETCHED_AT,
  };
}

/** Tạo thư mục gốc tạm và ctx theo CONTRACT §3. */
export async function makeCtx({ run = 'trial', limit = null, dryRun = false } = {}) {
  const rootDir = await mkdtemp(join(tmpdir(), 'pipeline-4b-'));
  const tmpPipeline = join(rootDir, 'pipeline');
  await cp(join(pipelineDir, 'schema'), join(tmpPipeline, 'schema'), { recursive: true });
  await cp(join(pipelineDir, 'config', 'categories.json'), join(tmpPipeline, 'config', 'categories.json'));
  await cp(join(here, 'series.json'), join(tmpPipeline, 'config', 'series.json'));
  const dataDir = join(rootDir, 'data');
  await cp(join(here, 'raw'), join(dataDir, 'raw', run), { recursive: true });
  const logs = [];
  return {
    run,
    limit,
    offline: true,
    dryRun,
    json: false,
    rootDir,
    dataDir,
    pipelineDir: tmpPipeline,
    log: (msg) => logs.push(msg),
    logs,
    http: fakeHttp(),
  };
}

/** Thêm một bản ghi thô vào data/raw/<run>/<source>.jsonl của ctx. */
export async function addRaw(ctx, record) {
  const file = join(ctx.dataDir, 'raw', ctx.run, `${record.source}.jsonl`);
  await mkdir(dirname(file), { recursive: true });
  await appendFile(file, `${JSON.stringify(record)}\n`, 'utf8');
}

export function rawTemplate(overrides) {
  return {
    source: 'tiki',
    level: 'volume',
    seriesKey: 'conan',
    sourceId: null,
    sourceUrl: 'https://tiki.vn/api/v2/products/9999',
    fetchedAt: '2026-11-11T03:30:00Z',
    name: 'Thám tử lừng danh Conan - Tập 9',
    authors: ['Gosho Aoyama'],
    publisher: 'Kim Đồng',
    publishedAt: null,
    pages: null,
    isbn: null,
    categoryHints: [],
    descriptionHtml: null,
    imageUrls: [],
    ...overrides,
  };
}

/** Chạy liền các bước cho tới `until` (tính cả), trả kết quả từng bước. */
export async function runSteps(ctx, until) {
  const { steps } = await import('../../../src/steps/index.mjs');
  const results = {};
  for (const step of steps) {
    results[step.name] = await step.run(ctx);
    if (step.name === until || results[step.name].exitCode !== 0) break;
  }
  return results;
}
