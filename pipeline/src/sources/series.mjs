// Nạp và kiểm pipeline/config/series.json (CONTRACT §4) cùng categories.json.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const SOURCES = ['kimdong', 'tiki'];
const KEY_PATTERN = /^[a-z0-9-]+$/;
const QID_PATTERN = /^Q\d+$/;
const REQUIRED = [
  'key', 'name', 'aliases', 'publisher', 'preferredSource', 'category', 'longStory',
  'kimdongSlugPrefixes', 'tikiQuery', 'wikidataId', 'maxVolumes',
];

function check(cond, message) {
  if (!cond) throw new Error(`series.json: ${message}`);
}

function validateOne(entry, index, categories) {
  const where = `phần tử ${index} (${entry?.key ?? '?'})`;
  for (const field of REQUIRED) check(field in entry, `${where} thiếu khoá "${field}"`);
  check(KEY_PATTERN.test(entry.key), `${where}: key phải khớp ${KEY_PATTERN}`);
  check(typeof entry.name === 'string' && entry.name.trim(), `${where}: name rỗng`);
  check(Array.isArray(entry.aliases) && entry.aliases.length > 0, `${where}: aliases phải là mảng không rỗng`);
  check(SOURCES.includes(entry.preferredSource), `${where}: preferredSource phải thuộc ${SOURCES.join('|')}`);
  check(categories.includes(entry.category), `${where}: category "${entry.category}" không có trong categories.json`);
  check(typeof entry.longStory === 'boolean', `${where}: longStory phải là boolean`);
  check(Array.isArray(entry.kimdongSlugPrefixes), `${where}: kimdongSlugPrefixes phải là mảng`);
  check(typeof entry.tikiQuery === 'string', `${where}: tikiQuery phải là chuỗi`);
  check(entry.wikidataId === null || QID_PATTERN.test(entry.wikidataId), `${where}: wikidataId phải là Q<số> hoặc null`);
  check(Number.isInteger(entry.maxVolumes) && entry.maxVolumes > 0, `${where}: maxVolumes phải là số nguyên dương`);
  check(entry.preferredSource !== 'tiki' || entry.tikiQuery.trim(), `${where}: nguồn ưu tiên tiki cần tikiQuery`);
}

export function loadCategories(pipelineDir) {
  return JSON.parse(readFileSync(join(pipelineDir, 'config', 'categories.json'), 'utf8'));
}

export function loadSeries(pipelineDir) {
  const series = JSON.parse(readFileSync(join(pipelineDir, 'config', 'series.json'), 'utf8'));
  const categories = loadCategories(pipelineDir);
  check(Array.isArray(series), 'phải là một mảng');
  series.forEach((entry, i) => validateOne(entry, i, categories));
  const keys = new Set();
  for (const { key } of series) {
    check(!keys.has(key), `key "${key}" bị trùng`);
    keys.add(key);
  }
  return series;
}

/** Lọc theo `--series a,b`; báo lỗi rõ khi có key không tồn tại. */
export function selectSeries(series, keys) {
  if (!keys) return series;
  const unknown = keys.filter((k) => !series.some((s) => s.key === k));
  if (unknown.length) throw new Error(`--series: không có bộ ${unknown.join(', ')} trong series.json`);
  return series.filter((s) => keys.includes(s.key));
}

/** Hạn mức tập mỗi bộ: `--limit n` chia đều theo thứ tự bộ, không vượt maxVolumes. */
export function volumeQuotas(series, limit) {
  if (limit === null) return series.map((s) => s.maxVolumes);
  const base = Math.floor(limit / series.length);
  const extra = limit % series.length;
  return series.map((s, i) => Math.min(s.maxVolumes, base + (i < extra ? 1 : 0)));
}
