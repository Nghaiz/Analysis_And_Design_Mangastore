// Đọc cấu hình chỉ đọc của pipeline: series.json (của 4A) và categories.json.
import { paths, readJson } from './io.mjs';

export async function loadSeries(ctx) {
  const list = await readJson(paths.seriesConfig(ctx));
  if (!Array.isArray(list)) throw new Error(`${paths.seriesConfig(ctx)}: phải là mảng (CONTRACT §4)`);
  const byKey = new Map();
  list.forEach((series, index) => {
    if (byKey.has(series.key)) throw new Error(`series.json: khoá bộ "${series.key}" bị trùng`);
    byKey.set(series.key, { ...series, index });
  });
  return { list, byKey, index: new Map(list.map((series, i) => [series.key, i])) };
}

export async function loadCategories(ctx) {
  const list = await readJson(paths.categoriesConfig(ctx));
  return new Set(list);
}
