#!/usr/bin/env node
// Accept phase 1 (plans/261111-tiem-thue-truyen/phase-01-khung-du-an-ha-tang.md, tiêu chí 1–8).
// Chạy: node scripts/accept/phase-01.mjs   (cần .env, JDK 25, Docker, Node 24)
// Bước làm đỏ có chủ đích: dừng container redis thì bước 5 phải FAIL (ghi trong báo cáo phase).
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  ROOT, MVNW, IS_WIN, createRunner, run, mustRun, findJava25, requireDocker, httpGet,
} from './_lib.mjs';

const runner = createRunner('phase-01');
const { step } = runner;

const ENV_PATH = join(ROOT, '.env');
const envValue = (key, fallback) => {
  if (!existsSync(ENV_PATH)) return fallback;
  const line = readFileSync(ENV_PATH, 'utf8').split(/\r?\n/).find((l) => l.startsWith(`${key}=`));
  return line ? line.slice(key.length + 1).trim() : fallback;
};
const BASE = `http://127.0.0.1:${envValue('NGINX_HTTP_PORT', '8080')}`;
const NPM = IS_WIN ? 'npm.cmd' : 'npm';
const VOLUMES = ['db_data', 'redis_data', 'covers_data', 'catalog_data'];
const SERVICES = ['app', 'db', 'redis', 'nginx'];
const SECURITY_HEADERS = ['content-security-policy', 'x-content-type-options', 'referrer-policy', 'permissions-policy'];

function compose(args, opts = {}) {
  return run(runner, 'docker', ['compose', ...args], opts);
}

function manifest() {
  const p = join(ROOT, 'src/main/webapp/static/.vite/manifest.json');
  if (!existsSync(p)) throw new Error('chưa có static/.vite/manifest.json → npm --prefix frontend run build');
  return JSON.parse(readFileSync(p, 'utf8'));
}

function serviceStates() {
  const r = compose(['ps', '--all', '--format', 'json']);
  if (r.code !== 0) throw new Error(`docker compose ps exit ${r.code} → xem log`);
  const rows = r.out.trim().startsWith('[')
    ? JSON.parse(r.out)
    : r.out.trim().split('\n').filter(Boolean).map((l) => JSON.parse(l));
  return Object.fromEntries(rows.map((s) => [s.Service, `${s.State}/${s.Health || 'none'}`]));
}

// 1. Maven verify trên JDK 25 (Checkstyle + test util)
await step('1 mvnw -B verify (JDK 25)', () => {
  const javaHome = findJava25();
  if (!existsSync(MVNW)) throw new Error('thiếu Maven Wrapper → lane 1A tạo mvnw, mvnw.cmd, .mvn/wrapper');
  mustRun(runner, MVNW, ['-B', '-ntp', 'verify'], {
    env: { JAVA_HOME: javaHome },
    fix: 'sửa lỗi Checkstyle/test trong log rồi chạy lại',
  });
  return `JAVA_HOME=${javaHome}`;
});

// 2. Frontend lint, test, build + manifest có entry loader
await step('2 frontend lint/test/build + manifest', () => {
  if (!existsSync(join(ROOT, 'frontend/node_modules'))) {
    mustRun(runner, NPM, ['--prefix', 'frontend', 'ci'], { fix: 'kiểm package-lock.json' });
  }
  for (const s of ['lint', 'test', 'build']) {
    mustRun(runner, NPM, ['--prefix', 'frontend', 'run', s], { fix: `sửa lỗi npm run ${s} trong frontend/` });
  }
  const m = manifest();
  for (const key of ['src/loader/island-loader.ts', 'src/styles/app.css']) {
    if (!m[key]?.isEntry) throw new Error(`manifest thiếu entry ${key} → kiểm vite.config.ts (contract.md §5)`);
  }
  return 'entry island-loader.ts + app.css';
});

