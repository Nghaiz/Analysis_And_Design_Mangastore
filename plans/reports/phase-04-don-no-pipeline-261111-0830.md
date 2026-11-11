# Phase 4b, lane P `pipeline`: báo cáo

Worktree `D:/Coding/mangastore-wt/04-don-no-pipeline`, nhánh `lane/04-don-no/pipeline`. Không gọi mạng, không chạy `publish`, không chạy docker. `data/` còn nguyên (raw không đổi từng byte).

**Trạng thái: DONE_WITH_CONCERNS.** Cả năm việc đã xong và có test. Có một điểm cần orchestrator quyết: sửa luật combo ở crawl làm `run --offline` dừng ở crawl, vì một tập Thần Đồng Đất Việt trước đây bị bỏ nhầm nay được nhận, mà trang chi tiết của nó chưa có trong cache (mục 6).

## 1. #82/#88: "Bố …" bị coi là combo

- Nguyên nhân: cả hai bộ lọc combo (`src/lib/title.mjs` `isCombo` cho validate và `src/sources/text.mjs` `isComboName` cho crawl) so `bo ` trên chữ đã bỏ dấu, nên mọi chữ bỏ dấu thành "bo" đều dính: bố, bò, bỏ, bọ, bờ, bó, bơ, bô, bồ, bổ.
- Sửa: thêm `src/lib/set-word.mjs` (`hasSetWord`), dùng chung cho cả hai bộ lọc. Hàm này so chữ "bộ" trên chữ có dấu (NFC, không phân biệt hoa thường, ranh giới chữ và số). Khi tên không có dấu tiếng Việt nào (slug Kim Đồng, tên gõ không dấu) thì "bo" vẫn tính là combo như cũ, vì lúc đó không phân biệt được "bộ" với "bố". Bỏ mẫu `bo ` khỏi hai danh sách mẫu. Các mẫu `tron bo`, `combo`, `set`, `box set`, `tu sach` giữ nguyên.
- Test thêm: `test/lib.test.mjs` (Bố Sói, Bố Ốm, Phá Bỏ, Bò Cái là không combo; BỘ viết hoa, "Bộ" dạng NFD, "Bộ" cuối tên, "bo truyen" không dấu là combo), `test/sources.test.mjs` (6 dòng: Bộ / bo không dấu là combo; Bố Ốm, Bò Cái, Bọ Hung, Thẻ Bo Góc không phải combo).
- Quét toàn bộ tên trong HTTP cache (290 tệp JSON/XML của Kim Đồng, Tiki, Wikidata; 13.379 tên khác nhau, gồm cả `data/raw/{full,trial}` và `data/stage/{full,trial}`): 410 tên khớp luật cũ `bo`. Trong đó 306 tên vẫn là combo theo luật mới; **104 tên bị luật cũ bỏ nhầm**: 96 tiêu đề trong sitemap Kim Đồng (sách thiếu nhi, không thuộc bộ nào trong `series.json`, ví dụ "Bố Sói - Con Thỏ - …", "Khoa học bỏ túi - …", "Bàn tay của bố") và 8 tên Tiki thuộc các bộ đang lấy:
  - `naruto`: "Naruto Tập 47: Phong Ấn Bị Phá Bỏ!! (Tái Bản 2022)"
  - `chu-thuat-hoi-chien`: "Chú Thuật Hồi Chiến - Tập 6 - Bản Tặng Kèm Obi Và Thẻ Bo Góc Nhựa" và bản "Bản Thường - …"
  - `dragon-ball`: "Sách - Dragon Ball - 7 Viên Ngọc Rồng - Tập 32 - Cell Bọ Hung Hoàn Thiện (Tái Bản 2025)"
  - `shin-hoat-hinh-mau`: ba tên "Tập 30: Cu Shin Chăm Bố Ốm" và "Tập 48: Vui Lên Nào Bố Ơi!"
  - `than-dong-dat-viet`: "Thần Đồng Đất Việt 164 - Bò Cái Tịt Ngòi"
- Ảnh hưởng thật lên dữ liệu: chạy lại crawl offline theo từng bộ với luật mới thì 27/28 bộ ra bản ghi giống hệt `data/raw/full` (các tập kia hoặc đã đủ hạn mức `maxVolumes`, hoặc bộ lấy Kim Đồng trước). Chỉ `than-dong-dat-viet` khác: tập 164 nay được nhận. Bộ này lấy 25 tập tăng dần, nên tập 164 sẽ chen vào và tập 209 (Book 85) bị đẩy ra (mục 6).
- Ngoài phạm vi, chưa sửa: luật "bộ" vẫn bắt các nghĩa khác như "bộ đội", "đi bộ", "bộ não". Trong cache không có tên nào thuộc bộ đang lấy mà dính trường hợp này.

## 2. #95: bìa có dải chữ FAHASA

