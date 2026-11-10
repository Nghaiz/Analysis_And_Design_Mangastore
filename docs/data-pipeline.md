# Pipeline dữ liệu catalog

Pipeline lấy dữ liệu truyện từ Kim Đồng, Tiki và Wikidata, làm sạch, sinh ảnh bìa, số quyển, giá thuê, kiểm tra rồi xuất migration Flyway. Hợp đồng nội bộ: `pipeline/CONTRACT.md`. Hợp đồng với app và nginx: `plans/261111-tiem-thue-truyen/contract.md` §5–§6.

Mọi dữ liệu sinh ra nằm trong `data/` (bị ignore, không vào git). Chỉ `pipeline/manifest.jsonl` vào git, và nó chỉ ghi nguồn, ngày tải, nguồn thắng, mã băm ảnh, không có tên truyện, mô tả hay ảnh.

## Các bước

`node pipeline/cli.mjs run` chạy `crawl` rồi lần lượt các bước dưới, dừng ngay khi một bước trả exit khác 0. Mỗi bước chạy riêng được: `node pipeline/cli.mjs <tên bước> [--run <tên>]`.

| Bước | Đọc | Ghi | Việc |
|---|---|---|---|
| `crawl` (lane 4A) | mạng hoặc `data/cache/http/` | `data/raw/<run>/<nguồn>.jsonl` | Tải bản ghi thô theo `pipeline/config/series.json`, bỏ combo |
| `clean` | `data/raw/<run>/*.jsonl` | `data/stage/<run>/clean.jsonl`, `image-sources.jsonl` | Kiểm bản ghi thô theo `raw-record.schema.json`; NFC, bỏ HTML; chuẩn hoá tác giả; gộp trùng; cắt mô tả; gán `id` |
| `images` | `clean.jsonl` | `images.jsonl`, `data/images/<run>/<id>/` | Tải ảnh, sha256 ảnh gốc, `cover-{160,320,640}.webp` và `.avif`, `extra-{n}-{160,320,640}.webp` |
| `copies` | `images.jsonl` | `copies.jsonl` | 1–5 quyển mỗi đầu truyện |
| `price` | `copies.jsonl` | `price.jsonl` | Giá thuê một ngày |
| `validate` | `price.jsonl`, ảnh | `data/reports/<run>/validate.{md,json}`, `index.html` | Lỗi chặn và cảnh báo; exit 1 khi có lỗi chặn |
| `export` | `price.jsonl`, `validate.json` | `data/export/V10__catalog_data.sql`, `V11__sample_bills.sql`, `pipeline/manifest.jsonl` | Chỉ chạy khi `validate.json` của cùng lần chạy không có lỗi chặn |
| `publish` (chạy tay) | `data/export/*.sql`, `data/images/full/` | volume Docker | Xem mục Publish |

`<run>` mặc định là `trial` khi có `--limit`, còn lại là `full`. Lần chạy khác `full` xuất vào `data/export/<run>/` (kèm `manifest.jsonl` của lần đó) và không bao giờ được publish.

### Làm sạch và gộp trùng (`clean`)

