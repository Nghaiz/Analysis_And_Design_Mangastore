---
name: tiem-add-crawl-source
description: Dùng khi thêm hoặc sửa nguồn crawl trong pipeline/ (kimdong, tiki, wikidata, nguồn mới): robots.txt, điều khoản, giãn ≥2s, User-Agent chung, cache đĩa, manifest.jsonl.
effort: medium
---

# Thêm một nguồn crawl

Pipeline Node 24 ESM ở `pipeline/` lấy 300–500 đầu truyện thật. Nguồn đã duyệt (D11): Kim Đồng (chính), Tiki (dự phòng), Wikidata (bổ trợ cấp bộ). Fahasa, Open Library, Google Books đã bị loại; lí do ở `plans/reports/researcher-261111-data-sources.md`.

## Đọc trước

- `plans/reports/researcher-261111-data-sources.md` (trích robots.txt, điều khoản, trường của từng nguồn).
- `plans/reports/brainstorm-261111-web-tiem-thue-truyen.md` §6 (giãn cách, gộp trùng, thứ tự ưu tiên, quy tắc giá).
- `plans/261111-tiem-thue-truyen/contract.md` §6 (manifest, ảnh bìa, thể loại); `phase-04-pipeline-crawl-seed.md` (lane 4A, 4B).
- `pipeline/schema/raw-record.schema.json`, `pipeline/config/series.json`, `pipeline/config/categories.json` (có từ phase 4).

## Các bước

1. **Cổng pháp lí trước khi viết dòng code nào.** Tải `robots.txt` của host **ngay lúc làm**, trích nguyên văn các dòng liên quan vào báo cáo lane kèm ngày tải; đọc trang điều khoản. Điều khoản cấm bot (như Fahasa) → loại nguồn. Nguồn ngoài D11 → dừng, ghi đề xuất cho orchestrator (cần chủ dự án duyệt). Đường dẫn bị `Disallow` thì không gọi, kể cả khi API trả lời.
2. **Một file một nguồn:** `pipeline/src/sources/<nguồn>.mjs`, xuất hàm trả bản ghi đúng `raw-record.schema.json` (`source`, `sourceUrl`, `fetchedAt`, `name`, `authors[]`, `publisher`, `publishedAt`, `pages`, `isbn`, `categoryHints[]`, `descriptionHtml`, `imageUrls[]`). Trường không có thì `null`, không bịa.
3. **Mọi request đi qua `pipeline/src/fetch/**`**, không gọi `fetch` thẳng trong file nguồn. Lớp fetch bảo đảm:
   - một kết nối mỗi host, cách nhau **≥ 2000 ms**;
   - 429 / 5xx: lùi dần, tôn trọng `Retry-After`, tối đa 5 lần rồi ném lỗi nêu URL và mã;
   - đọc và tuân `robots.txt` của từng host;
   - User-Agent chung `Mozilla/5.0 (compatible; tiem-truyen-pipeline/1.0)`: **không** tên người, không email, không số điện thoại;
   - cache HTTP trên đĩa `data/cache/http/`; `--offline` ném lỗi khi cần mạng mà cache thiếu.
4. **Lọc nhiễu ngay ở nguồn:** bỏ sản phẩm có "Combo", "Bộ", "Trọn bộ", "Set" trong tên; bỏ bản ghi lệch nhà xuất bản mong đợi của bộ (`series.json`).
5. **Khai nguồn vào `pipeline/config/series.json`:** bí danh, nguồn ưu tiên, thể loại theo `categories.json` (không tự thêm thể loại). Thứ tự thắng khi gộp: Kim Đồng > Tiki > Wikidata; nguồn mới cần orchestrator xếp chỗ.
6. **Manifest:** mỗi bản ghi và mỗi ảnh một dòng trong `pipeline/manifest.jsonl`, đúng bảy trường `{ "kind": "book" | "image", "bookId", "source", "sourceUrl", "fetchedAt", "winner", "sha256" }` (`contract.md` §6). Manifest **không** chứa mô tả, tên tập hay ảnh. `source` hiện chỉ nhận `kimdong` | `tiki` | `wikidata`; thêm giá trị là đổi hợp đồng.
7. **Nội dung ở lại `data/`** (bị ignore): `data/cache`, `data/raw`, `data/clean`, `data/images`, `data/export`, `data/reports`. Repo chỉ giữ script, cấu hình và `manifest.jsonl`.
8. **Test với phản hồi ghi sẵn** trong `pipeline/test/fixtures/http/`: cắt gọn còn trường cần dùng, mô tả thay bằng chuỗi giả, không có ảnh. Test không gọi mạng.
9. **Preview-first:** `census` (≤ 40 request) → `run --limit 10` → chủ dự án duyệt (HARD STOP bước 4.5) → mới chạy hết.