// 3. Compose: 4 service healthy, đủ named volume
await step('3 docker compose up --wait: 4 service healthy, 4 named volume', () => {
  requireDocker(runner);
  if (!existsSync(ENV_PATH)) throw new Error('thiếu .env → node scripts/dev/make-env.mjs');
  mustRun(runner, 'docker', ['compose', 'up', '--build', '-d', '--wait', '--wait-timeout', '300'], {
    fix: 'docker compose logs <service>',
  });
  const states = serviceStates();
  const bad = SERVICES.filter((s) => states[s] !== 'running/healthy');
  if (bad.length) throw new Error(`service chưa healthy: ${bad.map((s) => `${s}=${states[s]}`).join(', ')} → docker compose logs`);
  const vols = run(runner, 'docker', ['volume', 'ls', '--format', '{{.Name}}']).out.split(/\s+/);
  const missing = VOLUMES.filter((v) => !vols.includes(`tiemtruyen_${v}`));
  if (missing.length) throw new Error(`thiếu volume ${missing.join(', ')} → kiểm compose.yaml`);
  return SERVICES.map((s) => `${s}=${states[s]}`).join(' ');
});

// 4. Qua nginx: health, brotli, security headers
await step('4 nginx: /health.jsp ok, /static br, security headers', async () => {
  const health = await httpGet(`${BASE}/health.jsp`);
  if (health.status !== 200 || !/\bok\b/.test(health.body.toString())) {
    throw new Error(`/health.jsp trả ${health.status} "${health.body.toString().slice(0, 80)}" → docker compose logs app`);
  }
  const jsFile = manifest()['src/loader/island-loader.ts'].file;
  const asset = await httpGet(`${BASE}/static/${jsFile}`, { 'Accept-Encoding': 'br' });
  if (asset.status !== 200) throw new Error(`/static/${jsFile} trả ${asset.status} → kiểm proxy /static/`);
  if (asset.headers['content-encoding'] !== 'br') {
    throw new Error(`/static/${jsFile} content-encoding=${asset.headers['content-encoding']} → bật brotli trong nginx.conf`);
  }
  const icon = await httpGet(`${BASE}/favicon.ico`);
  if (icon.status !== 200) throw new Error(`/favicon.ico trả ${icon.status} → location = /favicon.ico trong docker/nginx/conf.d/app.conf`);
  const home = await httpGet(`${BASE}/HomeView.jsp`);
  for (const [name, res] of [['/health.jsp', health], ['/static', asset], ['/HomeView.jsp', home]]) {
    const miss = SECURITY_HEADERS.filter((h) => !res.headers[h]);
    if (miss.length) throw new Error(`${name} thiếu header ${miss.join(', ')} → snippets/security-headers.conf (add_header ... always)`);
    if (!/frame-ancestors 'none'/.test(res.headers['content-security-policy'])) {
      throw new Error(`${name} CSP thiếu frame-ancestors 'none' → sửa security-headers.conf`);
    }
  }
  mustRun(runner, process.execPath, ['scripts/check/csp-page-check.mjs', '--mode', 'build', '--url', `${BASE}/HomeView.jsp`], {
    fix: 'CSP phải đúng từng kí tự contract.md §10 khi APP_VITE_DEV=false → docker/nginx/docker-entrypoint.d/30-tiem-csp.sh',
  });
  return `br ${jsFile}, CSP đúng contract.md §10`;
});

// 5. Session Redis sống qua lần khởi động lại app
await step('5 session Redis còn sau khi restart app', async () => {
  const probe = async (cookie) => {
    const res = await httpGet(`${BASE}/dev/session-probe.jsp`, cookie ? { Cookie: cookie } : {});
    const m = /count=(\d+)/.exec(res.body.toString());
    if (res.status !== 200 || !m) throw new Error(`session-probe trả ${res.status} → kiểm /dev/session-probe.jsp`);
    const set = [res.headers['set-cookie'] ?? []].flat().find((c) => c.startsWith('JSESSIONID='));
    return { count: Number(m[1]), cookie: set ? set.split(';')[0] : cookie };
  };
  const a = await probe();
  const b = await probe(a.cookie);
  if (a.count !== 1 || b.count !== 2) throw new Error(`đếm ${a.count},${b.count} thay vì 1,2 → kiểm session-probe.jsp`);
  mustRun(runner, 'docker', ['compose', 'restart', 'app'], { fix: 'docker compose logs app' });
  mustRun(runner, 'docker', ['compose', 'up', '-d', '--wait', '--wait-timeout', '180', 'app', 'nginx'], {
    fix: 'docker compose logs app',
  });
  const c = await probe(b.cookie);
  if (c.count !== 3) throw new Error(`sau restart đếm ${c.count} thay vì 3 → kiểm RedissonSessionManager trong context.xml`);
  return 'đếm 1,2 → restart app → 3';
});

