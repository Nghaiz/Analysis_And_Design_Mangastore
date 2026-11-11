# Phase 4b: dọn mục bỏ sót của phase 1–4

Ngày 11/11/2026. Nhánh phase `phase/04-don-no` (từ `origin/main` 5166040). Orchestrator: phiên cook phase 3–4.
Nguồn: `plans/reports/phase-01-04-audit-concerns-261111-0803.md` (101 concern của 19 báo cáo lane; 14 mục d, 1 mục d′, 2 mục b⚠, 8 bất nhất).
Depends-on: 4. Không đổi hợp đồng nghiệp vụ brief §3; không thêm hàm DAO ngoài `docs/contracts.md` §5.3.

## Lane

| Lane | Việc (số mục trong báo cáo soát) | Agent | Worktree / nhánh | Owns |
|---|---|---|---|---|
| J `java` | #24 bỏ `JsonReader`, `ViteManifest` đọc manifest bằng Jackson (đã có trong `pom.xml`); #57 getter `AppConfig.flywayDataLocation()`, `MigrationListener` dùng nó; #61 `BookDAO.updateBook` đánh số quyển mới theo hậu tố lớn nhất của mã quyển hiện có cộng 1 (không theo `COUNT(*)`), có test mã lạc số; #66 gom ánh xạ `ResultSet` → `Book` lặp ở `BookDAO`, `CartDAO`, `RentalBillDAO` về một chỗ trong lớp cha `DAO` (không thêm lớp trong gói `dao`, `ArchitectureTest` cho đúng 9 lớp); #32 ghim ảnh Maven của `docker/app/Dockerfile` bản `-noble` (tra tag thật, `docker build -f docker/app/Dockerfile .` với tag riêng, **không** `docker compose`) | `t1k-web-core-developer` | `D:/Coding/mangastore-wt/04-don-no-java`, `lane/04-don-no/java` | `src/main/java/vn/tiemtruyen/{util,dao}/**`, `src/test/java/**`, `docker/app/Dockerfile`, `docs/architecture.md` (dòng nhắc `JsonReader`), `docs/adr/0003-*.md` (dòng `-noble`) |
| P `pipeline` | #82/#88 luật combo không được bắt "Bố …" (so khớp sau khi bỏ dấu làm "bộ" và "bố" trùng nhau): sửa, thêm test, đếm trên `data/raw` xem có tên nào bị bỏ nhầm; #95 bìa #10 có dải chữ người bán FAHASA: xem ảnh, sửa luật chọn bìa hoặc ghi lí do chấp nhận vào `pipeline/CONTRACT.md`; #98 năm trong ngoặc của tên có thể là năm tái bản: chốt nghĩa của `publishYear` trong `pipeline/CONTRACT.md` (năm của ấn bản tiệm có) và kiểm code đúng nghĩa đó; bất nhất 6 (ADR-0010 còn ghi SPARQL) và 7 (`CONTRACT.md` §… thiếu `manifest.jsonl` của chạy thử). Sau sửa: `npm --prefix pipeline test`, `node pipeline/cli.mjs run --offline`, `validate --json`; báo mã băm `V10`/`V11` trước và sau | `t1k-web-core-developer` | `D:/Coding/mangastore-wt/04-don-no-pipeline`, `lane/04-don-no/pipeline` | `pipeline/**` trừ `package.json` và lockfile, `docs/data-pipeline.md`, `docs/adr/0010-*.md` |
| D `dev-mode` | Bất nhất 2: chế độ `APP_VITE_DEV=true` không mở được (app không có cổng ra máy, trang chỉ vào qua nginx, CSP `script-src 'self'` chặn script của Vite ở `APP_VITE_DEV_ORIGIN`, preamble React refresh inline, `<style>` Vite chèn và WebSocket HMR). Sửa: CSP của nginx lấy theo biến môi trường; compose truyền CSP dev khi `APP_VITE_DEV=true` (mặc định giữ nguyên CSP phase 1 từng kí tự); thử thật: Vite dev + compose với `APP_VITE_DEV=true` mở `/HomeView.jsp` không lỗi CSP, rồi trả stack về `APP_VITE_DEV=false`. #6 CORS `127.0.0.1:8080`: phiên phase 5 đã sửa trên `phase/05-he-thiet-ke-giao-dien` (d82554a), lane này không đụng `frontend/**` | `t1k-web-core-developer` | `D:/Coding/mangastore-wt/04-don-no-dev`, `lane/04-don-no/dev-mode` | `docker/nginx/**`, khối service `nginx` (và biến môi trường liên quan) trong `compose.yaml`, `.env.example` (chỉ thêm biến mới, giá trị giả), `src/main/java/vn/tiemtruyen/util/AssetTags.java` và test của nó nếu cần; đề xuất câu thay cho `contract.md` §10 dòng "CSP phase 1" ghi vào báo cáo (orchestrator sửa) |
| O orchestrator | #64 mẹo `p++` cho MagicNumber vào skill `tiem-add-dao-duplicate-check`; #69 ghi vào `docs/contracts.md` §5.3: id của `tblRentedDamage`, `tblRentalCollateral` đổi sau mỗi lần `updateRentalBill` (ghi lại toàn bộ), không trang nào giữ id này qua lần lưu; #100 compose dùng chung project `tiemtruyen`: ghi vào `AGENTS.md` §3; #10 `onUncaughtError` và `data-island-state` mang sang `phase-06`; #49 tiêu đề `## 3.` lồng dưới `## 6.` của `AGENTS.md`: từ chối, vì là khối nguyên văn brief §3 bị khoá từng byte; bất nhất 1 (`contracts.md:10`, `:589`, `AGENTS.md:23` còn ghi "Chưa chốt"), 3 và 4 (báo cáo phase 3) | phiên chính | `D:/Coding/mangastore-wt/04-orch`, `phase/04-don-no` | `docs/contracts.md`, `AGENTS.md`, `.claude/skills/tiem-*/**`, `plans/**` |

Lane chỉ commit tại máy (pathspec), không push, không đổi nhánh, ghi báo cáo `plans/reports/phase-04-don-no-<lane>-<yymmdd-hhmm>.md`.

## Accept

`node scripts/accept/phase-01.mjs` … `phase-04.mjs` đều `ALL PASS` trên `main` sau khi merge; báo cáo soát được cập nhật nhãn cho từng mục d.

## Tiến độ

- [x] Lane J (b81736b; #24 đổi thành giữ `JsonReader` vì phase 5 dùng)
- [x] Lane P (ff4e2af; thêm crawl bù Thần Đồng Đất Việt 164)
- [ ] Lane D (code a6b5178; còn chạy thử trên compose khi phase 5 trả stack)
- [x] Phần orchestrator (1f636a0, 479e1d2, bf83876, 1e9685c, d4d05a5)
- [ ] Nạp lại DB: `mysqldump` sao lưu, DROP + CREATE database `tiemtruyen` (không xoá volume), publish V10 mới
- [ ] Merge, Accept 1–4 trên `main`
