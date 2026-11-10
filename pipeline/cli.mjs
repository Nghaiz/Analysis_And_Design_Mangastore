#!/usr/bin/env node
// CLI pipeline (CONTRACT §2). Thông điệp ra stderr; --json in đúng một đối tượng JSON ra stdout.
// Exit: 0 sạch, 1 lỗi chặn/lỗi chạy, 2 sai cách gọi.

import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHttpClient } from './src/fetch/client.mjs';
import { census, CENSUS_MAX_RETRIES, CENSUS_REQUEST_BUDGET } from './src/sources/census.mjs';
import { MAX_RETRIES } from './src/fetch/constants.mjs';
import { crawl } from './src/sources/crawl.mjs';

const EXIT_OK = 0;
const EXIT_FAIL = 1;
const EXIT_USAGE = 2;
const DEFAULT_PROJECT = 'tiemtruyen';
const pipelineDir = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(pipelineDir, '..');
const STEPS_FILE = join(pipelineDir, 'src', 'steps', 'index.mjs');

const VALUE_FLAGS = { '--run': 'run', '--limit': 'limit', '--series': 'series', '--project': 'project' };
const BOOL_FLAGS = { '--offline': 'offline', '--dry-run': 'dryRun', '--json': 'json' };

class UsageError extends Error {
  name = 'UsageError';
}

const log = (msg) => process.stderr.write(`${msg}\n`);

export function parseArgs(argv) {
  const opts = { command: null, run: null, limit: null, series: null, project: null, offline: false, dryRun: false, json: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg in BOOL_FLAGS) { opts[BOOL_FLAGS[arg]] = true; continue; }
    if (arg in VALUE_FLAGS) {
      const value = argv[i + 1];
      if (value === undefined || value.startsWith('--')) throw new UsageError(`${arg} thiếu giá trị`);
      opts[VALUE_FLAGS[arg]] = value;
      i += 1;
      continue;
    }
    if (arg.startsWith('-')) throw new UsageError(`cờ lạ: ${arg}`);
    if (opts.command) throw new UsageError(`thừa đối số: ${arg}`);
    opts.command = arg;
  }
  if (opts.limit !== null) {
    if (!/^[1-9]\d*$/.test(opts.limit)) throw new UsageError(`--limit phải là số nguyên dương, nhận "${opts.limit}"`);
    opts.limit = Number(opts.limit);
  }
  if (opts.series !== null) opts.series = opts.series.split(',').map((s) => s.trim()).filter(Boolean);
  opts.run ??= opts.limit === null ? 'full' : 'trial';
  opts.project ??= DEFAULT_PROJECT;
  if (!/^[a-zA-Z0-9_-]+$/.test(opts.run)) throw new UsageError(`--run chỉ gồm chữ, số, "-", "_": "${opts.run}"`);
  return opts;
}

/** Bước của lane 4B (src/steps/index.mjs); chưa có tệp thì danh sách rỗng. */
async function loadSteps() {
  if (!existsSync(STEPS_FILE)) return { steps: [], extraCommands: [], missing: true };
  const mod = await import(pathToFileURL(STEPS_FILE).href);
  return { steps: mod.steps ?? [], extraCommands: mod.extraCommands ?? [], missing: false };
}

function buildCtx(opts) {
  const dataDir = join(rootDir, 'data');
  const http = createHttpClient({
    cacheDir: join(dataDir, 'cache', 'http'), offline: opts.offline, log,
    maxNetworkRequests: opts.command === 'census' ? CENSUS_REQUEST_BUDGET : Infinity,
    maxRetries: opts.command === 'census' ? CENSUS_MAX_RETRIES : MAX_RETRIES,
  });
  return {
    run: opts.run, limit: opts.limit, offline: opts.offline, dryRun: opts.dryRun, json: opts.json,
    series: opts.series, project: opts.project, rootDir, dataDir, pipelineDir, log, http,
  };
}

function helpText(registry) {
  const lines = [
    'Cách dùng: node pipeline/cli.mjs <lệnh> [--run <tên>] [--limit <n>] [--offline] [--dry-run] [--json] [--series <key,key>]',
    '',
    'Lệnh:',
    '  census   đếm ứng viên từng bộ (sitemap Kim Đồng + trang 1 tìm Tiki), ≤ 40 request',
    '  crawl    tải bản ghi thô vào data/raw/<run>/<nguồn>.jsonl',
    ...registry.steps.map((s) => `  ${s.name.padEnd(8)} ${s.describe ?? ''}`),
    ...registry.extraCommands.map((s) => `  ${s.name.padEnd(8)} ${s.describe ?? ''}`),
    '  run      crawl rồi lần lượt mọi bước',
    '  help     in hướng dẫn này',
    '',
    'Cờ khác: --project <tên> (compose project cho publish, mặc định tiemtruyen)',
  ];
  if (registry.missing) lines.push('', 'Chưa có src/steps/index.mjs: chỉ có census, crawl.');
  return lines.join('\n');
}

async function runAll(ctx, registry) {
  let last = await crawl(ctx);
  if (last.exitCode !== EXIT_OK) return last;
  if (registry.missing) {
    log('run: chưa có pipeline/src/steps/index.mjs (lane 4B), dừng sau crawl');
    return { exitCode: EXIT_FAIL, summary: last.summary };
  }
  for (const step of registry.steps) {
    log(`run: bước ${step.name}`);
    last = await step.run(ctx);
    if (last.exitCode !== EXIT_OK) {
      log(`run: bước ${step.name} trả exit ${last.exitCode}, dừng`);
      return last;
    }
  }
  return last;
}

async function main(argv) {
  const opts = parseArgs(argv);
  const registry = await loadSteps();
  if (!opts.command || opts.command === 'help') {
    log(helpText(registry));
    return opts.command ? EXIT_OK : EXIT_USAGE;
  }
  const named = [...registry.steps, ...registry.extraCommands].find((s) => s.name === opts.command);
  const builtin = { census, crawl, run: (ctx) => runAll(ctx, registry) }[opts.command];
  if (!builtin && !named) throw new UsageError(`lệnh lạ: ${opts.command} (xem "help")`);
  const ctx = buildCtx(opts);
  const result = builtin ? await builtin(ctx) : await named.run(ctx);
  if (opts.json) process.stdout.write(`${JSON.stringify(result.summary ?? null)}\n`);
  return result.exitCode ?? EXIT_FAIL;
}

const invokedDirectly = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  main(process.argv.slice(2)).then(
    (code) => { process.exitCode = code; },
    (err) => {
      const usage = err instanceof UsageError;
      log(`${usage ? 'lỗi cách gọi' : 'lỗi'}: ${err.message}`);
      if (!usage && process.env.PIPELINE_DEBUG) log(err.stack);
      process.exitCode = usage ? EXIT_USAGE : EXIT_FAIL;
      if (process.argv.includes('--json')) {
        process.stdout.write(`${JSON.stringify({ error: err.name, message: err.message, url: err.url ?? null })}\n`);
      }
    },
  );
}
