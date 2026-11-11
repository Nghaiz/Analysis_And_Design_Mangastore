#!/usr/bin/env node
// Kiểm tương phản WCAG 2.x (phase-05-ui-contract.md §6, docs/design-tokens.md §1).
//
// Chạy: npm --prefix frontend run check:contrast
//       tuỳ chọn: --doc <design-tokens.md>  --css <tokens.css>   (mặc định: file thật của repo)
//
// Đọc bảng "## 1. Màu" của docs/design-tokens.md:
//   - cột giá trị (hex) phải trùng --color-<tên> trong frontend/src/styles/tokens.css, và mọi
//     --color-* viết bằng hex trong tokens.css phải có trong bảng (lệch hai file là lỗi);
//   - cột tương phản khai cặp chữ/nền:
//       "a / b / c"            token là chữ, trên từng nền ghi ở tiêu đề cột "(paper / paper-deep / tape)"
//       "N với chữ `--x`"      token là nền, chữ là --x
//       "N trên `--x`"         token là chữ, nền là --x
//       "nền"                  chỉ là nền, không có cặp
//   - mỗi cặp tính lại tỉ lệ từ hex THẬT trong tokens.css: dưới 4.5:1 (AA chữ cỡ thường) là lỗi;
//     số ghi trong tài liệu lệch số tính lại quá 0.01 cũng là lỗi (tài liệu cũ).
// Exit 0: đạt. Exit 1: vi phạm (in token, nền, tỉ lệ, ngưỡng). Exit 2: thiếu file hoặc thiếu bảng.
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const FRONTEND = join(dirname(fileURLToPath(import.meta.url)), '..');
const ROOT = join(FRONTEND, '..');
const AA_NORMAL_TEXT = 4.5;
const DOC_TOLERANCE = 0.01;
const TAG = '[check-contrast]';

const args = process.argv.slice(2);
const argValue = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const DOC = argValue('--doc') ?? join(ROOT, 'docs', 'design-tokens.md');
const CSS = argValue('--css') ?? join(FRONTEND, 'src', 'styles', 'tokens.css');

function exitMissing(message) {
  console.error(`${TAG} THIẾU ĐẦU VÀO: ${message}`);
  process.exit(2);
}

