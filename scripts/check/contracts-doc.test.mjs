// docs/contracts.md phải phủ đủ hợp đồng nghiệp vụ (phase 2, tiêu chí 2). Danh sách KHÔNG chép ở đây mà
// đọc từ nguồn đã duyệt: brief §3 (28 trang, 13 bảng), brainstorm §2.2 (28 thông báo), §2.3 (hàm DAO,
// 12 thuộc tính session), contract.md §5 (4 island). Sửa nguồn thì test tự theo.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');
const BRIEF = read('prompt-web-tiem-thue-truyen.md');
const BRAIN = read('plans/reports/brainstorm-261111-web-tiem-thue-truyen.md');
const PLAN_CONTRACT = read('plans/261111-tiem-thue-truyen/contract.md');
const DOC = read('docs/contracts.md');

const between = (text, from, to) => {
  const a = text.indexOf(from);
  assert.ok(a >= 0, `không thấy "${from}"`);
  const b = text.indexOf(to, a + from.length);
  return text.slice(a, b < 0 ? undefined : b);
};
const lineStarting = (text, prefix) => {
  const l = text.split('\n').find((x) => x.startsWith(prefix));
  assert.ok(l, `không thấy dòng bắt đầu bằng "${prefix}"`);
  return l;
};
const missing = (items, pred) => items.filter((x) => !pred(x));

const PAGES = lineStarting(BRIEF, '**Trang JSP').split(':**')[1]
  .replace(/\.\s*$/, '').split(',').map((s) => s.trim()).filter(Boolean);
const TABLES = [...new Set(lineStarting(BRIEF, '**Bảng MySQL:**').match(/tbl[A-Z]\w+/g))];
const MESSAGES = between(BRAIN, '### 2.2', '### 2.3').split('\n')
  .filter((l) => l.startsWith('| ') && !l.startsWith('| Nơi'))
  .flatMap((l) => [...l.matchAll(/"([^"]+)"/g)].map((m) => m[1]));
const isDaoRow = (l) => /^\| (\w+DAO\b|DAO \|)/.test(l) && !l.includes('| Hàm |');
const daoRows = between(BRAIN, '### 2.3', 'Tên thuộc tính session').split('\n').filter(isDaoRow);
const DAOS = daoRows.map((l) => l.split('|')[1].trim().split(' ')[0]);
const DAO_FUNCTIONS = [...new Set(daoRows.flatMap((l) => [...l.split('|')[2].matchAll(/`(\w+)(?:\(|`)/g)]
  .map((m) => m[1])).filter((n) => n !== 'con'))];
const SESSION_ATTRS = [...lineStarting(BRAIN, 'Tên thuộc tính session').split('Tên field form')[0]
  .matchAll(/`(\w+)`/g)].map((m) => m[1]);
const ISLANDS = [...lineStarting(PLAN_CONTRACT, '- Island (cách B)').split('Tên island:')[1]
  .split('.')[0].matchAll(/`(\w+)`/g)].map((m) => m[1]);

test('nguồn đọc ra đúng số lượng đã duyệt', () => {
  assert.equal(PAGES.length, 28, `trang: ${PAGES.join(',')}`);
  assert.equal(TABLES.length, 13);
  assert.equal(MESSAGES.length, 28);
  assert.equal(SESSION_ATTRS.length, 12);
  assert.equal(ISLANDS.length, 4);
  assert.equal(DAOS.length, 9, `DAO: ${DAOS}`);
  assert.equal(DAO_FUNCTIONS.length, 15, `hàm: ${DAO_FUNCTIONS}`);
});

test('đủ 28 trang JSP đúng tên (Tên.jsp)', () => {
  assert.deepEqual(missing(PAGES, (p) => DOC.includes(`${p}.jsp`)), []);
});

test('đủ 13 bảng', () => {
  assert.deepEqual(missing(TABLES, (t) => new RegExp(`\\b${t}\\b`).test(DOC)), []);
});

test('đủ 28 thông báo nguyên văn, mỗi câu một dòng | HẰNG_SỐ | Câu |', () => {
  assert.match(DOC, /\| Hằng số \| Câu \|/);
  // Chỉ đọc các dòng liền nhau của (mọi) bảng có tiêu đề | Hằng số | Câu |, bỏ dòng kẻ |---|.
  const lines = DOC.split('\n');
  const rows = [];
  lines.forEach((l, i) => {
    if (!l.startsWith('| Hằng số | Câu |')) return;
    for (let j = i + 2; j < lines.length && lines[j].startsWith('|'); j += 1) rows.push(lines[j]);
  });
  assert.equal(rows.length, MESSAGES.length, `bảng thông báo có ${rows.length} dòng, cần ${MESSAGES.length}`);
  const sentences = rows.map((l) => l.split('|')[2].trim().replace(/^"|"$/g, ''));
  assert.deepEqual(missing(MESSAGES, (m) => sentences.includes(m)), [], 'câu thiếu hoặc lệch chữ');
  const names = rows.map((l) => l.split('|')[1].trim().replaceAll('`', ''));
  assert.equal(new Set(names).size, names.length, 'tên hằng số lặp');
});

test('đủ DAO và hàm DAO (không gộp)', () => {
  assert.deepEqual(missing(DAOS, (d) => new RegExp(`\\b${d}\\b`).test(DOC)), []);
  assert.deepEqual(missing(DAO_FUNCTIONS, (f) => DOC.includes(`${f}(`)), []);
});

test('đủ 12 thuộc tính session', () => {
  assert.deepEqual(missing(SESSION_ATTRS, (a) => DOC.includes(`\`${a}\``)), []);
});

test('props đủ 4 island (interface <Tên>Props trong khối ts)', () => {
  const blocks = [...DOC.matchAll(/```ts\n([\s\S]*?)```/g)].map((m) => m[1]).join('\n');
  assert.deepEqual(missing(ISLANDS, (i) => new RegExp(`interface ${i}Props\\b`).test(blocks)), []);
});

test('getById và DAO cho lớp trung gian chỉ được nhắc trong câu cấm', () => {
  const forbidden = ['getById', 'SelectedBookDAO', 'RentedBookDAO', 'RentedDamageDAO', 'RentalCollateralDAO'];
  const bad = DOC.split('\n').filter((l) => forbidden.some((f) => l.includes(f)) && !/cấm|không/i.test(l));
  assert.deepEqual(bad, []);
});
