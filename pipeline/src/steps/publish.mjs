// Lệnh publish (CONTRACT §7): chép data/export/*.sql và data/images/full/** vào volume Docker; volume ảnh
// được đồng bộ (bỏ file nguồn không còn). Không xoá volume, không khởi động lại app. --dry-run chỉ in lệnh.
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { exists, paths } from '../lib/io.mjs';
import { V10_FILE, V11_FILE } from './export.mjs';

export const DEFAULT_PROJECT = 'tiemtruyen';
export const COPY_IMAGE = 'alpine:3.22';
const PUBLISH_RUN = 'full';
const EXIT_USAGE = 2;

/** Hai lệnh docker cần chạy, theo thứ tự. */
export function publishPlan(ctx) {
  const project = ctx.project ?? DEFAULT_PROJECT;
  const exportDir = join(ctx.dataDir, 'export');
  const imagesDir = paths.imagesDir(ctx, PUBLISH_RUN);
  const job = (volume, source, script) => ({
    volume,
    source,
    args: ['run', '--rm', '-v', `${volume}:/dst`, '--mount', `type=bind,source=${source},target=/src,readonly`, COPY_IMAGE, 'sh', '-c', script],
  });
  return [
    job(`${project}_catalog_data`, exportDir, "find /src -maxdepth 1 -name '*.sql' -exec cp {} /dst/ \\; && ls -l /dst"),
    job(`${project}_covers_data`, imagesDir, COVERS_SYNC),
  ];
}

// Volume ảnh khớp đúng data/images/full: chép đè, rồi xoá file và thư mục mà nguồn không còn
// (Book bớt ảnh phụ, Book bị bỏ). Không xoá volume. Chỉ publish ghi vào covers_data.
export const COVERS_SYNC =
  'cp -a /src/. /dst/ && cd /dst && find . -mindepth 1 -depth -exec sh -c \'[ -e "/src/$1" ] || rm -rf "$1"\' _ {} \\; && ls /dst | wc -l';

const quote = (arg) => (/[\s'"\\;&|*]/.test(arg) ? `"${arg.replace(/"/g, '\\"')}"` : arg);

export async function publish(ctx, { spawn = spawnSync } = {}) {
  const plan = publishPlan(ctx);
  const required = [join(ctx.dataDir, 'export', V10_FILE), join(ctx.dataDir, 'export', V11_FILE), plan[1].source];
  const missing = [];
  for (const file of required) if (!(await exists(file))) missing.push(file);
  if (missing.length) {
    ctx.log(`[publish] thiếu ${missing.join(', ')}: chạy "node pipeline/cli.mjs run" (run = full) trước`);
    return { exitCode: 1, summary: { error: 'missing-export', missing } };
  }
  if (ctx.dryRun) {
    for (const step of plan) ctx.log(`[publish] (dry-run) docker ${step.args.map(quote).join(' ')}`);
    return { exitCode: 0, summary: { dryRun: true, volumes: plan.map((step) => step.volume) } };
  }
  const probe = spawn('docker', ['version', '--format', '{{.Server.Version}}'], { encoding: 'utf8' });
  if (probe.error || probe.status !== 0) {
    ctx.log('[publish] không gọi được Docker: cài/khởi động Docker Desktop rồi chạy lại');
    return { exitCode: EXIT_USAGE, summary: { error: 'docker-unavailable' } };
  }
  for (const step of plan) {
    const inspect = spawn('docker', ['volume', 'inspect', step.volume], { encoding: 'utf8' });
    if (inspect.status !== 0) {
      ctx.log(`[publish] chưa có volume ${step.volume}: chạy "docker compose up -d" một lần để compose tạo volume`);
      return { exitCode: 1, summary: { error: 'missing-volume', volume: step.volume } };
    }
  }
  for (const step of plan) {
    ctx.log(`[publish] docker ${step.args.map(quote).join(' ')}`);
    const result = spawn('docker', step.args, { encoding: 'utf8' });
    if (result.status !== 0) {
      ctx.log(`[publish] lỗi khi chép vào ${step.volume}: ${(result.stderr || result.error?.message || '').trim()}`);
      return { exitCode: 1, summary: { error: 'copy-failed', volume: step.volume } };
    }
  }
  ctx.log('[publish] xong. Orchestrator khởi động lại app với database mới để Flyway nạp V10/V11.');
  return { exitCode: 0, summary: { dryRun: false, volumes: plan.map((step) => step.volume) } };
}
