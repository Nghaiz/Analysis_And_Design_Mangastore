# Soát: concern của báo cáo lane phase 1–4 đã đi đâu

Ngày 11/11/2026 · main `5166040` · agent `t1k-investigator` chỉ đọc (`git status --porcelain` rỗng trước và sau); orchestrator ghi file.
Nhãn: **a** đã giải quyết trên main · **b** mang sang file phase 05–08 hoặc `docs/contracts.md` · **b⚠** chỉ ghi trong file phase đã xong · **c** từ chối/chấp nhận có lí do trong repo ("c, tự đóng": lí do chỉ ở chính báo cáo lane) · **d** không còn dấu vết · **d′** chỉ ở báo cáo phase.
Viết tắt: FK=phase-01-frontend-khung, HT=phase-01-ha-tang, JK=phase-01-java-khung, XM=phase-01-xac-minh, DO=phase-02-docs, HD=phase-02-hop-dong, RU=phase-02-rules, SK=phase-02-skills, DR=phase-02-tiem-contract-guard-dryrun, MU=phase-03-model-util, UB=phase-03-dao-user-book, CB=phase-03-dao-cart-bill, KT=phase-03-kiem-kien-truc, PR3=phase-03-schema-dao, NG=phase-04-nguon, XL=phase-04-xu-li, TR=phase-04-trial, PR4=phase-04-pipeline.

Tổng: 101 mục · a=65 · b=8 · b⚠=2 · c=11 · d=14 · d′=1. Cách xử lí mục d, d′, b⚠ và bất nhất: `plans/261111-tiem-thue-truyen/phase-04-don-no.md`; nhãn sau xử lí ở mục cuối.

## Bảng

