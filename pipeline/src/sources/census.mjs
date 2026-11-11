// Lệnh census: đếm ứng viên từng bộ từ sitemap Kim Đồng và trang đầu tìm kiếm Tiki,
// không tải chi tiết tập (trừ sản phẩm "(Tập lẻ)" của Kim Đồng, cần để biết các tập).
// Ghi data/raw/<run>/census.json đúng CONTRACT §1: { "<seriesKey>": { "kimdong": n, "tiki": n } }.
// Tiki chặn (hết lượt thử lại) thì các bộ còn lại ghi "tiki": null (chưa biết, khác 0), không gọi Tiki nữa,
// và lệnh trả exit 1 để không ai đọc nhầm số đếm thiếu là đủ.

import { join } from 'node:path';
import { HttpError } from '../fetch/errors.mjs';
import { listSitemapProducts, planKimdong } from './kimdong.mjs';
import { rawDir, writeJson } from './output.mjs';
import { loadSeries, selectSeries } from './series.mjs';
import { searchTiki } from './tiki.mjs';

/** Ngân sách request mạng của census (phase 4, bước 4.3). */
export const CENSUS_REQUEST_BUDGET = 40;

/** Census chỉ thử lại 1 lần: lùi dần đủ 5 lần đốt ngân sách 40 request vào một URL bị chặn. */
export const CENSUS_MAX_RETRIES = 1;
const CENSUS_TIKI_PAGES = 1;

export async function census(ctx) {
  const selected = selectSeries(loadSeries(ctx.pipelineDir), ctx.series);
  const products = selected.some((s) => s.kimdongSlugPrefixes.length) ? await listSitemapProducts(ctx.http) : [];
  const result = {};
  let expected = 0;
  let tikiBlocked = null;
  for (const series of selected) {
    const kd = series.kimdongSlugPrefixes.length ? await planKimdong(ctx.http, series, products, ctx.log) : [];
    let tiki = null;
    if (!tikiBlocked) {
      try {
        tiki = await searchTiki(ctx.http, series, { maxPages: CENSUS_TIKI_PAGES });
      } catch (err) {
        if (!(err instanceof HttpError)) throw err;
        tikiBlocked = err.message;
        ctx.log(`census: Tiki không trả dữ liệu, bỏ Tiki cho các bộ còn lại: ${err.message}`);
      }
    }
    const union = new Set([...kd.map((e) => e.volume), ...(tiki?.keys() ?? [])]);
    const reachable = Math.min(series.maxVolumes, union.size);
    expected += reachable;
    result[series.key] = { kimdong: kd.length, tiki: tiki ? tiki.size : null };
    ctx.log(`census ${series.key}: kimdong ${kd.length}, tiki ${tiki ? tiki.size : 'chưa biết'} (trang 1), hợp ${union.size}, `
      + `dự kiến ${reachable}/${series.maxVolumes}`);
  }
  writeJson(join(rawDir(ctx), 'census.json'), result);
  ctx.log(`census: dự kiến tối thiểu ${expected} tập (Tiki mới xem trang 1); http ${JSON.stringify(ctx.http.stats?.() ?? {})}`);
  if (tikiBlocked) ctx.log('census: chưa đủ (Tiki bị chặn), exit 1; chạy lại sau, các request đã xong nằm trong cache');
  return { exitCode: tikiBlocked ? 1 : 0, summary: result };
}
