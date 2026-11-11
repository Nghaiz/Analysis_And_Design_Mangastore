#!/usr/bin/env node
// Kiểm một trang thật qua nginx: mọi tài nguyên trang nạp (script, stylesheet, modulepreload, ảnh, script và style
// inline) và WebSocket HMR của @vite/client đều được header CSP của chính phản hồi đó cho phép; mỗi tài nguyên
// http(s) trả 2xx, module script khác origin có CORS khớp origin trang.
//   --mode build: trang không được nạp gì từ origin khác, CSP phải đúng từng kí tự CSP phase 1 (contract.md §10).
//   --mode dev:   trang phải có @vite/client (APP_VITE_DEV=true thật sự đang bật), mọi thứ trên vẫn phải qua CSP.
// Chạy: node scripts/check/csp-page-check.mjs --mode dev|build [--url http://localhost:8080/HomeView.jsp]
// Exit 0 khi mọi bước PASS, 1 khi có bước FAIL, 2 khi không tải được trang. Chỉ dùng module có sẵn của Node 24.
// Giới hạn: chỉ đọc HTML trang (không chạy JS), nên import con của module và <style> do JS chèn không được kiểm ở
// đây; CSP dev cho phép chúng qua origin Vite và 'unsafe-inline' của style-src (30-tiem-csp.sh).
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const CONTRACT = 'plans/261111-tiem-thue-truyen/contract.md';
export const DEFAULT_URL = 'http://localhost:8080/HomeView.jsp';

// Chuỗi dự phòng khi một directive thiếu (CSP Level 3, mục 6.8.3 "Get the effective directive").
const FALLBACK = {
  'script-src-elem': ['script-src-elem', 'script-src', 'default-src'],
  'script-src-attr': ['script-src-attr', 'script-src', 'default-src'],
  'style-src-elem': ['style-src-elem', 'style-src', 'default-src'],
  'style-src-attr': ['style-src-attr', 'style-src', 'default-src'],
  'img-src': ['img-src', 'default-src'],
  'font-src': ['font-src', 'default-src'],
  'connect-src': ['connect-src', 'default-src'],
  'worker-src': ['worker-src', 'child-src', 'script-src', 'default-src'],
};
const DEFAULT_PORT = { http: '80', https: '443', ws: '80', wss: '443' };
// Scheme của source khớp scheme nào của URL (CSP Level 3, "scheme-part match").
const SCHEME_MATCH = { http: ['http', 'https'], https: ['https'], ws: ['ws', 'wss'], wss: ['wss'] };

