# Phase 4: Pipeline crawl và dữ liệu mẫu (báo cáo phase)

Ngày 11/11/2026. Nhánh `phase/04-pipeline`. Orchestrator: phiên cook thứ 3. Trạng thái: **DONE**.

## 1. Kết quả

| | |
|---|---|
| Bộ truyện | 28 (`pipeline/config/series.json`) |
| Đầu truyện (`tblBook`) | 396; nguồn thắng: Kim Đồng 275, Tiki 121 |
| Quyển (`tblBookCopy`) | 1168, mỗi đầu 1–5 quyển |
| Giá thuê | 3.000đ: 223 · 4.000đ: 73 · 5.000đ: 81 · 6.000đ: 19 (luật giá CONTRACT §5) |
| Thể loại | 10 nhóm, đủ cả 10 |
| Bìa | 396/396 có bìa, 0 ảnh lỗi; 750 ảnh (bìa và ảnh phụ), WebP 160/320/640 và AVIF cho bìa |
| Validate | 0 lỗi chặn; 147 cảnh báo, tất cả là `no-year` (nguồn không ghi năm nên `publishYear` để NULL, không bịa) |
| Phiếu mẫu (V11) | 3 phiếu của `khach01`–`khach03` và `hant`: 2 "Chờ nhận", 1 "Đang cho thuê" |

Census chạy lại lúc viết báo cáo (`node pipeline/cli.mjs census --json`, exit 0, 1 request mạng, 39 lần trúng cache): 453 ứng viên Kim Đồng, 429 ứng viên Tiki (trang 1), dự kiến tối thiểu 396 tập.

## 2. Accept

`node scripts/accept/phase-04.mjs` → `[accept] ALL PASS` (log `plans/reports/accept-phase-04-*.log`, bị ignore). Chạy ba lần: sau publish đầu tiên, sau khi sửa luật chọn bìa (mục 4), và lần cuối sau khi đổi `publish` sang đồng bộ volume ảnh.

| Bước | Kết quả |
|---|---|
| 1 Vitest pipeline | PASS, 151 test |
| 2 `run --offline` cho cùng mã băm export | PASS (`V10__catalog_data.sql`, `V11__sample_bills.sql`) |
| 3 `validate --json` | PASS, 396 Book, 1168 quyển, thiếu bìa 0 |
| 3b Làm đỏ có chủ đích: thêm bản ghi combo | PASS, validate exit 1, `code=combo` |
| 4 `manifest.jsonl` | PASS, 396 dòng Book, 750 dòng ảnh, không khoá `description` |
| 5 git | PASS, `data/` bị ignore, không file nào được track |
| 6 Sau publish | PASS, `/health.jsp` 200, `tblBook = 396`, `/covers/1/cover-320.webp` là `image/webp` 200 kèm `Cache-Control: public, max-age=31536000`, id không có trả bìa giấy SVG (D2) |
| 7 Chống thoái lui | PASS, `node --test "scripts/check/*.test.mjs"`, `section10-sync.mjs` |

Flyway của compose: V1, V2, V10 (`catalog data`), V11 (`sample bills`) đều `success = 1`.

## 3. HARD STOP 4.5: quyết định thay chủ dự án

Chủ dự án giao toàn quyền trong phiên này ("tự chọn phương án đầu tiên đề xuất ... đang đi ngủ"). Chạy thử 10 đầu truyện đạt 10/10 đủ trường bắt buộc và có bìa (`plans/reports/phase-04-trial-261111-0423.md`), trên ngưỡng kill (a) 6/10, nên orchestrator chọn phương án đầu "crawl hết". Các lỗi chất lượng thấy ở chạy thử (thực thể HTML, nhiễu tên, NXB, tác giả dính nhau, "Nhiều tác giả", số tập không có chữ "Tập", bìa là trang ruột, ảnh vuông có viền) đã sửa trước khi crawl hết, ghi ở `pipeline/CONTRACT.md` §9.

Tiki chặn IP sau khoảng 27 request liên tiếp, nên cache được nạp theo từng bộ (`--series`, có nghỉ và thử lại): 28/28 bộ đạt, không bị chặn. Crawl đầy đủ sau đó đọc từ cache.

## 4. Soát sau crawl đầy đủ và sửa

Soát toàn bộ 396 bìa bằng Playwright MCP (trang `data/reports/full/index.html` phục vụ qua `127.0.0.1`, vì MCP chặn `file:`) và một ảnh ghép đủ 396 bìa:

- 396/396 ảnh tải được, 0 ảnh hỏng.
- **Bìa sai, đã sửa** (`pipeline/src/lib/colour.mjs`, `steps/images.mjs`):
  - #181 Nhóc Maruko Tập 8: bìa ứng viên là ảnh ghép bìa với bộ postcard tặng kèm (vuông). Luật mới: bìa có màu mà sau khi cắt viền vẫn lệch xa dáng 2:3 thì lấy ảnh màu đúng dáng.
  - 9 tập Thần Đồng Đất Việt từ Tiki: luật cũ "ảnh màu đầu tiên" lấy nhầm **bìa sau** (Tiki xếp trang ruột xám, rồi bìa sau, rồi bìa trước; `thumbnail_url` của Tiki cũng trỏ vào trang ruột). Luật mới: khi nhiều ảnh đạt, lấy ảnh gần bìa tham chiếu của bộ nhất (trung bình bìa các tập cùng bộ đã đạt sẵn).
  - Sau sửa: đúng 11 đầu truyện được đổi bìa, cả 11 đều là bìa trước (soát bằng mắt). Có test cho từng luật.
- **Tên còn nhiễu, đã sửa** (`pipeline/src/lib/name.mjs`): "Sách " không có gạch (8 tập), "[Tái Bản 2023]", "(Tập N)", "(Bản thường)". Còn 7 tên có ngoặc, đều là ghi chú ấn bản có nghĩa, giữ lại.
- Sau mỗi lần sửa: `run --offline` từ cache (không gọi mạng), validate, publish lại, Accept lại.

## 5. Lane

| Lane | Báo cáo | Trạng thái |
|---|---|---|
| 4A `nguon` | `phase-04-nguon-261111-0411.md` | DONE_WITH_CONCERNS (Tiki chặn IP), đã xử lí bằng nạp cache theo bộ |
| 4B `xu-li` | `phase-04-xu-li-261111-0401.md` | DONE |
| 4C `xac-minh` | `phase-04-trial-261111-0423.md` | DONE_WITH_CONCERNS (bìa #3 là trang ruột), đã sửa bằng luật chọn bìa |

## 6. Ghi chú vận hành

- Compose dùng chung tên project `tiemtruyen` cho mọi worktree. Chạy `docker compose up` từ một worktree khác tạo lại `db` và `redis` (mount bind trỏ thư mục khác); nếu `app` khởi động đúng lúc đó, `MigrationListener` không nối được DB và context hỏng. Cách chữa: `docker compose up --build -d --wait` lại từ cùng một worktree. Volume giữ nguyên.
- `publish` đồng bộ volume `covers_data` với `data/images/full`: chép đè rồi xoá file và thư mục mà nguồn không còn (đã thử trên thư mục tạm). Không xoá volume. Sau publish, nginx trả đúng ảnh mới (so sha256 của #61 và #181 với file trên đĩa).

## 7. Nợ còn lại

Không có cho phase 4. Trang tìm truyện dùng dữ liệu này được kiểm ở phase 6.
