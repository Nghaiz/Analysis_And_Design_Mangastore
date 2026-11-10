// Rule, skill và agent của dự án (phase 2, tiêu chí 3). Danh sách đọc từ dòng "Owns:" của file phase 2.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, resolve, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const PHASE = readFileSync(join(ROOT, 'plans/261111-tiem-thue-truyen/phase-02-bo-cong-cu-ai.md'), 'utf8');
const owns = [...PHASE.split('\n').find((l) => l.startsWith('Owns:')).matchAll(/`([^`]+)`/g)].map((m) => m[1]);
const RULES = owns.filter((p) => p.startsWith('.claude/rules/tiem-'));
const SKILLS = owns.filter((p) => p.startsWith('.claude/skills/tiem-')).map((p) => p.split('/')[2]);
const AGENTS = owns.filter((p) => p.startsWith('.claude/agents/tiem-'));

/** Frontmatter dạng `key: value` một dòng giữa hai dòng `---`. */
export function frontmatter(text) {
  const m = /^---\n([\s\S]*?)\n---\n/.exec(text.replace(/\r\n/g, '\n'));
  if (!m) return null;
  return Object.fromEntries(m[1].split('\n').filter((l) => /^[\w-]+:/.test(l)).map((l) => {
    const i = l.indexOf(':');
    return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')];
  }));
}

test('Owns của phase 2 liệt kê 5 rule, 8 skill, 1 agent', () => {
  assert.equal(RULES.length, 5);
  assert.equal(SKILLS.length, 8);
  assert.deepEqual(AGENTS, ['.claude/agents/tiem-contract-guard.md']);
});

test('5 rule tồn tại và trỏ docs/contracts.md', () => {
  for (const r of RULES) {
    assert.ok(existsSync(join(ROOT, r)), `thiếu ${r}`);
    assert.match(readFileSync(join(ROOT, r), 'utf8'), /docs\/contracts\.md/, `${r} không trỏ docs/contracts.md`);
  }
});

for (const s of SKILLS) {
  test(`skill ${s}: frontmatter, Gotchas, danh sách kiểm tra, lệnh kiểm`, () => {
    const p = join(ROOT, '.claude/skills', s, 'SKILL.md');
    assert.ok(existsSync(p), `thiếu ${p}`);
    const text = readFileSync(p, 'utf8');
    const fm = frontmatter(text);
    assert.ok(fm, 'thiếu frontmatter --- ... ---');
    assert.equal(fm.name, s, 'name phải trùng tên thư mục');
    assert.match(fm.name, /^tiem-/);
    assert.ok(fm.description && fm.description.length >= 20, 'description rỗng hoặc quá ngắn');
    assert.match(text, /^## Gotchas/m, 'thiếu mục ## Gotchas');
    assert.match(text, /^## .*(Danh sách kiểm tra|Checklist)/m, 'thiếu danh sách kiểm tra cuối');
    assert.match(text, /^## .*Lệnh kiểm/m, 'thiếu mục lệnh kiểm');
  });
}

test('agent tiem-contract-guard: chỉ đọc, model opus', () => {
  for (const a of AGENTS) {
    const p = join(ROOT, a);
    assert.ok(existsSync(p), `thiếu ${a}`);
    const fm = frontmatter(readFileSync(p, 'utf8'));
    assert.ok(fm, 'thiếu frontmatter');
    assert.equal(fm.name, basename(a, '.md'));
    assert.equal(fm.model, 'opus');
    assert.ok(fm.description, 'description rỗng');
    assert.deepEqual(fm.tools.split(',').map((t) => t.trim()).sort(), ['Bash', 'Glob', 'Grep', 'Read']);
  }
});

test('git chỉ theo dõi file tiem-* của .claude (không file nào của kit)', () => {
  const r = spawnSync('git', ['ls-files', '.claude'], { cwd: ROOT, encoding: 'utf8' });
  assert.equal(r.status, 0);
  const allowed = (f) => RULES.includes(f) || AGENTS.includes(f)
    || SKILLS.some((s) => f.startsWith(`.claude/skills/${s}/`));
  const extra = r.stdout.split('\n').filter(Boolean).filter((f) => !allowed(f));
  assert.deepEqual(extra, [], 'file ngoài danh sách tiem-* trong git');
});
