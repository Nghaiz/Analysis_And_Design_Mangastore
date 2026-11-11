#!/usr/bin/env node
// Accept phase 8 (plans/261111-tiem-thue-truyen/phase-08-e2e-ci-hoan-thien.md, tiêu chí 1–6).
// Chạy: node scripts/accept/phase-08.mjs   (cần JDK 25, Node 24, Docker, .env). Không hỏi tương tác.
// Tiêu chí 7 (CI xanh trên PR) là điều kiện merge ở bước 8.8, không nằm ở đây.
// Bước làm đỏ có chủ đích: đổi một chữ trong một câu mong đợi ở e2e/tests/01-dang-ki.spec.ts thì bước 4 FAIL.
// --only <số,...> chạy riêng vài bước (vd --only 4,5 khi stack E2E đang chạy).
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, IS_WIN, createRunner, mustRun, run, requireDocker, httpGet } from './_lib.mjs';

const runner = createRunner('phase-08');
const { step } = runner;

const NPM = IS_WIN ? 'npm.cmd' : 'npm';
const NPX = IS_WIN ? 'npx.cmd' : 'npx';
const PROJECT = process.env.SMOKE_COMPOSE_PROJECT ?? 'tiemtruyen-e2e';
if (PROJECT === 'tiemtruyen') {
  console.log('[accept] FAIL SMOKE_COMPOSE_PROJECT=tiemtruyen là dữ liệu thường → dùng tiemtruyen-e2e hoặc stack riêng');
  process.exit(2);
}
const COMPOSE = ['compose', '-p', PROJECT, '-f', 'compose.yaml', '-f', 'compose.e2e.yaml'];
const BASE_URL = process.env.SMOKE_BASE_URL ?? 'http://127.0.0.1:8080';
const E2E = join(ROOT, 'e2e');
const CI_YML = join(ROOT, '.github', 'workflows', 'ci.yml');
const env = { SMOKE_BASE_URL: BASE_URL, SMOKE_COMPOSE_PROJECT: PROJECT };
const lastLine = (s) => s.trim().split('\n').pop();

/** Phiên bản ghim ở khối env: đầu ci.yml (hợp đồng với lane 8B: TRIVY_VERSION, ACTIONLINT_VERSION). */
function ciVersion(name) {
  const m = readFileSync(CI_YML, 'utf8').match(new RegExp(`^\\s*${name}:\\s*["']?([0-9][0-9.]*)["']?\\s*$`, 'm'));
  if (!m) throw new Error(`ci.yml thiếu ${name} ở khối env → lane 8B ghim phiên bản`);
  return m[1];
}

// 1. Chống thoái lui: Accept phase 1–7 (tiêu chí 5). Gồm mvnw verify (lint Checkstyle, build, unit, integration
//    Testcontainers) và lint, typecheck, test, build frontend (tiêu chí 4).
for (const n of ['01', '02', '03', '04', '05', '06', '07']) {
  await step(`1.${Number(n)} accept phase ${n}`, () => {
    const r = run(runner, process.execPath, [join(ROOT, 'scripts', 'accept', `phase-${n}.mjs`)]);
    if (r.code !== 0) throw new Error(`${lastLine(r.out)} → node scripts/accept/phase-${n}.mjs, sửa bước FAIL`);
    return lastLine(r.out);
  });
}

// 2. Gói E2E và trình duyệt
await step('2 e2e: npm ci, playwright install chromium', () => {
  if (!existsSync(join(E2E, 'node_modules', '@playwright', 'test'))) {
    mustRun(runner, NPM, ['--prefix', 'e2e', 'ci'], { fix: 'kiểm e2e/package-lock.json' });
  }
  mustRun(runner, NPX, ['playwright', 'install', 'chromium'], { cwd: E2E, fix: 'kiểm mạng, chạy lại trong e2e/' });
});

// 3. Stack E2E (seed ch.2). Stack thường giữ cổng 8080 thì dừng nó trước (không -v).
await step(`3 compose ${PROJECT} up --build --wait`, async () => {
  requireDocker(runner);
  if (BASE_URL.endsWith(':8080')) run(runner, 'docker', ['compose', '-p', 'tiemtruyen', 'stop', 'nginx']);
  mustRun(runner, 'docker', [...COMPOSE, 'up', '--build', '-d', '--wait', '--wait-timeout', '300'], {
    fix: `docker ${COMPOSE.join(' ')} logs app`,
  });
  const r = await httpGet(`${BASE_URL}/health.jsp`);
  if (r.status !== 200) throw new Error(`/health.jsp trả ${r.status} → docker ${COMPOSE.join(' ')} logs app`);
});

// 4. Playwright: 3 kịch bản ch.2 và mọi ngoại lệ, bảo mật, axe AA, hai project (tiêu chí 1)
await step('4 playwright test (mobile 390×844, desktop 1440×900)', () => {
  const r = run(runner, NPX, ['playwright', 'test', '--reporter=list'], { cwd: E2E, env: { ...env, CI: '' } });
  const summary = r.out.match(/^\s*\d+ (passed|failed).*$/gm)?.join('; ') ?? lastLine(r.out);
  if (r.code !== 0) throw new Error(`${summary} → cd e2e && npx playwright test, đọc e2e/test-results`);
  for (const p of ['mobile', 'desktop']) {
    if (!r.out.includes(`[${p}]`)) throw new Error(`không có test nào chạy ở project ${p} → kiểm e2e/playwright.config.ts`);
  }
  return summary;
});

