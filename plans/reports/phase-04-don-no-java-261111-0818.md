# Phase 4b, lane J `java`: báo cáo

Ngày 11/11/2026. Worktree `D:/Coding/mangastore-wt/04-don-no-java`, nhánh `lane/04-don-no/java` (từ 7cf726b). Chỉ commit tại máy, không push.

**Trạng thái:** DONE

## 1. Thay đổi theo từng mục

| Mục | Đã làm | File |
|---|---|---|
| #24 (đổi phạm vi theo tin nhắn orchestrator) | **Không** xoá `util/JsonReader`, **không** đổi `ViteManifest` (giữ y như `main`; phase 5 dùng `JsonReader.parse` trong `dev/HomePreviewView.jsp`). Chỉ sửa câu hứa "phase 3 thay" ở `docs/architecture.md:187` thành: giữ `JsonReader` làm bộ đọc JSON chặt cho manifest Vite và `categories.json` (phase 5); `JsonUtil` (Jackson) chỉ ghi props island. Hai dòng khác của file (`:59`, `:179`) chỉ liệt kê lớp đang có, vẫn đúng | `docs/architecture.md` |
| #57 | `AppConfig.flywayDataLocation()` = `optional("FLYWAY_DATA_LOCATION", "filesystem:/flyway/data")`, cùng mặc định và hành vi cũ. `MigrationListener.contextInitialized` gọi getter này; bỏ hai hằng public `DATA_LOCATION_VARIABLE`, `DEFAULT_DATA_LOCATION` (grep toàn repo: chỉ `MigrationListener` dùng). Test: mặc định trong `documentedDefaultsApplyOnlyToNonSecrets`, test mới `flywayDataLocationIsReadFromItsVariable` (bỏ khoảng trắng) | `util/AppConfig.java`, `util/MigrationListener.java`, `AppConfigTest` |
| #61 | `updateBook` đánh số quyển mới từ số lớn nhất trong các mã vạch dạng D8 của đầu truyện + 1, thay `COUNT(*)`. Câu `SELECT barcode FROM tblBookCopy WHERE barcode LIKE 'DTxxx-%'` quét **cả bảng** (UNIQUE tính trên cả bảng, nên mã cùng tiền tố nhập tay ở đầu truyện khác cũng được tính); tách số bằng hàm mới `Codes.copyNumber(bookId, barcode)` (không phân biệt hoa thường như collation `ai_ci` của cột, tối đa 9 chữ số; mã không theo D8 như `SHIN-TAY-01` → rỗng, bỏ qua vì không thể trùng mã sinh ra). Vẫn chạy sau `UPDATE tblBook` (khoá dòng đầu truyện) như trước | `dao/BookDAO.java`, `util/Codes.java`, `BookDAOTest`, `CodesTest` |
| #66 | Lớp cha `DAO` có ba helper `protected static`: `bookColumns(alias)` (cột SELECT), `bookJson(alias)` (`JSON_OBJECT` cho `RentalBillDAO`), `readBook(rs, idColumn)`; cả hai cái đầu sinh từ một danh sách `BOOK_COLUMNS`. Xoá `readBook` riêng của `BookDAO` và `CartDAO`, `RentalBillDAO.BOOK_JSON = bookJson("b")`. Không thêm lớp hay lớp lồng; `ArchitectureTest` (10 test) xanh. Số dòng: `BookDAO` 282→277, `CartDAO` 215→202, `RentalBillDAO` 299→297, `DAO` 177→237 | `dao/DAO.java`, `BookDAO.java`, `CartDAO.java`, `RentalBillDAO.java` |
| #32 | `ARG MAVEN_IMAGE=maven:3.9.16-eclipse-temurin-25-noble` (dùng cho tầng `war` và `session-libs`). ADR-0003 dòng "Ảnh build WAR" ghi tag mới và bằng chứng tra | `docker/app/Dockerfile`, `docs/adr/0003-jakarta-ee-11-tomcat-java-25.md` |

