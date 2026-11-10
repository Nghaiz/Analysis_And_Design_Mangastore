#!/usr/bin/env node
// Accept phase 2 (plans/261111-tiem-thue-truyen/phase-02-bo-cong-cu-ai.md, tiêu chí 1–5 và 7).
// Tiêu chí 6 (chạy thử tiem-contract-guard) ghi ở plans/reports/phase-02-tiem-contract-guard-dryrun-*.md.
// Chạy: node scripts/accept/phase-02.mjs
import { existsSync, readFileSync, readdirSync, mkdtempSync, writeFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { ROOT, IS_WIN, createRunner, run, mustRun, MissingToolError } from './_lib.mjs';

const runner = createRunner('phase-02');
const { step } = runner;
const NPX = IS_WIN ? 'npx.cmd' : 'npx';
const NPM = IS_WIN ? 'npm.cmd' : 'npm';
const MERMAID_CLI = '@mermaid-js/mermaid-cli@12.2.0';
const read = (p) => readFileSync(join(ROOT, p), 'utf8');
const nodeTest = (file) => mustRun(runner, process.execPath, ['--test', file], { fix: `sửa theo test hỏng (${file})` });

function walk(dir) {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

// 1. Brief §10 khớp từng byte ở AGENTS.md và tiem-cook-orchestration.md (+ test làm đỏ có chủ đích)
await step('1 section10-sync exit 0 (và test đổi một kí tự thì exit 1)', () => {
  mustRun(runner, process.execPath, ['scripts/check/section10-sync.mjs'], {
    fix: 'chép lại nguyên văn brief §10 giữa hai dấu, không sửa tay',
  });
  nodeTest('scripts/check/section10-sync.test.mjs');
});

// 2. docs/contracts.md đủ trang, thông báo, bảng, DAO, session, props island
await step('2 contracts-doc.test.mjs', () => nodeTest('scripts/check/contracts-doc.test.mjs'));

// 3. Rule, skill, agent hợp lệ; git chỉ có file tiem-* trong .claude
await step('3 skills-frontmatter.test.mjs', () => nodeTest('scripts/check/skills-frontmatter.test.mjs'));

// 4. Mọi khối Mermaid trong docs render được
await step(`4 Mermaid trong docs/ render được (${MERMAID_CLI})`, () => {
  const files = walk(join(ROOT, 'docs')).filter((f) => f.endsWith('.md') && /```mermaid/.test(readFileSync(f, 'utf8')));
  if (files.length === 0) throw new Error('docs/ không có khối mermaid nào → schema.md và page-flow.md phải có');
  const out = mkdtempSync(join(tmpdir(), 'mmd-'));
  try {
    let blocks = 0;
    for (const f of files) {
      const text = readFileSync(f, 'utf8');
      for (const m of text.matchAll(/```mermaid\n([\s\S]*?)```/g)) {
        blocks += 1;
        const src = join(out, `b${blocks}.mmd`);
        writeFileSync(src, m[1]);
        const r = run(runner, NPX, ['-y', MERMAID_CLI, '-q', '-i', src, '-o', join(out, `b${blocks}.svg`)], { timeout: 10 * 60 * 1000 });
        if (r.code !== 0) {
          if (/not found|ENOENT|ERR_MODULE/i.test(r.out) && blocks === 1) throw new MissingToolError(`không chạy được ${MERMAID_CLI} → kiểm mạng/npx`);
          throw new Error(`${relative(ROOT, f)} khối mermaid thứ ${blocks} lỗi: ${r.out.trim().split('\n').slice(-2).join(' ')} → sửa cú pháp Mermaid`);
        }
      }
    }
    return `${blocks} khối trong ${files.length} file`;
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
});

// 5. CLAUDE.md nhập AGENTS.md; lệnh trong AGENTS.md trỏ tới thứ có thật và chạy được
await step('5 CLAUDE.md @AGENTS.md, lệnh trong AGENTS.md chạy được', () => {
  if (!existsSync(join(ROOT, 'CLAUDE.md')) || !existsSync(join(ROOT, 'AGENTS.md'))) throw new Error('thiếu CLAUDE.md hoặc AGENTS.md → lane 2A');
  const first = read('CLAUDE.md').split('\n').find((l) => l.trim());
  if (first.trim() !== '@AGENTS.md') throw new Error(`dòng đầu CLAUDE.md là "${first}" → đặt "@AGENTS.md" ở dòng đầu`);
  const agents = read('AGENTS.md');
  const rows = agents.split('\n').filter((l) => /^\| [^|]+ \| [^|]*`[^`]+`[^|]* \| phase \d+ \|$/.test(l));
  if (rows.length < 8) throw new Error(`bảng "Lệnh chạy" chỉ có ${rows.length} dòng đúng dạng | Việc | \`lệnh\` | phase N | → sửa AGENTS.md`);
  const pkg = (dir) => JSON.parse(read(`${dir}/package.json`)).scripts ?? {};
  const problems = [];
  for (const row of rows) {
    const phase = Number(/phase (\d+)/.exec(row.split('|').at(-2))[1]);
    if (phase > 2) continue;
    for (const [, cmd] of row.split('|')[2].matchAll(/`([^`]+)`/g)) {
      for (const [, p] of cmd.matchAll(/(?:^|\s|")((?:scripts|frontend|docker|docs|src|config|\.claude)\/[\w./*-]+)/g)) {
        if (!p.includes('*') && !existsSync(join(ROOT, p))) problems.push(`${cmd}: không có ${p}`);
      }
      for (const [, dir, name] of cmd.matchAll(/npm --prefix (\w+) run ([\w:-]+)/g)) {
        if (!existsSync(join(ROOT, dir, 'package.json')) || !pkg(dir)[name]) problems.push(`${cmd}: ${dir}/package.json không có script ${name}`);
      }
    }
  }
  if (problems.length) throw new Error(`${problems.join('; ')} → sửa bảng Lệnh chạy hoặc ghi "phase N" cho lệnh của phase sau`);
  const mustHave = ['node scripts/check/section10-sync.mjs', 'node --test "scripts/check/*.test.mjs"', 'npm --prefix frontend run lint', 'npm --prefix frontend run test'];
  const absent = mustHave.filter((c) => !agents.includes(c));
  if (absent.length) throw new Error(`AGENTS.md thiếu lệnh ${absent.join(', ')} → thêm vào bảng Lệnh chạy`);
  for (const s of ['lint', 'test']) mustRun(runner, NPM, ['--prefix', 'frontend', 'run', s], { fix: `npm --prefix frontend run ${s}` });
  return `${rows.length} lệnh`;
});

// 7. Chống thoái lui: Accept phase 1 vẫn xanh
await step('7 Accept phase 1 vẫn xanh', () => {
  mustRun(runner, process.execPath, ['scripts/accept/phase-01.mjs'], {
    timeout: 60 * 60 * 1000, fix: 'xem log accept-phase-01 mới nhất trong plans/reports/',
  });
});

runner.finish();
