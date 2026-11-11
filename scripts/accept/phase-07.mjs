#!/usr/bin/env node
// Accept phase 7 (plans/261111-tiem-thue-truyen/phase-07-chuc-nang-3.md, tiêu chí 1, 2, 5).
// Chạy: node scripts/accept/phase-07.mjs   (cần JDK 25, Node 24, Docker, .env)
// Tiêu chí 3 (Playwright MCP 7E, 7F) và 4 (tiem-contract-guard) ghi trong báo cáo, không nằm ở đây.
// Bước làm đỏ có chủ đích: tạm bỏ điều kiện "đã có khoản cọc" khỏi nhan-vien/doUpdateRentalBill.jsp thì
// bước 5 FAIL ở "đk 3".
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, IS_WIN, createRunner, mustRun, run, requireDocker, httpGet } from './_lib.mjs';

const runner = createRunner('phase-07');
const { step } = runner;

const NPM = IS_WIN ? 'npm.cmd' : 'npm';
// Mặc định stack E2E chung; SMOKE_COMPOSE_PROJECT (kèm NGINX_HTTP_PORT, DB_HOST_PORT, APP_IMAGE_TAG, SMOKE_BASE_URL)
// cho chạy trên stack riêng khi phiên khác giữ tiemtruyen-e2e. lib/e2e-db.mjs từ chối project tiemtruyen.
const PROJECT = process.env.SMOKE_COMPOSE_PROJECT ?? 'tiemtruyen-e2e';
if (PROJECT === 'tiemtruyen') {
  console.log('[accept] FAIL SMOKE_COMPOSE_PROJECT=tiemtruyen là dữ liệu thường → dùng tiemtruyen-e2e hoặc stack riêng');
  process.exit(2);
}
const COMPOSE = ['compose', '-p', PROJECT, '-f', 'compose.yaml', '-f', 'compose.e2e.yaml'];
const BASE_URL = process.env.SMOKE_BASE_URL ?? 'http://127.0.0.1:8080';
const ISLANDS = ['ProcessBillDesk', 'CollateralDrawer'];

const npm = (args, fix) => mustRun(runner, NPM, ['--prefix', 'frontend', ...args], { fix });

// 1. Java: Checkstyle, JUnit, Testcontainers (gồm test phase 3 và filter phase 6)
await step('1 mvnw -B verify', () => {
  mustRun(runner, process.execPath, [join(ROOT, 'scripts', 'dev', 'mvnw.mjs'), '-B', 'verify'], {
    fix: 'đọc target/surefire-reports và sửa test đỏ',
  });
});

// 2. Frontend, có test của hai island M3
await step('2 frontend: lint, typecheck, test (có test ProcessBillDesk, CollateralDrawer), build', () => {
  const missing = ISLANDS.filter((n) => !existsSync(join(ROOT, 'frontend', 'src', 'islands', n, `${n}.test.tsx`)));
  if (missing.length) throw new Error(`thiếu test island ${missing.join(', ')} → lane 7C viết frontend/src/islands/<Tên>/<Tên>.test.tsx`);
  if (!existsSync(join(ROOT, 'frontend', 'node_modules'))) npm(['ci'], 'kiểm frontend/package-lock.json');
  npm(['run', 'lint'], 'sửa lỗi ESLint trong frontend/src');
  npm(['run', 'typecheck'], 'sửa lỗi TypeScript');
  const t = npm(['run', 'test'], 'sửa test Vitest đỏ');
  const ran = ISLANDS.filter((n) => t.out.includes(`${n}.test.tsx`));
  if (ran.length !== ISLANDS.length) throw new Error(`Vitest không chạy test của ${ISLANDS.filter((n) => !ran.includes(n)).join(', ')} → kiểm include trong vite.config.ts`);
  npm(['run', 'build'], 'sửa lỗi build Vite');
});

// 3. Stack E2E (seed ch.2)
await step(`3 compose ${PROJECT} up --build --wait`, async () => {
  requireDocker(runner);
  mustRun(runner, 'docker', [...COMPOSE, 'up', '--build', '-d', '--wait', '--wait-timeout', '300'], {
    fix: `docker ${COMPOSE.join(' ')} logs app`,
  });
  const r = await httpGet(`${BASE_URL}/health.jsp`);
  if (r.status !== 200) throw new Error(`/health.jsp trả ${r.status} → docker ${COMPOSE.join(' ')} logs app`);
});

// 4. Chức năng 1, 2 vẫn xanh (tiêu chí 5) và dựng PM0125 "Chờ nhận" cho bước 5
await step('4 smoke flow-m1-m2 (chống thoái lui phase 6)', () => {
  const r = run(runner, process.execPath, [join(ROOT, 'scripts', 'smoke', 'flow-m1-m2.mjs')], { env: { SMOKE_BASE_URL: BASE_URL, SMOKE_COMPOSE_PROJECT: PROJECT } });
  if (r.code !== 0) throw new Error(`${r.out.trim().split('\n').pop()} → sửa trang M1/M2 theo bước bị báo`);
});

// 5. Chức năng 3
await step('5 smoke flow-m3 (ch.2 mục 2.3, bốn điều kiện, D9, D6)', () => {
  const r = run(runner, process.execPath, [join(ROOT, 'scripts', 'smoke', 'flow-m3.mjs')], {
    env: { SMOKE_BASE_URL: BASE_URL, SMOKE_COMPOSE_PROJECT: PROJECT },
  });
  if (r.code === 2) throw new Error(`${r.out.trim().split('\n').pop()} → dựng stack E2E`);
  if (r.code !== 0) throw new Error(`${r.out.trim().split('\n').pop()} → sửa trang M3 theo bước bị báo`);
  return r.out.trim().split('\n').pop();
});

runner.finish();
