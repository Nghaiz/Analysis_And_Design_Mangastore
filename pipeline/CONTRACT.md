# Hợp đồng nội bộ pipeline (phase 4)

Owner: orchestrator phase 4. Lane 4A và 4B không sửa file này; cần đổi thì ghi đề xuất vào báo cáo.
Hợp đồng ngoài (đường dẫn ảnh, location Flyway, manifest): `plans/261111-tiem-thue-truyen/contract.md` §5–§6.
Cột bảng: `tblBook(id int PK, name varchar(255), author varchar(100), publisher varchar(100), publishYear int NULL, category varchar(50), description varchar(255), rentalPrice float)`, `tblBookCopy(id int PK, barcode varchar(20) UNIQUE, bookId int FK→tblBook.id)` (brainstorm §2.1; `docs/schema.md` của phase 2 là SSOT khi có, hai nguồn phải khớp).

## 1. Thư mục dữ liệu (`data/`, bị ignore)

| Đường dẫn | Ai ghi | Nội dung |
|---|---|---|
| `data/cache/http/<host>/<sha256(url)>.body` + `.meta.json` | 4A fetch | Thân phản hồi và `{url, status, contentType, fetchedAt}`; `fetchedAt` ISO UTC lúc tải thật lần đầu |
| `data/raw/<run>/<source>.jsonl` | 4A crawl | Bản ghi theo `schema/raw-record.schema.json`, thứ tự ổn định (theo bộ trong `series.json`, rồi `sourceUrl`) |
| `data/raw/<run>/census.json` | 4A census | `{ "<seriesKey>": { "kimdong": n, "tiki": n } }` |
| `data/stage/<run>/image-sources.jsonl` | 4B clean | `{bookId, source}`: nguồn của ảnh mỗi Book (cho manifest) |
| `data/stage/<run>/clean.jsonl` → `images.jsonl` → `copies.jsonl` → `price.jsonl` | 4B | Bản ghi theo `schema/clean-record.schema.json`, mỗi bước đọc tệp của bước trước, sắp theo `id` |
| `data/images/<run>/<bookId>/cover-{160,320,640}.{webp,avif}`, `extra-{n}-{160,320,640}.webp` | 4B images | Đúng tên file của `contract.md` §6 |
| `data/reports/<run>/validate.md`, `validate.json`, `index.html` | 4B validate | Báo cáo; `index.html` mở thẳng được từ đĩa (ảnh dẫn tương đối tới `data/images/<run>/`) |
| `data/export/V10__catalog_data.sql`, `data/export/V11__sample_bills.sql` | 4B export, chỉ khi `run = full` | Migration dữ liệu Flyway |
| `data/export/<run>/*.sql` | 4B export, khi `run ≠ full` | Bản xuất của lần chạy thử, không bao giờ publish |

`<run>`: `--run <tên>`; mặc định `trial` khi có `--limit`, ngược lại `full`.

## 2. CLI (`pipeline/cli.mjs`, của 4A; bước của 4B đăng kí qua `src/steps/index.mjs`)

```
node pipeline/cli.mjs <lệnh> [--run <tên>] [--limit <n>] [--offline] [--dry-run] [--json] [--series <key,key>] [--project <tên>]
lệnh: census | crawl | <tên bước> | run | help
```

- `run` = `crawl` rồi lần lượt mọi bước trong `steps` (thứ tự: clean, images, copies, price, validate, export). Dừng ngay khi một bước trả `exitCode ≠ 0` (validate lỗi chặn thì không export).
- `--limit <n>`: chỉ lấy `n` đầu truyện (Book) cho lần chạy thử, chia đều theo thứ tự bộ trong `series.json`; giới hạn áp ở crawl (số bản ghi volume cần tải), clean giữ tối đa `n` Book.
- `--offline`: không gọi mạng; cần mạng mà cache thiếu thì ném `OfflineError` nêu URL, exit 1.
- `--dry-run`: bắt buộc có ở `export` và `publish`; in việc sẽ làm ra stderr, không ghi file đích, không chạy docker.
- `--json`: lệnh in đúng một đối tượng JSON ra **stdout**; mọi thông điệp khác ra **stderr**.
- Exit: 0 sạch; 1 có lỗi chặn hoặc lỗi chạy; 2 sai cách gọi (lệnh lạ, cờ lạ, thiếu giá trị cờ).
- `publish` không nằm trong `run`; orchestrator chạy riêng.
- `--project <tên>`: tên compose project cho `publish` (mặc định `tiemtruyen`), đưa vào `ctx.project`.

## 3. Đăng kí bước (`pipeline/src/steps/index.mjs`, của 4B)

```js
export const steps = [ { name: 'clean', describe: '...', run: async (ctx) => ({ exitCode: 0, summary: {...} }) }, ... ];
export const extraCommands = [ { name: 'publish', describe: '...', run: async (ctx) => ({ exitCode: 0 }) } ];
```

