#!/usr/bin/env node
// Accept phase 5 (plans/261111-tiem-thue-truyen/phase-05-he-thiet-ke-giao-dien.md, tiêu chí 1–5 và 8).
// Chạy: node scripts/accept/phase-05.mjs   (cần Node 24; bước 6 cần Docker và .env)
// Tiêu chí 6–7 (Playwright MCP, Lighthouse) do lane 5D ghi báo cáo, không nằm ở đây.
// Bước làm đỏ có chủ đích: bước 2 đặt một island tạm gọi fetch() và đòi ESLint exit 1.
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, IS_WIN, createRunner, run, mustRun, requireDocker, httpGet } from './_lib.mjs';

const runner = createRunner('phase-05');
const { step } = runner;

const NPM = IS_WIN ? 'npm.cmd' : 'npm';
const FRONTEND = join(ROOT, 'frontend');
const STATIC_DIR = join(ROOT, 'src', 'main', 'webapp', 'static');
const ESLINT = join(FRONTEND, 'node_modules', 'eslint', 'bin', 'eslint.js');
const ENV_PATH = join(ROOT, '.env');
const envValue = (key, fallback) => {
  if (!existsSync(ENV_PATH)) return fallback;
  const line = readFileSync(ENV_PATH, 'utf8').split(/\r?\n/).find((l) => l.startsWith(`${key}=`));
  return line ? line.slice(key.length + 1).trim() : fallback;
};
const BASE = `http://127.0.0.1:${envValue('NGINX_HTTP_PORT', '8080')}`;
const DEV_PAGES = ['/dev/StyleGuideView.jsp', '/dev/HomePreviewView.jsp'];
const RED_ISLAND_DIR = join(FRONTEND, 'src', 'islands', 'AcceptRedProbe');
const NETWORK_CALLS = ['fetch', 'XMLHttpRequest', 'WebSocket', 'EventSource', 'navigator.sendBeacon'];

const npm = (args, fix) => mustRun(runner, NPM, ['--prefix', 'frontend', ...args], { fix });

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

// 1. Lint, kiểu, test, build
await step('1 frontend: ci, lint, typecheck, test, build', () => {
  if (!existsSync(join(FRONTEND, 'node_modules'))) npm(['ci'], 'kiểm frontend/package-lock.json');
  npm(['run', 'lint'], 'sửa lỗi ESLint trong frontend/src');
  npm(['run', 'typecheck'], 'sửa lỗi TypeScript');
  npm(['run', 'test'], 'sửa test Vitest đỏ');
  npm(['run', 'build'], 'sửa lỗi build Vite');
  const manifest = join(STATIC_DIR, '.vite', 'manifest.json');
  if (!existsSync(manifest)) throw new Error('build không ra .vite/manifest.json → kiểm build.manifest trong vite.config.ts');
});

// 2. Luật ESLint chặn gọi mạng trong islands/ (làm đỏ có chủ đích mỗi lần chạy)
await step('2 ESLint chặn fetch/XMLHttpRequest/WebSocket/EventSource/sendBeacon trong islands/', () => {
  if (existsSync(RED_ISLAND_DIR)) throw new Error(`${RED_ISLAND_DIR} đã tồn tại → xoá thư mục thử còn sót`);
  mkdirSync(RED_ISLAND_DIR, { recursive: true });
  try {
    const missed = [];
    for (const call of NETWORK_CALLS) {
      const body = call === 'navigator.sendBeacon'
        ? 'navigator.sendBeacon("/x")'
        : call === 'fetch' ? 'void fetch("/x")' : `new ${call}("/x")`;
      const file = join(RED_ISLAND_DIR, 'index.tsx');
      writeFileSync(file, `export default function AcceptRedProbe() {\n  ${body}\n  return null\n}\n`);
      const r = run(runner, process.execPath, [ESLINT, '--no-warn-ignored', file], { cwd: FRONTEND });
      if (r.code !== 1) missed.push(`${call} (eslint exit ${r.code})`);
    }
    if (missed.length) throw new Error(`ESLint không chặn: ${missed.join(', ')} → thêm luật vào frontend/eslint.config.js cho src/islands/**`);
    return `${NETWORK_CALLS.length}/${NETWORK_CALLS.length} bị chặn`;
  } finally {
    rmSync(RED_ISLAND_DIR, { recursive: true, force: true });
  }
});

// 3. Tương phản WCAG AA
await step('3 check-contrast: mọi cặp chữ/nền ≥ 4.5:1', () => {
  npm(['run', 'check:contrast'], 'đổi màu token trong frontend/src/styles/tokens.css và docs/design-tokens.md');
});

// 4. Font tự host có subset vietnamese, không gọi Google Fonts
await step('4 check-font-subsets + không fonts.googleapis.com trong build', () => {
  npm(['run', 'check:fonts'], 'nạp subset vietnamese của họ font bị báo trong frontend/src/styles/fonts.css');
  const hits = walk(STATIC_DIR)
    .filter((f) => /\.(js|css|html|json|svg)$/.test(f))
    .filter((f) => /fonts\.(googleapis|gstatic)\.com/.test(readFileSync(f, 'utf8')));
  if (hits.length) throw new Error(`build gọi Google Fonts ở ${hits.map((f) => f.slice(ROOT.length + 1)).join(', ')} → dùng Fontsource tự host`);
});

// 5. Ngân sách JS và CSS (gzip)
await step('5 check-budget: loader ≤ 3 KB, CSS đầu trang ≤ 30 KB, chunk ngoài ShelfScene ≤ 120 KB', () => {
  npm(['run', 'check:budget'], 'tách chunk hoặc bỏ phụ thuộc nặng khỏi chunk bị báo');
});

// 6. Trang công cụ qua compose (nginx → Tomcat)
await step('6 compose: /dev/StyleGuideView.jsp và /dev/HomePreviewView.jsp trả 200', async () => {
  requireDocker(runner);
  mustRun(runner, 'docker', ['compose', 'up', '--build', '-d', '--wait', '--wait-timeout', '300'], {
    fix: 'docker compose logs app',
  });
  const bad = [];
  for (const page of DEV_PAGES) {
    const r = await httpGet(`${BASE}${page}`);
    const html = r.body.toString('utf8');
    if (r.status !== 200) bad.push(`${page}=${r.status}`);
    else if (!/<script type="module" src="\/static\//.test(html)) bad.push(`${page} thiếu <t:assets/>`);
  }
  if (bad.length) throw new Error(`${bad.join(', ')} → docker compose logs app`);
});

// 8. Chống thoái lui phase 1–3 (phần nhanh)
await step('8 node --test scripts/check/*.test.mjs', () => {
  mustRun(runner, process.execPath, ['--test', 'scripts/check/*.test.mjs'], { fix: 'sửa test đỏ trong scripts/check/' });
});
await step('8 section10-sync', () => {
  mustRun(runner, process.execPath, [join(ROOT, 'scripts', 'check', 'section10-sync.mjs')], {
    fix: 'chép lại khối brief §10 bằng script',
  });
});

runner.finish();
