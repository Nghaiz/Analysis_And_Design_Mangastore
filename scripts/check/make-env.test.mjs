// Kiểm scripts/dev/make-env.mjs (phase 1, lane 1C). Chạy: node --test "scripts/check/*.test.mjs"
// Chỉ ghi vào thư mục tạm qua --out, không bao giờ tạo .env thật trong repo.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SCRIPT = join(ROOT, 'scripts/dev/make-env.mjs');
const SECRETS = ['MYSQL_ROOT_PASSWORD', 'MYSQL_PASSWORD', 'REDIS_PASSWORD', 'APP_DB_PASSWORD'];

const parse = (text) => new Map(text.split(/\r?\n/).filter((l) => /^[A-Z][A-Z0-9_]*=/.test(l))
  .map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]));
const TEMPLATE = parse(readFileSync(join(ROOT, '.env.example'), 'utf8'));

function withTmp(fn) {
  const dir = mkdtempSync(join(tmpdir(), 'make-env-'));
  try {
    return fn(join(dir, '.env'));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function makeEnv(...args) {
  const r = spawnSync(process.execPath, [SCRIPT, ...args], { encoding: 'utf8', env: { ...process.env, NO_COLOR: '1' } });
  assert.ifError(r.error);
  return { code: r.status, out: `${r.stdout}${r.stderr}` };
}

test('tạo file đủ mọi biến của .env.example, mật khẩu ngẫu nhiên, biến app khớp MySQL', () => withTmp((out) => {
  const r = makeEnv('--out', out);
  assert.equal(r.code, 0, r.out);
  const env = parse(readFileSync(out, 'utf8'));
  assert.deepEqual([...env.keys()], [...TEMPLATE.keys()]);
  for (const key of ['MYSQL_ROOT_PASSWORD', 'MYSQL_PASSWORD', 'REDIS_PASSWORD']) {
    assert.match(env.get(key), /^[A-Za-z0-9]{32}$/, `${key} không phải chuỗi 32 kí tự chữ số`);
  }
  assert.equal(new Set(['MYSQL_ROOT_PASSWORD', 'MYSQL_PASSWORD', 'REDIS_PASSWORD'].map((k) => env.get(k))).size, 3);
  assert.equal(env.get('APP_DB_PASSWORD'), env.get('MYSQL_PASSWORD'));
  assert.equal(env.get('APP_DB_USER'), env.get('MYSQL_USER'));
  for (const [key, value] of TEMPLATE) {
    if (!SECRETS.includes(key) && key !== 'APP_DB_USER') assert.equal(env.get(key), value, `${key} phải chép nguyên`);
  }
}));

test('không còn giá trị giữ chỗ (change-me) hay giá trị rỗng', () => withTmp((out) => {
  assert.equal(makeEnv('--out', out).code, 0);
  for (const [key, value] of parse(readFileSync(out, 'utf8'))) {
    assert.ok(value.length > 0, `${key} rỗng`);
    assert.doesNotMatch(value, /change-me/i, `${key} còn giá trị giữ chỗ`);
  }
}));

test('hai lần chạy cho mật khẩu khác nhau', () => {
  const a = withTmp((out) => (makeEnv('--out', out), parse(readFileSync(out, 'utf8'))));
  const b = withTmp((out) => (makeEnv('--out', out), parse(readFileSync(out, 'utf8'))));
  for (const key of SECRETS) assert.notEqual(a.get(key), b.get(key), `${key} lặp lại giữa hai lần chạy`);
});

test('từ chối ghi đè file đã có: exit 1, nêu việc cần làm, file giữ nguyên', () => withTmp((out) => {
  writeFileSync(out, 'KEEP=1\n');
  const r = makeEnv('--out', out);
  assert.equal(r.code, 1);
  assert.match(r.out, /FAIL .*đã tồn tại.*→ \S/);
  assert.equal(readFileSync(out, 'utf8'), 'KEEP=1\n');
}));

test('không bao giờ in giá trị bí mật ra màn hình', () => withTmp((out) => {
  const first = makeEnv('--out', out);
  const again = makeEnv('--out', out);
  const env = parse(readFileSync(out, 'utf8'));
  for (const key of SECRETS) {
    assert.ok(!first.out.includes(env.get(key)), `lần ghi in lộ ${key}`);
    assert.ok(!again.out.includes(env.get(key)), `lần từ chối in lộ ${key}`);
  }
  assert.match(first.out, /MYSQL_ROOT_PASSWORD/);
}));

test('tham số lạ hoặc --out thiếu đường dẫn: exit 2 kèm việc cần làm', () => {
  for (const args of [['--force'], ['--out']]) {
    const r = makeEnv(...args);
    assert.equal(r.code, 2, `${args.join(' ')}: ${r.out}`);
    assert.match(r.out, /FAIL .*→ \S/);
  }
});