/** CSP phase 1 nguyên văn trong contract.md §10 (dòng "**CSP phase 1:** `...`"). */
export function contractCsp(contractText) {
  const match = /\*\*CSP phase 1:\*\* `([^`]+)`/.exec(contractText);
  if (!match) throw new Error(`${CONTRACT} §10 không còn dòng "**CSP phase 1:** \`...\`"`);
  return match[1];
}

/** Map directive → mảng source (directive viết thường, source giữ nguyên). */
export function parseCsp(header) {
  const policy = new Map();
  for (const part of header.split(';')) {
    const [name, ...sources] = part.trim().split(/\s+/);
    if (name && !policy.has(name.toLowerCase())) policy.set(name.toLowerCase(), sources);
  }
  return policy;
}

export function effectiveSources(policy, directive) {
  const chain = FALLBACK[directive];
  if (!chain) throw new Error(`directive chưa hỗ trợ: ${directive}`);
  const found = chain.find((name) => policy.has(name));
  return found ? { directive: found, sources: policy.get(found) } : { directive: null, sources: null };
}

function sourceMatches(source, url, pageUrl) {
  const scheme = url.protocol.slice(0, -1);
  const lower = source.toLowerCase();
  if (lower === "'self'") {
    // CSP3: cùng origin; hoặc cùng host, cùng cổng (hay cả hai dùng cổng mặc định) và scheme được nâng cấp.
    const page = new URL(pageUrl);
    if (url.origin === page.origin) return true;
    const portsOk = url.port === page.port;
    const upgrade = page.protocol === 'http:' ? ['https', 'ws', 'wss'].includes(scheme)
      : page.protocol === 'https:' && scheme === 'wss';
    return url.hostname === page.hostname && portsOk && upgrade;
  }
  if (lower.startsWith("'")) return false;
  const schemeOnly = /^([a-z][a-z0-9+.-]*):$/.exec(lower);
  if (schemeOnly) return (SCHEME_MATCH[schemeOnly[1]] ?? [schemeOnly[1]]).includes(scheme);
  const host = /^(?:([a-z][a-z0-9+.-]*):\/\/)?(\*\.)?([a-z0-9.-]+|\*)(?::(\d+|\*))?(\/.*)?$/.exec(lower);
  if (!host) return false;
  const [, srcScheme, wildcard, srcHost, srcPort, srcPath] = host;
  const pageScheme = new URL(pageUrl).protocol.slice(0, -1);
  if (!(SCHEME_MATCH[srcScheme ?? pageScheme] ?? [srcScheme]).includes(scheme)) return false;
  if (srcHost !== '*') {
    const hostOk = wildcard ? url.hostname.endsWith(`.${srcHost}`) : url.hostname === srcHost;
    if (!hostOk) return false;
  }
  if (srcPort !== '*') {
    const wanted = srcPort ?? DEFAULT_PORT[srcScheme ?? scheme];
    // CSP3: cổng mặc định của scheme nguồn khớp cả cổng mặc định của scheme an toàn hơn (80 → 443).
    if (portOf(url) !== wanted && !(srcPort === undefined && portOf(url) === DEFAULT_PORT[scheme])) return false;
  }
  if (srcPath && srcPath !== '/') {
    return srcPath.endsWith('/') ? url.pathname.startsWith(srcPath) : url.pathname === srcPath;
  }
  return true;
}

function portOf(url) {
  return url.port || DEFAULT_PORT[url.protocol.slice(0, -1)] || '';
}

/** CSP có cho tải `url` (tuyệt đối hoặc tương đối theo `pageUrl`) theo `directive` không. */
export function allowsUrl(policy, directive, url, pageUrl) {
  const { sources } = effectiveSources(policy, directive);
  if (sources === null) return true;
  const target = new URL(url, pageUrl);
  return sources.some((source) => sourceMatches(source, target, pageUrl));
}

/** Script/style inline chạy được khi có 'unsafe-inline' và không có nonce/hash (nonce, hash làm nó bị bỏ qua). */
export function allowsInline(policy, directive) {
  const { sources } = effectiveSources(policy, directive);
  if (sources === null) return true;
  const lower = sources.map((source) => source.toLowerCase());
  const nonceOrHash = lower.some((source) => /^'(nonce-|sha256-|sha384-|sha512-)/.test(source));
  return lower.includes("'unsafe-inline'") && !nonceOrHash;
}

function attrs(tag) {
  const out = {};
  for (const match of tag.matchAll(/([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)) {
    const name = match[1].toLowerCase();
    if (!(name in out)) out[name] = decode(match[2] ?? match[3] ?? match[4] ?? '');
  }
  return out;
}

function decode(value) {
  return value.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

const DATA_SCRIPT_TYPES = new Set(['application/json', 'application/ld+json', 'text/plain']);

/**
 * Tài nguyên trang nạp, mỗi phần tử `{ directive, what, url? , inline? , module? }`.
 * `url` đã tuyệt đối theo `pageUrl`; tài nguyên inline có `inline: true`.
 */
export function pageResources(html, pageUrl) {
  const body = html.replace(/<!--[\s\S]*?-->/g, '');
  const found = [];
  const abs = (value) => new URL(value, pageUrl).href;
  for (const match of body.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)) {
    const a = attrs(match[1]);
    const type = (a.type ?? '').toLowerCase();
    if (DATA_SCRIPT_TYPES.has(type)) continue;
    if (a.src !== undefined) {
      found.push({ directive: 'script-src-elem', what: `<script src="${a.src}">`, url: abs(a.src), module: type === 'module' });
    } else if (match[2].trim()) {
      found.push({ directive: 'script-src-elem', what: '<script> inline', inline: true });
    }
  }
  for (const match of body.matchAll(/<link\b([^>]*)>/gi)) {
    const a = attrs(match[1]);
    const rel = (a.rel ?? '').toLowerCase().split(/\s+/);
    if (!a.href) continue;
    const what = `<link rel="${a.rel}" href="${a.href}">`;
    if (rel.includes('stylesheet')) found.push({ directive: 'style-src-elem', what, url: abs(a.href) });
    else if (rel.includes('modulepreload')) found.push({ directive: 'script-src-elem', what, url: abs(a.href), module: true });
    else if (rel.includes('icon')) found.push({ directive: 'img-src', what, url: abs(a.href) });
    else if (rel.includes('preload') && a.as === 'font') found.push({ directive: 'font-src', what, url: abs(a.href) });
  }
  for (const match of body.matchAll(/<img\b([^>]*)>/gi)) {
    const a = attrs(match[1]);
    if (a.src) found.push({ directive: 'img-src', what: `<img src="${a.src}">`, url: abs(a.src) });
  }
  for (const match of body.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style\s*>/gi)) {
    if (match[1].trim()) found.push({ directive: 'style-src-elem', what: '<style> inline', inline: true });
  }
  for (const match of body.matchAll(/<[a-z][^\s>]*\s([^>]*)>/gi)) {
    for (const name of Object.keys(attrs(match[1]))) {
      if (name === 'style') found.push({ directive: 'style-src-attr', what: 'thuộc tính style=', inline: true });
      if (/^on[a-z]+$/.test(name)) found.push({ directive: 'script-src-attr', what: `thuộc tính ${name}=`, inline: true });
    }
  }
  // @vite/client mở WebSocket HMR tới đúng host:cổng của URL nó được nạp (vite/dist/client/client.mjs).
  for (const item of [...found]) {
    if (item.url && new URL(item.url).pathname.endsWith('/@vite/client')) {
      const client = new URL(item.url);
      const socket = `${client.protocol === 'https:' ? 'wss' : 'ws'}://${client.host}/`;
      found.push({ directive: 'connect-src', what: `WebSocket HMR của ${item.url}`, url: socket, viteClient: true });
    }
  }
  return found;
}

