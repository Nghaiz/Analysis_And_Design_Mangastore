// docs/schema.md §3 phải chép đúng từng dòng bảng cột của docs/contracts.md §2 (SSOT). So các dòng bảng
// (bắt đầu bằng "|") dưới mỗi tiêu đề "### tblX"; ghi chú văn xuôi được phép khác. Sửa contracts.md thì
// chép lại bảng sang schema.md.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');

/** Map tên bảng → các dòng bảng dưới tiêu đề "### tblX" (dừng ở tiêu đề kế tiếp). */
export function tables(text) {
  const out = new Map();
  let cur = null;
  for (const line of text.split(/\r?\n/)) {
    const h = /^#{2,3} (\S+)/.exec(line);
    if (h) { cur = /^tbl[A-Z]\w*$/.test(h[1]) ? h[1] : null; if (cur) out.set(cur, []); continue; }
    if (cur && line.startsWith('|')) out.get(cur).push(line.trimEnd());
  }
  return out;
}

const SSOT = tables(read('docs/contracts.md'));
const COPY = tables(read('docs/schema.md'));

test('contracts.md §2 có đủ 13 bảng', () => {
  assert.equal(SSOT.size, 13, [...SSOT.keys()].join(','));
});

test('schema.md có đúng tập bảng của contracts.md', () => {
  assert.deepEqual([...COPY.keys()].sort(), [...SSOT.keys()].sort());
});

for (const [name, rows] of SSOT) {
  test(`${name}: dòng bảng khớp từng kí tự`, () => {
    assert.ok(rows.length > 2, `${name} không có dòng cột`);
    assert.deepEqual(COPY.get(name), rows, `docs/schema.md lệch docs/contracts.md ở ${name} → chép lại bảng từ contracts.md`);
  });
}

test('lệch một ô thì bắt được', () => {
  const broken = read('docs/schema.md').replace('FK→tblClient.userId, UNIQUE', 'FK→tblClient.userId');
  assert.notDeepEqual(tables(broken).get('tblCart'), SSOT.get('tblCart'));
});