// 6. Phiên bản thực tế trong container
await step('6 phiên bản: Java 25, Tomcat 11.0.27, MySQL 8.4.13, Redis 8.10.3', () => {
  const checks = [
    ['app', ['java', '-version'], /version "25\./, 'Java 25'],
    ['app', ['sh', '-c', '"$CATALINA_HOME/bin/version.sh"'], /Apache Tomcat\/11\.0\.27/, 'Tomcat 11.0.27'],
    ['db', ['mysqld', '--version'], /\b8\.4\.13\b/, 'MySQL 8.4.13'],
    ['redis', ['redis-server', '--version'], /v=8\.10\.3\b/, 'Redis 8.10.3'],
  ];
  for (const [svc, cmd, re, label] of checks) {
    const r = compose(['exec', '-T', svc, ...cmd]);
    if (r.code !== 0 || !re.test(r.out)) throw new Error(`${svc} không phải ${label}: ${r.out.trim().slice(0, 120)} → kiểm thẻ ảnh`);
  }
  // Cấu hình MySQL thật sự được nạp (Windows mount 0777 làm MySQL bỏ qua file .cnf)
  const vars = compose(['exec', '-T', 'db', 'sh', '-c',
    'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysql -uroot -N -e "SELECT @@time_zone, @@character_set_server, @@collation_server, @@character_set_client"']);
  const got = vars.out.trim().split(/\s+/).slice(-4).join(' ');
  if (got !== '+07:00 utf8mb4 utf8mb4_0900_ai_ci utf8mb4') {
    throw new Error(`MySQL nạp sai cấu hình (${got}) → kiểm docker/mysql/conf.d và entrypoint của db trong compose.yaml`);
  }
  return 'đủ 4, MySQL +07:00 utf8mb4';
});

// 7. Ignore: bí mật, dữ liệu và bộ kit; chỉ file tiem-* của .claude vào repo
await step('7 git check-ignore', () => {
  const ignored = ['.env', 'data/', '.claude/.t1k.json', '.claude/agents/planner.md', '.claude/rules/code-conventions-web.md'];
  const tracked = ['.claude/rules/tiem-x.md', '.claude/skills/tiem-x/SKILL.md', '.claude/agents/tiem-x.md'];
  for (const p of ignored) {
    if (run(runner, 'git', ['check-ignore', '-q', '--no-index', p]).code !== 0) throw new Error(`${p} không bị ignore → sửa .gitignore`);
  }
  for (const p of tracked) {
    if (run(runner, 'git', ['check-ignore', '-q', '--no-index', p]).code === 0) throw new Error(`${p} bị ignore → sửa whitelist .claude trong .gitignore`);
  }
  const files = run(runner, 'git', ['ls-files']).out.split('\n');
  if (files.some((f) => f === '.env' || /^\.env\.(?!example$)/.test(f))) throw new Error('.env nằm trong git → git rm --cached .env');
  return `${ignored.length} ignore, ${tracked.length} không ignore`;
});

// 8. Kiểm hợp đồng
// Node 24 không nhận thư mục trần cho --test, nên truyền glob (cùng tập file với "scripts/check/").
await step('8 node --test scripts/check/*.test.mjs', () => {
  mustRun(runner, process.execPath, ['--test', 'scripts/check/*.test.mjs'], { fix: 'sửa theo test hỏng trong log' });
});

runner.finish();