- "#10" của báo cáo chạy thử là Dragon Ball Tập 1. Ở lần chạy `full`, tập này là **Book 202**; Book 10 của `full` là Conan Tập 42, bìa sạch.
- Ảnh gốc 600×600 của người bán FAHASA trên Tiki có cấu trúc: nhãn chữ đỏ hẹp ở trên, một khoảng trắng chạy hết bề ngang, rồi đến bìa. Cắt viền đệm giữ cả nhãn vì nhãn không trắng. Không chỉ #202: soát hết 396 Book thì **31 bìa ứng viên** có dải này (Book 62, 178, 179, 202, 203, 205–216, 237, 238, 242, 314, 316–319, 328, 391–394, 396). Cả 31 đều có ảnh thay thế sạch: bìa trước đúng dáng, không nhãn, nằm trong ảnh phụ của chính sản phẩm đó.
- Sửa luật chọn bìa: thêm luật 3. `src/lib/trim.mjs` có hàm mới `sellerBandHeight`. Hàm chỉ xét ảnh có viền đệm và nhận ra dải trên cùng khi: dải cao 3–15% hộp cắt, mọi hàng của dải còn ít nhất 30% màu viền (nhãn hẹp hơn 70% bề ngang), và dưới dải là khoảng trống cao ít nhất 2,5% hộp cắt. Trong `src/lib/colour.mjs`, `chooseCover` dùng luật 3 khi bìa ứng viên qua được luật 1 và 2 nhưng có nhãn: chọn ảnh màu đúng dáng bìa, không nhãn, gần bìa tham chiếu của bộ nhất. `isUsableCover` loại bìa có nhãn khỏi bìa tham chiếu. Không có ảnh sạch thì giữ bìa có nhãn; lí do chấp nhận ghi ở `pipeline/CONTRACT.md` §9 (nhãn nằm ngoài bìa in, không cắt ảnh để khỏi mất phần bìa thật). Lần này không Book nào phải dùng ngoại lệ đó.
- Bộ dò trên dữ liệu thật: đúng 31 bìa ứng viên trên, không có dương tính giả trong 396 bìa ứng viên. Các ảnh gần ngưỡng mà không bị bắt: 169 (dải 2,3%), 180 (khoảng trống 1,85%), 250–258 (dải dưới 1%), 260 (khoảng trống 1,4%). Trong ảnh phụ có 1 ảnh bị bắt (Book 328 ảnh 3), không ảnh hưởng gì.
- Kết quả: 32 Book đổi bìa. 31 Book là các bìa có nhãn kể trên. Book thứ 32 là **Book 68** (Thần Đồng Đất Việt 160): vì Book 62 bị loại khỏi bìa tham chiếu của bộ, luật 1 chọn ảnh màu gần tham chiếu nhất thay đổi, và bìa mới là một ảnh chụp bìa trước khác của cùng tập 160. Tôi đã soát bằng mắt cả 32 bìa mới: đều là bìa trước, đúng số tập, không còn nhãn. Test thêm trong `test/images.test.mjs`: dò được nhãn; không nhầm bìa không nhãn, dải chạy hết bề ngang hay ảnh trơn; có ảnh sạch thì đổi; không có ảnh sạch thì giữ nguyên.

## 3. #98: nghĩa của `publishYear`

- Đã chốt trong `pipeline/CONTRACT.md` §9 và `docs/data-pipeline.md`: `publishYear` là **năm của ấn bản tiệm có**, tức ấn bản mà bản ghi nguồn mô tả, không phải năm ra mắt của bộ. Vì vậy năm 2026 của trial #2, #4, #6 là đúng nghĩa.
- Code cũ chưa khớp nghĩa này. `buildBook` lấy `publishedAt` của mọi nguồn trước, rồi mới đến năm trong tên. Trong dữ liệu thật có 28 bản ghi Tiki của FAHASA mà tên ghi "(Tái Bản 2025)" hoặc "(Tái Bản 2024)", nhưng `publication_date` của cả 28 đều là "2023-12-21 14:00:00", tức ngày mặc định của người bán. Sửa (`src/lib/book.mjs`): với từng bản ghi theo thứ tự gộp, nguồn thắng trước, năm trong tên thắng, không có thì lấy năm của `publishedAt`; không có năm nào thì `null`. Không bịa năm: số cảnh báo `no-year` vẫn là 147.
- Test: `test/clean-real.test.mjs` "publishYear là năm của ấn bản tiệm có…". Dragon Ball trước kỳ vọng 2023 theo nghĩa cũ, nay là 2025; đây là đổi do đặc tả, không phải sửa test cho xanh.

## 4–5. Bất nhất 6 và 7

- Bất nhất 6: `docs/adr/0010-nguon-du-lieu-kim-dong-tiki.md:18` đổi "Wikidata SPARQL" thành `Special:EntityData/<QID>.json`, kèm lí do robots, khớp `CONTRACT.md` §9 và `docs/data-pipeline.md:5`.
- Bất nhất 7: dòng `data/export/<run>/…` ở `pipeline/CONTRACT.md` §1 nay ghi đủ `*.sql` và `manifest.jsonl` của lần chạy thử (như `export.mjs` ghi), và nói rõ `pipeline/manifest.jsonl` chỉ ghi khi `run = full`.
- Cùng đợt: §5 của `CONTRACT.md` (luật combo) và dòng `crawl` cùng đoạn chọn bìa trong `docs/data-pipeline.md` đã cập nhật theo mục 1 và 2.

