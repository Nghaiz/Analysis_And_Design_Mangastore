import { describe, expect, it } from 'vitest';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { publish, publishPlan } from '../src/steps/publish.mjs';
import { extraCommands, steps } from '../src/steps/index.mjs';
import { makeCtx } from './fixtures/records/harness.mjs';

async function withExports(ctx) {
  await mkdir(join(ctx.dataDir, 'export'), { recursive: true });
  await writeFile(join(ctx.dataDir, 'export', 'V10__catalog_data.sql'), '-- v10\n');
  await writeFile(join(ctx.dataDir, 'export', 'V11__sample_bills.sql'), '-- v11\n');
  await mkdir(join(ctx.dataDir, 'images', 'full', '1'), { recursive: true });
}

describe('đăng kí bước', () => {
  it('steps đúng thứ tự CONTRACT §3, publish nằm trong extraCommands', () => {
    expect(steps.map((s) => s.name)).toEqual(['clean', 'images', 'copies', 'price', 'validate', 'export']);
    expect(extraCommands.map((c) => c.name)).toEqual(['publish']);
    for (const step of [...steps, ...extraCommands]) {
      expect(typeof step.describe).toBe('string');
      expect(typeof step.run).toBe('function');
    }
  });
});

describe('publish', () => {
  it('kế hoạch chép vào <project>_catalog_data và <project>_covers_data bằng alpine:3.22', async () => {
    const ctx = await makeCtx({ run: 'full' });
    const plan = publishPlan({ ...ctx, project: 'demo' });
    expect(plan.map((p) => p.volume)).toEqual(['demo_catalog_data', 'demo_covers_data']);
    expect(plan[1].source).toBe(join(ctx.dataDir, 'images', 'full'));
    for (const p of plan) expect(p.args).toContain('alpine:3.22');
  });

  it('--dry-run in lệnh, không gọi docker', async () => {
    const ctx = await makeCtx({ run: 'full', dryRun: true });
    await withExports(ctx);
    const calls = [];
    const result = await publish(ctx, { spawn: (...args) => calls.push(args) });
    expect(result.exitCode).toBe(0);
    expect(calls).toEqual([]);
    expect(ctx.logs.filter((l) => l.startsWith('[publish] (dry-run) docker run --rm'))).toHaveLength(2);
  });

  it('thiếu file export thì exit 1; thiếu Docker thì exit 2', async () => {
    const ctx = await makeCtx({ run: 'full' });
    expect((await publish(ctx, { spawn: () => ({ status: 0 }) })).exitCode).toBe(1);
    await withExports(ctx);
    const noDocker = () => ({ status: null, error: Object.assign(new Error('spawn docker ENOENT'), { code: 'ENOENT' }) });
    expect((await publish(ctx, { spawn: noDocker })).exitCode).toBe(2);
  });

  it('chạy đủ hai lệnh docker khi volume có sẵn', async () => {
    const ctx = await makeCtx({ run: 'full' });
    await withExports(ctx);
    const calls = [];
    const result = await publish(ctx, { spawn: (cmd, args) => (calls.push(args[0] + ' ' + args[1]), { status: 0, stdout: '' }) });
    expect(result.exitCode).toBe(0);
    expect(calls).toEqual(['version --format', 'volume inspect', 'volume inspect', 'run --rm', 'run --rm']);
  });
});
