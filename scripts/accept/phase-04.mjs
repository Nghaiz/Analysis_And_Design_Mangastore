#!/usr/bin/env node
// Accept phase 4 (plans/261111-tiem-thue-truyen/phase-04-pipeline-crawl-seed.md, tiêu chí 1–7).
// Chạy: node scripts/accept/phase-04.mjs   (cần Node 24, dữ liệu đã crawl ở data/, Docker với stack tiemtruyen đã publish)
// Bước làm đỏ có chủ đích: bước 3b chèn một bản ghi combo vào bản sao dữ liệu thì validate phải exit 1 với lỗi `combo`.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, IS_WIN, createRunner, run, mustRun, requireDocker, httpGet } from './_lib.mjs';

const runner = createRunner('phase-04');
const { step } = runner;

const NPM = IS_WIN ? 'npm.cmd' : 'npm';
const CLI = join(ROOT, 'pipeline', 'cli.mjs');
const EXPORT_DIR = join(ROOT, 'data', 'export');
const ENV_PATH = join(ROOT, '.env');
const envValue = (key, fallback) => {
  if (!existsSync(ENV_PATH)) return fallback;
  const line = readFileSync(ENV_PATH, 'utf8').split(/\r?\n/).find((l) => l.startsWith(`${key}=`));
  return line ? line.slice(key.length + 1).trim() : fallback;
};
const BASE = `http://127.0.0.1:${envValue('NGINX_HTTP_PORT', '8080')}`;
const MANIFEST_KEYS = ['kind', 'bookId', 'source', 'sourceUrl', 'fetchedAt', 'winner', 'sha256'].sort().join(',');

function exportHashes() {
  if (!existsSync(EXPORT_DIR)) throw new Error('chưa có data/export → node pipeline/cli.mjs run');
  const files = readdirSync(EXPORT_DIR).filter((f) => f.endsWith('.sql')).sort();
  if (!files.includes('V10__catalog_data.sql') || !files.includes('V11__sample_bills.sql')) {
    throw new Error(`data/export chỉ có [${files.join(', ')}] → node pipeline/cli.mjs run (đủ V10, V11)`);
  }
  return Object.fromEntries(
    files.map((f) => [f, createHash('sha256').update(readFileSync(join(EXPORT_DIR, f))).digest('hex')]),
  );
}

function validateJson(args = []) {
  const r = run(runner, process.execPath, [CLI, 'validate', '--json', ...args]);
  let report;
  try {
    report = JSON.parse(r.out.slice(r.out.indexOf('{'), r.out.lastIndexOf('}') + 1));
  } catch {
    throw new Error(`validate --json không in JSON hợp lệ (exit ${r.code}) → sửa pipeline/src/steps/validate.mjs`);
  }
  return { code: r.code, report };
}

// 1. Test pipeline (Vitest)
await step('1 pipeline: vitest run', () => {
  if (!existsSync(join(ROOT, 'pipeline', 'node_modules'))) {
    mustRun(runner, NPM, ['--prefix', 'pipeline', 'ci'], { fix: 'kiểm pipeline/package-lock.json' });
  }
  mustRun(runner, NPM, ['--prefix', 'pipeline', 'test'], { fix: 'sửa test đỏ trong pipeline/test/' });
});

// 2. Chạy lại từ cache, không mạng, ra cùng mã băm
await step('2 run --offline cho cùng mã băm export', () => {
  const before = exportHashes();
  mustRun(runner, process.execPath, [CLI, 'run', '--offline'], {
    fix: 'cache thiếu URL (OfflineError) hoặc bước nào đó không xác định → xem log',
  });
  const after = exportHashes();
  const diff = Object.keys({ ...before, ...after }).filter((f) => before[f] !== after[f]);
  if (diff.length) throw new Error(`mã băm đổi ở ${diff.join(', ')} → bỏ dấu thời gian/thứ tự không ổn định trong export`);
  return Object.entries(after).map(([f, h]) => `${f}=${h.slice(0, 12)}`).join(' ');
});