| # | Báo cáo:dòng | Concern | Nhãn | Bằng chứng |
|---|---|---|---|---|
| 1 | FK:6,162 | Lane 1A phải đọc §5 (đường dẫn dev, entry CSS, chống lặp) | a | JK:30; `AssetTags.java:68,74` |
| 2 | FK:102 | Duyệt `imports` phải chống lặp | a | JK:18, JK:42 |
| 3 | FK:104 | Error Boundary cho từng island | b | phase-05:34 |
| 4 | FK:149 | Dev: `/static/@vite/client`, `@react-refresh`; entry CSS khoá riêng | a | `AssetTags.java:68,74`; JK:52 |
| 5 | FK:150 | Preamble inline bị CSP chặn nếu dev đi qua nginx | c → **d** | contract.md:120 ghi "không đi qua nginx" nhưng app không có cổng ra máy; xem bất nhất 2 |
| 6 | FK:151 | CORS chỉ `localhost:8080` | d | `vite.config.ts:16,33-34` |
| 7 | FK:155 | `lucide-react`, `radix-ui` ở phase 5 | b⚠ | chỉ phase-01:117 |
| 8 | FK:156 | `npm audit` moderate | b⚠ | chỉ phase-01:117 |
| 9 | FK:157 | Kiểm lại peer khi lên TS 6.1 | a | ADR-0003:77,116 |
| 10 | FK:158 | `onUncaughtError` + `data-island-state` cho E2E | d | 0 kết quả trong plans/docs/src/frontend/skills |
| 11 | FK:98-99 | Vite 8 `input` cấp gốc; TS 6 bỏ `baseUrl` | a | `vite.config.ts:27-28`; `tsconfig.app.json:25` |
| 12 | HT:4,49-65 | MySQL bỏ qua `.cnf` 0777 | a | `compose.yaml:50,61`; 1523d10 |
| 13 | HT:67 | Accept thêm `SELECT @@time_zone` | a | `phase-01.mjs:147-149` |
| 14 | HT:69-75 | Redis chạy bằng root | a | `compose.yaml:76` |
| 15 | HT:79 | Thiếu `cover-fallback.svg` | a | `frontend/public/img/cover-fallback.svg` |
| 16 | HT:80 | `/covers/` gắn cứng `APP_COVERS_BASE_URL` | c | `app.conf:49` |
| 17 | HT:81 | Bìa dự phòng cache 300 s | a | `app.conf:57,63` |
| 18 | HT:82 | Ai cũng đọc được manifest | c (tự đóng) | HT:82 |
| 19 | HT:83 | `resolver 127.0.0.11` | c (tự đóng) | HT:83 |
| 20 | HT:84 | Mật khẩu Redis trong `/proc/1/cmdline` | c (tự đóng) | HT:84 |
| 21 | JK:63 | `REDIS_PASSWORD` rỗng không nêu tên biến | a | `compose.yaml:23,74` |
| 22 | JK:65 | Chưa kiểm qua nginx / Accept | a | phase-01:94 |
| 23 | JK:70 | `HomeView` 500 khi WAR thiếu frontend | c (tự đóng) | JK:70 |
| 24 | JK:75 | Có Jackson thì bỏ `JsonReader` | d | `pom.xml:128` có Jackson; `JsonReader.java` còn, `ViteManifest.java:74` dùng |
| 25 | JK:76 | `.gitattributes` `mvnw eol=lf` | c (tự đóng) | JK:76; `.gitattributes:1` |
| 26 | XM:62 | `/favicon.ico` 404 | a | d7b9e22; `app.conf:39-41` |
| 27 | XM:97 | Request favicon tự động | a | XM:99-108 |
| 28 | XM:38 | `h1` cùng cỡ chữ thân bài | b | phase-06:33, phase-05:33 |
| 29 | DO:50 | Mật khẩu `quanli`, `khach0x` | a | `dev-accounts.md:14-17`; 9c2c8b0 |
| 30 | DO:51 | Token là đề xuất | b | phase-05:13,33 |
| 31 | DO:53 | M1/M2/M3 dễ lẫn | a | `page-flow.md:7` |
| 32 | DO:57 | Ảnh Maven không ghim `-noble` | d | `docker/app/Dockerfile:11`; ADR-0003:29 |
| 33 | DO:58 | UNIQUE `tblCart.clientId` | a | 2257b72 |
| 34 | DO:59 | Cổng `schema-doc-sync` | a | `scripts/check/schema-doc-sync.test.mjs` |
| 35 | DO:60 | Tham số Argon2id | a | ADR-0007:16; 74999b1 |
| 36 | DO:61 | Họ tên tài khoản mẫu | a | `dev-accounts.md:14-17` |
| 37 | DO:62 | Owner tiếp theo của docs | b | phase-04:7; phase-08:6 |
| 38 | HD:5,26-44 | 13 điểm C1–C13 | a | 063f864; contracts.md:793-811 |
| 39 | HD:47 | `getCart` hiện dòng của phiếu đã huỷ | a | contracts.md:247 |
| 40 | HD:48 | `rentalBill` khác đối tượng trong `listRentalBill` | a | contracts.md:317 |
| 41 | HD:49 | `doUpdateRentedBookList` ghi cả phiếu | a (một phần) | contracts.md:526 |
| 42 | HD:50 | Nút "Huỷ phiếu" chỉ ở "Chờ nhận" | a | contracts.md:461 |
| 43 | HD:51 | context7 / cua-driver | a | plan.md:61 |
| 44 | HD:71 | Duyệt 13 điểm trước 2B–2D | a | agent-map.md:94 |
| 45 | HD:72 | Test thông báo đọc theo header | a | `contracts-doc.test.mjs:65-70` |
| 46 | HD:73 | 2C cắt khối §10 theo byte | a | `phase-02.mjs:31` |
| 47 | RU:4,46 | Rule chỉ khuyên tới khi có test | b | phase-05:34; phase-08:32 |
| 48 | RU:47 | Link `design-tokens.md` | a | file đã có |
| 49 | RU:48 | `AGENTS.md`: `## 3.` lồng dưới `## 6.` | d | `AGENTS.md:141,146`; khối khoá byte |
| 50 | SK:32 | Agent ghi báo cáo bằng Bash | c | `tiem-contract-guard.md:17-20` |
| 51 | SK:33 | Registry agent chụp lúc mở phiên | a | DR:8,27 |
| 52 | SK:34 | Skill trỏ file phase sau | b | phase-05:33,34; phase-06:6 |
| 53 | SK:35 | Script `test` của pipeline | a | `pipeline/package.json:11`; `AGENTS.md:61` |
| 54 | DR:23-25 | Ba điểm định nghĩa | a | `tiem-contract-guard.md:20,51,52` |
| 55 | MU:3,27,103 | `protected con` va Checkstyle | a | PR3:47 |
| 56 | MU:104 | `failOnMissingLocations(true)` | a | `MigrationListener.java:17,54` |
| 57 | MU:105 | Getter `AppConfig.flywayDataLocation()` | d | 0 kết quả |
| 58 | MU:106 | Khuôn transaction của skill | a | fcad765 |
| 59 | MU:94-97 | Bảng băm `Quanli@123` | a | 9c2c8b0 |
| 60 | UB:33,40 | `LIKE` không thoát `%` `_` | a | `DAO.java:163`; fb67552 |
| 61 | UB:34 | `updateBook` đánh số quyển theo `COUNT(*)` | d | contracts, phase-07 không nhắc |
| 62 | UB:39 | Hằng 1062 lặp | a | `DAO.java:54,152` |
| 63 | UB:41 | Skill dùng `con` cũ | a | fcad765 |
| 64 | UB:42 | MagicNumber: biến đếm `p++` | d | 0 kết quả |
| 65 | CB:3,70 | Đọc phiếu bằng JSON | a | PR3:50; `checkstyle.xml:32-33` |
| 66 | CB:70 | Ánh xạ Book lặp 3 chỗ | d | `BookDAO.java:256`, `CartDAO.java:165`, `RentalBillDAO.java:61` |
| 67 | CB:71 | contracts §6.1 / §5.3 | a | db76ff4 |
| 68 | CB:72 | Skill: đổi đối tượng sau commit | a (một phần) | skill:45,63,88 |
| 69 | CB:50 | Id lỗi và khoản cọc đổi sau mỗi lần lưu | d | không có trong contracts, phase-07 |
| 70 | CB:61-66 | Các quyết định thoát kí tự, sắp xếp | a | contracts.md:461 |
| 71 | KT:3 | 2 test đỏ khi chưa có DAO | a | PR3:11 |
| 72 | KT:63 | Accept chạy `clean verify` | a | 2501fa8 |
| 73 | KT:64 | Danh sách tên viết cứng trong test | c (tự đóng) | KT:64 |
| 74 | KT:65 | `DocRules` dựa vào 3 câu §2 | c (tự đóng) | KT:65 |
| 75 | PR3:63 | Phase 6/7 đọc lại trạng thái khi D9 | b | phase-06:34; phase-07:32 |
| 76 | NG:3,66 | Tiki chặn IP | a | PR4:41 |
| 77 | NG:67 | Thần đồng đất Việt chỉ có trên Tiki | a | PR4:50 |
| 78 | NG:68 | Chạy thử cần 3 bộ Tiki | a | TR:70 |
| 79 | NG:69 | haikyu chưa có số Tiki | a | `series.json:495` |
| 80 | NG:70 | takagi | a | NG:70 |
| 81 | NG:71 | Ảnh P18 Wikidata | a | CONTRACT.md:118 |
| 82 | NG:72 | "Bố …" bị coi là combo | d | CONTRACT.md:83 |
| 83 | NG:76-81 | 6 đề xuất đổi hợp đồng | a | fceb8e6 |
| 84 | NG:57 | 4 s với Tiki là đoán | a | PR4:41 |
| 85 | NG:104-106 | Bìa #3 sai | a | de4d753 |
| 86 | NG:77 | Plan còn ghi SPARQL | a | `data-pipeline.md:5` (ADR-0010:18 còn cũ, bất nhất 6) |
| 87 | XL:28-32 | Đề xuất hợp đồng 1–5 | a | 3a698f2 |
| 88 | XL:33 | Combo `bo ` | d | như #82 |
| 89 | XL:37 | Chưa chạy dữ liệu thật | a | PR4:9-16 |
| 90 | XL:38 | V11 cần tài khoản V2 | a | PR4:16,35 |
| 91 | XL:54 | Tác giả Thần đồng đất Việt | a | a38c96a |
| 92 | XL:55 | Kim Đồng dính nhiều tác giả | a | a38c96a |
| 93 | XL:56 | Tên `<bộ> <số>` | a | c023732, fe9fdd3 |
| 94 | TR:7,39,90 | Bìa #3 là trang ruột | a | de4d753 |
| 95 | TR:40,91 | Dải chữ FAHASA trên bìa #10 | d | 0 kết quả trong CONTRACT |
| 96 | TR:41 | Ảnh vuông 1:1 | a | a837cee |
| 97 | TR:92 | Cảnh báo bìa lệch dáng | a (khác cách) | CONTRACT.md:127 |
| 98 | TR:66 | Năm 2026 có thể là năm tái bản | d | 0 kết quả |
| 99 | TR:35 | 404 favicon trang báo cáo | c (tự đóng) | TR:35 |
| 100 | PR4:65 | Compose project `tiemtruyen` dùng chung mọi worktree | d′ | `compose.yaml:5` |
| 101 | PR4:70 | Trang tìm truyện kiểm ở phase 6 | b | phase-06:37 |

