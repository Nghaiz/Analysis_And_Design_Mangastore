// Bộ tải HTTP của pipeline (ctx.http, CONTRACT §3): cache đĩa, throttle theo host,
// robots.txt, lùi dần khi 429/5xx, --offline chỉ đọc cache.

import { createDiskCache } from './cache.mjs';
import {
  BACKOFF_BASE_MS, HTTP_CLIENT_ERROR_MIN, HTTP_SERVER_ERROR_MIN, HTTP_SUCCESS_MAX, HTTP_SUCCESS_MIN,
  HTTP_TOO_MANY_REQUESTS,
  MAX_RETRIES, MAX_RETRY_AFTER_MS, MIN_HOST_GAP_MS, MS_PER_SECOND, REQUEST_TIMEOUT_MS,
  ROBOTS_AGENT_TOKEN, USER_AGENT, HOST_GAP_OVERRIDES_MS,
} from './constants.mjs';
import { HttpError, OfflineError, RequestBudgetError, RobotsDisallowedError } from './errors.mjs';
import { allowAllRobots, isAllowed, parseRobots } from './robots.mjs';
import { createHostThrottle, systemClock } from './throttle.mjs';

const isRetryableStatus = (status) => status === HTTP_TOO_MANY_REQUESTS || status >= HTTP_SERVER_ERROR_MIN;
const isSuccess = (status) => status >= HTTP_SUCCESS_MIN && status <= HTTP_SUCCESS_MAX;

/**
 * Lí do thử lại một phản hồi, hoặc null. Yêu cầu JSON mà nhận 2xx không phải JSON
 * (trang thử thách chống bot của Tiki trả 200 text/html) thì không cache và lùi dần như 429.
 */
function retryReason(res, expect) {
  if (isRetryableStatus(res.status)) return `HTTP ${res.status}`;
  const type = res.headers.get('content-type') ?? '';
  if (expect === 'json' && isSuccess(res.status) && !/json/i.test(type)) {
    return `HTTP ${res.status} ${type || 'không có content-type'} thay vì JSON (có thể là trang chặn bot)`;
  }
  return null;
}

/** Retry-After: số giây hoặc ngày HTTP → số ms phải chờ, null nếu không có/không đọc được. */
export function parseRetryAfter(value, nowMs) {
  if (!value) return null;
  const trimmed = value.trim();
  if (/^\d+$/.test(trimmed)) return Number(trimmed) * MS_PER_SECOND;
  const at = Date.parse(trimmed);
  return Number.isNaN(at) ? null : Math.max(0, at - nowMs);
}

export function createHttpClient({
  cacheDir, offline = false, clock = systemClock(), fetchImpl = globalThis.fetch,
  log = () => {}, maxNetworkRequests = Infinity, gapMs = MIN_HOST_GAP_MS,
  hostGapsMs = HOST_GAP_OVERRIDES_MS, maxRetries = MAX_RETRIES,
}) {
  const cache = createDiskCache(cacheDir);
  const throttle = createHostThrottle({ clock, defaultGapMs: gapMs, hostGapsMs });
  const robotsByOrigin = new Map();
  const stats = { network: 0, cacheHits: 0 };

  async function attemptOnce(url, host) {
    if (stats.network >= maxNetworkRequests) throw new RequestBudgetError(url, maxNetworkRequests);
    stats.network += 1;
    return throttle.run(host, async () => {
      const res = await fetchImpl(url, {
        headers: { 'User-Agent': USER_AGENT, Accept: '*/*' },
        redirect: 'follow',
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      const body = Buffer.from(await res.arrayBuffer());
      return { status: res.status, headers: res.headers, body };
    });
  }

  /** Tải mạng có thử lại; trả `{status, contentType, body}` của phản hồi cuối. */
  async function download(url, expect) {
    const host = new URL(url).host;
    for (let attempt = 0; ; attempt += 1) {
      let res = null;
      let failure = null;
      try {
        res = await attemptOnce(url, host);
      } catch (err) {
        if (err instanceof RequestBudgetError) throw err;
        failure = err;
      }
      const reason = res ? retryReason(res, expect) : `lỗi mạng (${failure.message})`;
      if (!reason) return { status: res.status, contentType: res.headers.get('content-type'), body: res.body };
      if (attempt >= maxRetries) {
        throw new HttpError(url, res ? res.status : 0, `${reason} sau ${maxRetries} lần thử lại`);
      }
      const retryAfter = res ? parseRetryAfter(res.headers.get('retry-after'), clock.now()) : null;
      if (retryAfter !== null && retryAfter > MAX_RETRY_AFTER_MS) {
        throw new HttpError(url, res.status, `máy chủ yêu cầu chờ ${retryAfter / MS_PER_SECOND} giây, quá giới hạn`);
      }
      const wait = retryAfter ?? BACKOFF_BASE_MS * 2 ** attempt;
      log(`${reason} từ ${host}, chờ ${wait / MS_PER_SECOND} giây rồi thử lại (${attempt + 1}/${maxRetries})`);
      throttle.defer(host, clock.now() + wait);
    }
  }

  /** Phản hồi đã cache hoặc tải mới rồi ghi cache (không ghi 429/5xx). */
  async function load(url, { checkRobots, expect = null }) {
    const hit = cache.read(url);
    if (hit) {
      stats.cacheHits += 1;
      return hit;
    }
    if (offline) throw new OfflineError(url);
    if (checkRobots && !isAllowed(await robotsFor(url), url)) throw new RobotsDisallowedError(url);
    const res = await download(url, expect);
    const fetchedAt = new Date(clock.now()).toISOString();
    const meta = cache.write(url, { status: res.status, contentType: res.contentType, fetchedAt }, res.body);
    return { meta, body: res.body };
  }

  async function robotsFor(url) {
    const { origin, host } = new URL(url);
    if (!robotsByOrigin.has(origin)) {
      robotsByOrigin.set(origin, (async () => {
        const { meta, body } = await load(`${origin}/robots.txt`, { checkRobots: false });
        // RFC 9309 §2.3.1.3: 4xx = không có robots.txt, được phép hết.
        const robots = meta.status >= HTTP_CLIENT_ERROR_MIN ? allowAllRobots()
          : parseRobots(body.toString('utf8'), ROBOTS_AGENT_TOKEN);
        if (robots.crawlDelaySeconds !== null) throttle.setGap(host, robots.crawlDelaySeconds * MS_PER_SECOND);
        return robots;
      })());
    }
    return robotsByOrigin.get(origin);
  }

  async function getOk(url, expect = null) {
    const { meta, body } = await load(url, { checkRobots: true, expect });
    if (meta.status >= HTTP_CLIENT_ERROR_MIN) throw new HttpError(url, meta.status);
    return body;
  }

  return {
    getBuffer: (url) => getOk(url),
    getText: async (url) => (await getOk(url)).toString('utf8'),
    getJson: async (url) => {
      const text = (await getOk(url, 'json')).toString('utf8');
      try {
        return JSON.parse(text);
      } catch (err) {
        throw new HttpError(url, 0, `JSON không hợp lệ (${err.message})`);
      }
    },
    fetchedAt: (url) => cache.readMeta(url)?.fetchedAt ?? null,
    stats: () => ({ ...stats }),
  };
}