Không thêm hàm DAO public (ngoài §5.3), không getById, chỉ `PreparedStatement`.

## 2. Bằng chứng test

- **Test mã lạc số đỏ trên code cũ.** `BookDAOTest.updateBookNumbersNewCopiesAfterTheHighestExistingSuffix` viết trước, chạy với `BookDAO` cũ (`COUNT(*)`):
  `[ERROR] BookDAOTest.updateBookNumbersNewCopiesAfterTheHighestExistingSuffix:197 expected: <true> but was: <false>`
  Đầu truyện có `-01`, `TAY-99`, `-05` (3 quyển): code cũ sinh `-04`, `-05` → trùng `-05` → `updateBook` trả `false`. Code mới: `-06`, `-07`; sau đó thêm đầu truyện khác mang mã `dtxxx-09` (chữ thường) → quyển kế của đầu truyện đầu là `-10`, không trùng.
- `CodesTest` thêm 14 trường hợp (`DT001-07`, `dt001-07`, `DT001-100`, `DT001-1`, 9 chữ số; bị loại: `DT002-07`, `DT0010-07`, `DT001-`, `DT001-07A`, 10 chữ số, `SHIN-TAY-01`, `DT001--07`, có khoảng trắng đầu, `DT001-ab`).
- Test cũ của `updateBook` (`DT001-08`, `-09` trên V10) vẫn xanh.
- **Verify một lần cuối:** `node scripts/dev/mvnw.mjs -B clean verify` → `You have 0 Checkstyle violations.`, `Tests run: 262, Failures: 0, Errors: 0, Skipped: 0`, `BUILD SUCCESS`. Theo lớp: `BookDAOTest` 7, `CartDAOTest` 5, `RentalBillDAOTest` 6, `ArchitectureTest` 10, `AppConfigTest` 27, `CodesTest` 51, `ViteManifestTest` 14, `JsonReaderTest` 21 (giữ nguyên).

## 3. Docker

- `docker manifest inspect maven:3.9.16-eclipse-temurin-25-noble`: có, index OCI với `linux/amd64` và `linux/arm64/v8`.
- `docker build -f docker/app/Dockerfile -t tiemtruyen-app-lanej .` từ gốc worktree: exit 0; tầng `war` kéo `maven:3.9.16-eclipse-temurin-25-noble@sha256:93b8a14e…`, Maven trong ảnh `BUILD SUCCESS`; ảnh `sha256:147b7f49…`. Trong ảnh Maven: `VERSION_CODENAME=noble`, Maven 3.9.16, Java 25.0.4.1 Temurin.
- Không dùng `docker compose`, không đụng volume. Đã `docker rmi tiemtruyen-app-lanej` sau khi kiểm.

## 4. Commit

| SHA | Nội dung |
|---|---|
| `4fabe50842bdecc674d83a234aa72858574f5fff` | #61, #66, #57 (Java + test) |
| `8d9d28ae88225eb56d6251c49d7166c9ce083e01` | #32 Dockerfile + ADR-0003, #24 câu trong `architecture.md` |
| (commit báo cáo này) | `plans/reports/phase-04-don-no-java-261111-0818.md` |

## 5. Cho orchestrator

1. `plans/261111-tiem-thue-truyen/phase-01-khung-du-an-ha-tang.md:114` cũng ghi `util/JsonReader` "phase 3 thêm Jackson thì thay". File thuộc `plans/**` (của orchestrator), lane không sửa; nên đổi câu cho khớp quyết định giữ `JsonReader`.
2. `docs/contracts.md` không mô tả cách đánh số quyển của `updateBook`; nếu muốn ghi thì một câu ở §5.3 dòng `updateBook`: "mã trống nhận số = số lớn nhất trong các mã `DTxxx-NN` đang có + 1".
3. Nhãn báo cáo soát: #57, #61, #66, #32 → đã sửa; #24 → đổi thành giữ `JsonReader`, chỉ sửa tài liệu.
