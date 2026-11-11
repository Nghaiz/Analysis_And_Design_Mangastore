// Kiểm scripts/accept/_lib.mjs: ROOT luôn có chữ ổ đĩa viết hoa, kể cả khi script được gọi bằng `d:\…`
// (Vitest 5 đỏ "failed to find the current suite" khi cwd là `d:\…`).
import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath, pathToFileURL } from 'node:url';

const LIB = fileURLToPath(new URL('../accept/_lib.mjs', import.meta.url));

test('upperDrive viết hoa chữ ổ đĩa, giữ nguyên đường dẫn khác', async () => {
  const { upperDrive } = await import(pathToFileURL(LIB).href);
  assert.equal(upperDrive('d:\\Coding\\repo'), 'D:\\Coding\\repo');
  assert.equal(upperDrive('D:\\Coding\\repo'), 'D:\\Coding\\repo');
  assert.equal(upperDrive('/home/u/repo'), '/home/u/repo');
});

test('ROOT có chữ ổ đĩa viết hoa khi _lib.mjs nạp qua đường dẫn d:', { skip: process.platform !== 'win32' }, async () => {
  const lower = LIB[0].toLowerCase() + LIB.slice(1);
  const { ROOT } = await import(`${pathToFileURL(lower).href}?drive=lower`);
  assert.match(ROOT, /^[A-Z]:\\/, `ROOT = ${ROOT}`);
});
