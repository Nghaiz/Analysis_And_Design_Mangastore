# Pipeline dữ liệu

<!-- updated 261111 -->

**Khung, phase 4 điền.** Owner từ phase 4: lane `pipeline` (`plans/261111-tiem-thue-truyen/phase-04-pipeline-crawl-seed.md`). Lí do chọn nguồn: [ADR-0010](adr/0010-nguon-du-lieu-kim-dong-tiki.md); lí do dùng Node: [ADR-0012](adr/0012-pipeline-bang-node.md). Endpoint, trích `robots.txt` và điều khoản: `plans/reports/researcher-261111-data-sources.md`.

Mục tiêu: 300–500 Book thật (mỗi tập một Book, D4), mỗi Book 1–5 BookCopy, có bìa, có manifest nguồn; báo cáo validate không lỗi chặn.

## 1. Nguồn

| Nguồn | Vai trò | Cách đọc |
|---|---|---|
| NXB Kim Đồng (Sapo) | Chính | `sitemap_products_*.xml` rồi `/products/<alias>.json` (`/search` bị `robots.txt` chặn) |
| Tiki | Dự phòng; nguồn duy nhất của Thần đồng đất Việt | `/api/v2/products?q=…`, `/api/v2/products/<id>` |
| Wikidata | Bổ trợ cấp bộ | SPARQL |

Không dùng: Fahasa (điều khoản cấm bot), Open Library, Google Books.

## 2. Làm đàng hoàng

- Đọc và tuân `robots.txt` của từng host.
- Một kết nối mỗi host, cách nhau **≥ 2 giây**; gặp 429 hoặc 5xx thì lùi dần, tôn trọng `Retry-After`, tối đa 5 lần rồi báo lỗi rõ.
- User-Agent chung chung, không tên, không email: `Mozilla/5.0 (compatible; tiem-truyen-pipeline/1.0)`.
- Cache HTTP trên đĩa (`data/cache/http/`); `--offline` chạy lại toàn bộ từ cache, ném lỗi nếu cần mạng.
- Nội dung crawl (mô tả, ảnh, SQL sinh ra) chỉ nằm ở `data/` (bị ignore) và volume; repo giữ script và `pipeline/manifest.jsonl` (D11).

## 3. Các bước

`crawl` → `clean` → `images` → `copies` → `price` → `validate` → `export` → `publish`. Mỗi bước là một script chạy lại được, đọc và ghi trong `data/`. `copies` chạy trước `price` vì quy tắc "hiếm" dùng số quyển (Deferred #27).

| Bước | Việc | Chi tiết |
|---|---|---|
| `crawl` | Tải bản ghi thô theo `raw-record.schema.json` | phase 4 điền |
| `clean` | NFC, bỏ HTML, chuẩn hoá tên tác giả; gộp trùng theo ISBN-13 rồi `bộ\|tập\|biến thể`; Kim Đồng thắng Tiki thắng Wikidata; bỏ combo, bộ, trọn bộ, set; mô tả cắt ≤ 255 kí tự theo ranh giới câu; không bịa `publishYear` | phase 4 điền |
| `images` | WebP 160/320/640 và AVIF; ảnh phụ `extra-{n}-{w}.webp`; mã băm sha256 (`contract.md` §6) | phase 4 điền |
| `copies` | 1–5 quyển mỗi Book, phân bố cố định theo seed; barcode `DT{id:3}-{n:2}` (D8) | phase 4 điền |
| `price` | Quy tắc `rentalPrice` ở mục 4 | phase 4 điền |
| `validate` | Đếm thiếu trường, ảnh lỗi, tên trùng; dừng khi có lỗi chặn | phase 4 điền |
| `export` | `V10__catalog_data.sql`, `V11__sample_bills.sql` vào `data/export/`; cập nhật `manifest.jsonl` | phase 4 điền |
| `publish` | Chép SQL vào volume `catalog_data`, ảnh vào `covers_data` | phase 4 điền |

Chạy thử 10 đầu truyện trước, chủ dự án duyệt báo cáo validate và ảnh rồi mới crawl hết (HARD STOP ở phase 4). Lệnh: `AGENTS.md` mục 3.

## 4. Quy tắc `rentalPrice`

Theo brainstorm §6, khớp số liệu ch.2 (tập thường 3.000đ, truyện dài hay tập đặc biệt như "Nobita và lâu đài dưới đáy biển" 5.000đ). Đơn vị: đồng mỗi ngày.

| Điều kiện | Giá |
|---|---|
| Cơ bản | 3.000đ |
| Truyện dài, tập đặc biệt hoặc trên 200 trang | 5.000đ |
| Hiếm (xuất bản trước 2005 hoặc chỉ có 1 quyển) | cộng thêm 1.000đ |

Cách nhận ra "truyện dài", "tập đặc biệt" và cách xử lí `publishYear` thiếu khi xét "hiếm": phase 4 điền.

## 5. Manifest

Mỗi dòng `pipeline/manifest.jsonl` là một bản ghi `{ "kind": "book" | "image", "bookId", "source": "kimdong" | "tiki" | "wikidata", "sourceUrl", "fetchedAt", "winner", "sha256" }`; không chứa mô tả, tên tập hay ảnh (`contract.md` §6).

## 6. Báo cáo validate, ngưỡng lỗi chặn, kết quả lần chạy

Phase 4 điền.
