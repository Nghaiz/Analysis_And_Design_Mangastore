// Cache HTTP trên đĩa: data/cache/http/<host>/<sha256(url)>.body + .meta.json (CONTRACT §1).

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export function urlHash(url) {
  return createHash('sha256').update(url).digest('hex');
}

/** Tên thư mục host an toàn cho mọi hệ điều hành (cổng ":" không hợp lệ trên Windows). */
function hostDir(url) {
  return new URL(url).host.replace(/[^a-zA-Z0-9.-]/g, '_');
}

export function createDiskCache(cacheDir) {
  const paths = (url) => {
    const base = join(cacheDir, hostDir(url), urlHash(url));
    return { body: `${base}.body`, meta: `${base}.meta.json` };
  };

  /** Metadata `{url, status, contentType, fetchedAt}` hoặc null khi chưa có. */
  function readMeta(url) {
    const { meta } = paths(url);
    if (!existsSync(meta)) return null;
    return JSON.parse(readFileSync(meta, 'utf8'));
  }

  /** `{ meta, body: Buffer }` hoặc null. Thiếu một trong hai file coi như chưa có. */
  function read(url) {
    const p = paths(url);
    if (!existsSync(p.meta) || !existsSync(p.body)) return null;
    return { meta: readMeta(url), body: readFileSync(p.body) };
  }

  /** Ghi body trước, meta sau (meta là dấu hoàn tất); ghi tạm rồi đổi tên cho nguyên tử. */
  function write(url, { status, contentType, fetchedAt }, body) {
    const p = paths(url);
    mkdirSync(join(cacheDir, hostDir(url)), { recursive: true });
    writeFileSync(`${p.body}.tmp`, body);
    renameSync(`${p.body}.tmp`, p.body);
    const meta = { url, status, contentType, fetchedAt };
    writeFileSync(`${p.meta}.tmp`, `${JSON.stringify(meta, null, 2)}\n`);
    renameSync(`${p.meta}.tmp`, p.meta);
    return meta;
  }

  return { read, readMeta, write };
}
