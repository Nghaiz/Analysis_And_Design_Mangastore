import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { urlHash } from '../src/fetch/cache.mjs';
import { createHttpClient, parseRetryAfter } from '../src/fetch/client.mjs';
import { MAX_RETRIES, MIN_HOST_GAP_MS, USER_AGENT } from '../src/fetch/constants.mjs';
import { HttpError, OfflineError, RequestBudgetError, RobotsDisallowedError } from '../src/fetch/errors.mjs';
import { isAllowed, parseRobots } from '../src/fetch/robots.mjs';
import { fakeClock, fixtureBody, fixtureClient, fixtureFetch, tempDir } from './fixtures/http/fake-net.mjs';

const KD = 'https://nxbkimdong.com.vn';
const CONAN = `${KD}/products/tham-tu-lung-danh-conan-tap-107.json`;
const SITEMAP = `${KD}/sitemap.xml`;
const TIKI_DETAIL = 'https://tiki.vn/api/v2/products/262303707';
const SECOND = 1000;

describe('throttle theo host', () => {
  it('hai request cùng host cách nhau ≥ 2 giây, kể cả khi gọi đồng thời', async () => {
    const { http, calls } = fixtureClient();
    await Promise.all([http.getJson(CONAN), http.getText(SITEMAP)]);
    const kd = calls.filter((c) => c.url.startsWith(KD));
    expect(kd.map((c) => c.url)).toEqual([`${KD}/robots.txt`, CONAN, SITEMAP]);
    for (let i = 1; i < kd.length; i += 1) expect(kd[i].at - kd[i - 1].at).toBeGreaterThanOrEqual(MIN_HOST_GAP_MS);
  });

  it('host khác không phải chờ nhau', async () => {
    const { http, calls } = fixtureClient({ hostGapsMs: {} });
    await Promise.all([http.getJson(CONAN), http.getJson(TIKI_DETAIL)]);
    const firstTiki = calls.find((c) => c.url.startsWith('https://tiki.vn'));
    expect(firstTiki.at).toBe(calls[0].at);
  });

  it('Tiki dùng khoảng cách riêng lớn hơn mặc định', async () => {
    const { http, calls } = fixtureClient();
    await http.getJson(TIKI_DETAIL);
    const [robots, detail] = calls;
    expect(detail.at - robots.at).toBeGreaterThan(MIN_HOST_GAP_MS);
  });

  it('Crawl-delay của robots nâng khoảng cách', async () => {
    const robots = { body: 'User-agent: *\nCrawl-delay: 7\nDisallow: /private', contentType: 'text/plain' };
    const { http, calls } = fixtureClient({ overrides: { [`${KD}/robots.txt`]: robots } });
    await http.getJson(CONAN);
    await http.getText(SITEMAP);
    expect(calls[2].at - calls[1].at).toBeGreaterThanOrEqual(7 * SECOND);
  });
});

describe('robots.txt', () => {
  it('Kim Đồng chặn /search, cho /products/*.json', () => {
    const r = parseRobots(fixtureBody('kimdong/robots.txt').toString(), 'tiem-truyen-pipeline');
    expect(isAllowed(r, `${KD}/search?q=conan`)).toBe(false);
    expect(isAllowed(r, CONAN)).toBe(true);
    expect(isAllowed(r, `${KD}/collections/a+b`)).toBe(false);
  });

  it('Wikidata: Special:EntityData/*.json được, /sparql của query bị chặn', () => {
    const www = parseRobots(fixtureBody('wikidata/robots-www.txt').toString(), 'tiem-truyen-pipeline');
    expect(isAllowed(www, 'https://www.wikidata.org/wiki/Special:EntityData/Q1.json')).toBe(true);
    expect(isAllowed(www, 'https://www.wikidata.org/wiki/Special:EntityData/Q1')).toBe(false);
    const query = parseRobots(fixtureBody('wikidata/robots-query.txt').toString(), 'tiem-truyen-pipeline');
    expect(isAllowed(query, 'https://query.wikidata.org/sparql?query=x')).toBe(false);
  });

  it('nhóm riêng cho token của mình thắng nhóm "*"', () => {
    const r = parseRobots('User-agent: *\nDisallow: /\n\nUser-agent: tiem-truyen-pipeline\nAllow: /', 'tiem-truyen-pipeline');
    expect(isAllowed(r, 'https://x.test/a')).toBe(true);
  });

  it('URL bị robots chặn thì báo lỗi và không gửi request', async () => {
    const { http, calls } = fixtureClient();
    await expect(http.getText(`${KD}/search?q=conan`)).rejects.toBeInstanceOf(RobotsDisallowedError);
    expect(calls.map((c) => c.url)).toEqual([`${KD}/robots.txt`]);
  });

  it('robots.txt 404 nghĩa là được phép hết', async () => {
    const { http } = fixtureClient({ overrides: { [`${KD}/robots.txt`]: { status: 404, body: 'x' } } });
    await expect(http.getJson(CONAN)).resolves.toMatchObject({ alias: 'tham-tu-lung-danh-conan-tap-107' });
  });
});

