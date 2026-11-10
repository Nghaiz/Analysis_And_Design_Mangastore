#!/usr/bin/env node
// Sinh .env từ .env.example với mật khẩu ngẫu nhiên (contract.md §4). Chỉ dùng module có sẵn của Node 24.
// Chạy: node scripts/dev/make-env.mjs [--out <đường dẫn>]
// - Không bao giờ in giá trị bí mật (AX-18): chỉ in tên biến.
// - Không ghi đè file đã có: exit 1 kèm việc cần làm. Không hỏi tương tác, không màu.
// Exit: 0 ghi xong; 1 từ chối hoặc ghi hỏng; 2 sai tham số hoặc thiếu .env.example.
import { randomInt } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const TEMPLATE = join(ROOT, '.env.example');
const TAG = '[make-env]';

// Mật khẩu sinh mới. Chỉ chữ và số: an toàn trong URL, trong shell ("-p$X", "--requirepass $X") và không
// bao giờ bắt đầu bằng "-" (redis-server hiểu "--..." là tên tuỳ chọn).
const GENERATED = ['MYSQL_ROOT_PASSWORD', 'MYSQL_PASSWORD', 'REDIS_PASSWORD'];
// Biến của app phải trùng với tài khoản MySQL mà ảnh mysql tạo lúc khởi tạo.
const LINKED = { APP_DB_PASSWORD: 'MYSQL_PASSWORD', APP_DB_USER: 'MYSQL_USER' };
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const PASSWORD_LENGTH = 32; // 32 kí tự từ 62 kí tự: khoảng 190 bit.
const LINE_RE = /^([A-Z][A-Z0-9_]*)=(.*)$/;

function fail(code, reason, todo) {
  process.stderr.write(`${TAG} FAIL ${reason} → ${todo}\n`);
  process.exit(code);
}

function parseArgs(argv) {
  let out = join(ROOT, '.env');
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') {
      process.stdout.write('Dùng: node scripts/dev/make-env.mjs [--out <đường dẫn>]   (mặc định: .env ở gốc repo)\n');
      process.exit(0);
    }
    if (arg !== '--out') fail(2, `tham số lạ "${arg}"`, 'chỉ dùng --out <đường dẫn> hoặc --help');
    const value = argv[i + 1];
    if (!value || value.startsWith('--')) fail(2, '--out thiếu đường dẫn', 'ví dụ: --out ./tmp/.env');
    out = resolve(value);
    i += 1;
  }
  return out;
}

function password() {
  let s = '';
  for (let i = 0; i < PASSWORD_LENGTH; i += 1) s += ALPHABET[randomInt(ALPHABET.length)];
  return s;
}

function render(templateText) {
  const lines = templateText.split(/\r?\n/);
  const values = new Map();
  for (const line of lines) {
    const m = LINE_RE.exec(line);
    if (m) values.set(m[1], m[2]);
  }
  const needed = [...GENERATED, ...Object.keys(LINKED), ...Object.values(LINKED)];
  const missing = [...new Set(needed)].filter((k) => !values.has(k));
  if (missing.length) {
    fail(1, `.env.example thiếu biến ${missing.join(', ')}`, 'đồng bộ .env.example với contract.md §4');
  }
  for (const key of GENERATED) values.set(key, password());
  for (const [key, source] of Object.entries(LINKED)) values.set(key, values.get(source));

  const body = lines.map((line) => {
    const m = LINE_RE.exec(line);
    return m ? `${m[1]}=${values.get(m[1])}` : line;
  }).join('\n');
  const copied = [...values.keys()].filter((k) => !GENERATED.includes(k) && !(k in LINKED));
  return { body: body.endsWith('\n') ? body : `${body}\n`, copied };
}

const out = parseArgs(process.argv.slice(2));
if (!existsSync(TEMPLATE)) fail(2, `không thấy ${TEMPLATE}`, 'chạy từ repo đã checkout đủ (git restore .env.example)');
if (existsSync(out)) {
  fail(1, `${out} đã tồn tại, không ghi đè`,
    'giữ file cũ; muốn tạo lại thì tự xoá hoặc đổi tên file đó rồi chạy lại (mật khẩu cũ trong volume db/redis sẽ không còn khớp)');
}

const { body, copied } = render(readFileSync(TEMPLATE, 'utf8'));
try {
  // flag "wx": thất bại nếu file vừa xuất hiện giữa lần kiểm và lần ghi; mode 0600 trên Linux/macOS.
  writeFileSync(out, body, { flag: 'wx', mode: 0o600 });
} catch (err) {
  fail(1, `không ghi được ${out} (${err.code ?? err.message})`, 'kiểm quyền ghi thư mục đích hoặc file đã tồn tại');
}

process.stdout.write(`${TAG} OK đã ghi ${out}\n`);
process.stdout.write(`${TAG} sinh ngẫu nhiên: ${GENERATED.join(', ')}\n`);
process.stdout.write(`${TAG} gán theo: ${Object.entries(LINKED).map(([k, v]) => `${k} = ${v}`).join(', ')}\n`);
process.stdout.write(`${TAG} chép từ .env.example: ${copied.join(', ')}\n`);
