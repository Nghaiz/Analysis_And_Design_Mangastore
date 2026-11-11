#!/usr/bin/env node
// Accept phase 6 (plans/261111-tiem-thue-truyen/phase-06-chuc-nang-1-2.md, tiêu chí 1–3 và 6).
// Chạy: node scripts/accept/phase-06.mjs   (cần Node 24, JDK 25, Docker, .env)
// Tiêu chí 4 (Playwright MCP của 6E, 6F) và 5 (tiem-contract-guard) ghi trong báo cáo, không nằm ở đây.
// Bước làm đỏ có chủ đích: bỏ <t:csrf/> khỏi một form của M1/M2 thì bước 5 (smoke) FAIL.
// Bước 4 dựng stack E2E (project tiemtruyen-e2e, volume riêng) trên cổng 8080: stack thường phải đang tắt.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, IS_WIN, createRunner, run, mustRun, requireDocker } from './_lib.mjs';

const runner = createRunner('phase-06');
const { step } = runner;

const NPM = IS_WIN ? 'npm.cmd' : 'npm';
const E2E = ['compose', '-p', 'tiemtruyen-e2e', '-f', 'compose.yaml', '-f', 'compose.e2e.yaml'];
const REPORTS = join(ROOT, 'target', 'surefire-reports');

/** Các lớp test trong surefire-reports có tiền tố cho trước: [{ name, tests, failures }]. */
function suitesWithPrefix(prefix) {
  if (!existsSync(REPORTS)) return [];
  return readdirSync(REPORTS)
    .filter((f) => f.startsWith(`TEST-${prefix}`) && f.endsWith('.xml'))
    .map((f) => {
      const head = readFileSync(join(REPORTS, f), 'utf8').slice(0, 2000);
      const num = (a) => Number(head.match(new RegExp(`\\s${a}="(\\d+)"`))?.[1] ?? 0);
      return { name: f.slice(5, -4), tests: num('tests'), failures: num('failures') + num('errors') };
    });
}

// 1. mvnw clean verify (gồm Accept phase 3 bước 1: DAO, tranh chấp, kiến trúc, schema, Messages) + test filter
await step('1 mvnw -B clean verify (Accept phase 3 bước 1) và test filter', () => {
  mustRun(runner, process.execPath, [join(ROOT, 'scripts', 'accept', 'phase-03.mjs'), '--only', '1'], {
    fix: 'node scripts/accept/phase-03.mjs --only 1 rồi xem log của nó',
  });
  const filters = suitesWithPrefix('vn.tiemtruyen.filter.');
  const total = filters.reduce((n, s) => n + s.tests, 0);
  if (filters.length === 0 || total === 0) throw new Error('không có test nào trong vn.tiemtruyen.filter → lane 6A viết test filter');
  const named = filters.map((s) => s.name.split('.').pop());
  for (const f of ['CsrfFilterTest', 'AuthFilterTest', 'LoginRateLimitFilterTest']) {
    if (!named.includes(f)) throw new Error(`thiếu ${f} → lane 6A viết test cho filter đó`);
  }
  return `${filters.length} lớp test filter, ${total} test`;
});

// 2. Frontend: lint, kiểu, test (có SelectedStack), build
await step('2 frontend: lint, typecheck, test (có SelectedStack), build', () => {
  const npm = (args, fix) => mustRun(runner, NPM, ['--prefix', 'frontend', ...args], { fix });
  if (!existsSync(join(ROOT, 'frontend', 'node_modules'))) npm(['ci'], 'kiểm frontend/package-lock.json');
  npm(['run', 'lint'], 'sửa lỗi ESLint trong frontend/src');
  npm(['run', 'typecheck'], 'sửa lỗi TypeScript');
  // reporter verbose: reporter mặc định (không TTY) chỉ in tổng, không in tên file test đã chạy.
  const t = npm(['run', 'test', '--', '--reporter=verbose'], 'sửa test Vitest đỏ');
  npm(['run', 'build'], 'sửa lỗi build Vite');
  if (!existsSync(join(ROOT, 'frontend', 'src', 'islands', 'SelectedStack', 'SelectedStack.test.tsx'))) {
    throw new Error('thiếu frontend/src/islands/SelectedStack/SelectedStack.test.tsx → lane 6D');
  }
  if (!/SelectedStack\.test\.tsx/.test(t.out)) throw new Error('Vitest không chạy SelectedStack.test.tsx → kiểm include của vitest');
});

// 3. Chống thoái lui phase 5 (luật ESLint chặn mạng, tương phản, font, ngân sách JS) + kiểm tài liệu
await step('3 Accept phase 5 bước 2–5 và 8 vẫn xanh', () => {
  mustRun(runner, process.execPath, [join(ROOT, 'scripts', 'accept', 'phase-05.mjs'), '--only', '2,3,4,4b,5,8'], {
    fix: 'node scripts/accept/phase-05.mjs --only 2,3,4,4b,5,8 rồi xem log của nó',
  });
});

// 4. Stack E2E (seed ch.2) chạy, healthy
await step('4 compose E2E (tiemtruyen-e2e, FLYWAY_DATA_LOCATION=classpath:db/e2e) up --wait', () => {
  requireDocker(runner);
  const normal = run(runner, 'docker', ['compose', '-p', 'tiemtruyen', 'ps', '-q', 'nginx']);
  if (normal.out.trim()) {
    throw new Error('stack thường (project tiemtruyen) đang giữ cổng 8080 → docker compose down (KHÔNG -v) rồi chạy lại');
  }
  mustRun(runner, 'docker', [...E2E, 'up', '--build', '-d', '--wait', '--wait-timeout', '420'], {
    fix: 'docker compose -p tiemtruyen-e2e -f compose.yaml -f compose.e2e.yaml logs app',
  });
});

// 5. Smoke chức năng 1 và 2 (kịch bản ch.2 mục 2.1, 2.2; CSRF 403; chưa đăng nhập về LoginView)
await step('5 smoke flow-m1-m2.mjs xanh trên stack E2E', () => {
  const r = run(runner, process.execPath, [join(ROOT, 'scripts', 'smoke', 'flow-m1-m2.mjs')]);
  if (r.code !== 0) {
    const fail = r.out.split('\n').find((l) => l.startsWith('[smoke] FAIL')) ?? r.out.trim().split('\n').pop();
    throw new Error(`${fail} → sửa trang của lane sở hữu, chạy lại node scripts/smoke/flow-m1-m2.mjs`);
  }
  return r.out.split('\n').find((l) => l.startsWith('[smoke] ALL PASS'))?.replace('[smoke] ', '');
});

runner.finish();