function luminance(hex) {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function ratio(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const cells = (line) => line.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
const tokenName = (cell) => /`--([a-z0-9-]+)`/.exec(cell)?.[1];

function readDocTable(text) {
  const section = /^## 1\. Màu\s*$([\s\S]*?)(?=^## )/m.exec(text)?.[1];
  if (!section) exitMissing(`${DOC} không có mục "## 1. Màu"`);
  const lines = section.split(/\r?\n/).filter((l) => l.trim().startsWith('|'));
  if (lines.length < 3) exitMissing(`${DOC} mục "## 1. Màu" không có bảng`);
  const header = cells(lines[0]);
  const contrastCol = header.findIndex((h) => h.startsWith('Tương phản'));
  const valueCol = header.findIndex((h) => h === 'Giá trị');
  const bgList = /\(([^)]+)\)/.exec(header[contrastCol] ?? '')?.[1].split('/').map((s) => s.trim());
  if (contrastCol < 0 || valueCol < 0 || !bgList?.length) {
    exitMissing(`${DOC}: tiêu đề bảng màu phải có cột "Giá trị" và "Tương phản (nền1 / nền2 / …)"`);
  }
  return lines.slice(2).map((line) => {
    const c = cells(line);
    return { token: tokenName(c[0]), value: c[valueCol]?.replace(/`/g, ''), contrast: c[contrastCol] ?? '', raw: line.trim() };
  }).concat([{ bgList }]);
}

function readCss(text) {
  const map = new Map();
  for (const m of text.matchAll(/--color-([a-z0-9-]+)\s*:\s*(#[0-9a-fA-F]+)\s*;/g)) map.set(m[1], m[2].toUpperCase());
  return map;
}

function main() {
  if (!existsSync(DOC)) exitMissing(`${DOC} không có`);
  if (!existsSync(CSS)) exitMissing(`${CSS} không có`);
  const rows = readDocTable(readFileSync(DOC, 'utf8'));
  const { bgList } = rows.pop();
  const css = readCss(readFileSync(CSS, 'utf8'));
  const violations = [];
  const pairs = [];

  for (const row of rows) {
    if (!row.token) {
      violations.push(`dòng bảng màu không có tên token \`--x\`: ${row.raw} → sửa docs/design-tokens.md`);
      continue;
    }
    const docHex = row.value?.toUpperCase();
    if (!/^#[0-9A-F]{6}$/.test(docHex ?? '')) {
      violations.push(`--${row.token}: giá trị trong tài liệu "${row.value}" không phải hex 6 chữ số`);
    }
    const cssHex = css.get(row.token);
    if (!cssHex) {
      violations.push(`--${row.token} có trong tài liệu nhưng tokens.css không có --color-${row.token} → thêm vào @theme`);
      continue;
    }
    if (docHex && cssHex !== docHex) {
      violations.push(`--${row.token}: tokens.css ${cssHex} ≠ tài liệu ${docHex} → sửa cho hai file trùng nhau`);
    }

    const c = row.contrast;
    let m;
    if (c === 'nền') continue;
    if ((m = /^([\d.]+(?:\s*\/\s*[\d.]+)+)$/.exec(c))) {
      const nums = m[1].split('/').map((n) => Number(n.trim()));
      if (nums.length !== bgList.length) {
        violations.push(`--${row.token}: ${nums.length} số tương phản nhưng tiêu đề có ${bgList.length} nền (${bgList.join(', ')})`);
        continue;
      }
      nums.forEach((doc, i) => pairs.push({ fg: row.token, bg: bgList[i], doc }));
    } else if ((m = /^([\d.]+)\s+với chữ\s+`--([a-z0-9-]+)`$/.exec(c))) {
      pairs.push({ fg: m[2], bg: row.token, doc: Number(m[1]) });
    } else if ((m = /^([\d.]+)\s+trên\s+`--([a-z0-9-]+)`$/.exec(c))) {
      pairs.push({ fg: row.token, bg: m[2], doc: Number(m[1]) });
    } else {
      violations.push(`--${row.token}: không hiểu ô tương phản "${c}" (dạng nhận: "nền", "a / b / c", "N với chữ \`--x\`", "N trên \`--x\`")`);
    }
  }

  const documented = new Set(rows.map((r) => r.token));
  for (const name of css.keys()) {
    if (!documented.has(name)) violations.push(`tokens.css có --color-${name} nhưng docs/design-tokens.md §1 không có → thêm dòng vào bảng hoặc bỏ token`);
  }

  for (const p of pairs) {
    const fg = css.get(p.fg);
    const bg = css.get(p.bg);
    if (!fg || !bg) {
      violations.push(`cặp --${p.fg} trên --${p.bg}: thiếu ${!fg ? `--color-${p.fg}` : `--color-${p.bg}`} trong tokens.css`);
      continue;
    }
    const r = ratio(fg, bg);
    const label = `--${p.fg} (${fg}) trên --${p.bg} (${bg})`;
    if (r < AA_NORMAL_TEXT) {
      violations.push(`${label}: ${r.toFixed(2)}:1 < ${AA_NORMAL_TEXT}:1 (AA chữ cỡ thường) → làm đậm màu chữ trong tokens.css và docs/design-tokens.md`);
    } else if (Math.abs(r - p.doc) > DOC_TOLERANCE) {
      violations.push(`${label}: tài liệu ghi ${p.doc} nhưng tính được ${r.toFixed(2)} (lệch > ${DOC_TOLERANCE}) → sửa số trong docs/design-tokens.md`);
    } else {
      console.log(`${TAG} ok ${label}: ${r.toFixed(2)}:1`);
    }
  }

  if (violations.length) {
    for (const v of violations) console.error(`${TAG} FAIL ${v}`);
    console.error(`${TAG} FAIL ${violations.length} vi phạm trên ${pairs.length} cặp chữ/nền (ngưỡng ${AA_NORMAL_TEXT}:1)`);
    process.exit(1);
  }
  console.log(`${TAG} PASS ${pairs.length} cặp chữ/nền đều ≥ ${AA_NORMAL_TEXT}:1; ${css.size} token màu khớp docs/design-tokens.md`);
}

main();
