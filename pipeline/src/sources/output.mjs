// Ghi tệp đầu ra của crawl/census vào data/raw/<run>/ (ghi tạm rồi đổi tên).

import { mkdirSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

function writeAtomic(path, text) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(`${path}.tmp`, text);
  renameSync(`${path}.tmp`, path);
}

export const rawDir = (ctx) => join(ctx.dataDir, 'raw', ctx.run);

export function writeJsonl(path, rows) {
  writeAtomic(path, rows.map((r) => `${JSON.stringify(r)}\n`).join(''));
}

export function writeJson(path, value) {
  writeAtomic(path, `${JSON.stringify(value, null, 2)}\n`);
}
