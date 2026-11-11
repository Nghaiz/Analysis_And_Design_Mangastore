// Test cho csp-page-check.mjs và docker/nginx/docker-entrypoint.d/30-tiem-csp.sh (lane 4D dev-mode).
// Bước làm đỏ có chủ đích: preamble React Refresh inline cũ của AssetTags bị CSP dev chặn (test "preamble inline").
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { CONTRACT, allowsInline, allowsUrl, checkPage, contractCsp, pageResources, parseCsp } from './csp-page-check.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const CSP_SCRIPT = join(ROOT, 'docker/nginx/docker-entrypoint.d/30-tiem-csp.sh');
const CONTRACT_CSP = contractCsp(readFileSync(join(ROOT, CONTRACT), 'utf8'));
const PAGE = 'http://localhost:8080/HomeView.jsp';
const VITE = 'http://localhost:5173';

// Đúng đầu ra AssetTags.renderDev("http://localhost:5173", DEFAULT_ENTRIES) (ViteManifestTest kiểm phía Java).
const DEV_TAGS = [
  `<script type="module" src="${VITE}/static/@id/__x00__@vitejs/plugin-react/preamble"></script>`,
  `<script type="module" src="${VITE}/static/@vite/client"></script>`,
  `<link rel="stylesheet" href="${VITE}/static/src/styles/app.css">`,
  `<script type="module" src="${VITE}/static/src/loader/island-loader.ts"></script>`,
].join('\n');
const BUILD_TAGS = [
  '<link rel="stylesheet" href="/static/assets/app-AbC123.css">',
  '<script type="module" src="/static/assets/island-loader-XyZ789.js"></script>',
  '<link rel="modulepreload" href="/static/assets/chunk-Q1.js">',
].join('\n');
const page = (tags) => `<!doctype html><html lang="vi"><head><link rel="icon" href="data:,">${tags}
<script type="application/json" id="p">{"a":1}</script></head><body><main><h1>Tiệm</h1></main></body></html>`;

const SH = spawnSync('sh', ['-c', 'exit 0']).status === 0;

/** Chạy 30-tiem-csp.sh với env cho trước; trả { status, csp, stderr }. */
function renderCsp(env) {
  const dir = mkdtempSync(join(tmpdir(), 'csp-'));
  const out = join(dir, 'csp.conf');
  try {
    const run = spawnSync('sh', [CSP_SCRIPT, out], {
      encoding: 'utf8',
      env: { PATH: process.env.PATH, ...env },
    });
    let csp = null;
    if (run.status === 0) {
      const line = readFileSync(out, 'utf8');
      const match = /^add_header Content-Security-Policy "([^"]*)" always;\n$/.exec(line);
      assert.ok(match, `dòng add_header sai dạng: ${JSON.stringify(line)}`);
      csp = match[1];
    }
    return { status: run.status, csp, stderr: run.stderr };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const failures = (steps) => steps.filter((step) => !step.ok).map((step) => step.step);

test('CSP_BUILD trong 30-tiem-csp.sh đúng từng kí tự CSP phase 1 của contract.md §10', () => {
  const script = readFileSync(CSP_SCRIPT, 'utf8');
  const match = /^CSP_BUILD="([^"]*)"$/m.exec(script);
  assert.ok(match, '30-tiem-csp.sh mất dòng CSP_BUILD="..."');
  assert.equal(match[1], CONTRACT_CSP);
});

test('30-tiem-csp.sh: không đặt APP_VITE_DEV hoặc false → CSP phase 1 nguyên văn', { skip: !SH && 'không có sh' }, () => {
  assert.equal(renderCsp({}).csp, CONTRACT_CSP);
  assert.equal(renderCsp({ APP_VITE_DEV: 'false', APP_VITE_DEV_ORIGIN: VITE }).csp, CONTRACT_CSP);
});

