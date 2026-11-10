// Lệnh crawl: mỗi bộ trong series.json lấy tối đa `maxVolumes` tập (hoặc phần của --limit),
// nguồn ưu tiên trước, nguồn kia lấp tập còn thiếu; Wikidata thêm một bản ghi cấp bộ.
// Ghi data/raw/<run>/{kimdong,tiki,wikidata}.jsonl, sắp theo thứ tự bộ rồi sourceUrl.

import { join } from 'node:path';
import { kimdongRecord, listSitemapProducts, planKimdong } from './kimdong.mjs';
import { rawDir, writeJsonl } from './output.mjs';
import { loadSeries, selectSeries, volumeQuotas } from './series.mjs';
import { pickTikiProduct, searchTiki, tikiRecord } from './tiki.mjs';
import { wikidataRecord } from './wikidata.mjs';

export const RAW_SOURCES = ['kimdong', 'tiki', 'wikidata'];

async function takeKimdong(ctx, series, plan, quota, taken, push) {
  for (const entry of plan) {
    if (taken.size >= quota) return;
    if (taken.has(entry.volume)) continue;
    const record = await kimdongRecord(ctx.http, series, entry, ctx.log);
    if (!record) continue;
    push(record);
    taken.add(entry.volume);
  }
}

async function takeTiki(ctx, series, quota, taken, push) {
  const need = quota - taken.size;
  if (need <= 0) return;
  const byVolume = await searchTiki(ctx.http, series, { need, exclude: taken });
  const volumes = [...byVolume.keys()].filter((v) => !taken.has(v)).sort((a, b) => a - b);
  for (const volume of volumes) {
    if (taken.size >= quota) return;
    const detail = await pickTikiProduct(ctx.http, series, byVolume.get(volume), ctx.log);
    if (!detail) continue;
    push(tikiRecord(ctx.http, series, detail));
    taken.add(volume);
  }
}

/** Bản ghi của một bộ: `{ records, counts }`. */
export async function crawlSeries(ctx, series, quota, products) {
  const records = [];
  const counts = { kimdong: 0, tiki: 0, wikidata: 0 };
  const push = (r) => { records.push(r); counts[r.source] += 1; };
  const taken = new Set();
  const plan = series.kimdongSlugPrefixes.length ? await planKimdong(ctx.http, series, products, ctx.log) : [];
  const order = series.preferredSource === 'kimdong' ? ['kimdong', 'tiki'] : ['tiki', 'kimdong'];
  for (const source of order) {
    if (source === 'kimdong') await takeKimdong(ctx, series, plan, quota, taken, push);
    else await takeTiki(ctx, series, quota, taken, push);
  }
  if (series.wikidataId) push(await wikidataRecord(ctx.http, series));
  return { records, counts };
}

export async function crawl(ctx) {
  const selected = selectSeries(loadSeries(ctx.pipelineDir), ctx.series);
  const quotas = volumeQuotas(selected, ctx.limit);
  const needsSitemap = selected.some((s, i) => quotas[i] > 0 && s.kimdongSlugPrefixes.length);
  const products = needsSitemap ? await listSitemapProducts(ctx.http) : [];
  const bySource = Object.fromEntries(RAW_SOURCES.map((s) => [s, []]));
  const perSeries = {};
  for (const [i, series] of selected.entries()) {
    if (quotas[i] === 0) continue;
    const { records, counts } = await crawlSeries(ctx, series, quotas[i], products);
    for (const r of records) bySource[r.source].push({ order: i, record: r });
    perSeries[series.key] = { quota: quotas[i], ...counts };
    ctx.log(`crawl ${series.key}: ${counts.kimdong} kimdong + ${counts.tiki} tiki / ${quotas[i]} tập, ${counts.wikidata} wikidata`);
  }
  const records = {};
  for (const source of RAW_SOURCES) {
    const rows = bySource[source]
      .sort((a, b) => a.order - b.order || a.record.sourceUrl.localeCompare(b.record.sourceUrl))
      .map((x) => x.record);
    writeJsonl(join(rawDir(ctx), `${source}.jsonl`), rows);
    records[source] = rows.length;
  }
  ctx.log(`crawl xong: ${JSON.stringify(records)} → ${rawDir(ctx)}`);
  return { exitCode: 0, summary: { run: ctx.run, records, series: perSeries, http: ctx.http.stats?.() ?? null } };
}
