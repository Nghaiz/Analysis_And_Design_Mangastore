// Test cho section10-sync.mjs: khớp → exit 0; sửa một kí tự trong khối của rule → exit 1 kèm vị trí byte;
// thiếu dấu → exit 1; chạy trên repo thật → exit 0. Bước làm đỏ có chủ đích của phase 2 (tiêu chí 1).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { BEGIN, END, BRIEF, briefSection10, firstDiff, markedBlock } from './section10-sync.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SCRIPT = join(ROOT, 'scripts/check/section10-sync.mjs');
const SECTION = briefSection10(readFileSync(join(ROOT, BRIEF), 'utf8'));

function fixture({ agents = SECTION, rule = SECTION, ruleMarkers = true } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 's10-'));
  writeFileSync(join(dir, BRIEF), readFileSync(join(ROOT, BRIEF)));
  writeFileSync(join(dir, 'AGENTS.md'), `# A\n\n${BEGIN}${agents}${END}\n`);
  mkdirSync(join(dir, '.claude/rules'), { recursive: true });
  writeFileSync(join(dir, '.claude/rules/tiem-cook-orchestration.md'),
    ruleMarkers ? `# R\n\n${BEGIN}${rule}${END}\n\nphần thêm\n` : `# R\n\n${rule}\n`);
  return dir;
}
const runOn = (dir) => spawnSync(process.execPath, [SCRIPT, '--root', dir], { encoding: 'utf8' });

test('brief §10 bắt đầu bằng tiêu đề §10 và dừng trước §11', () => {
  assert.match(SECTION, /^## 10\. /);
  assert.ok(!SECTION.includes('## 11.'));
  assert.ok(SECTION.endsWith('\n'));
});

test('khớp từng byte → exit 0', () => {
  const dir = fixture();
  try { assert.equal(runOn(dir).status, 0); } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('sửa một kí tự trong khối của rule → exit 1, in vị trí byte và việc cần làm', () => {
  const pos = SECTION.indexOf('orchestrator');
  const broken = `${SECTION.slice(0, pos)}O${SECTION.slice(pos + 1)}`;
  const dir = fixture({ rule: broken });
  try {
    const r = runOn(dir);
    assert.equal(r.status, 1);
    assert.match(r.stdout, new RegExp(`tiem-cook-orchestration\\.md: lệch brief §10 ở byte ${Buffer.byteLength(SECTION.slice(0, pos))}`));
    assert.match(r.stdout, /→ chép lại nguyên văn/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('thiếu dấu → exit 1', () => {
  const dir = fixture({ ruleMarkers: false });
  try { assert.equal(runOn(dir).status, 1); } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('firstDiff và markedBlock', () => {
  assert.equal(firstDiff('abc', 'abc'), -1);
  assert.equal(firstDiff('ab', 'abc'), 2);
  assert.equal(firstDiff('đa', 'đb'), 2);
  assert.equal(markedBlock(`x${BEGIN}y${END}`), 'y');
  assert.equal(markedBlock(`${BEGIN}y${END}${BEGIN}z${END}`), null);
});

test('repo thật khớp (AGENTS.md và tiem-cook-orchestration.md)', () => {
  const r = spawnSync(process.execPath, [SCRIPT], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stdout);
});