test('30-tiem-csp.sh: true → chỉ thêm origin Vite, ws, blob worker và style inline', { skip: !SH && 'không có sh' }, () => {
  const { csp } = renderCsp({ APP_VITE_DEV: 'true', APP_VITE_DEV_ORIGIN: `${VITE}/` });
  const policy = parseCsp(csp);
  assert.deepEqual(policy.get('script-src'), ["'self'", VITE]);
  assert.deepEqual(policy.get('style-src'), ["'self'", VITE, "'unsafe-inline'"]);
  assert.deepEqual(policy.get('connect-src'), ["'self'", VITE, 'ws://localhost:5173']);
  assert.deepEqual(policy.get('worker-src'), ["'self'", 'blob:']);
  for (const fixed of ['default-src', 'object-src', 'base-uri', 'form-action', 'frame-ancestors']) {
    assert.deepEqual(policy.get(fixed), parseCsp(CONTRACT_CSP).get(fixed), fixed);
  }
  assert.ok(!policy.get('script-src').includes("'unsafe-inline'"));
  assert.equal(parseCsp(renderCsp({ APP_VITE_DEV: 'true', APP_VITE_DEV_ORIGIN: 'https://vite.test:5443' }).csp)
    .get('connect-src')[2], 'wss://vite.test:5443');
});

test('30-tiem-csp.sh: giá trị sai thì dừng với lỗi, không lùi về CSP nào', { skip: !SH && 'không có sh' }, () => {
  const bad = [
    { APP_VITE_DEV: 'TRUE' },
    { APP_VITE_DEV: 'true' },
    { APP_VITE_DEV: 'true', APP_VITE_DEV_ORIGIN: 'localhost:5173' },
    { APP_VITE_DEV: 'true', APP_VITE_DEV_ORIGIN: 'http://localhost:5173/static' },
    { APP_VITE_DEV: 'true', APP_VITE_DEV_ORIGIN: 'http://localhost:5173"; evil' },
    { APP_VITE_DEV: 'true', APP_VITE_DEV_ORIGIN: 'http://localhost:5173\nadd_header X 1' },
    { APP_VITE_DEV: 'true', APP_VITE_DEV_ORIGIN: 'http://localhost:123456' },
  ];
  for (const env of bad) {
    const run = renderCsp(env);
    assert.equal(run.status, 1, JSON.stringify(env));
    assert.match(run.stderr, /30-tiem-csp\.sh: APP_VITE_DEV/, JSON.stringify(env));
  }
});

test('pageResources: đọc script, link, style, thuộc tính inline; bỏ JSON props; suy ra WebSocket HMR', () => {
  const items = pageResources(page(`${DEV_TAGS}<style>p{}</style><p style="x" onclick="y">`), PAGE);
  const what = items.map((item) => `${item.directive} ${item.url ?? item.what}`);
  assert.deepEqual(what, [
    `script-src-elem ${VITE}/static/@id/__x00__@vitejs/plugin-react/preamble`,
    `script-src-elem ${VITE}/static/@vite/client`,
    `script-src-elem ${VITE}/static/src/loader/island-loader.ts`,
    'img-src data:,',
    `style-src-elem ${VITE}/static/src/styles/app.css`,
    'style-src-elem <style> inline',
    'style-src-attr thuộc tính style=',
    'script-src-attr thuộc tính onclick=',
    'connect-src ws://localhost:5173/',
  ]);
});

test('allowsUrl/allowsInline theo CSP3: self, cổng, scheme ws, scheme-source, nonce vô hiệu unsafe-inline', () => {
  const policy = parseCsp(`default-src 'self'; script-src 'self' ${VITE}; connect-src 'self' ws://localhost:5173; img-src data:`);
  assert.ok(allowsUrl(policy, 'script-src-elem', `${VITE}/static/@vite/client`, PAGE));
  assert.ok(!allowsUrl(policy, 'script-src-elem', 'http://localhost:5174/x.js', PAGE));
  assert.ok(!allowsUrl(policy, 'script-src-elem', 'http://127.0.0.1:5173/x.js', PAGE));
  assert.ok(allowsUrl(policy, 'connect-src', 'ws://localhost:5173/static/', PAGE));
  assert.ok(!allowsUrl(policy, 'connect-src', `${VITE}/x`, PAGE));
  assert.ok(allowsUrl(policy, 'img-src', 'data:,', PAGE));
  assert.ok(!allowsUrl(policy, 'img-src', '/a.png', 'http://localhost:8080/'));
  assert.ok(allowsUrl(policy, 'style-src-elem', '/a.css', PAGE), 'style-src thiếu thì lùi về default-src');
  assert.ok(!allowsInline(policy, 'script-src-elem'));
  assert.ok(allowsInline(parseCsp("style-src 'self' 'unsafe-inline'"), 'style-src-attr'));
  assert.ok(!allowsInline(parseCsp("style-src 'unsafe-inline' 'nonce-abc'"), 'style-src-elem'));
});