/**
 * Kiểm tĩnh một trang (không mạng). Trả mảng bước `{ ok, step, why? }`.
 * @param {{ html: string, csp: string | null, pageUrl: string, mode: 'dev' | 'build', expectedBuildCsp?: string }} input
 */
export function checkPage({ html, csp, pageUrl, mode, expectedBuildCsp }) {
  if (!csp) return [{ ok: false, step: 'header Content-Security-Policy', why: 'phản hồi không có CSP → kiểm security-headers.conf, csp.conf' }];
  const steps = [];
  const policy = parseCsp(csp);
  const resources = pageResources(html, pageUrl);
  const pageOrigin = new URL(pageUrl).origin;
  const hasViteClient = resources.some((item) => item.viteClient);
  if (mode === 'dev') {
    steps.push(hasViteClient
      ? { ok: true, step: 'trang dev có @vite/client' }
      : { ok: false, step: 'trang dev có @vite/client', why: 'không thấy → app chưa chạy với APP_VITE_DEV=true' });
  } else {
    if (expectedBuildCsp !== undefined) {
      steps.push(csp === expectedBuildCsp
        ? { ok: true, step: 'CSP đúng từng kí tự contract.md §10' }
        : { ok: false, step: 'CSP đúng từng kí tự contract.md §10', why: `đang là "${csp}" → nginx chưa về chế độ build (APP_VITE_DEV=false)` });
    }
    const foreign = resources.filter((item) => item.url && !item.url.startsWith('data:') && new URL(item.url).origin !== pageOrigin);
    steps.push(foreign.length === 0
      ? { ok: true, step: 'trang build không nạp gì từ origin khác' }
      : { ok: false, step: 'trang build không nạp gì từ origin khác', why: foreign.map((item) => item.what).join(', ') });
  }
  for (const item of resources) {
    const ok = item.inline ? allowsInline(policy, item.directive) : allowsUrl(policy, item.directive, item.url, pageUrl);
    const { directive } = effectiveSources(policy, item.directive);
    steps.push(ok
      ? { ok: true, step: `CSP cho phép ${item.what} (${directive})` }
      : { ok: false, step: `CSP cho phép ${item.what}`, why: `bị ${directive} chặn → sửa docker/nginx/docker-entrypoint.d/30-tiem-csp.sh hoặc trang` });
  }
  return steps;
}

