# ADR-0012: Pipeline dữ liệu viết bằng Node

<!-- updated 261111 -->

- Trạng thái: Đã chấp nhận (11/11/2026)
- Nguồn: `plans/261111-tiem-thue-truyen/plan.md` Deferred #5; brainstorm §6

## Bối cảnh

Pipeline crawl, làm sạch, nén ảnh, sinh giá và quyển, validate, xuất migration Flyway; chạy lại được nhiều lần (brief §6). Dự án đã có Node 24 cho frontend.

## Quyết định

- `pipeline/` là gói Node 24 ESM (`.mjs`), `sharp` cho ảnh (WebP, AVIF), Vitest cho test. Lệnh qua `node pipeline/cli.mjs <lệnh>`.
- Phiên bản gói tra npm registry lúc ghim (phase 4).

## Hệ quả

- Một bộ công cụ chung với frontend; không thêm Python vào máy dev, CI hay ảnh Docker.
- Lệnh và bước: [`docs/data-pipeline.md`](../data-pipeline.md).

## Phương án đã loại

| Phương án | Lí do loại |
|---|---|
| Python (requests, Pillow) | Thêm toolchain thứ hai cho một phần nhỏ của dự án |
