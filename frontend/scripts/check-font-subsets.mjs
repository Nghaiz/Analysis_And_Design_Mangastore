#!/usr/bin/env node
// Kiểm font tự host (phase-05-ui-contract.md §6, docs/design-tokens.md §2, ADR-0011).
//
// Chạy: npm --prefix frontend run check:fonts            (sau `npm --prefix frontend run build`)
//       node frontend/scripts/check-font-subsets.mjs --sync   (chép lại woff2 từ Fontsource vào public/fonts)
//       tuỳ chọn: --css-dir <thư mục CSS đã build>  (mặc định src/main/webapp/static/assets)
//
// Kiểm trên CSS ĐÃ BUILD:
//   1. Bốn họ font, mỗi độ đậm khai báo, có @font-face với unicode-range của subset vietnamese
//      (chứa U+1EA0-1EF9) và của subset latin (chứa U+0000-00FF).
//   2. Không có @font-face của bốn họ cho subset khác (latin-ext, cyrillic…): chỉ latin + vietnamese.
//   3. Mọi url() trong @font-face trỏ tới file có thật trong thư mục build, và không có URL ngoài
//      (fonts.googleapis.com, fonts.gstatic.com, CDN).
//   4. Bản chép trong frontend/public/fonts/ (woff2 và giấy phép OFL của từng họ) giống từng byte file
//      của gói Fontsource đang cài; không có file lạ.
//   5. layout.tag preload đúng các file của họ preload (Fuzzy Bubbles 400, Momo Trust Sans), không preload
//      họ nạp lười, và mọi href preload có file thật trong build.
//   6. Mọi tên họ font trong font-family và biến --font-* của CSS đã build là một trong bốn họ tự host,
//      một font hệ thống dự phòng (SYSTEM_FALLBACKS) hay từ khoá CSS: họ font đã bỏ còn sót là vi phạm.
// Exit 0: đạt. Exit 1: vi phạm (liệt kê từng dòng). Exit 2: thiếu đầu vào (chưa build, chưa npm ci).
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const FRONTEND = join(dirname(fileURLToPath(import.meta.url)), '..');
const ROOT = join(FRONTEND, '..');
const STATIC_DIR = join(ROOT, 'src', 'main', 'webapp', 'static');
const PUBLIC_FONTS = join(FRONTEND, 'public', 'fonts');
const LAYOUT_TAG = join(ROOT, 'src', 'main', 'webapp', 'WEB-INF', 'tags', 'layout.tag');
const PUBLIC_BASE = '/static/';
const FONTS_URL_PREFIX = `${PUBLIC_BASE}fonts/`;

const SUBSETS = {
  vietnamese: { probe: [0x1ea0, 0x1ef9], label: 'U+1EA0-1EF9' },
  latin: { probe: [0x0000, 0x00ff], label: 'U+0000-00FF' },
};

// Data: họ font → gói Fontsource, độ đậm, tên file trong gói, có preload hay không (docs/design-tokens.md §2).
const FAMILIES = [
  {
    family: 'Fuzzy Bubbles',
    pkg: '@fontsource/fuzzy-bubbles',
    weights: ['400', '700'],
    preloadWeights: ['400'],
    file: (subset, weight) => `fuzzy-bubbles-${subset}-${weight}-normal.woff2`,
  },
  {
    family: 'Momo Trust Sans',
    pkg: '@fontsource-variable/momo-trust-sans',
    weights: ['200 800'],
    preloadWeights: ['200 800'],
    file: (subset) => `momo-trust-sans-${subset}-wght-normal.woff2`,
  },
  {
    family: 'Momo Signature',
    pkg: '@fontsource/momo-signature',
    weights: ['400'],
    preloadWeights: [],
    file: (subset, weight) => `momo-signature-${subset}-${weight}-normal.woff2`,
  },
  {
    family: 'Momo Trust Display',
    pkg: '@fontsource/momo-trust-display',
    weights: ['400'],
    preloadWeights: [],
    file: (subset, weight) => `momo-trust-display-${subset}-${weight}-normal.woff2`,
  },
];