## Bất nhất

1. `contracts.md:10` và `AGENTS.md:23` còn gọi §14 là "Chưa chốt"; `contracts.md:589` còn "đề xuất tạm, chốt ở C12" dù C12 (:810) đã chốt.
2. `contract.md:120` ghi trang dev Vite "không đi qua nginx", nhưng `app` không có `ports:` nên trang chỉ mở được qua nginx, nơi CSP `script-src 'self'` chặn script Vite và preamble inline (FK:150): chế độ dev không dùng được.
3. PR3:39-40 ghi 3A, 3B "DONE", nhưng MU:3, UB:3 là DONE_WITH_CONCERNS.
4. PR3:63 ghi phase 6/7 "đọc lại bằng `getRentalBillList`", nhưng `contracts.md:289` cho nhân viên dùng `searchRentalBill("PM"+id)`.
5. XL không có dòng Status; PR4:60 ghi DONE.
6. ADR-0010:18 còn ghi "Wikidata SPARQL".
7. `pipeline/CONTRACT.md:19` chỉ liệt kê `data/export/<run>/*.sql`; `export.mjs:36` còn ghi `manifest.jsonl` của chạy thử.
8. Báo cáo phase cho phase 1, 2: không bắt buộc (phase-01:39, phase-02:23 ghi kết quả vào file phase).