- Chữ: chuẩn Unicode NFC, bỏ thẻ HTML, giải mã mọi thực thể HTML có tên (đủ bảng Latin-1 như `&agrave;`, `&ocirc;`, `&nbsp;`, cộng `&abreve;`, `&dstrok;`...) và số (`&#7887;`, `&#x1EA1;`), kể cả chuỗi bị mã hoá hai lần, trước khi cắt; gom khoảng trắng.
- Tên đầu truyện: bỏ tiền tố "Sách - ", đuôi "(YYYY)", "(Tái bản ...)", mọi "(Tặng ...)", "(N tập)"; số tập đệm "Tập 01" thành "Tập 1". Năm bỏ khỏi tên chỉ dùng làm `publishYear` khi nguồn không ghi năm. Số tập, biến thể và khoá gộp tính trên tên đã làm sạch; validate chặn hai Book trùng tên.
- Mô tả bắt đầu bằng chính tên sản phẩm (hay gặp ở Tiki) thì bỏ phần tên lặp đó.
- NXB chuẩn hoá theo tiền tố: bỏ "Nhà xuất bản", "NXB", "Công ty"/"Cty" và từ chỉ loại doanh nghiệp đi sau ("TNHH", "Cổ phần", "Văn hoá"...); phần còn lại khớp đuôi với `publisher` của một bộ trong `series.json` thì dùng cách viết đó ("Nhà Xuất Bản Kim Đồng" → "Kim Đồng", "Cty Phan Thị" → "Phan Thị").
- ISBN: đổi ISBN-10 sang ISBN-13, kiểm checksum; sai checksum thì coi như không có ISBN (đếm vào `invalidIsbn`).
- Số tập đọc từ "Tập N", "Vol. N", "#N", "Quyển N"; không có thì từ dạng "<tên bộ hoặc bí danh> <số>" ở đầu tên, trước " - " hoặc cuối tên (so sau khi bỏ dấu; bỏ qua số dạng năm 19xx/20xx), tên giữ nguyên. Biến thể: `dac-biet` ("đặc biệt", "special"), `mau` ("màu", có dấu, để không nhầm với "mẫu"), `plus`; còn lại `thuong`. "Tái bản YYYY" không phải biến thể.
- Gộp trùng hai lượt: lượt 1 gom các bản ghi cùng ISBN-13; lượt 2 gom các nhóm có cùng khoá `seriesKey|volume|variant` của bản ghi thắng (không có số tập thì dùng tên đã bỏ dấu thay số tập). Khoá của bản ghi thua không nối chuỗi, nên một ISBN ghi nhầm không kéo hai tập khác nhau vào một.
- Nguồn thắng: Kim Đồng, rồi Tiki, rồi Wikidata; cùng nguồn thì `sourceUrl` nhỏ hơn. Trường nào nguồn thắng để trống thì lấy của bản ghi kế tiếp trong nhóm. Bản ghi Wikidata cấp bộ chỉ bổ trợ: tác giả khi mọi bản ghi tập đều thiếu, và cách viết chuẩn của tên tác giả.
- Tác giả: chữ chung chung ("Nhiều tác giả", "Đang cập nhật"...) coi như trống; khi mọi nguồn trống thì dùng khoá `author` của bộ trong `series.json`, rồi tác giả Wikidata, không có nữa thì để trống (validate chặn `missing-field`). Chữ cái đứng một mình giữa tên được thêm dấu chấm ("Fujiko F Fujio" → "Fujiko F. Fujio"). Tách theo `,`, `;`, `/`, `&`, " - ", " và "; gộp biến thể theo khoá bỏ dấu, chữ thường, sắp các từ (nên "Aoyama Gosho", "GOSHO AOYAMA" và "Gosho Aoyama" là một người); cách viết chuẩn là `author` của `series.json` rồi Wikidata, không có thì cách viết gặp đầu tiên (cách viết toàn chữ hoa bị thay khi có cách viết thường). Nhiều tác giả nối bằng ", ", bỏ bớt người cuối nếu vượt 100 kí tự.
- `publisher`: từ nguồn, không có thì `publisher` của bộ trong `series.json`.
- `publishYear`: năm trong "Ngày xuất bản"/`publishedAt` của nguồn, không có thì năm trong "(Tái bản YYYY)" hoặc "(YYYY)" của tên; vẫn không có thì để trống (validate cảnh báo `no-year`). Không bao giờ đoán.
- `description`: văn bản thuần, cắt ≤ 255 kí tự tại dấu kết câu cuối cùng còn vừa; câu đầu đã dài hơn 255 thì cắt ở ranh giới từ và thêm "…".
- `category`: thể loại của bộ trong `series.json` (phải có trong `pipeline/config/categories.json`).
- `id`: theo thứ tự bộ trong `series.json`, rồi số tập (không số tập xếp cuối), rồi biến thể (`thuong`, `dac-biet`, `mau`, `plus`), bắt đầu từ 1. Thứ tự dòng trong tệp thô không ảnh hưởng.
- `--limit n`: lấy vòng tròn từng bộ theo thứ tự `series.json` tới đủ n đầu truyện; `maxVolumes` của bộ chặn số tập.
- Combo còn sót không bị clean bỏ, để validate báo lỗi chặn.

### Ảnh (`images`)

Ảnh tải qua bộ tải của lane 4A (có cache, throttle, `--offline`). Ảnh được xoay theo EXIF, thu nhỏ giữ tỉ lệ, không phóng to ảnh nhỏ hơn cỡ đích (file `cover-640.webp` của ảnh gốc rộng 400 px vẫn rộng 400 px). WebP chất lượng 80, AVIF chất lượng 50, effort 4. Ảnh tải lỗi: `sha256` null (coi như thiếu ảnh). Ảnh tải được mà không giải mã được: giữ `sha256`, `widths` rỗng, validate báo `image-decode`. Chạy lại: Book có ảnh gốc giống lần trước và đủ file thì dùng lại, không mã hoá lại.

## Quy tắc số quyển và giá

Nguồn duy nhất: `pipeline/src/lib/rules.mjs`.

- Số quyển: `1 + (4 byte đầu của sha256("seriesKey|volume|variant") mod 5)`, tức 1–5, cố định giữa các lần chạy. Barcode `DT{id 3 chữ số}-{n 2 chữ số}`, ví dụ `DT005-01`; `tblBookCopy.id` tăng dần theo (bookId, n) từ 1.
- Giá thuê một ngày:
  - Cơ bản 3.000đ.
  - 5.000đ nếu bộ là truyện dài (`longStory: true` trong `series.json`), tập đặc biệt (`variant = dac-biet`) hoặc trên 200 trang.
  - Cộng 1.000đ nếu hiếm: xuất bản trước 2005, hoặc chỉ có 1 quyển. Thiếu năm thì không tính là hiếm theo năm.
  - Ví dụ: tập thường 1 quyển 4.000đ; tập đặc biệt in năm 2003 là 6.000đ.
