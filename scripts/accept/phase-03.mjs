#!/usr/bin/env node
// Accept phase 3 (plans/261111-tiem-thue-truyen/phase-03-schema-dao-test.md, tiêu chí 1, 3, 4).
// Chạy: node scripts/accept/phase-03.mjs   (cần JDK 25, Docker cho Testcontainers và compose, .env)
// AX-05: mỗi test hỏng được nêu tên kèm lệnh chạy lại riêng test đó (đọc target/surefire-reports).
// Bước làm đỏ có chủ đích (ghi trong báo cáo lane 3C, 3D): bỏ FOR UPDATE của K1, thêm BookDAO.getBookById,
// sửa một chữ trong Messages thì bước 1 FAIL và nêu đúng test.
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, MVNW, createRunner, run, mustRun, findJava25, requireDocker, httpGet } from './_lib.mjs';

const runner = createRunner('phase-03');
const { step } = runner;

const ENV_PATH = join(ROOT, '.env');
const envValue = (key, fallback) => {
  if (!existsSync(ENV_PATH)) return fallback;
  const line = readFileSync(ENV_PATH, 'utf8').split(/\r?\n/).find((l) => l.startsWith(`${key}=`));
  return line ? line.slice(key.length + 1).trim() : fallback;
};
const BASE = `http://127.0.0.1:${envValue('NGINX_HTTP_PORT', '8080')}`;
const REQUIRED_TESTS = [
  'vn.tiemtruyen.dao.RentalBillConcurrencyTest',
  'vn.tiemtruyen.schema.SchemaConformanceTest',
  'vn.tiemtruyen.arch.ArchitectureTest',
  'vn.tiemtruyen.util.MessagesTest',
  'vn.tiemtruyen.util.SerializationTest',
];

/** Đọc target/surefire-reports/TEST-*.xml: trả { suites: Map<class, {tests, failed}>, failures: [Class#method] }. */
function surefire() {
  const dir = join(ROOT, 'target', 'surefire-reports');
  const suites = new Map();
  const failures = [];
  if (!existsSync(dir)) return { suites, failures };
  for (const f of readdirSync(dir).filter((n) => /^TEST-.*\.xml$/.test(n))) {
    const xml = readFileSync(join(dir, f), 'utf8');
    const name = /<testsuite[^>]*\sname="([^"]+)"/.exec(xml)?.[1] ?? f;
    const attr = (k) => Number(new RegExp(`<testsuite[^>]*\\s${k}="(\\d+)"`).exec(xml)?.[1] ?? 0);
    suites.set(name, { tests: attr('tests'), failed: attr('failures') + attr('errors') });
    for (const m of xml.matchAll(/<testcase\b([^>]*?)(?:\/>|>([\s\S]*?)<\/testcase>)/g)) {
      if (!/<(failure|error)\b/.test(m[2] ?? '')) continue;
      const method = /\sname="([^"]+)"/.exec(m[1])?.[1] ?? '?';
      const cls = /\sclassname="([^"]+)"/.exec(m[1])?.[1] ?? name;
      failures.push(`${cls.split('.').pop()}#${method.replace(/\(.*$/, '')}`);
    }
  }
  return { suites, failures };
}

// 1. mvnw -B clean verify (clean: ArchitectureTest đọc target/classes, bỏ .class cũ): Flyway V1, V2 (+ V10 e2e) trên mysql:8.4.13, DAO, tranh chấp, kiến trúc, schema, Messages
await step('1 mvnw -B clean verify (Testcontainers mysql:8.4.13)', () => {
  const javaHome = findJava25();
  requireDocker(runner);
  const r = run(runner, MVNW, ['-B', '-ntp', 'clean', 'verify'], { env: { JAVA_HOME: javaHome } });
  const { suites, failures } = surefire();
  if (r.code !== 0) {
    if (failures.length) {
      const cmds = failures.slice(0, 5).map((t) => `mvnw -B -Dtest=${t} -Dsurefire.failIfNoSpecifiedTests=false verify`);
      throw new Error(`${failures.length} test hỏng: ${failures.slice(0, 5).join(', ')} → chạy lại riêng: ${cmds.join(' ; ')}`);
    }
    throw new Error(`mvnw verify exit ${r.code} (không phải test: Checkstyle/biên dịch) → xem log ${runner.logPath}`);
  }
  const missing = REQUIRED_TESTS.filter((t) => !(suites.get(t)?.tests > 0));
  if (missing.length) throw new Error(`thiếu hoặc rỗng: ${missing.join(', ')} → lane sở hữu viết test`);
  const conc = suites.get('vn.tiemtruyen.dao.RentalBillConcurrencyTest');
  if (conc.tests < 4) throw new Error(`RentalBillConcurrencyTest chỉ có ${conc.tests} test, cần 4 → lane 3C`);
  const total = [...suites.values()].reduce((n, s) => n + s.tests, 0);
  return `${suites.size} lớp test, ${total} test`;
});

// 3. Compose khởi động lại sạch: listener chạy migration, health 200, có danh mục
await step('3 compose: app chạy migration, /health.jsp 200, tblDamage > 0', async () => {
  requireDocker(runner);
  if (!existsSync(ENV_PATH)) throw new Error('thiếu .env → node scripts/dev/make-env.mjs');
  mustRun(runner, 'docker', ['compose', 'up', '--build', '-d', '--wait', '--wait-timeout', '300'], {
    fix: 'docker compose logs app',
  });
  mustRun(runner, 'docker', ['compose', 'restart', 'app'], { fix: 'docker compose logs app' });
  mustRun(runner, 'docker', ['compose', 'up', '-d', '--wait', '--wait-timeout', '240', 'app', 'nginx'], {
    fix: 'docker compose logs app (MigrationListener)',
  });
  const health = await httpGet(`${BASE}/health.jsp`);
  if (health.status !== 200) throw new Error(`/health.jsp trả ${health.status} → docker compose logs app`);
  const q = run(runner, 'docker', ['compose', 'exec', '-T', 'db', 'sh', '-c',
    'mysql -N -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE" -e "SELECT COUNT(*) FROM tblDamage"']);
  const n = Number(/^\s*(\d+)\s*$/m.exec(q.out)?.[1] ?? 0);
  if (q.code !== 0 || !(n > 0)) throw new Error(`SELECT COUNT(*) FROM tblDamage = ${n} (exit ${q.code}) → kiểm MigrationListener và V2`);
  const logs = run(runner, 'docker', ['compose', 'logs', '--no-color', '--tail', '400', 'app']).out;
  if (/FlywayException|Migration .* failed|SEVERE.*MigrationListener/i.test(logs)) {
    throw new Error('log app có lỗi Flyway → docker compose logs app');
  }
  return `tblDamage=${n}`;
});

// 4. Chống thoái lui: Accept phase 1 và phase 2
for (const p of ['phase-01', 'phase-02']) {
  await step(`4 Accept ${p} vẫn xanh`, () => {
    const script = join(ROOT, 'scripts', 'accept', `${p}.mjs`);
    if (!existsSync(script)) throw new Error(`thiếu scripts/accept/${p}.mjs → merge main vào nhánh phase 3`);
    mustRun(runner, process.execPath, [script], { fix: `node scripts/accept/${p}.mjs rồi xem log của nó` });
  });
}

runner.finish();
