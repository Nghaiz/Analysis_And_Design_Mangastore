// Kiểm hợp đồng hạ tầng: plans/261111-tiem-thue-truyen/contract.md (§2 cây thư mục, §3 compose, §4 biến
// môi trường, §9 .gitignore). Chạy: node --test scripts/check/
// Danh sách biến đọc thẳng từ contract.md §4 (SSOT), không chép lại ở đây.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');
const CONTRACT = read('plans/261111-tiem-thue-truyen/contract.md');

function section(no) {
  const start = CONTRACT.indexOf(`\n## ${no}.`);
  assert.ok(start >= 0, `contract.md thiếu mục §${no}`);
  const end = CONTRACT.indexOf('\n## ', start + 4);
  return CONTRACT.slice(start, end < 0 ? undefined : end);
}

const CONTRACT_ENV = [...section(4).split('\n').find((l) => l.includes('`MYSQL_ROOT_PASSWORD`'))
  .matchAll(/`([A-Z][A-Z0-9_]+)`/g)].map((m) => m[1]);

const REQUIRED_PATHS = [
  'pom.xml', 'mvnw', 'mvnw.cmd', '.mvn/wrapper/maven-wrapper.properties',
  'compose.yaml', '.env.example', '.gitignore', '.gitattributes', '.editorconfig',
  'config/checkstyle/checkstyle.xml',
  'src/main/webapp/WEB-INF/web.xml', 'src/main/webapp/WEB-INF/tags/assets.tag',
  'src/main/webapp/health.jsp', 'src/main/webapp/dev/session-probe.jsp',
  'frontend/package.json', 'frontend/package-lock.json', 'frontend/vite.config.ts',
  'frontend/tsconfig.json', 'frontend/tsconfig.app.json', 'frontend/eslint.config.js',
  'frontend/components.json', 'frontend/src/loader/island-loader.ts', 'frontend/src/styles/app.css',
  'docker/app/Dockerfile', 'docker/nginx/Dockerfile', 'docker/mysql/conf.d', 'docker/redis/redis.conf',
  'scripts/dev/make-env.mjs', 'scripts/accept/phase-01.mjs',
];

test('cây thư mục tối thiểu (contract.md §2)', () => {
  const missing = REQUIRED_PATHS.filter((p) => !existsSync(join(ROOT, p)));
  assert.deepEqual(missing, [], `thiếu: ${missing.join(', ')}`);
});

test('Java chỉ có bốn package dao, model, filter, util (contract.md §2)', () => {
  const base = join(ROOT, 'src/main/java/vn/tiemtruyen');
  if (!existsSync(base)) return;
  const pkgs = readdirSync(base).filter((n) => statSync(join(base, n)).isDirectory());
  const extra = pkgs.filter((p) => !['dao', 'model', 'filter', 'util'].includes(p));
  assert.deepEqual(extra, [], `package ngoài hợp đồng: ${extra.join(', ')}`);
});

test('.env.example có đúng các biến của contract.md §4', () => {
  assert.ok(CONTRACT_ENV.length >= 18, `chỉ đọc được ${CONTRACT_ENV.length} biến từ §4`);
  const keys = read('.env.example').split(/\r?\n/)
    .filter((l) => /^[A-Z][A-Z0-9_]*=/.test(l)).map((l) => l.split('=')[0]);
  assert.deepEqual([...new Set(keys)].sort(), [...CONTRACT_ENV].sort());
  assert.equal(keys.length, new Set(keys).size, 'biến lặp trong .env.example');
});

function composeConfig() {
  const r = spawnSync('docker', ['compose', '--env-file', '.env.example', 'config', '--format', 'json'], {
    cwd: ROOT, encoding: 'utf8',
  });
  assert.ok(!r.error, `không chạy được docker compose (${r.error?.code}) → cài/mở Docker`);
  assert.equal(r.status, 0, `docker compose config lỗi: ${r.stderr}`);
  return JSON.parse(r.stdout);
}

test('compose: service, ảnh, cổng, healthcheck, volume (contract.md §3)', () => {
  const cfg = composeConfig();
  const s = cfg.services;
  assert.deepEqual(Object.keys(s).sort(), ['app', 'db', 'nginx', 'redis']);
  assert.equal(s.db.image, 'mysql:8.4.13');
  assert.equal(s.redis.image, 'redis:8.10.3');
  assert.equal(s.app.build.dockerfile, 'docker/app/Dockerfile');
  assert.match(s.nginx.build.context.replaceAll('\\', '/'), /docker\/nginx$/);

  const ports = (svc) => (s[svc].ports ?? []).map((p) => `${p.host_ip}:${p.published}->${p.target}`);
  assert.deepEqual(ports('db'), ['127.0.0.1:3307->3306']);
  assert.deepEqual(ports('nginx'), ['127.0.0.1:8080->80']);
  assert.deepEqual(ports('app'), []);
  assert.deepEqual(ports('redis'), []);

  for (const [name, svc] of Object.entries(s)) {
    assert.ok(svc.healthcheck?.test?.length, `${name} thiếu healthcheck`);
    assert.equal(svc.environment?.TZ, 'Asia/Ho_Chi_Minh', `${name} thiếu TZ`);
    for (const [dep, cond] of Object.entries(svc.depends_on ?? {})) {
      assert.equal(cond.condition, 'service_healthy', `${name} → ${dep} phải chờ service_healthy`);
    }
    for (const v of svc.volumes ?? []) {
      assert.ok(v.type === 'bind' || (v.type === 'volume' && v.source), `${name} có volume ẩn danh: ${v.target}`);
    }
  }
  assert.deepEqual(Object.keys(s.app.depends_on).sort(), ['db', 'redis']);
  assert.deepEqual(Object.keys(s.nginx.depends_on), ['app']);
  assert.deepEqual(Object.keys(cfg.volumes).sort(), ['catalog_data', 'covers_data', 'db_data', 'redis_data']);

  const mounts = (svc) => Object.fromEntries((s[svc].volumes ?? []).filter((v) => v.type === 'volume')
    .map((v) => [v.source, `${v.target}${v.read_only ? ':ro' : ''}`]));
  assert.deepEqual(mounts('db'), { db_data: '/var/lib/mysql' });
  assert.deepEqual(mounts('redis'), { redis_data: '/data' });
  assert.deepEqual(mounts('app'), { covers_data: '/srv/covers:ro', catalog_data: '/flyway/data:ro' });
  assert.deepEqual(mounts('nginx'), { covers_data: '/srv/covers:ro' });
});

test('.gitignore có các dòng tối thiểu (contract.md §9)', () => {
  const lines = read('.gitignore').split(/\r?\n/).map((l) => l.trim());
  for (const need of ['.env', '.env.*', '!.env.example', 'data/', 'node_modules/', 'target/',
    'src/main/webapp/static/', 'plans/reports/screens/', '/.claude/*', '!/.claude/rules/tiem-*.md',
    '!/.claude/skills/tiem-*/', '!/.claude/agents/tiem-*.md']) {
    assert.ok(lines.includes(need), `.gitignore thiếu "${need}"`);
  }
});
