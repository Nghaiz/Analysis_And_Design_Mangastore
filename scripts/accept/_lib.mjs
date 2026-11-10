// Thư viện dùng chung cho scripts/accept/phase-0N.mjs (quy ước: contract.md §7).
// Chỉ dùng module có sẵn của Node 24. In mỗi bước một dòng [accept] PASS|FAIL, không màu khi
// không có TTY hoặc có NO_COLOR, không hỏi tương tác. Exit 0 = mọi bước PASS, 1 = có FAIL,
// 2 = thiếu công cụ (JDK 25, Docker, Node).
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, appendFileSync, writeFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import http from 'node:http';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const IS_WIN = process.platform === 'win32';

const useColor = process.stdout.isTTY && !process.env.NO_COLOR;
const paint = (code, s) => (useColor ? `\x1b[${code}m${s}\x1b[0m` : s);

/** Mã thời gian yymmdd-hhmm theo giờ máy. */
export function stamp(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${String(d.getFullYear()).slice(2)}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
}

export class MissingToolError extends Error {}

/**
 * Bộ chạy Accept: ghi log đầy đủ vào plans/reports/accept-<name>-<ts>.log.
 * step(name, fn): fn ném Error(lí do + ' → ' + việc cần làm) khi FAIL; ném MissingToolError khi thiếu công cụ.
 */
export function createRunner(name) {
  const dir = join(ROOT, 'plans', 'reports');
  mkdirSync(dir, { recursive: true });
  const logPath = join(dir, `accept-${name}-${stamp()}.log`);
  writeFileSync(logPath, `# accept ${name} ${new Date().toISOString()}\n`);
  const results = [];
  let missingTool = false;

  const log = (text) => appendFileSync(logPath, text.endsWith('\n') ? text : `${text}\n`);

  async function step(title, fn) {
    log(`\n## ${title}`);
    try {
      const note = await fn();
      results.push({ title, ok: true });
      console.log(`${paint('32', '[accept] PASS')} ${title}${note ? ` (${note})` : ''}`);
      log(`PASS${note ? ` ${note}` : ''}`);
    } catch (err) {
      if (err instanceof MissingToolError) missingTool = true;
      const msg = String(err?.message ?? err).split('\n')[0];
      results.push({ title, ok: false });
      console.log(`${paint('31', '[accept] FAIL')} ${title}: ${msg}`);
      log(`FAIL ${err?.stack ?? err}`);
    }
  }

  function finish() {
    const failed = results.filter((r) => !r.ok).length;
    const summary = `[accept] ${failed === 0 ? 'ALL PASS' : `${failed}/${results.length} FAIL`} (log: ${logPath.slice(ROOT.length + 1)})`;
    console.log(summary);
    log(summary);
    process.exit(failed === 0 ? 0 : missingTool ? 2 : 1);
  }

  return { step, finish, log, logPath };
}

/** Chạy lệnh đồng bộ, ghi stdout/stderr vào log; trả { code, out }. */
export function run(runner, cmd, args, opts = {}) {
  const shell = opts.shell ?? (IS_WIN && /\.(cmd|bat)$/i.test(cmd));
  runner.log(`$ ${cmd} ${args.join(' ')}`);
  const r = spawnSync(cmd, args, {
    cwd: opts.cwd ?? ROOT,
    env: { ...process.env, ...(opts.env ?? {}) },
    encoding: 'utf8',
    shell,
    timeout: opts.timeout ?? 30 * 60 * 1000,
    maxBuffer: 256 * 1024 * 1024,
  });
  const out = `${r.stdout ?? ''}${r.stderr ?? ''}`;
  runner.log(out);
  if (r.error && r.error.code === 'ENOENT') {
    throw new MissingToolError(`không tìm thấy lệnh ${cmd} → cài ${cmd} rồi chạy lại`);
  }
  return { code: r.status ?? 1, out };
}

/** Như run() nhưng ném lỗi khi exit khác 0. */
export function mustRun(runner, cmd, args, opts = {}) {
  const r = run(runner, cmd, args, opts);
  if (r.code !== 0) {
    const tail = r.out.trim().split('\n').slice(-3).join(' | ').slice(0, 300);
    throw new Error(`${cmd} ${args.join(' ')} exit ${r.code}: ${tail} → ${opts.fix ?? 'xem log'}`);
  }
  return r;
}

function javaMajor(javaHome) {
  const bin = join(javaHome, 'bin', IS_WIN ? 'java.exe' : 'java');
  if (!existsSync(bin)) return null;
  const r = spawnSync(bin, ['-version'], { encoding: 'utf8' });
  const m = /version "(\d+)/.exec(`${r.stdout}${r.stderr}`);
  return m ? Number(m[1]) : null;
}

/**
 * Tìm JDK 25 cho tiến trình con, không đổi biến môi trường của hệ thống.
 * Thứ tự: JAVA25_HOME → JAVA_HOME (nếu là 25) → C:/Program Files/Eclipse Adoptium/jdk-25* (Windows).
 */
export function findJava25() {
  const candidates = [process.env.JAVA25_HOME, process.env.JAVA_HOME].filter(Boolean);
  const adoptium = 'C:/Program Files/Eclipse Adoptium';
  if (IS_WIN && existsSync(adoptium)) {
    for (const d of readdirSync(adoptium).filter((n) => /^jdk-25/.test(n)).sort().reverse()) {
      candidates.push(join(adoptium, d));
    }
  }
  for (const c of candidates) if (javaMajor(c) === 25) return c;
  throw new MissingToolError(
    'không thấy JDK 25 → cài: winget install --id EclipseAdoptium.Temurin.25.JDK -e, hoặc đặt JAVA25_HOME',
  );
}

/** Lệnh Maven Wrapper đúng hệ điều hành. */
export const MVNW = IS_WIN ? join(ROOT, 'mvnw.cmd') : join(ROOT, 'mvnw');

export function requireDocker(runner) {
  const r = run(runner, 'docker', ['info', '--format', '{{.ServerVersion}}']);
  if (r.code !== 0) throw new MissingToolError('Docker không chạy → mở Docker Desktop rồi chạy lại');
  return r.out.trim();
}

/** GET qua node:http (không tự giải nén), trả { status, headers, body }. */
export function httpGet(url, headers = {}, timeoutMs = 10000) {
  return new Promise((resolvePromise, reject) => {
    const req = http.get(url, { headers }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () =>
        resolvePromise({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }),
      );
    });
    req.setTimeout(timeoutMs, () => req.destroy(new Error(`timeout ${timeoutMs}ms`)));
    req.on('error', reject);
  });
}