## Sau xử lí

Nhánh `phase/04-don-no`. Báo cáo lane: `phase-04-don-no-java-261111-0818.md`, `phase-04-don-no-pipeline-261111-0830.md`, `phase-04-don-no-dev-261111-0819.md`.

| # | Nhãn mới | Xử lí |
|---|---|---|
| 5, bất nhất 2 | a | CSP nginx sinh theo `APP_VITE_DEV` (`docker/nginx/docker-entrypoint.d/30-tiem-csp.sh`); mặc định đúng từng kí tự §10; preamble React Refresh là module ngoài; `scripts/check/csp-page-check.mjs` (Accept phase 1 bước 4 gọi `--mode build`); `contract.md` §10 sửa câu "không đi qua nginx" |
| 6 | b | Phase 5 thêm `http://127.0.0.1:8080` vào `server.cors.origin` (d82554a trên `phase/05-he-thiet-ke-giao-dien`) |
| 7, 8 | b | Phase 5 ghi vào phase-05 bước 5.0 (d82554a) |
| 10 | b | Phase 5 làm (c3af339); `phase-06` ghi 6D chỉ kiểm |
| 24 | c | Giữ `JsonReader`: phase 5 dùng `JsonReader.parse` đọc `categories.json` (hợp đồng giao diện phase 5 §5); `docs/architecture.md`, `phase-01` sửa câu hứa thay |
| 32 | a | `maven:3.9.16-eclipse-temurin-25-noble`, ADR-0003 |
| 49 | c | Khối nguyên văn brief §3 bị khoá từng byte (`section10-sync.mjs`); `AGENTS.md:141` đã nói khối là nguyên văn |
| 57 | a | `AppConfig.flywayDataLocation()`, `MigrationListener` dùng |
| 61 | a | `updateBook` đánh số theo hậu tố lớn nhất + 1 (`Codes.copyNumber`); test đỏ trên code cũ; `contracts.md` §5.3 |
| 64 | a | Gotcha `p++` trong skill `tiem-add-dao-duplicate-check` |
| 66 | a | `DAO.readBook`, `bookColumns`, `bookJson` dùng chung cho 3 DAO |
| 69 | c | `contracts.md` §5.3: id lỗi/khoản cọc đổi sau mỗi lần lưu, không khoá ngoại tới chúng, trang không giữ qua lần lưu |
| 82, 88 | a | `pipeline/src/lib/set-word.mjs`: "bộ" so trên chữ có dấu; Thần Đồng Đất Việt 164 vào kho (Book 71, các Book 71–84 cũ dịch +1, tập 209 ra) |
| 95 | a | Luật bìa (3) bỏ dải chữ người bán: 32 bìa đổi, soát bằng mắt |
| 98 | a | `publishYear` = năm của ấn bản tiệm có (CONTRACT §9); 28 Book đổi năm |
| 100 | a | `AGENTS.md` §3 ghi compose project dùng chung |
| Bất nhất 1 | a | `contracts.md:10`, `:589`, `AGENTS.md:23` |
| Bất nhất 3, 4 | a | Báo cáo phase 3 sửa trạng thái 3A, 3B và cách đọc lại D9 |
| Bất nhất 5 | c | Báo cáo lane lịch sử; trạng thái DONE của 4B ghi ở báo cáo phase 4 |
| Bất nhất 6, 7 | a | ADR-0010 `Special:EntityData`; CONTRACT §1 có `manifest.jsonl` của chạy thử |
| Mới (phiên phase 5 phát hiện) | a | `docker/app/Dockerfile` tầng frontend chép `src/main/webapp` cho Tailwind `@source` (d4d05a5; JSP thử: cũ 0 lớp, mới 1 lớp) |

Dữ liệu sau phase 4b: 396 Book, 1164 quyển, 0 lỗi chặn, 146 cảnh báo `no-year`; V10 `38f090234fb1`, V11 `ff6fb1b87a9a` (không đổi); 11 request mạng (1 trang sản phẩm, 10 ảnh của tập 164).