// 5. Lighthouse mobile ≥ 90 cả bốn hạng mục trên mọi trang có giao diện (tiêu chí 2)
await step('5 lighthouse mobile ≥ 90 (Performance, Accessibility, Best Practices, SEO)', () => {
  const script = join(E2E, 'lighthouse', 'run-lighthouse.mjs');
  if (!existsSync(script)) throw new Error('thiếu e2e/lighthouse/run-lighthouse.mjs → lane 8C');
  const r = run(runner, process.execPath, [script, '--base-url', BASE_URL, '--json'], { cwd: E2E, env });
  let data;
  try {
    data = JSON.parse(r.out.slice(r.out.indexOf('{')));
  } catch {
    throw new Error(`run-lighthouse --json không in JSON (exit ${r.code}) → sửa e2e/lighthouse/run-lighthouse.mjs`);
  }
  if (!data.pages?.length) throw new Error('Lighthouse không đo trang nào → kiểm danh sách trang');
  if (r.code !== 0 || data.failing?.length) {
    const bad = (data.failing ?? []).map((f) => `${f.path} ${f.category}=${f.score}`).join(', ');
    throw new Error(`dưới 90: ${bad || `exit ${r.code}`} → lane 8D sửa theo plans/reports/phase-08-lighthouse-*.md`);
  }
  return `${data.pages.length} trang`;
});

// 6. Workflow: actionlint bằng ảnh Docker, timeout-minutes mỗi job, concurrency PR, không paths: (tiêu chí 3)
await step('6 .github/workflows: actionlint, timeout-minutes, concurrency, không paths:', () => {
  if (!existsSync(CI_YML)) throw new Error('thiếu .github/workflows/ci.yml → lane 8B');
  const yml = readFileSync(CI_YML, 'utf8');
  const ver = ciVersion('ACTIONLINT_VERSION');
  mustRun(runner, 'docker', ['run', '--rm', '-v', `${ROOT}:/repo`, '-w', '/repo', `rhysd/actionlint:${ver}`, '-color=never'], {
    fix: 'sửa lỗi actionlint trong .github/workflows/',
  });
  if (/^\s*paths(-ignore)?:/m.test(yml)) throw new Error('ci.yml có paths: → check bắt buộc không được lọc theo đường dẫn');
  if (!/cancel-in-progress:\s*true/.test(yml) || !/group:\s*\$\{\{\s*github\.workflow\s*\}\}-\$\{\{\s*github\.ref\s*\}\}/.test(yml)) {
    throw new Error('thiếu concurrency { group: ${{ github.workflow }}-${{ github.ref }}, cancel-in-progress: true }');
  }
  const jobsBlock = yml.slice(yml.search(/^jobs:/m));
  const jobs = [...jobsBlock.matchAll(/^ {2}([A-Za-z0-9_-]+):\s*$/gm)].map((m) => m[1]);
  const parts = jobsBlock.split(/^ {2}[A-Za-z0-9_-]+:\s*$/m).slice(1);
  const noTimeout = jobs.filter((_, i) => !/^\s{4}timeout-minutes:\s*\d+/m.test(parts[i]));
  if (!jobs.length) throw new Error('ci.yml không có job');
  if (noTimeout.length) throw new Error(`job thiếu timeout-minutes: ${noTimeout.join(', ')}`);
  return `${jobs.length} job, actionlint ${ver}`;
});

// 7. Trivy: không còn lỗ hổng HIGH/CRITICAL đã có bản sửa trong ảnh app và nginx (tiêu chí 4)
await step('7 trivy image (HIGH, CRITICAL, đã có bản sửa)', () => {
  const ver = ciVersion('TRIVY_VERSION');
  const tag = process.env.APP_IMAGE_TAG ?? 'local';
  const images = [`tiemtruyen-app:${tag}`, 'tiemtruyen-nginx:local'];
  for (const img of images) {
    mustRun(runner, 'docker', ['run', '--rm', '-v', '/var/run/docker.sock:/var/run/docker.sock', '-v', 'tiemtruyen-trivy-cache:/root/.cache',
      `aquasec/trivy:${ver}`, 'image', '--quiet', '--severity', 'HIGH,CRITICAL', '--ignore-unfixed', '--exit-code', '1', img], {
      fix: `nâng ảnh nền hoặc thư viện có lỗ hổng trong ${img}`,
    });
  }
  return images.join(', ');
});

// 8. Hợp đồng tài liệu
await step('8 section10-sync, node --test scripts/check', () => {
  mustRun(runner, process.execPath, [join(ROOT, 'scripts', 'check', 'section10-sync.mjs')], { fix: 'chép lại khối brief §10' });
  mustRun(runner, process.execPath, ['--test', 'scripts/check/*.test.mjs'], { fix: 'sửa test hợp đồng tài liệu đỏ' });
});

// 9. Cây sạch, data/ ngoài git (tiêu chí 6)
await step('9 git status sạch, git ls-files data rỗng', () => {
  const st = run(runner, 'git', ['status', '--porcelain']);
  if (st.out.trim()) throw new Error(`cây có thay đổi chưa commit: ${st.out.trim().split('\n').slice(0, 5).join('; ')} → commit hoặc ignore`);
  const d = run(runner, 'git', ['ls-files', 'data']);
  if (d.out.trim()) throw new Error('data/ có file trong git → git rm --cached');
});

runner.finish();