test('checkPage build: trang build qua CSP phase 1; CSP lệch hợp đồng hay nạp origin khác thì FAIL', () => {
  const html = page(BUILD_TAGS);
  assert.deepEqual(failures(checkPage({ html, csp: CONTRACT_CSP, pageUrl: PAGE, mode: 'build', expectedBuildCsp: CONTRACT_CSP })), []);
  const devCsp = CONTRACT_CSP.replace("script-src 'self'", `script-src 'self' ${VITE}`);
  assert.deepEqual(failures(checkPage({ html, csp: devCsp, pageUrl: PAGE, mode: 'build', expectedBuildCsp: CONTRACT_CSP })),
    ['CSP đúng từng kí tự contract.md §10']);
  assert.ok(failures(checkPage({ html: page(DEV_TAGS), csp: CONTRACT_CSP, pageUrl: PAGE, mode: 'build' }))
    .includes('trang build không nạp gì từ origin khác'));
  assert.deepEqual(failures(checkPage({ html, csp: null, pageUrl: PAGE, mode: 'build' })), ['header Content-Security-Policy']);
});

test('checkPage dev: CSP phase 1 chặn mọi tài nguyên Vite (lỗi gốc của lane)', () => {
  const failed = failures(checkPage({ html: page(DEV_TAGS), csp: CONTRACT_CSP, pageUrl: PAGE, mode: 'dev' }));
  assert.equal(failed.length, 5, failed.join('\n'));
  assert.ok(failed.every((step) => step.startsWith('CSP cho phép')));
});

test('checkPage dev: trang không có @vite/client thì FAIL (chống xanh suông khi app chưa bật dev)', () => {
  assert.deepEqual(failures(checkPage({ html: page(BUILD_TAGS), csp: CONTRACT_CSP, pageUrl: PAGE, mode: 'dev' })),
    ['trang dev có @vite/client']);
});

test('checkPage dev: CSP do 30-tiem-csp.sh sinh cho phép đúng các thẻ AssetTags dev', { skip: !SH && 'không có sh' }, () => {
  const { csp } = renderCsp({ APP_VITE_DEV: 'true', APP_VITE_DEV_ORIGIN: VITE });
  assert.deepEqual(failures(checkPage({ html: page(DEV_TAGS), csp, pageUrl: PAGE, mode: 'dev' })), []);
  // Trang mở bằng 127.0.0.1 vẫn qua CSP (origin Vite không đổi); CORS là việc của server.cors trong vite.config.ts.
  assert.deepEqual(failures(checkPage({ html: page(DEV_TAGS), csp, pageUrl: 'http://127.0.0.1:8080/HomeView.jsp', mode: 'dev' })), []);
});

test('checkPage dev: preamble inline cũ bị CSP dev chặn (vì vậy AssetTags in preamble dạng module ngoài)', { skip: !SH && 'không có sh' }, () => {
  const { csp } = renderCsp({ APP_VITE_DEV: 'true', APP_VITE_DEV_ORIGIN: VITE });
  const inline = `<script type="module">\nimport RefreshRuntime from '${VITE}/static/@react-refresh';\n</script>`;
  assert.deepEqual(failures(checkPage({ html: page(`${inline}\n${DEV_TAGS}`), csp, pageUrl: PAGE, mode: 'dev' })),
    ['CSP cho phép <script> inline']);
});