`ctx` do `cli.mjs` dựng:

| Khoá | Kiểu | Ý nghĩa |
|---|---|---|
| `run` | string | tên lần chạy |
| `limit` | number \| null | |
| `offline`, `dryRun`, `json` | boolean | |
| `rootDir` | string tuyệt đối | thư mục gốc repo |
| `dataDir` | string tuyệt đối | `<rootDir>/data` |
| `pipelineDir` | string tuyệt đối | `<rootDir>/pipeline` |
| `project` | string | compose project, mặc định `tiemtruyen` |
| `log(msg)` | function | ghi một dòng ra stderr |
| `http` | object | bộ tải của 4A: `getJson(url)`, `getText(url)`, `getBuffer(url)` trả `Promise`; dùng cache, throttle ≥ 2 giây mỗi host, robots.txt, lùi dần; offline thì chỉ đọc cache |
| `http.fetchedAt(url)` | function → string \| null | `fetchedAt` trong cache của URL |

`cli.mjs` dựng `ctx.http` cho **mọi** lệnh (kể cả export, validate, publish), vì export cần `http.fetchedAt` cho manifest.

Bước trả `{ exitCode, summary? }`. Với `--json`, `cli.mjs` in `summary` (hoặc của bước cuối khi `run`) ra stdout.

## 4. `pipeline/config/series.json` (của 4A, 4B chỉ đọc)

Mảng, thứ tự là thứ tự gán `id`:

```json
{ "key": "conan", "name": "Thám tử lừng danh Conan", "aliases": ["conan", "tham tu lung danh conan", "detective conan"],
  "publisher": "Kim Đồng", "preferredSource": "kimdong", "category": "Trinh thám", "longStory": false,
  "kimdongSlugPrefixes": ["tham-tu-lung-danh-conan-tap-"], "tikiQuery": "thám tử lừng danh conan tập",
  "wikidataId": "Q3853685", "maxVolumes": 30 }
```

`category` là một giá trị của `config/categories.json`. `longStory: true` nghĩa là mọi tập của bộ là "truyện dài" (giá 5.000đ). `maxVolumes` chặn số tập lấy của bộ. Bộ "Thần đồng đất Việt": `preferredSource: "tiki"`, `kimdongSlugPrefixes: []`.

## 5. Quy tắc (4B)

