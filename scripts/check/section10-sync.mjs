#!/usr/bin/env node
// So từng byte toàn văn brief §10 ở ba nơi (brief §10 của dự án, phase 2 AX-04/AX-05):
//   1. prompt-web-tiem-thue-truyen.md: từ dòng "## 10." tới trước dòng "## 11." (nguồn gốc)
//   2. AGENTS.md: giữa <!-- BEGIN brief-section-10 --> và <!-- END brief-section-10 -->
//   3. .claude/rules/tiem-cook-orchestration.md: giữa cùng hai dấu
// Exit 0: khớp cả ba. Exit 1: lệch hoặc thiếu dấu (in vị trí byte lệch đầu tiên và việc cần làm).
// Exit 2: thiếu file nguồn. Tuỳ chọn: --root <thư mục> (dùng cho test).
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const BEGIN = '<!-- BEGIN brief-section-10 -->\n';
export const END = '<!-- END brief-section-10 -->';
export const BRIEF = 'prompt-web-tiem-thue-truyen.md';
export const COPIES = ['AGENTS.md', '.claude/rules/tiem-cook-orchestration.md'];

/** Toàn văn §10 của brief, gồm cả dòng tiêu đề và dòng trống cuối, không gồm dòng "## 11.". */
export function briefSection10(text) {
  const start = text.indexOf('\n## 10.');
  const end = text.indexOf('\n## 11.', start + 1);
  if (start < 0 || end < 0) throw new Error(`${BRIEF} không có cặp tiêu đề "## 10." / "## 11."`);
  return text.slice(start + 1, end + 1);
}

/** Khối giữa hai dấu; null khi thiếu dấu hoặc dấu xuất hiện nhiều lần. */
export function markedBlock(text) {
  const b = text.indexOf(BEGIN);
  if (b < 0 || text.indexOf(BEGIN, b + 1) >= 0) return null;
  const e = text.indexOf(END, b + BEGIN.length);
  if (e < 0 || text.indexOf(END, e + 1) >= 0) return null;
  return text.slice(b + BEGIN.length, e);
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
  const source = briefSection10(readFileSync(briefPath, 'utf8'));
  const problems = [];
  for (const rel of COPIES) {
    const p = join(root, rel);
    if (!existsSync(p)) {
      problems.push(`${rel}: không có file → tạo file và chép nguyên văn brief §10 giữa hai dấu`);
      continue;
    }
    const block = markedBlock(readFileSync(p, 'utf8'));
    if (block === null) {
      problems.push(`${rel}: thiếu hoặc lặp dấu "${BEGIN.trim()}" / "${END}" → đặt đúng một cặp dấu, mỗi dấu một dòng riêng`);
      continue;
    }
    const at = firstDiff(source, block);
    if (at >= 0) {
      problems.push(`${rel}: lệch brief §10 ở byte ${at} của khối (brief ${context(source, at)} ≠ file ${context(block, at)}) → chép lại nguyên văn từ ${BRIEF}, không sửa tay`);
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
    if (problems.length === 0) console.log(`[section10-sync] PASS brief §10 khớp từng byte ở ${COPIES.join(', ')}`);
    process.exit(problems.length === 0 ? 0 : 1);
  } catch (err) {
    console.log(`[section10-sync] FAIL ${err.message} → chạy ở gốc repo hoặc truyền --root`);
    process.exit(err.code === 2 ? 2 : 1);
  }
}
