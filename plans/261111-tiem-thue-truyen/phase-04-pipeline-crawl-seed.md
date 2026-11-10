# Phase 4: Pipeline crawl và seed

Lane: data
Depends-on: 3
Gate: human
Effort: L
Owns: `pipeline/**`, `docs/data-pipeline.md`, `data/**` (bị ignore, không vào git)
Creates: `scripts/accept/phase-04.mjs`, `pipeline/cli.mjs`, `pipeline/package.json`, `pipeline/manifest.jsonl`, `pipeline/config/series.json`, `pipeline/config/categories.json`, `pipeline/schema/raw-record.schema.json`, `pipeline/schema/clean-record.schema.json`, `pipeline/test/clean.test.mjs`
AX: AX-01 `pipeline/cli.mjs validate --json` in báo cáo máy đọc ra stdout, thông điệp ra stderr; AX-04 exit 0 khi sạch, 1 khi có lỗi chặn, 2 khi sai cách gọi; AX-13 chạy lại dùng cache, `--offline` không gọi mạng; AX-14 `export` và `publish` có `--dry-run`; AX-18 không cần khoá API, User-Agent chung chung
Accept: `node scripts/accept/phase-04.mjs`

## Mục tiêu

Pipeline tách bước, chạy lại được, lấy 300–500 Book thật (D4) từ Kim Đồng (chính), Tiki (dự phòng, nguồn duy nhất của Thần đồng đất Việt) và Wikidata (bổ trợ cấp bộ), làm sạch, nén ảnh, sinh quyển và giá, kiểm, xuất migration dữ liệu và manifest. Nội dung crawl nằm ngoài git (D11). **Không dùng** Fahasa (điều khoản cấm bot), Open Library và Google Books (gần như không có sách tiếng Việt, Google Books cần key); lí do và trích dẫn ở `plans/reports/researcher-261111-data-sources.md`. **HARD STOP sau chạy thử 10 đầu truyện:** chủ dự án xem rồi mới crawl hết.

Nguồn: `plans/reports/researcher-261111-data-sources.md` (endpoint, robots.txt, điều khoản, gộp trùng), brainstorm §6, `plans/261111-tiem-thue-truyen/contract.md` §5–§6 (đường dẫn ảnh, location Flyway, manifest), `docs/schema.md` (cột `tblBook`, `tblBookCopy`).

Chạy song song với phase 5 (lane `ui`). Ngân sách agent chung là 3: phase 4 giữ 2 chỗ cho 4A và 4B, phase 5 giữ 1 chỗ.

## Các bước

- [ ] **4.0 Orchestrator, tuần tự (hợp đồng trong pipeline):** `pipeline/package.json` (Node 24 ESM; `sharp`, trình đọc XML cho sitemap, Vitest; phiên bản tra npm registry lúc ghim) và lockfile; `pipeline/schema/raw-record.schema.json` (bản ghi thô mỗi nguồn: `source`, `sourceUrl`, `fetchedAt`, `name`, `authors[]`, `publisher`, `publishedAt`, `pages`, `isbn`, `categoryHints[]`, `descriptionHtml`, `imageUrls[]`) và `clean-record.schema.json` (đủ cột `tblBook` cộng `seriesKey`, `volume`, `variant`, `images[]`, `copies`); `pipeline/config/categories.json` (R3, có "Thiếu nhi", "Phiêu lưu", "Trinh thám"); `scripts/accept/phase-04.mjs`. Commit trước khi spawn.
- [ ] **4.1 Lane 4A `nguon`** và **4.2 Lane 4B `xu-li`** song song.
- [ ] **4.3 Orchestrator:** merge; chạy nền `node pipeline/cli.mjs census` (đếm ứng viên từng bộ từ sitemap Kim Đồng và tìm Tiki, ≤ 40 request) rồi `node pipeline/cli.mjs run --limit 10`. Mười đầu truyện chạy thử gồm cả hai nguồn: Conan (Kim Đồng), Doraemon (Kim Đồng và Tiki), Thần đồng đất Việt (Tiki).
- [ ] **4.4 Lane 4C `xac-minh`:** Playwright MCP mở `data/reports/trial/index.html` (trang ảnh bìa và bảng trường do bước validate sinh), chụp khổ điện thoại và máy tính, ghi `plans/reports/phase-04-trial-<ts>.md` (số trường thiếu, ảnh lỗi, tên trùng, nguồn thắng từng bản ghi).
- [ ] **4.5 HARD STOP (Gate: human).** Orchestrator đưa chủ dự án báo cáo validate, kết quả census và ảnh chụp, hỏi bằng câu hỏi lựa chọn: crawl hết / chỉnh nguồn rồi chạy thử lại / dừng. Kill (a) của `plan.md`: dưới 6/10 đầu truyện đủ trường bắt buộc và có bìa thì không đề xuất crawl hết. Không crawl đầy đủ khi chưa có câu trả lời.
- [ ] **4.6 Orchestrator:** chạy nền `node pipeline/cli.mjs run` (ước tính 400 Book × khoảng 4 request ≈ 1.500 request, cách nhau ≥ 2 giây, khoảng 50–60 phút). Trong lúc chờ làm việc của phase 5. Validate có lỗi chặn thì brief lại 4A hoặc 4B theo loại lỗi.
- [ ] **4.7 Orchestrator:** `node pipeline/cli.mjs publish` (chép `data/export/*.sql` vào volume `catalog_data`, ảnh vào `covers_data`); khởi động lại `app`; Flyway nạp V10, V11.
- [ ] **4.8 Orchestrator:** chạy Accept, đánh dấu, push nhánh phase, mở PR vào `main` và merge bằng merge commit (`contract.md` §9).