// Tên được phép trong font-family và biến --font-* của CSS đã build, ngoài bốn họ tự host: font hệ thống
// dự phòng của tokens.css, stack mặc định của Tailwind, từ khoá chung của CSS. Họ nào khác (ví dụ một họ
// font đã bỏ còn sót trong stack hay @font-face) là vi phạm.
const SYSTEM_FALLBACKS = [
  'system-ui', 'Segoe UI', 'Roboto', 'Segoe Script', 'Segoe Print',
  'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji',
  'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'Liberation Mono', 'Courier New',
  // stack dự phòng của preflight Tailwind: font-family: var(--default-font-family, …)
  '-apple-system', 'BlinkMacSystemFont', 'Helvetica Neue', 'Noto Sans', 'Arial',
];
const CSS_KEYWORDS = [
  'serif', 'sans-serif', 'monospace', 'cursive', 'fantasy', 'math', 'emoji', 'fangsong',
  'ui-serif', 'ui-sans-serif', 'ui-monospace', 'ui-rounded',
  'inherit', 'initial', 'unset', 'revert', 'revert-layer',
];

const TAG = '[check-font-subsets]';
const args = process.argv.slice(2);
const argValue = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};

function exitMissing(message) {
  console.error(`${TAG} THIẾU ĐẦU VÀO: ${message}`);
  process.exit(2);
}

/** Mọi file woff2 cần có: [{ family, weight, subset, name, source }] */
function expectedFiles() {
  return FAMILIES.flatMap((f) =>
    f.weights.flatMap((weight) =>
      Object.keys(SUBSETS).map((subset) => {
        const name = f.file(subset, weight);
        return { ...f, weight, subset, name, source: join(FRONTEND, 'node_modules', f.pkg, 'files', name) };
      }),
    ),
  );
}

/** Giấy phép SIL OFL 1.1 đi kèm font khi phân phối lại: một file mỗi họ */
function licenseFiles() {
  return FAMILIES.map((f) => ({
    ...f,
    name: `${f.pkg.split('/')[1]}-OFL.txt`,
    source: join(FRONTEND, 'node_modules', f.pkg, 'LICENSE'),
  }));
}

function sync() {
  mkdirSync(PUBLIC_FONTS, { recursive: true });
  for (const e of [...expectedFiles(), ...licenseFiles()]) {
    if (!existsSync(e.source)) exitMissing(`${relative(ROOT, e.source)} → chạy npm --prefix frontend ci`);
    copyFileSync(e.source, join(PUBLIC_FONTS, e.name));
    console.log(`${TAG} chép ${relative(FRONTEND, e.source).replaceAll('\\', '/')} → frontend/public/fonts/${e.name}`);
  }
  console.log(`${TAG} --sync xong; chạy lại build rồi npm --prefix frontend run check:fonts`);
}

/** "U+0102-0103, U+1EA0-1EF9" → [[0x102,0x103],[0x1ea0,0x1ef9]] */
function parseRanges(value) {
  return value.split(',').map((part) => {
    const m = /^U\+([0-9A-F?]+)(?:-([0-9A-F]+))?$/i.exec(part.trim());
    if (!m) return [NaN, NaN];
    const start = parseInt(m[1].replace(/\?/g, '0'), 16);
    const end = m[2] ? parseInt(m[2], 16) : parseInt(m[1].replace(/\?/g, 'F'), 16);
    return [start, end];
  });
}

const covers = (ranges, [a, b]) => ranges.some(([s, e]) => s <= a && e >= b);

function subsetOf(ranges) {
  return Object.entries(SUBSETS).find(([, s]) => covers(ranges, s.probe))?.[0];
}

function parseFontFaces(css, file) {
  const faces = [];
  for (const m of css.matchAll(/@font-face\s*\{([^}]*)\}/g)) {
    const body = m[1];
    const prop = (name) => new RegExp(`(?:^|;)\\s*${name}\\s*:\\s*([^;]+)`, 'i').exec(body)?.[1].trim();
    const family = prop('font-family')?.replace(/^["']|["']$/g, '');
    const urls = [...body.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/g)].map((u) => u[1]);
    const range = prop('unicode-range');
    faces.push({ file, family, weight: prop('font-weight') ?? '400', urls, range, ranges: range ? parseRanges(range) : null });
  }
  return faces;
}