describe('lùi dần', () => {
  it('429 kèm Retry-After: chờ đúng số giây rồi thử lại', async () => {
    const tooMany = { status: 429, body: 'slow down', headers: { 'retry-after': '9' } };
    const ok = { file: 'tiki/product-262303707.json', contentType: 'application/json' };
    const { http, calls, logs } = fixtureClient({ overrides: { [TIKI_DETAIL]: [tooMany, ok] } });
    const detail = await http.getJson(TIKI_DETAIL);
    expect(detail.id).toBe(262303707);
    const tries = calls.filter((c) => c.url === TIKI_DETAIL);
    expect(tries).toHaveLength(2);
    expect(tries[1].at - tries[0].at).toBeGreaterThanOrEqual(9 * SECOND);
    expect(logs.join('\n')).toMatch(/HTTP 429/);
  });

  it('5xx mãi: dừng sau MAX_RETRIES lần thử lại với lỗi rõ, không ghi cache', async () => {
    const { http, calls, cacheDir } = fixtureClient({ overrides: { [CONAN]: { status: 503, body: 'down' } } });
    const err = await http.getJson(CONAN).catch((e) => e);
    expect(err).toBeInstanceOf(HttpError);
    expect(err.message).toMatch(/503.*5 lần thử lại/);
    expect(calls.filter((c) => c.url === CONAN)).toHaveLength(MAX_RETRIES + 1);
    expect(existsSync(join(cacheDir, 'nxbkimdong.com.vn', `${urlHash(CONAN)}.meta.json`))).toBe(false);
  });

  it('trang chặn bot (200 text/html cho yêu cầu JSON) được thử lại, không cache', async () => {
    const challenge = { status: 200, body: '<!DOCTYPE html><html></html>', contentType: 'text/html' };
    const ok = { file: 'tiki/product-262303707.json', contentType: 'application/json' };
    const { http, calls } = fixtureClient({ overrides: { [TIKI_DETAIL]: [challenge, ok] } });
    await expect(http.getJson(TIKI_DETAIL)).resolves.toMatchObject({ id: 262303707 });
    expect(calls.filter((c) => c.url === TIKI_DETAIL)).toHaveLength(2);
  });

  it('Retry-After dạng ngày HTTP', () => {
    const now = Date.parse('2026-11-11T00:00:00Z');
    expect(parseRetryAfter('Wed, 11 Nov 2026 00:00:30 GMT', now)).toBe(30 * SECOND);
    expect(parseRetryAfter(null, now)).toBeNull();
  });
});

describe('cache và --offline', () => {
  it('ghi body + meta {url,status,contentType,fetchedAt}; lần sau đọc cache, không gọi mạng', async () => {
    const cacheDir = tempDir();
    const first = fixtureClient({ cacheDir });
    await first.http.getJson(CONAN);
    const meta = JSON.parse(readFileSync(join(cacheDir, 'nxbkimdong.com.vn', `${urlHash(CONAN)}.meta.json`), 'utf8'));
    expect(meta).toEqual({ url: CONAN, status: 200, contentType: 'application/json; charset=utf-8', fetchedAt: '2026-11-11T00:00:02.000Z' });
    const second = fixtureClient({ cacheDir, offline: true });
    await expect(second.http.getJson(CONAN)).resolves.toMatchObject({ id: 69587005 });
    expect(second.calls).toHaveLength(0);
    expect(second.http.fetchedAt(CONAN)).toBe(meta.fetchedAt);
  });

  it('--offline thiếu cache: OfflineError nêu URL, không gọi mạng', async () => {
    const { http, calls } = fixtureClient({ offline: true });
    const err = await http.getBuffer(CONAN).catch((e) => e);
    expect(err).toBeInstanceOf(OfflineError);
    expect(err.message).toContain(CONAN);
    expect(calls).toHaveLength(0);
  });

  it('404 được cache (chạy lại offline vẫn ra cùng lỗi) và getJson báo HttpError', async () => {
    const cacheDir = tempDir();
    const url = `${KD}/products/tap-le-bluelock.json`;
    await expect(fixtureClient({ cacheDir }).http.getJson(url)).rejects.toMatchObject({ status: 404 });
    await expect(fixtureClient({ cacheDir, offline: true }).http.getJson(url)).rejects.toMatchObject({ status: 404 });
  });

  it('gửi User-Agent chung, không tên, không email', async () => {
    const { http, calls } = fixtureClient();
    await http.getText(SITEMAP);
    expect(calls.every((c) => c.headers['User-Agent'] === USER_AGENT)).toBe(true);
    expect(USER_AGENT).toBe('Mozilla/5.0 (compatible; tiem-truyen-pipeline/1.0)');
  });

  it('ngân sách request: vượt thì RequestBudgetError', async () => {
    const clock = fakeClock();
    const http = createHttpClient({ cacheDir: tempDir(), clock, fetchImpl: fixtureFetch(clock).impl, maxNetworkRequests: 1 });
    await expect(http.getJson(CONAN)).rejects.toBeInstanceOf(RequestBudgetError);
  });
});
