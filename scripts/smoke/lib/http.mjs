// Helper HTTP thuần cho scripts/smoke/flow-*.mjs (phase-06-integration.md §5). Chỉ module có sẵn của Node 24
// (fetch toàn cục). Không theo redirect tự động: smoke khẳng định từng 302 (AuthFilter, đăng nhập).
//
// const s = new Session('http://127.0.0.1:8080');
// let page = await s.get('/LoginView.jsp');                 // { status, location, html, url }
// page = await s.post('/LoginView.jsp', { txtUsername: 'minhanh', txtPassword: '...', btnLogin: '' }, { page });
// s.postParams(action, URLSearchParams, { page }) khi một tên có nhiều giá trị.
// messageOf(page.html)  → câu trong .tt-message-box (đã gỡ thẻ, giải mã thực thể, NFC)
// valueOf(page.html, 'txtFullName'), textOf(page.html, 'id'), hasId(page.html, 'id')

/** Lỗi của một bước kịch bản: smoke in ra rồi exit 1 (AX-05: bước, trang, câu chờ, câu nhận). */
export class StepError extends Error {
  constructor(step, page, expected, actual) {
    super(`${step} | trang ${page} | chờ: ${expected} | nhận: ${actual}`);
    this.step = step;
  }
}

export class Session {
  constructor(base) {
    this.base = base.replace(/\/$/, '');
    this.cookies = new Map();
  }

  #cookieHeader() {
    return [...this.cookies].map(([k, v]) => `${k}=${v}`).join('; ');
  }

  #storeCookies(res) {
    for (const line of res.headers.getSetCookie?.() ?? []) {
      const [pair] = line.split(';');
      const eq = pair.indexOf('=');
      if (eq > 0) this.cookies.set(pair.slice(0, eq).trim(), pair.slice(eq + 1).trim());
    }
  }

  async request(path, { method = 'GET', form = null, follow = true } = {}) {
    let url = new URL(path, `${this.base}/`).toString();
    let body = form ? (form instanceof URLSearchParams ? form : new URLSearchParams(form)).toString() : undefined;
    for (let hop = 0; hop < 5; hop++) {
      const headers = { cookie: this.#cookieHeader() };
      if (body !== undefined) headers['content-type'] = 'application/x-www-form-urlencoded; charset=UTF-8';
      const res = await fetch(url, { method, headers, body, redirect: 'manual' });
      this.#storeCookies(res);
      const location = res.headers.get('location');
      const html = await res.text();
      if (follow && location && res.status >= 300 && res.status < 400) {
        url = new URL(location, url).toString();
        method = 'GET';
        body = undefined;
        continue;
      }
      return { status: res.status, location, html, url, headers: res.headers };
    }
    throw new Error(`quá 5 lần chuyển hướng tại ${path}`);
  }

  get(path, opts = {}) {
    return this.request(path, { ...opts, method: 'GET' });
  }

  /** POST tới `action` (đường dẫn) kèm token csrf lấy từ `page.html`; `withCsrf: false` để thử 403. */
  post(action, fields, { page = null, withCsrf = true, follow = true } = {}) {
    return this.postParams(action, new URLSearchParams(fields), { page, withCsrf, follow });
  }

  /** Như post() nhưng nhận URLSearchParams, để gửi nhiều giá trị cùng tên (ô tích trên nhiều dòng). */
  postParams(action, params, { page = null, withCsrf = true, follow = true } = {}) {
    const form = new URLSearchParams(params);
    if (withCsrf) {
      const token = page ? csrfOf(page.html) : null;
      if (!token) throw new Error(`không thấy input csrf để gửi tới ${action}`);
      form.set('csrf', token);
    }
    return this.request(action, { method: 'POST', form, follow });
  }

  /** Gửi form về chính trang `page` (hoặc tới `action` khi nút có formaction). */
  submit(page, fields, { action = null, withCsrf = true, follow = true } = {}) {
    return this.post(action ?? new URL(page.url).pathname, fields, { page, withCsrf, follow });
  }
}

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

export function decode(s) {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&([a-z]+);/gi, (m, n) => ENTITIES[n.toLowerCase()] ?? m);
}

/** Gỡ thẻ, giải mã, gom khoảng trắng, NFC. */
export function clean(fragment) {
  return decode(fragment.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim().normalize('NFC');
}

function attr(tag, name) {
  const m = tag.match(new RegExp(`\\s${name}\\s*=\\s*("([^"]*)"|'([^']*)')`, 'i'));
  return m ? decode(m[2] ?? m[3] ?? '') : null;
}

export function csrfOf(html) {
  for (const tag of html.match(/<input\b[^>]*>/gi) ?? []) {
    if (attr(tag, 'name') === 'csrf') return attr(tag, 'value');
  }
  return null;
}

/** Mọi câu trong hộp .tt-message-box của trang, theo thứ tự. */
export function messagesOf(html) {
  const out = [];
  const re = /<(p|div)\b[^>]*class\s*=\s*"[^"]*\btt-message-box\b[^"]*"[^>]*>([\s\S]*?)<\/\1>/gi;
  for (const m of html.matchAll(re)) out.push(clean(m[2]));
  return out;
}

export function messageOf(html) {
  return messagesOf(html)[0] ?? null;
}

export function hasId(html, id) {
  return new RegExp(`\\sid\\s*=\\s*["']${id}["']`).test(html);
}

/** value của input có id/name cho trước (lấy cái đầu tiên). */
export function valueOf(html, idOrName) {
  for (const tag of html.match(/<(input|textarea)\b[^>]*>/gi) ?? []) {
    if (attr(tag, 'id') === idOrName || attr(tag, 'name') === idOrName) return attr(tag, 'value') ?? '';
  }
  return null;
}

/** Chữ của phần tử có id cho trước (khớp thẻ đóng cùng tên, không lồng cùng tên). */
export function textOf(html, id) {
  const re = new RegExp(`<([a-z0-9]+)\\b[^>]*\\sid\\s*=\\s*["']${id}["'][^>]*>([\\s\\S]*?)</\\1>`, 'i');
  const m = html.match(re);
  return m ? clean(m[2]) : null;
}

/** Các dòng <tr> trong phần tử có id (bảng), mỗi dòng là mảng chữ của các ô <td>/<th>. */
export function tableRows(html, id) {
  const re = new RegExp(`<table\\b[^>]*\\sid\\s*=\\s*["']${id}["'][^>]*>([\\s\\S]*?)</table>`, 'i');
  const m = html.match(re);
  if (!m) return null;
  const body = m[1].replace(/<thead\b[\s\S]*?<\/thead>/i, '');
  return [...body.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map((r) =>
    [...r[1].matchAll(/<(td|th)\b[^>]*>([\s\S]*?)<\/\1>/gi)].map((c) => clean(c[2])),
  );
}

/** Giá trị (value) của các nút name=... trên trang, theo thứ tự xuất hiện. */
export function buttonValues(html, name) {
  const out = [];
  for (const tag of html.match(/<button\b[^>]*>/gi) ?? []) {
    if (attr(tag, 'name') === name) out.push(attr(tag, 'value'));
  }
  return out;
}

export function assertEq(step, page, expected, actual) {
  const norm = (v) => (typeof v === 'string' ? v.normalize('NFC') : JSON.stringify(v));
  if (norm(expected) !== norm(actual)) throw new StepError(step, page, norm(expected), norm(actual));
}
