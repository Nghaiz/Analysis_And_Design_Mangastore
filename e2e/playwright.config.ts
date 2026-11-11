// Playwright E2E (phase-08-e2e-ci-hoan-thien.md lane 8A, skill tiem-write-e2e-chapter2). File dùng chung, chỉ orchestrator sửa.
// Chạy trên stack E2E (seed ch.2): SMOKE_BASE_URL (mặc định http://127.0.0.1:8080) và SMOKE_COMPOSE_PROJECT
// (mặc định tiemtruyen-e2e) dùng chung tên biến với scripts/smoke để fixture đặt lại DB đúng stack.
import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.SMOKE_BASE_URL ?? 'http://127.0.0.1:8080';
const common = {
  baseURL,
  locale: 'vi-VN',
  timezoneId: 'Asia/Ho_Chi_Minh',
  trace: 'retain-on-failure' as const,
  screenshot: 'only-on-failure' as const,
};

export default defineConfig({
  testDir: './tests',
  // Một DB cho mọi test: không chạy song song (đặt lại DB trước mỗi kịch bản).
  workers: 1,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : [['list']],
  projects: [
    {
      name: 'mobile',
      use: { ...devices['Desktop Chrome'], ...common, viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true },
    },
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], ...common, viewport: { width: 1440, height: 900 } },
    },
  ],
});