async function fetchResourceSteps(resources, pageOrigin) {
  const steps = [];
  for (const item of resources) {
    if (!item.url || !/^https?:/.test(item.url)) continue;
    const name = `tải ${item.url}`;
    try {
      const response = await fetch(item.url, { headers: { Origin: pageOrigin }, redirect: 'manual' });
      await response.arrayBuffer();
      if (!response.ok) {
        steps.push({ ok: false, step: name, why: `HTTP ${response.status}` });
        continue;
      }
      const crossModule = item.module && new URL(item.url).origin !== pageOrigin;
      const allowOrigin = response.headers.get('access-control-allow-origin');
      if (crossModule && allowOrigin !== '*' && allowOrigin !== pageOrigin) {
        steps.push({ ok: false, step: name, why: `module khác origin nhưng Access-Control-Allow-Origin là "${allowOrigin}" (trang ${pageOrigin}) → server.cors của Vite` });
        continue;
      }
      steps.push({ ok: true, step: `${name} (HTTP ${response.status}${crossModule ? `, CORS ${allowOrigin}` : ''})` });
    } catch (error) {
      steps.push({ ok: false, step: name, why: `${error.cause?.code ?? error.message} → server có đang chạy?` });
    }
  }
  return steps;
}

function parseArgs(argv) {
  const args = { url: DEFAULT_URL, mode: null };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--url') args.url = argv[++i];
    else if (argv[i] === '--mode') args.mode = argv[++i];
    else throw new Error(`tham số lạ: ${argv[i]}`);
  }
  if (args.mode !== 'dev' && args.mode !== 'build') throw new Error('thiếu --mode dev|build');
  return args;
}

async function main(argv) {
  let args;
  try {
    args = parseArgs(argv);
  } catch (error) {
    console.error(`[csp] ${error.message}. Dùng: node scripts/check/csp-page-check.mjs --mode dev|build [--url <trang>]`);
    return 2;
  }
  let response;
  let html;
  try {
    response = await fetch(args.url, { redirect: 'manual' });
    html = await response.text();
  } catch (error) {
    console.error(`[csp] FAIL tải ${args.url}: ${error.cause?.code ?? error.message} → docker compose up --build -d --wait`);
    return 2;
  }
  const steps = [];
  steps.push(response.status === 200
    ? { ok: true, step: `tải ${args.url} (HTTP 200)` }
    : { ok: false, step: `tải ${args.url}`, why: `HTTP ${response.status}` });
  const csp = response.headers.get('content-security-policy');
  const expectedBuildCsp = args.mode === 'build' ? contractCsp(readFileSync(join(ROOT, CONTRACT), 'utf8')) : undefined;
  steps.push(...checkPage({ html, csp, pageUrl: args.url, mode: args.mode, expectedBuildCsp }));
  steps.push(...await fetchResourceSteps(pageResources(html, args.url), new URL(args.url).origin));
  console.log(`[csp] CSP: ${csp}`);
  for (const step of steps) {
    console.log(step.ok ? `[csp] PASS ${step.step}` : `[csp] FAIL ${step.step}: ${step.why}`);
  }
  return steps.every((step) => step.ok) ? 0 : 1;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  process.exitCode = await main(process.argv.slice(2));
}
