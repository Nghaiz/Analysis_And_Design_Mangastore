# ADR-0013: Chỉ chạy localhost, không có môi trường prod

<!-- updated 261111 -->

- Trạng thái: Đã chấp nhận (11/11/2026, chủ dự án chốt, Deferred #28)
- Nguồn: `plans/261111-tiem-thue-truyen/plan.md` Deferred #18, #26, #28; `plans/261111-tiem-thue-truyen/contract.md` §3

## Bối cảnh

Brief §7 ghi hai cấu hình dev và prod, có sẵn cấu hình prod cho VPS. Chủ dự án bỏ hai ý đó ngày 11/11/2026 để đỡ thời gian: dự án là bài môn học, chỉ chạy trên máy.

## Quyết định

- Một `compose.yaml` để chạy tại máy, mọi cổng chỉ mở trên `127.0.0.1` (nginx 8080, MySQL 3307), cộng `compose.e2e.yaml` chồng lên khi chạy E2E (compose project riêng, volume riêng).
- Không có profile `prod`, biến `APP_PROFILE`, `compose.prod.yaml`, TLS, cấu hình VPS hay thư mục `deploy/`.
- Trang `/dev/*` luôn có và luôn mở (Deferred #18).
- Tài khoản mẫu nạp ở mọi lần chạy bằng V2, mật khẩu ghi công khai ở [`docs/dev-accounts.md`](../dev-accounts.md) (Deferred #26).

## Hệ quả

- Không có môi trường công khai nào để lộ mật khẩu mẫu hay trang `/dev/*`.
- GitHub Actions vẫn chạy lint, build, test, E2E, quét image, nhưng không có job deploy.
- Muốn có prod về sau thì phải: thêm `compose.prod.yaml`, tách tài khoản mẫu sang location chỉ nạp ở máy dev, chặn `/dev/*`. Việc đó cần chủ dự án duyệt.

## Phương án đã loại

| Phương án | Lí do loại |
|---|---|
| Hai cấu hình dev và prod theo brief §7 | Chủ dự án bỏ, không có nơi deploy |