/** Mọi tên họ font trong font-family, --*-font-family và --font-<tên> (bỏ qua --font-weight-*, --font-<tên>--*) */
function familyNames(css) {
  const out = [];
  for (const m of css.matchAll(/(?<![\w-])(font-family|--[\w-]*font-family|--font-(?!weight-)[\w-]+)\s*:\s*([^;}]+)/g)) {
    const prop = m[1];
    if (/^--font-[\w-]*--/.test(prop)) continue; // --font-x--font-feature-settings…: không phải họ font
    // var(--x, a, b) → a, b: tên trong phần dự phòng của var() cũng phải hợp lệ
    const value = m[2].replace(/!important\s*$/i, '').replace(/var\(\s*--[\w-]+\s*,?/g, '').replace(/\)/g, '');
    for (const raw of value.split(',')) {
      const name = raw.trim().replace(/^["']|["']$/g, '');
      if (name === '') continue;
      out.push({ prop, name });
    }
  }
  return out;
}

function main() {
  if (args.includes('--sync')) return sync();

  const cssDir = argValue('--css-dir') ?? join(STATIC_DIR, 'assets');
  if (!existsSync(cssDir)) exitMissing(`${relative(ROOT, cssDir) || cssDir} không có → chạy npm --prefix frontend run build`);
  const cssFiles = readdirSync(cssDir).filter((f) => f.endsWith('.css'));
  if (cssFiles.length === 0) exitMissing(`không có file .css trong ${cssDir} → chạy npm --prefix frontend run build`);
  if (!existsSync(join(FRONTEND, 'node_modules'))) exitMissing('frontend/node_modules không có → chạy npm --prefix frontend ci');
  if (!existsSync(LAYOUT_TAG)) exitMissing(`${relative(ROOT, LAYOUT_TAG)} không có`);

  const violations = [];
  const faces = cssFiles.flatMap((f) => parseFontFaces(readFileSync(join(cssDir, f), 'utf8'), f));
  const known = new Map(FAMILIES.map((f) => [f.family, f]));

  // 3a. URL ngoài ở bất kì đâu trong CSS đã build
  for (const f of cssFiles) {
    if (/fonts\.(googleapis|gstatic)\.com/.test(readFileSync(join(cssDir, f), 'utf8'))) {
      violations.push(`${f}: có fonts.googleapis.com / fonts.gstatic.com → bỏ import Google Fonts, dùng fonts.css tự host`);
    }
  }

  for (const face of faces) {
    if (!known.has(face.family)) continue;
    // 2. Chỉ subset latin + vietnamese
    const subset = face.ranges ? subsetOf(face.ranges) : undefined;
    if (!face.range) {
      violations.push(`${face.file}: @font-face "${face.family}" ${face.weight} không có unicode-range → thêm unicode-range của subset`);
    } else if (!subset) {
      violations.push(`${face.file}: @font-face "${face.family}" ${face.weight} có subset ngoài latin/vietnamese (unicode-range: ${face.range}) → bỏ khỏi fonts.css`);
    }
    // 3b. URL trỏ tới file có thật, trong /static/fonts/
    for (const url of face.urls) {
      if (!url.startsWith(FONTS_URL_PREFIX)) {
        violations.push(`${face.file}: "${face.family}" nạp từ ${url}, phải nằm dưới ${FONTS_URL_PREFIX} → sửa url() trong fonts.css`);
        continue;
      }
      const onDisk = join(STATIC_DIR, url.slice(PUBLIC_BASE.length));
      if (!existsSync(onDisk)) {
        violations.push(`${face.file}: "${face.family}" trỏ tới ${url} nhưng không có ${relative(ROOT, onDisk)} → chạy --sync rồi build lại`);
      }
    }
  }

  // 6. Không còn họ font lạ (họ đã bỏ) trong @font-face, font-family hay biến --font-*
  const allowed = new Set([...FAMILIES.map((f) => f.family), ...SYSTEM_FALLBACKS, ...CSS_KEYWORDS].map((n) => n.toLowerCase()));
  for (const f of cssFiles) {
    for (const { prop, name } of familyNames(readFileSync(join(cssDir, f), 'utf8'))) {
      if (!allowed.has(name.toLowerCase())) {
        violations.push(`${f}: ${prop} có họ font "${name}" không thuộc bốn họ tự host hay font hệ thống dự phòng → bỏ khỏi frontend/src/styles/ (tokens.css, fonts.css…)`);
      }
    }
  }

  // 1. Mỗi họ, mỗi độ đậm có đủ hai subset
  for (const f of FAMILIES) {
    for (const weight of f.weights) {
      for (const [subset, s] of Object.entries(SUBSETS)) {
        const ok = faces.some((face) => face.family === f.family && face.weight === weight && face.ranges && covers(face.ranges, s.probe));
        if (!ok) {
          violations.push(`"${f.family}" ${weight}: thiếu @font-face subset ${subset} (unicode-range chứa ${s.label}) trong CSS đã build → thêm vào frontend/src/styles/fonts.css`);
        }
      }
    }
  }

  // 4. Bản chép trong public/fonts khớp gói Fontsource
  const expected = expectedFiles();
  const copies = [...expected, ...licenseFiles()];
  for (const e of copies) {
    if (!existsSync(e.source)) {
      violations.push(`${relative(ROOT, e.source)} không có trong gói ${e.pkg} → kiểm phiên bản gói, sửa FAMILIES trong script`);
      continue;
    }
    const copy = join(PUBLIC_FONTS, e.name);
    if (!existsSync(copy)) {
      violations.push(`frontend/public/fonts/${e.name} không có → node frontend/scripts/check-font-subsets.mjs --sync`);
    } else if (!readFileSync(copy).equals(readFileSync(e.source))) {
      violations.push(`frontend/public/fonts/${e.name} lệch ${e.pkg} đang cài → node frontend/scripts/check-font-subsets.mjs --sync`);
    }
  }
  if (existsSync(PUBLIC_FONTS)) {
    const names = new Set(copies.map((e) => e.name));
    for (const extra of readdirSync(PUBLIC_FONTS).filter((n) => !names.has(n))) {
      violations.push(`frontend/public/fonts/${extra} không thuộc họ font nào trong danh sách → xoá file`);
    }
  }

  // 5. Preload trong layout.tag
  const layout = readFileSync(LAYOUT_TAG, 'utf8');
  const preloads = [...layout.matchAll(/<link\b[^>]*\brel="preload"[^>]*>/g)]
    .map((m) => m[0])
    .filter((tag) => /\bas="font"/.test(tag))
    .map((tag) => /\bhref="[^"]*?\/static\/fonts\/([^"]+)"/.exec(tag)?.[1] ?? `(href lạ: ${tag})`);
  const byName = new Map(expected.map((e) => [e.name, e]));
  for (const name of preloads) {
    const e = byName.get(name);
    if (!e) {
      violations.push(`layout.tag preload ${name} không phải file font nào trong danh sách → sửa href`);
    } else if (!e.preloadWeights.includes(e.weight)) {
      violations.push(`layout.tag preload ${name} của "${e.family}" ${e.weight}, họ/độ đậm này phải nạp lười → bỏ preload`);
    } else if (!existsSync(join(STATIC_DIR, 'fonts', name))) {
      violations.push(`layout.tag preload ${name} nhưng build không có static/fonts/${name} → chạy --sync rồi build lại`);
    }
  }
  for (const f of FAMILIES) {
    for (const weight of f.preloadWeights) {
      for (const subset of Object.keys(SUBSETS)) {
        const name = f.file(subset, weight);
        if (!preloads.includes(name)) {
          violations.push(`layout.tag thiếu preload ${name} ("${f.family}" ${weight}, subset ${subset}) → thêm <link rel="preload" as="font" crossorigin>`);
        }
      }
    }
  }

  const families = FAMILIES.length;
  if (violations.length) {
    for (const v of violations) console.error(`${TAG} FAIL ${v}`);
    console.error(`${TAG} FAIL ${violations.length} vi phạm (ngưỡng: ${families} họ font đều có subset vietnamese + latin, không subset khác, không URL ngoài, không họ font lạ)`);
    process.exit(1);
  }
  console.log(`${TAG} PASS ${families} họ font có subset vietnamese (U+1EA0-1EF9) và latin; ${faces.length} @font-face trong ${cssFiles.length} file CSS; ${copies.length} file (woff2 + OFL) khớp Fontsource; ${preloads.length} preload đúng; không họ font lạ`);
}

main();
