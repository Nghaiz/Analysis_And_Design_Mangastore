#!/usr/bin/env node
// Chạy Maven Wrapper với JDK 25 cho riêng tiến trình con, không đổi JAVA_HOME của hệ thống.
// Dùng: node scripts/dev/mvnw.mjs -B verify      (mọi tham số chuyển nguyên cho mvnw)
// Tìm JDK 25 theo thứ tự: JAVA25_HOME → JAVA_HOME (nếu là 25) → C:/Program Files/Eclipse Adoptium/jdk-25*.
// Exit: mã thoát của Maven; 2 khi thiếu JDK 25 hoặc Maven Wrapper.
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { ROOT, MVNW, IS_WIN, findJava25, MissingToolError } from '../accept/_lib.mjs';

let javaHome;
try {
  javaHome = findJava25();
} catch (err) {
  if (!(err instanceof MissingToolError)) throw err;
  console.error(`[mvnw] ${err.message}`);
  process.exit(2);
}
if (!existsSync(MVNW)) {
  console.error('[mvnw] thiếu Maven Wrapper (mvnw, mvnw.cmd) ở gốc repo → kiểm checkout');
  process.exit(2);
}
const r = spawnSync(MVNW, process.argv.slice(2), {
  cwd: ROOT,
  stdio: 'inherit',
  shell: IS_WIN,
  env: { ...process.env, JAVA_HOME: javaHome },
});
process.exit(r.status ?? 1);