let report;
// 3. validate --json trên dữ liệu đầy đủ
await step('3 validate --json: 300–500 Book, 1–5 quyển, không lỗi chặn', () => {
  const v = validateJson();
  report = v.report;
  if (v.code !== 0 || report.blocking?.length) {
    const first = report.blocking?.[0];
    throw new Error(`validate exit ${v.code}, ${report.blocking?.length ?? '?'} lỗi chặn${first ? ` (đầu tiên: ${first.code} ${first.message})` : ''} → data/reports/full/validate.md`);
  }
  if (report.run !== 'full') throw new Error(`validate chạy trên run=${report.run} → mặc định phải là full`);
  if (!(report.books >= 300 && report.books <= 500)) throw new Error(`${report.books} Book ngoài 300–500 → chỉnh series.json`);
  const stage = join(ROOT, 'data', 'stage', 'full', 'price.jsonl');
  const books = readFileSync(stage, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
  const badCopies = books.filter((b) => !(Number.isInteger(b.copies) && b.copies >= 1 && b.copies <= 5));
  if (badCopies.length) throw new Error(`${badCopies.length} Book có số quyển ngoài 1–5 (id ${badCopies[0].id}) → bước copies`);
  if (!Array.isArray(report.missingCover)) throw new Error('validate.json thiếu missingCover → pipeline/CONTRACT.md §7b');
  return `${report.books} Book, ${report.copies} quyển, thiếu bìa ${report.missingCover.length}`;
});

// 3b. Làm đỏ có chủ đích: thêm combo thì validate phải chặn
await step('3b validate chặn bản ghi combo (đỏ có chủ đích)', () => {
  const src = join(ROOT, 'data', 'stage', 'full', 'price.jsonl');
  const dir = join(ROOT, 'data', 'stage', 'accept-combo');
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  const lines = readFileSync(src, 'utf8').split('\n').filter(Boolean).slice(0, 5).map((l) => JSON.parse(l));
  lines[0].name = `Combo ${lines[0].name} (trọn bộ 3 tập)`;
  writeFileSync(join(dir, 'price.jsonl'), `${lines.map((b) => JSON.stringify(b)).join('\n')}\n`);
  const v = validateJson(['--run', 'accept-combo']);
  rmSync(dir, { recursive: true, force: true });
  rmSync(join(ROOT, 'data', 'reports', 'accept-combo'), { recursive: true, force: true });
  if (v.code !== 1) throw new Error(`validate exit ${v.code} với bản ghi combo → validate phải exit 1`);
  if (!v.report.blocking?.some((e) => e.code === 'combo')) throw new Error('không có lỗi chặn code=combo → kiểm quy tắc combo trong validate');
  return 'exit 1, code=combo';
});

// 4. Manifest: một dòng mỗi Book và mỗi ảnh, không nội dung
await step('4 manifest.jsonl: đủ dòng, không mô tả', () => {
  const p = join(ROOT, 'pipeline', 'manifest.jsonl');
  if (!existsSync(p)) throw new Error('thiếu pipeline/manifest.jsonl → export của run full');
  const rows = readFileSync(p, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
  const extra = rows.find((r) => Object.keys(r).sort().join(',') !== MANIFEST_KEYS);
  if (extra) throw new Error(`dòng có khoá lạ ${Object.keys(extra).join(',')} → chỉ ${MANIFEST_KEYS} (contract.md §6)`);
  const bookIds = new Set(rows.filter((r) => r.kind === 'book').map((r) => r.bookId));
  if (bookIds.size !== report?.books) throw new Error(`manifest có ${bookIds.size} Book, validate có ${report?.books} → export`);
  const stage = readFileSync(join(ROOT, 'data', 'stage', 'full', 'price.jsonl'), 'utf8').split('\n').filter(Boolean);
  const images = stage.map((l) => JSON.parse(l)).reduce((n, b) => n + b.images.filter((i) => i.sha256).length, 0);
  const imageRows = rows.filter((r) => r.kind === 'image').length;
  if (imageRows !== images) throw new Error(`manifest có ${imageRows} ảnh, dữ liệu có ${images} → export`);
  if (/"description"|descriptionHtml/.test(readFileSync(p, 'utf8'))) throw new Error('manifest chứa mô tả → bỏ');
  return `${bookIds.size} Book, ${imageRows} ảnh`;
});

// 5. data/ ngoài git
await step('5 git: data/ bị ignore, không file nào được track', () => {
  const ls = mustRun(runner, 'git', ['ls-files', 'data']).out.trim();
  if (ls) throw new Error(`git đang track: ${ls.split('\n')[0]} → git rm --cached`);
  const ci = run(runner, 'git', ['check-ignore', 'data/']);
  if (ci.code !== 0) throw new Error('data/ không bị ignore → .gitignore');
});

// 6. Sau publish: DB có catalog, nginx phục vụ ảnh bìa
await step('6 sau publish: health, COUNT(tblBook), ảnh bìa và ảnh dự phòng', async () => {
  requireDocker(runner);
  const health = await httpGet(`${BASE}/health.jsp`);
  if (health.status !== 200) throw new Error(`/health.jsp trả ${health.status} → docker compose logs app`);
  const q = run(runner, 'docker', ['compose', 'exec', '-T', 'db', 'sh', '-c',
    'mysql -N -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE" -e "SELECT COUNT(*) FROM tblBook"']);
  const count = Number(/^\s*(\d+)\s*$/m.exec(q.out)?.[1]);
  if (!(count >= 300 && count <= 500)) throw new Error(`tblBook có ${q.code === 0 ? count : '?'} dòng → publish rồi docker compose restart app`);
  const withCover = report?.withCover?.[0];
  if (!withCover) throw new Error('validate không có Book nào có bìa → bước images');
  const ok = await httpGet(`${BASE}/covers/${withCover}/cover-320.webp`);
  if (ok.status !== 200 || ok.headers['content-type'] !== 'image/webp') {
    throw new Error(`/covers/${withCover}/cover-320.webp trả ${ok.status} ${ok.headers['content-type']} → kiểm covers_data`);
  }
  if (!/public/.test(ok.headers['cache-control'] ?? '') || !/max-age=31536000/.test(ok.headers['cache-control'] ?? '')) {
    throw new Error(`Cache-Control="${ok.headers['cache-control']}" → nginx location /covers/`);
  }
  const noCover = report.missingCover?.[0] ?? 999999;
  const fb = await httpGet(`${BASE}/covers/${noCover}/cover-320.webp`);
  if (fb.status !== 200 || !fb.body.length) throw new Error(`/covers/${noCover}/cover-320.webp trả ${fb.status} → ảnh dự phòng trong nginx`);
  return `tblBook=${count}, bìa ${withCover}, dự phòng ${noCover} (${fb.headers['content-type']})`;
});

// 7. Chống thoái lui
await step('7 chống thoái lui: scripts/check, section10-sync', () => {
  mustRun(runner, process.execPath, ['--test', 'scripts/check/*.test.mjs'], { fix: 'sửa test đỏ trong scripts/check/' });
  const sync = join(ROOT, 'scripts', 'check', 'section10-sync.mjs');
  if (!existsSync(sync)) throw new Error('thiếu scripts/check/section10-sync.mjs → merge main (phase 2) vào nhánh');
  mustRun(runner, process.execPath, [sync], { fix: 'AGENTS.md hoặc rule lệch brief §10' });
});

runner.finish();