## Lane trong phase

4A và 4B song song (2 chỗ); 4C sau bước 4.3 (1 chỗ, khi 4A và 4B đã xong). Lần crawl là tiến trình nền, không tính vào ngân sách agent.

| Lane | Việc | Agent | Owns (không chồng nhau) | Phụ thuộc |
|---|---|---|---|---|
| 4A `nguon` | `pipeline/src/fetch/**`: một kết nối mỗi host, cách nhau ≥ 2 giây, lùi dần khi 429/5xx (tôn trọng `Retry-After`, tối đa 5 lần rồi báo lỗi rõ), đọc và tuân `robots.txt` của từng host (Kim Đồng chặn `/search` nên đi qua sitemap), User-Agent chung `Mozilla/5.0 (compatible; tiem-truyen-pipeline/1.0)` không tên không email, cache HTTP trên đĩa `data/cache/http/`, chế độ `--offline` ném lỗi nếu cần mạng; `pipeline/src/sources/{kimdong,tiki,wikidata}.mjs` trả bản ghi đúng `raw-record.schema.json`, loại sản phẩm combo/bộ/trọn bộ/set; `pipeline/config/series.json` (20–40 bộ, bí danh, nguồn ưu tiên, thể loại theo R3); lệnh `census` và `crawl` trong `pipeline/cli.mjs`; test với phản hồi ghi sẵn trong `pipeline/test/fixtures/http/` | `t1k-web-core-developer` | `pipeline/src/fetch/**`, `pipeline/src/sources/**`, `pipeline/config/series.json`, `pipeline/test/fetch*.test.mjs`, `pipeline/test/sources*.test.mjs`, `pipeline/test/fixtures/http/**` | 4.0 |
| 4B `xu-li` | `pipeline/src/steps/{clean,images,copies,price,validate,export,publish}.mjs` và `pipeline/src/lib/**`: `clean` (NFC, bỏ HTML, chuẩn hoá tên tác giả, gộp trùng theo ISBN-13 đã kiểm checksum rồi theo `bộ|tập|biến thể`, Kim Đồng thắng Tiki thắng Wikidata, mô tả cắt ≤ 255 kí tự theo ranh giới câu, không bịa `publishYear`); `images` (WebP 160/320/640 và AVIF, ảnh phụ, mã băm sha256, theo `contract.md` §6); `copies` (1–5 quyển, phân bố cố định theo seed, barcode `DT{id:3}-{n:2}`, có đủ cảnh hết, còn ít, còn nhiều); `price` (quy tắc brainstorm §6: 3.000đ; truyện dài, tập đặc biệt hoặc trên 200 trang 5.000đ; hiếm thì cộng 1.000đ); `validate` (báo cáo `data/reports/<run>/validate.md` và `--json`; lỗi chặn: thiếu name/author/publisher/category/rentalPrice, trùng khoá gộp, ảnh không giải mã được, còn combo, số Book ngoài 300–500 ở lần chạy đầy đủ; cảnh báo: thiếu bìa, thiếu năm, mô tả rỗng; sinh `index.html` ảnh bìa để xem); `export` (`data/export/V10__catalog_data.sql`, `V11__sample_bills.sql` với vài phiếu "Chờ nhận" và "Đang cho thuê" giữ hết quyển của vài đầu truyện, dùng khách và nhân viên của V2; `pipeline/manifest.jsonl` theo `contract.md` §6); `publish`; điền `docs/data-pipeline.md` (các bước, quy tắc giá, cách chạy lại); test với bản ghi mẫu theo `raw-record.schema.json` | `t1k-web-core-developer` | `pipeline/src/steps/**`, `pipeline/src/lib/**`, `pipeline/test/clean.test.mjs` và mọi `pipeline/test/*.test.mjs` khác của các bước, `pipeline/test/fixtures/records/**`, `docs/data-pipeline.md` | 4.0 |
| 4C `xac-minh` | Kiểm bằng Playwright MCP như bước 4.4, chỉ đọc | `t1k-web-testing-tester` | chỉ ghi `plans/reports/` | 4.3 |

