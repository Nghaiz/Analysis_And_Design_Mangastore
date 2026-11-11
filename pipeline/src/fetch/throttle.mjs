// Hàng đợi theo host: một request đang chạy mỗi host, request sau bắt đầu
// sớm nhất `gapMs` sau khi request trước kết thúc, và không trước `notBefore` (Retry-After).

export function systemClock() {
  return {
    now: () => Date.now(),
    sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  };
}

export function createHostThrottle({ clock, defaultGapMs, hostGapsMs = {} }) {
  const hosts = new Map();

  function state(host) {
    if (!hosts.has(host)) {
      const gapMs = Math.max(defaultGapMs, hostGapsMs[host] ?? 0);
      hosts.set(host, { tail: Promise.resolve(), lastEnd: null, notBefore: 0, gapMs });
    }
    return hosts.get(host);
  }

  /** Chạy `task` khi tới lượt host; trả kết quả của `task`. */
  function run(host, task) {
    const s = state(host);
    const result = s.tail.then(async () => {
      const earliest = Math.max(s.lastEnd === null ? 0 : s.lastEnd + s.gapMs, s.notBefore);
      const wait = earliest - clock.now();
      if (wait > 0) await clock.sleep(wait);
      try {
        return await task();
      } finally {
        s.lastEnd = clock.now();
      }
    });
    s.tail = result.catch(() => undefined);
    return result;
  }

  /** Không cho host nhận request mới trước thời điểm `untilMs`. */
  function defer(host, untilMs) {
    const s = state(host);
    s.notBefore = Math.max(s.notBefore, untilMs);
  }

  /** Nâng khoảng cách của host (Crawl-delay lớn hơn hiện tại); không bao giờ hạ xuống. */
  function setGap(host, gapMs) {
    const s = state(host);
    s.gapMs = Math.max(s.gapMs, gapMs);
  }

  const gapOf = (host) => state(host).gapMs;

  return { run, defer, setGap, gapOf };
}
