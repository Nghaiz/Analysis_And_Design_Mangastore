#!/usr/bin/env node
// So từng byte các khối chép nguyên văn từ brief prompt-web-tiem-thue-truyen.md (phase 2, AX-04/AX-05):
//   - brief §10 (từ dòng "## 10." tới trước "## 11.") nằm giữa <!-- BEGIN brief-section-10 --> và
//     <!-- END brief-section-10 --> ở AGENTS.md và .claude/rules/tiem-cook-orchestration.md;
//   - brief §3 (từ "## 3." tới trước "## 4.") nằm giữa <!-- BEGIN brief-section-3 --> / END ở AGENTS.md.
// Exit 0: mọi khối khớp. Exit 1: lệch hoặc thiếu dấu (in vị trí byte lệch đầu tiên và việc cần làm).
// Exit 2: thiếu file nguồn. Tuỳ chọn: --root <thư mục> (dùng cho test).
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const BRIEF = 'prompt-web-tiem-thue-truyen.md';
export const markers = (n) => [`<!-- BEGIN brief-section-${n} -->\n`, `<!-- END brief-section-${n} -->`];
export const [BEGIN, END] = markers(10);
export const COPIES = ['AGENTS.md', '.claude/rules/tiem-cook-orchestration.md'];
/** Mục n của brief → các file phải chứa đúng bản sao giữa hai dấu. */
export const SECTIONS = [
  { n: 10, copies: COPIES },
  { n: 3, copies: ['AGENTS.md'] },
];

/** Toàn văn mục n của brief, gồm dòng tiêu đề và dòng trống cuối, không gồm tiêu đề mục n+1. */
export function briefSection(text, n) {
  const start = text.indexOf(`\n## ${n}.`);
  const end = text.indexOf(`\n## ${n + 1}.`, start + 1);
  if (start < 0 || end < 0) throw new Error(`${BRIEF} không có cặp tiêu đề "## ${n}." / "## ${n + 1}."`);
  return text.slice(start + 1, end + 1);
}
export const briefSection10 = (text) => briefSection(text, 10);

/** Khối giữa hai dấu; null khi thiếu dấu hoặc dấu xuất hiện nhiều lần. */
export function markedBlock(text, begin = BEGIN, end = END) {
  const b = text.indexOf(begin);
  if (b < 0 || text.indexOf(begin, b + 1) >= 0) return null;
  const e = text.indexOf(end, b + begin.length);
  if (e < 0 || text.indexOf(end, e + 1) >= 0) return null;
  return text.slice(b + begin.length, e);
}

/** Vị trí byte (UTF-8) lệch đầu tiên, -1 nếu bằng nhau. */
export function firstDiff(a, b) {
  const x = Buffer.from(a, 'utf8');
  const y = Buffer.from(b, 'utf8');
  const n = Math.min(x.length, y.length);
  for (let i = 0; i < n; i += 1) if (x[i] !== y[i]) return i;
  return x.length === y.length ? -1 : n;
}

function context(text, byte) {
  const buf = Buffer.from(text, 'utf8');
  return JSON.stringify(buf.subarray(Math.max(0, byte - 20), byte + 20).toString('utf8'));
}

/** Trả danh sách lỗi (rỗng = khớp). Ném Error khi thiếu file nguồn. */
export function check(root) {
  const briefPath = join(root, BRIEF);
  if (!existsSync(briefPath)) throw Object.assign(new Error(`thiếu ${BRIEF}`), { code: 2 });
  const brief = readFileSync(briefPath, 'utf8');
  const problems = [];
  for (const { n, copies } of SECTIONS) {
    const source = briefSection(brief, n);
    const [begin, end] = markers(n);
    for (const rel of copies) {
      const p = join(root, rel);
      if (!existsSync(p)) {
        problems.push(`${rel}: không có file → tạo file và chép nguyên văn brief §${n} giữa hai dấu`);
        continue;
      }
      const block = markedBlock(readFileSync(p, 'utf8'), begin, end);
      if (block === null) {
        problems.push(`${rel}: thiếu hoặc lặp dấu "${begin.trim()}" / "${end}" → đặt đúng một cặp dấu, mỗi dấu một dòng riêng`);
        continue;
      }
      const at = firstDiff(source, block);
      if (at >= 0) {
        problems.push(`${rel}: lệch brief §${n} ở byte ${at} của khối (brief ${context(source, at)} ≠ file ${context(block, at)}) → chép lại nguyên văn từ ${BRIEF}, không sửa tay`);
      }
    }
  }
  return problems;
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const i = process.argv.indexOf('--root');
  const root = i > 0 ? resolve(process.argv[i + 1]) : resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
  try {
    const problems = check(root);
    for (const p of problems) console.log(`[section10-sync] FAIL ${p}`);
    if (problems.length === 0) {
      const what = SECTIONS.map((s) => `brief §${s.n} → ${s.copies.join(', ')}`).join('; ');
      console.log(`[section10-sync] PASS khớp từng byte: ${what}`);
    }
    process.exit(problems.length === 0 ? 0 : 1);
  } catch (err) {
    console.log(`[section10-sync] FAIL ${err.message} → chạy ở gốc repo hoặc truyền --root`);
    process.exit(err.code === 2 ? 2 : 1);
  }
}