`pipeline/cli.mjs` là file của 4A; 4B thêm lệnh cho bước của mình bằng cách đăng kí trong `pipeline/src/steps/index.mjs` (4B sở hữu), `cli.mjs` chỉ nạp danh sách đó. Mọi spawn: `model: "opus"`, `effort` = giá trị `CLAUDE_EFFORT`, chạy nền; agent con không spawn agent.

Ghi chú thứ tự: `copies` chạy trước `price` vì quy tắc "hiếm" dùng số quyển (Deferred #27 của `plan.md`).

## Tiêu chí hoàn thành

1. Test pipeline (Vitest) xanh.
2. `node pipeline/cli.mjs run --offline` chạy hết từ cache, không gọi mạng, và cho file export có mã băm giống lần chạy trước (chạy lại được).
3. `node pipeline/cli.mjs validate --json` exit 0 trên dữ liệu đầy đủ: 300–500 Book, mỗi Book 1–5 quyển, không lỗi chặn; số Book thiếu bìa được liệt kê.
4. `pipeline/manifest.jsonl` có một dòng cho mỗi Book và mỗi ảnh, không có khoá `description` hay nội dung.
5. `git ls-files data` rỗng; `git check-ignore data/` khớp.
6. Sau publish: `/health.jsp` 200; `SELECT COUNT(*) FROM tblBook` trong khoảng 300–500; `/covers/<id có bìa>/cover-320.webp` trả `image/webp` 200 kèm `Cache-Control: public, max-age=31536000`; `/covers/<id không bìa>/cover-320.webp` trả ảnh dự phòng 200.
7. Accept phase 3 vẫn xanh phần nhanh (`node --test scripts/check/`, `section10-sync.mjs`).

## Lệnh kiểm

Accept (một lệnh): `node scripts/accept/phase-04.mjs` chạy tiêu chí 1–7. Bước làm đỏ có chủ đích khi viết script: thêm một dòng combo vào bản ghi mẫu thì validate phải exit 1.

## Playwright MCP

Áp dụng một phần: bước 4.4 soi trang ảnh bìa của lần chạy thử để chủ dự án xem. Trang tìm truyện dùng dữ liệu này được kiểm ở phase 6.

## Rủi ro

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Bộ cũ chỉ bán combo, thiếu tập lẻ | high | medium | Lấy tập lẻ từ Tiki; census ở bước 4.3 cho biết sớm; thiếu thì chọn thêm bộ khác trong `series.json` chứ không ghép ảnh combo |
| Tiki đổi API hoặc chặn | medium | medium | Cache, lùi dần, báo lỗi rõ; Kim Đồng vẫn đủ phần lớn kho |
| Gọi mạng quá dày, vi phạm điều khoản | low | high | Throttle ≥ 2 giây mỗi host, một kết nối, tuân robots.txt; test của 4A kiểm khoảng cách giữa hai request |
| Nội dung có bản quyền lọt vào git | low | high | `data/` bị ignore; Accept kiểm `git ls-files data` rỗng và manifest không chứa mô tả |
| `description` dài hơn 255 kí tự | high | low | Cắt theo câu ở `clean`, test có ca dài |
| Crawl đầy đủ dừng giữa chừng | medium | low | Mọi bước đọc và ghi `data/`, chạy lại từ cache |

## Rollback

`git revert -m 1 <merge phase 4>`; dữ liệu nằm ngoài git. Gỡ dữ liệu khỏi DB tại máy: đổi `FLYWAY_DATA_LOCATION` sang thư mục rỗng và dùng database mới; volume chỉ bị xoá khi chủ dự án đồng ý.

## Ước lượng

Effort L: khoảng 5–8 giờ agent (ESTIMATED: 4A và 4B song song khoảng 3–4 giờ; chạy thử và báo cáo khoảng 1 giờ; sửa sau chạy thử khoảng 1–2 giờ), cộng khoảng 1 giờ crawl chạy nền và thời gian chờ chủ dự án duyệt.
