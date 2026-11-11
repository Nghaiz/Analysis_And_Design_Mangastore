// Mạng giả cho test: fetch đọc phản hồi ghi sẵn trong index.json, đồng hồ giả không ngủ thật.

import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHttpClient } from '../../../src/fetch/client.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const index = JSON.parse(readFileSync(join(here, 'index.json'), 'utf8'));
const START_MS = Date.parse('2026-11-11T00:00:00Z');

export function fakeClock(start = START_MS) {
  const clock = { t: start, now: () => clock.t, sleep: async (ms) => { clock.t += ms; } };
  return clock;
}

export function fixtureBody(file) {
  return readFileSync(join(here, file));
}

/** fetch giả: `overrides[url]` (mảng phản hồi lần lượt hoặc một phản hồi) trước, rồi index.json. */
export function fixtureFetch(clock, overrides = {}) {
  const calls = [];
  const queues = Object.fromEntries(Object.entries(overrides).map(([u, r]) => [u, [].concat(r)]));
  const impl = async (url, init) => {
    calls.push({ url, at: clock.now(), headers: init?.headers ?? {} });
    const queued = queues[url];
    const spec = queued?.length ? (queued.length > 1 ? queued.shift() : queued[0]) : index[url];
    if (!spec) return new Response('not in fixtures', { status: 404, headers: { 'content-type': 'text/plain' } });
    const body = spec.file ? fixtureBody(spec.file) : (spec.body ?? '');
    const headers = { 'content-type': spec.contentType ?? 'application/octet-stream', ...(spec.headers ?? {}) };
    return new Response(body, { status: spec.status ?? 200, headers });
  };
  return { impl, calls };
}

export function tempDir(prefix = 'pipeline-test-') {
  return mkdtempSync(join(tmpdir(), prefix));
}

/** Bộ tải thật (cache, throttle, robots) nối với mạng giả và đồng hồ giả. */
export function fixtureClient({ overrides, offline = false, cacheDir = tempDir(), ...rest } = {}) {
  const clock = fakeClock();
  const net = fixtureFetch(clock, overrides);
  const logs = [];
  const http = createHttpClient({ cacheDir, offline, clock, fetchImpl: net.impl, log: (m) => logs.push(m), ...rest });
  return { http, clock, calls: net.calls, logs, cacheDir };
}