## Gotchas

- Kim Đồng (Sapo) chặn `/search`: liệt kê qua `sitemap.xml` / `sitemap_products_1.xml`, rồi lấy `/products/<alias>.json`. Đi `/search` là vi phạm robots.
- Tiki: `HEAD` trả 404 trên API sản phẩm, chỉ dùng `GET`. Bản ghi Tiki thường **không có ISBN** (`sku` là mã nội bộ, không phải ISBN). "Ngày xuất bản" của Tiki thường là ngày tái bản.
- Không bịa `publishYear`: chỉ lấy từ "Ngày xuất bản" hoặc "(Tái bản YYYY)" trong tên; thiếu thì để `null` và để `validate` liệt kê.
- Wikidata không có bản ghi từng tập tiếng Việt; chỉ dùng cho tác giả, thể loại cấp bộ. WDQS giới hạn 60 giây CPU mỗi phút và 5 truy vấn song song.
- ISBN: bỏ gạch và khoảng trắng, kiểm checksum, đổi ISBN-10 sang 13 trước khi gộp.
- Chuẩn hoá Unicode NFC trước mọi so sánh; tên có "(Tái Bản 2020)" là thuộc tính, không phải tên bộ.
- Không dùng bìa crawl cho trang trí (logo, kệ 3D); bìa chỉ hiện ở chỗ dữ liệu.
- Nguồn đổi API không báo trước: lỗi phải hiện rõ (URL, mã, bước), không lặng lẽ bỏ bản ghi.

## Lệnh kiểm

Tất cả có từ phase 4.

| Việc | Lệnh |
|---|---|
| Cài gói pipeline | `npm --prefix pipeline ci` |
| Test pipeline (fixtures, không mạng) | `npm --prefix pipeline test` |
| Đếm ứng viên từng bộ (≤ 40 request) | `node pipeline/cli.mjs census` |
| Chạy thử 10 đầu truyện | `node pipeline/cli.mjs run --limit 10` |
| Chạy lại từ cache, không gọi mạng | `node pipeline/cli.mjs run --offline` |
| Báo cáo validate | `node pipeline/cli.mjs validate --json` |
| Không file `data/` nào trong git | `git ls-files data` (phải rỗng) |
| Accept phase 4 | `node scripts/accept/phase-04.mjs` |

## Danh sách kiểm tra

- [ ] Đã tải và trích `robots.txt`, đọc điều khoản, ghi ngày vào báo cáo; nguồn nằm trong D11.
- [ ] File nguồn trả bản ghi đúng `raw-record.schema.json`; trường thiếu là `null`.
- [ ] Mọi request qua `pipeline/src/fetch/**`: ≥ 2 giây, lùi dần, robots, UA chung, cache đĩa, `--offline`.
- [ ] Lọc combo / bộ / set.
- [ ] Manifest đúng bảy trường, không nội dung.
- [ ] Không nội dung crawl trong git; fixtures đã cắt gọn.
- [ ] Test không gọi mạng và xanh; `run --offline` chạy lại được.
- [ ] Chạy thử 10 đầu truyện trước, chờ duyệt rồi mới chạy hết.