## Kiểm (một lần, cuối lane)

| Lệnh | Kết quả |
|---|---|
| `npm --prefix pipeline test` | 11 tệp, **167 test pass**, 0 fail (thêm 10 test hoặc ca) |
| `node pipeline/cli.mjs run --offline` | **exit 1 ở crawl**: `cache không có https://tiki.vn/api/v2/products/378986` (Thần Đồng Đất Việt 164, mục 6) |
| `clean`, `images`, `copies`, `price`, `validate`, `export` chạy riêng từng bước, `--offline`, trên `data/raw/full` có sẵn | cả 6 bước exit 0; 210 ảnh sinh mới, 364 Book dùng lại ảnh cũ, 0 lỗi |
| `node pipeline/cli.mjs validate --json` | `run=full`, 396 Book, 1168 quyển, **0 lỗi chặn**, 147 cảnh báo (toàn bộ `no-year`), thiếu bìa 0 |
| `node --test "scripts/check/*.test.mjs"` | 56/56 pass |

## Mã băm (12 kí tự hex đầu của sha256)

| File | Trước | Sau |
|---|---|---|
| `data/export/V10__catalog_data.sql` | `bd16251ff3b7` | `ea48f8335561` |
| `data/export/V11__sample_bills.sql` | `ff6fb1b87a9a` | `ff6fb1b87a9a` (không đổi) |
| `pipeline/manifest.jsonl` | | không đổi (git không thấy khác; manifest sắp theo `sourceUrl`, không ghi ảnh nào là bìa) |

V10 đổi đúng **28 dòng `tblBook`**, và chỉ đổi cột `publishYear`:
- 2023 → 2025: Book 202, 203, 205–216 (Dragon Ball), 237, 238, 242 (One Piece), 314, 316–319 (Thanh Gươm Diệt Quỷ), 328 (Spy X Family).
- 2023 → 2024: Book 391–394, 396 (Haikyu).

Không đổi `tblBookCopy`, `rentalPrice` (không Book nào qua mốc hiếm 2005), tên, mô tả hay id. Đổi bìa (mục 2) chỉ làm đổi ảnh trong `data/images/full/`, không đổi V10. V10 mới đã khác checksum Flyway của DB đang nạp: publish lại phải dùng database mới (`CONTRACT.md` §6).

## 6. Cần orchestrator quyết

1. **`run --offline` không chạy được nữa** cho tới khi cache có `https://tiki.vn/api/v2/products/378986` (và ảnh của nó). Luật combo đúng nhận "Thần Đồng Đất Việt 164 - Bò Cái Tịt Ngòi". Bộ này lấy 25 tập tăng dần, nên lần crawl có mạng tiếp theo sẽ thêm tập 164 và bỏ tập 209. Id của các tập Thần Đồng Đất Việt từ 164 trở đi sẽ dịch đi một số trong bộ (hiện là Book 71–85), V10 đổi thêm và manifest đổi. Hai cách:
   - Cho phép chạy `node pipeline/cli.mjs crawl --series than-dong-dat-viet`, sau đó `run --offline`. Ước khoảng 1–3 request chi tiết Tiki, cộng ảnh của tập đó.
   - Hoặc giữ nguyên `data/raw/full` như lần crawl trước. Khi đó V10 mã băm `ea48f8335561` là bản xuất đúng từ raw hiện có, nhưng không tái tạo được bằng `run --offline`.
   Tôi không gọi mạng.
2. Đề xuất sửa skill `.claude/skills/tiem-add-crawl-source/SKILL.md:28` (ngoài Owns của lane). Hiện dòng này ghi: bỏ sản phẩm có "Bộ" trong tên. Nên thêm: so "bộ" trên chữ có dấu bằng `pipeline/src/lib/set-word.mjs`, không so trên chữ đã bỏ dấu (trùng "bố", "bò", "bỏ").

## Tệp đã sửa

- Code: `pipeline/src/lib/set-word.mjs` (mới), `pipeline/src/lib/title.mjs`, `pipeline/src/sources/text.mjs`, `pipeline/src/lib/trim.mjs`, `pipeline/src/lib/colour.mjs`, `pipeline/src/lib/book.mjs`, `pipeline/src/steps/images.mjs` (chỉ chữ trong log).
- Test: `pipeline/test/lib.test.mjs`, `pipeline/test/sources.test.mjs`, `pipeline/test/images.test.mjs`, `pipeline/test/clean-real.test.mjs`.
- Tài liệu: `pipeline/CONTRACT.md` (§1, §5, §9), `docs/data-pipeline.md`, `docs/adr/0010-nguon-du-lieu-kim-dong-tiki.md`.
- Dữ liệu (bị ignore, không commit): `data/stage/full/*`, `data/images/full/*` (32 Book đổi bìa), `data/reports/full/*`, `data/export/V10__catalog_data.sql`.