- Giá (`price`, chạy sau `copies`, Deferred #27): cơ bản 3000; `longStory`, `variant = dac-biet` hoặc `pages > 200` thì 5000; hiếm (`publishYear < 2005` hoặc `copies = 1`) thì cộng 1000.
- Quyển (`copies`): 1–5, cố định theo seed `sha256(seriesKey|volume|variant)`; phân bố phải có đủ cảnh hết (bị V11 giữ hết), còn ít (1–2), còn nhiều (4–5). Barcode `DT{id:3}-{n:2}`, `tblBookCopy.id` gán tăng dần theo `(bookId, n)` bắt đầu từ 1.
- Biến thể (`variant`): `thuong` mặc định; `dac-biet` khi tên có "đặc biệt"/"special"; `mau` khi "màu"/"tuyển tập màu"; `plus` khi "plus". "Tái bản YYYY" không phải biến thể (chỉ là năm).
- Loại combo: tên chứa (không phân biệt hoa thường, đã bỏ dấu) `combo`, `bo `, `tron bo`, `set `, `box set`, `tu sach` dạng nhiều tập → bỏ ở crawl (4A) và validate báo lỗi chặn nếu còn sót.

## 6. Export (4B)

- `V10__catalog_data.sql`: `INSERT INTO tblBook (id, name, author, publisher, publishYear, category, description, rentalPrice) VALUES ...;` rồi `INSERT INTO tblBookCopy (id, barcode, bookId) VALUES ...;`, chuỗi escape đúng MySQL (`\\`, `'`), UTF-8, LF, không dấu thời gian trong file (chạy lại cho cùng mã băm). Cuối file: `ALTER TABLE tblBook AUTO_INCREMENT = <maxId+1>; ALTER TABLE tblBookCopy AUTO_INCREMENT = <maxCopyId+1>;`.
- `V11__sample_bills.sql`: vài phiếu `"Chờ nhận"` và `"Đang cho thuê"` (chuỗi trạng thái đúng brief §3: "Chờ nhận", "Đang cho thuê", "Đã huỷ") giữ **hết** quyển của 3–5 đầu truyện. Tham chiếu tài khoản và danh mục của V2 bằng truy vấn con theo khoá tự nhiên, không ghi cứng id:
  - khách: `username` ∈ `khach01`, `khach02`, `khach03` (`tblClient.userId = (SELECT id FROM tblUser WHERE username = 'khach01')`); giỏ: `(SELECT id FROM tblCart WHERE clientId = ...)`;
  - nhân viên giao: `hant`;
  - quyển: `(SELECT id FROM tblBookCopy WHERE barcode = 'DT005-01')`;
  - đồ cọc: `(SELECT id FROM tblCollateral WHERE name = 'Căn cước công dân')`.
  Phiếu "Chờ nhận": `staffId NULL`, `borrowDate`, `dueDate` NULL; mỗi quyển có một dòng `tblSelectedBook` trong giỏ của khách và `tblRentedBook.selectedBookId` trỏ tới dòng đó. Phiếu "Đang cho thuê": có `staffId`, `borrowDate`, `dueDate`, `conditionNote` từng quyển và một `tblRentalCollateral`. Ngày giờ viết bằng biểu thức tương đối (`NOW() - INTERVAL 1 DAY`, `CURDATE() + INTERVAL 5 DAY`) để file không đổi giữa các lần chạy.
- Đổi nội dung V10/V11 sau khi DB đã nạp thì Flyway báo sai checksum: publish lại cần database mới (xem Rollback của phase 4).

## 7. Publish (4B, chạy tay bởi orchestrator)

`node pipeline/cli.mjs publish [--dry-run] [--project tiemtruyen]`: chép `data/export/*.sql` vào volume `<project>_catalog_data` (thư mục gốc của volume) và `data/images/full/**` vào `<project>_covers_data`, qua `docker run --rm -v <volume>:/dst -v <nguồn>:/src:ro alpine:3.22 ...`. Không xoá volume, không khởi động lại app (orchestrator làm). Thiếu Docker thì exit 2 kèm việc cần làm.

## 7b. Báo cáo `validate --json` (stdout, cũng ghi `data/reports/<run>/validate.json`)

```json
{ "run": "full", "books": 412, "copies": 1180,
  "blocking": [ { "code": "missing-field|duplicate-key|image-decode|combo|book-count|schema", "bookId": 12, "message": "..." } ],
  "warnings": [ { "code": "no-cover|no-year|no-description", "bookId": 40, "message": "..." } ],
  "missingCover": [40, 41], "withCover": [1, 2, 3], "sourceWins": { "kimdong": 300, "tiki": 112, "wikidata": 0 } }
```

Exit 1 khi `blocking` không rỗng. `book-count` (ngoài 300–500) chỉ xét khi `run = full`. `image-decode` chỉ xét ảnh có `sha256` khác null (file trong `data/images/<run>/` phải giải mã được bằng sharp).

## 8. Manifest (`pipeline/manifest.jsonl`, vào git, do export ghi khi `run = full`)

Đúng `contract.md` §6: mỗi dòng `{"kind":"book"|"image","bookId","source","sourceUrl","fetchedAt","winner","sha256"}`; `kind=book`: một dòng cho mỗi bản ghi nguồn đã gộp vào Book đó (`source`/`sourceUrl`/`fetchedAt` của bản ghi đó), `winner` là nguồn thắng, `sha256` null; `kind=image`: một dòng mỗi ảnh gốc (bìa và ảnh phụ), `sha256` của ảnh gốc, `winner` là nguồn của ảnh. Không có `name`, `description` hay bất kì nội dung nào. Sắp theo `bookId`, rồi `kind` (book trước), rồi `sourceUrl`.

## 9. Đổi sau lane 4A (orchestrator chấp nhận 11/11/2026)

- `census.json`: `"tiki": null` nghĩa là chưa biết vì nguồn chặn; census exit 1 khi có `null`.
- Wikidata đọc `https://www.wikidata.org/wiki/Special:EntityData/<QID>.json` (1 request mỗi bộ), không dùng SPARQL vì `robots.txt` của query.wikidata.org cấm `/sparql`. Ảnh P18 của bản ghi `level = series` không bao giờ là bìa Book.
- `ctx.series`: mảng key từ `--series` hoặc `null`. `ctx.http.stats()` trả `{ network, cacheHits }`.
- `sourceUrl` là trang sản phẩm người xem được (Kim Đồng `https://nxbkimdong.com.vn/<alias>[?variant=<id>]`, Tiki `https://tiki.vn/<url_path>`), không phải URL API; `fetchedAt` của Book lấy từ `record.fetchedAt`, `http.fetchedAt` chỉ dùng cho URL ảnh.
- `publisher` Kim Đồng là `"Kim Đồng"`; Tiki giữ chữ của nguồn, clean chuẩn hoá ("Nhà Xuất Bản Kim Đồng" → "Kim Đồng").
- Tiki chặn IP sau khoảng 27 request liên tiếp: crawl đầy đủ chạy theo đợt `--series`, cache giữ phần đã tải.