- `price` chạy sau `copies` vì quy tắc "hiếm" dùng số quyển.

## Kiểm tra (`validate`)

Lỗi chặn (exit 1, không export): thiếu `name`/`author`/`publisher`/`category`/`rentalPrice` hoặc thể loại ngoài danh sách (`missing-field`), sai `clean-record.schema.json` (`schema`), trùng `id`, khoá gộp hoặc ISBN-13 (`duplicate-key`), ảnh có `sha256` mà file trong `data/images/<run>/` thiếu hoặc không giải mã được (`image-decode`), tên còn dấu hiệu combo/bộ/set (`combo`), số Book ngoài 300–500 khi `run = full` (`book-count`).

Cảnh báo: thiếu bìa (`no-cover`, nginx trả ảnh dự phòng), thiếu năm (`no-year`), mô tả rỗng (`no-description`).

`data/reports/<run>/index.html` mở thẳng từ đĩa để xem lưới bìa (đọc được trên điện thoại). `validate --json` in báo cáo ra stdout.

## Xuất (`export`)

- `V10__catalog_data.sql`: `INSERT` vào `tblBook` rồi `tblBookCopy`, chuỗi escape theo MySQL, UTF-8, LF, không dấu thời gian; cuối file đặt `AUTO_INCREMENT` của hai bảng.
- `V11__sample_bills.sql`: ba phiếu mẫu giữ hết quyển của bốn đầu truyện có ít quyển nhất: `khach01` "Chờ nhận" (1 đầu truyện), `khach02` "Đang cho thuê" (2 đầu truyện, nhân viên `hant`, cọc "Căn cước công dân"), `khach03` "Chờ nhận" (1 đầu truyện). Tài khoản, giỏ, quyển, đồ cọc tham chiếu bằng truy vấn con theo `username`, `barcode`, tên cọc; id phiếu và dòng giỏ lấy bằng `LAST_INSERT_ID()`. Ngày giờ viết tương đối (`NOW() - INTERVAL 1 DAY`) nên file không đổi giữa các lần chạy.
- `pipeline/manifest.jsonl` (chỉ khi `run = full`): mỗi bản ghi nguồn đã gộp vào một Book một dòng `kind=book` (`source` là nguồn của bản ghi đó, `winner` là nguồn thắng, `sha256` null) và mỗi ảnh gốc một dòng `kind=image` (`sha256` của ảnh gốc). Sắp theo `bookId`, rồi `book` trước `image`, rồi `sourceUrl`.
- `--dry-run`: in đường dẫn và mã băm sẽ ghi ra stderr, không ghi file.

## Chạy lại

- Chạy thử: `node pipeline/cli.mjs run --limit 10` (run `trial`), mở `data/reports/trial/index.html`.
- Chạy đầy đủ: `node pipeline/cli.mjs run`. Lần đầu tải mạng khoảng 50–60 phút; các lần sau đọc cache.
- Không gọi mạng: `node pipeline/cli.mjs run --offline` (thiếu cache thì exit 1 và nêu URL).
- Chạy lại một bước: `node pipeline/cli.mjs <bước> --run full`. Mỗi bước đọc tệp của bước trước trong `data/stage/<run>/`, nên sửa quy tắc giá chỉ cần chạy lại `price`, `validate`, `export`.
- Chạy lại với cùng cache và cùng mã cho V10, V11, manifest cùng mã băm (`export --json` in `sha256` từng file).

## Publish

```
node pipeline/cli.mjs publish --dry-run            # in hai lệnh docker sẽ chạy
node pipeline/cli.mjs publish [--project tiemtruyen]
```

Publish chép `data/export/*.sql` vào volume `<project>_catalog_data` và `data/images/full/**` vào `<project>_covers_data` bằng `docker run --rm ... alpine:3.22`. Volume phải có sẵn (compose tạo khi `docker compose up` lần đầu). Publish không xoá volume và không khởi động lại app. Thiếu Docker thì exit 2.

Sau publish, app cần một database mới để Flyway nạp V10 và V11 (xem Rollback).

## Rollback và nạp lại

Flyway ghi checksum của V10/V11 khi nạp. Đổi nội dung hai file sau khi DB đã nạp thì Flyway báo sai checksum, nên mỗi lần publish dữ liệu khác phải dùng database mới:

1. Dừng app: `docker compose stop app`.
2. Tạo database mới (ví dụ `tiemtruyen_v2`) trong MySQL và trỏ `MYSQL_DATABASE`/`APP_DB_URL` trong `.env` sang nó.
3. `docker compose up -d app`: Flyway chạy V1, V2 rồi V10, V11 từ volume.

Gỡ dữ liệu crawl khỏi DB: đặt `FLYWAY_DATA_LOCATION` sang một thư mục rỗng và dùng database mới. Không xoá volume khi chủ dự án chưa đồng ý.
