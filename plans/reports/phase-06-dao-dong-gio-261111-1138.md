# Phase 6, lane 6G `dao-dong-gio`: C21 (dòng giỏ đổi giữa chừng khi khách xác nhận phiếu)

Worktree `D:/Coding/mangastore-wt/06-dao-dong-gio`, nhánh `lane/06-chuc-nang-1-2/dao-dong-gio`, đã merge `799d807` (hằng `SELECTED_BOOKS_CHANGED`, C21, island 6D).

**Trạng thái: DONE.** Orchestrator đã duyệt khoá dòng giỏ trong updateCart (ab66866); phần làm đỏ đã chạy, xem mục 4. Ghi chú cũ: Code xong, compile và Checkstyle sạch. Lần chạy đầu hỏng vì Docker Desktop engine trả 500. Docker sống lại thì chạy lại một lần: **120/120 xanh** ở năm lớp liên quan (mục 5). **Chưa làm bước làm đỏ có chủ đích**: luật mới của orchestrator là cả máy chỉ một việc Docker nặng mỗi lúc, không chạy thêm lượt khi chưa được nhắn "lượt của 6G". Mục 4 ghi đúng hai biến thể cần chạy.

## 1. Việc đã làm

| File | Thay đổi |
|---|---|
| `src/main/java/vn/tiemtruyen/dao/CartDAO.java` | (1) Hàm tĩnh package-private `lockFreeLines(Connection, Client, List<RentedBook>)`, không public nên không phải hàm DAO của §5.3 (`ArchitectureTest` chỉ đếm hàm public). Nó khoá dòng `tblSelectedBook` theo id tăng dần (`FOR UPDATE`), rồi một câu đọc mới đếm các dòng còn tồn tại, thuộc giỏ của client và là dòng tự do. Định nghĩa "tự do" dùng lại đúng `NOT_IN_ACTIVE_BILL` của `getCart` (SSOT, không chép SQL sang RentalBillDAO). Trả `false` khi đếm thiếu hoặc khi hai dòng phiếu trỏ cùng một dòng giỏ. (2) `updateCart` khoá mọi dòng của chính giỏ theo id tăng dần trước khi đọc dòng tự do (xem mục 2, bước này cần orchestrator duyệt). |
| `src/main/java/vn/tiemtruyen/dao/RentalBillDAO.java` | `reserveCopies` (bước K1 dùng chung cho `addRentalBill` và nhánh thêm dòng của `updateRentalBill`) gọi `CartDAO.lockFreeLines` ngay sau khi khoá `tblBook`, trước mọi lần chọn quyển hay INSERT. Sai thì trả `false`, transaction rollback, không lỗi khoá ngoại, không 500. Không thêm hàm public, không đổi chữ kí, không getById. Dòng thêm tại quầy (`selectedBook == null`) không bị kiểm. File đúng 300 dòng (trần Checkstyle). |
| `src/test/java/vn/tiemtruyen/dao/RentalBillCartLineTest.java` (mới) | 7 test cho (a) và (b), xem mục 3. |
| `src/test/java/vn/tiemtruyen/dao/CartDAOTest.java` | Thêm `updateCartWaitsForAnInFlightBillAndKeepsItsLine`: dựng tất định đúng thứ tự xấu nhất (mục 2). |
| `src/main/webapp/doAddRentalBill.jsp` | Khi `addRentalBill` trả `false`: đọc lại giỏ bằng `CartDAO.getCart(client)`. Có dòng phiếu không còn là dòng tự do thì ghi `cart` = giỏ mới, bỏ `rentalBill`, `message = Messages.SELECTED_BOOKS_CHANGED`, forward `/SearchBookView.jsp`. Ngược lại vẫn `NOT_ENOUGH_COPIES` về ConfirmRentalBillView. Bỏ bước kiểm trước của 6C (so dòng phiếu với `cart` của session) vì giờ DAO kiểm trong transaction, cùng tab cũng đi đường này nên ra đúng câu C21 thay cho `NOT_ENOUGH_COPIES`. |
| `src/main/webapp/SearchBookView.jsp` | Theo tin nhắn orchestrator: bọc khối nút `btnCreateRentalBill` bằng `<div id="createRentalBillFallback" data-island-fallback="SelectedStack">`. Khi island gắn thì khối này bị ẩn, nút vẫn nằm trong form. Bọc **ngoài** div `mt-6 flex` vì `hidden` đặt lên phần tử có lớp `flex` có thể bị `display:flex` đè. id và name của nút giữ nguyên. Cây này giống fixture `SelectedStack.test.tsx` (`<div id="create" data-island-fallback>`). |

**Forward hay 302 về SearchBookView:** chọn forward, giống 6C ở `doDeleteSelectedBook.jsp` (doXxx kết thúc bằng forward kèm `message`, phase-06 §3). Dùng 302 thì mất câu báo. SearchBookView nhận forward (dispatcher FORWARD) chỉ hiển thị. Thấy `rentalBill` vắng thì nó tạo phiếu mới gắn client, `cart` mới thì hiện đúng giỏ trong DB. F5 sau đó gửi lại POST tới doAddRentalBill: `rentalBill` mới chưa có dòng nên được 302 về SearchBookView, không tạo phiếu. Câu báo hiện kiểu `error` (mọi câu khác `BOOK_NOT_FOUND` của trang đều vậy).

## 2. Thứ tự khoá và lí do không deadlock

Thứ tự chung: **`tblBook` (id tăng dần) → `tblSelectedBook` (id tăng dần) → ghi `tblRentalBill`/`tblRentedBook`**.

- **`addRentalBill` với `addRentalBill`** (ca b): cùng giỏ thì cùng quyển nên gặp nhau ngay ở `tblBook`, chạy lần lượt. Bên sau lấy được khoá dòng giỏ khi bên trước đã commit. Câu đếm là một câu đọc mới chạy sau khi đã có khoá, dưới READ COMMITTED nó thấy `tblRentedBook` bên trước vừa ghi, nên trả `false`. Câu đếm tách khỏi câu khoá có chủ đích: truy vấn con nằm trong câu `FOR UPDATE` không bị khoá và đọc theo ảnh chụp lúc câu lệnh bắt đầu, tức trước lúc chờ khoá, nên gộp một câu thì vẫn lọt ca (b).
- **`addRentalBill` với `updateCart`** (ca a): trước thay đổi, `updateCart` đọc dòng tự do mà không khoá, rồi `DELETE` từng dòng theo thứ tự `HashMap` (không tăng dần). Có hai hỏng:
  1. **Đảo thứ tự:** `addRentalBill` giữ L1, chờ L2; `updateCart` đã xoá L2, chờ L1. Đó là vòng chờ, MySQL 1213, một bên 500. Trước thay đổi cũng có, qua khoá S của khoá ngoại khi INSERT `tblRentedBook`.
  2. **Thứ tự xấu ngược chiều:** `updateCart` đọc thấy L tự do, rồi `addRentalBill` khoá L và ghi dòng phiếu trỏ L, rồi `updateCart` chờ L, `addRentalBill` commit, `DELETE` L chạy tiếp và vỡ khoá ngoại 1451. Kết quả là 500 ở thiết bị xoá. Lỗi này có từ trước; 6C chặn được trong một session nhưng hai thiết bị thì không.

  Sửa: `updateCart` khoá **mọi dòng của chính giỏ theo id tăng dần trước khi đọc dòng tự do** và không khoá `tblBook`. Hai bên chỉ tranh nhau `tblSelectedBook` và cùng đi theo chiều tăng, nên bên nào lấy được dòng chung nhỏ nhất trước thì chạy hết trước, không có vòng. Sau khi có khoá, `updateCart` mới đọc dòng tự do, nên dòng vừa thuộc phiếu không còn tự do, không bị xoá, không vỡ khoá ngoại. Sau khoá, `updateCart` chỉ đụng các dòng `tblRentedBook` của phiếu **đã huỷ** (DETACH); trạng thái huỷ là cuối, D9 trả `false` ngay nên không ai giữ lâu các dòng đó. INSERT dòng giỏ chỉ lấy khoá S trên `tblBookCopy` và `tblCart`, không đụng `tblBook`.
- **`updateRentalBill`** (D9): khoá dòng phiếu đã có, rồi `tblBook` khi có dòng mới. Dòng thêm tại quầy không trỏ dòng giỏ nên `lockFreeLines` trả `true` mà không khoá gì. Nó không đụng phiếu mới (chưa commit) của `addRentalBill`, nên không có vòng.
- `addRentalBill` vẫn INSERT `tblRentalBill` trước K1 như cũ. Đó là khoá X trên dòng phiếu mới của chính nó, không ai khác chờ.

**Cần orchestrator quyết:** bước khoá dòng giỏ trong `updateCart` mâu thuẫn câu chữ "`updateCart` không khoá" ở `docs/contracts.md` §6.1 và `.claude/rules/tiem-dao-rules.md`. Ý gốc của câu đó là không khoá quyển (K1); lane không sửa hai file này. Đề xuất ghi lại thành: "`updateCart` không khoá quyển hay đầu truyện; khoá dòng của chính giỏ theo id tăng dần trước khi đọc dòng tự do (C21)". Nếu không duyệt thì chỉ cần bỏ 4 dòng khoá trong `CartDAO.saveLines` (và test `updateCartWaitsForAnInFlightBillAndKeepsItsLine` sẽ đỏ, đúng như mong đợi). Khi đó vẫn còn hỏng (1) và (2) ở trên.

## 3. Test

`RentalBillCartLineTest` (mỗi test `@Timeout(60)`; ca song song mỗi luồng một kết nối, qua `CyclicBarrier` như `RentalBillConcurrencyTest`):

| Test | Ca | Khẳng định |
|---|---|---|
| `cartLineDeletedBeforeConfirmMakesAddReturnFalse` | (a) tuần tự | Thiết bị B xoá dòng DT001-01 rồi A xác nhận với phiếu cũ: `false`, `id = 0`, 0 phiếu, 0 dòng phiếu, giỏ còn 1 dòng |
| `deletingACartLineWhileConfirmingNeverFails` ×15 | (a) song song | Không bên nào ném lỗi; hoặc phiếu lưu và dòng ở lại (2 dòng giỏ), hoặc `false` và dòng bị xoá (1 dòng giỏ); `updateCart` luôn `true` |
| `confirmingTheSameCartLinesTwiceCreatesOneBill` | (b) tuần tự | Lần 1 `true`, lần 2 `false`, đúng 1 phiếu, 2 dòng phiếu, giỏ không còn dòng tự do |
| `twoDevicesConfirmingTheSameCartLinesAtOnceCreateExactlyOneBill` ×15 | (b) song song | Đúng một `true`, 1 phiếu, 2 dòng phiếu, `COUNT(DISTINCT selectedBookId) = 2` |
| `cartLineOfAnotherClientIsRejected` | sửa session | Dòng giỏ của LAN trong phiếu của NAM: `false`, 0 phiếu |
| `sameCartLineTwiceInOneBillIsRejected` | sửa session | Hai dòng phiếu cùng một dòng giỏ: `false` |
| `cartLineReleasedByACancelledBillCanBeConfirmedAgain` | chống chặn thừa | Dòng từng thuộc phiếu đã huỷ vẫn lập phiếu mới được |

`CartDAOTest.updateCartWaitsForAnInFlightBillAndKeepsItsLine`: một kết nối tay (READ COMMITTED, autocommit tắt) đóng vai `addRentalBill` đang dở. Nó khoá dòng giỏ, ghi phiếu và dòng phiếu trỏ dòng đó, chưa commit. Một luồng gọi `updateCart` xoá dòng đó. Test chờ tới khi `performance_schema.data_locks` có khoá `WAITING` trong schema test, rồi commit. `updateCart` phải trả `true`, dòng giỏ còn và vẫn được dòng phiếu trỏ tới.

Các test cũ chạy được nguyên trạng: dòng phiếu của `newBill` có `selectedBook == null` nên không qua bước kiểm.

## 4. Làm đỏ có chủ đích (đã chạy theo "lượt của 6G", không commit bản đỏ)

Mỗi biến thể chỉ chạy `-Dtest='RentalBillCartLineTest,CartDAOTest'`, rồi `git checkout --` để khôi phục.

| Biến thể | Kết quả |
|---|---|
| 1. Bỏ lời gọi `CartDAO.lockFreeLines` trong `RentalBillDAO.reserveCopies` | Đỏ 34/41 (18 failure, 16 error). `cartLineDeletedBeforeConfirm…` và `deletingACartLineWhileConfirmingNeverFails` ×15 ra `SQLIntegrityConstraintViolationException` (khoá ngoại `selectedBookId` trỏ dòng đã xoá: đúng lỗi 500 của ca a). `confirmingTheSameCartLinesTwice…`, `cartLineOfAnotherClient…`, `sameCartLineTwice…` báo `expected: <false> but was: <true>`. `twoDevicesConfirming…` ×15 báo `kết quả: [true, true] ==> expected: <1> but was: <2>` (ca b). CartDAOTest 6/6 xanh |
| 2. Bỏ khối `LOCK_LINES` trong `CartDAO.saveLines` | Đỏ 1/41: `CartDAOTest.updateCartWaitsForAnInFlightBillAndKeepsItsLine` ra `SQLIntegrityConstraintViolationException: Cannot delete or update a parent row … fk_tblRentedBook_selectedBook` (1451, đúng như dự đoán). Ca song song (a) ×15 vẫn xanh: thứ tự xấu này hẹp, chỉ test tất định bắt được |
| Khôi phục, chạy năm lớp liên quan | `BUILD SUCCESS`, `Tests run: 120, Failures: 0, Errors: 0, Skipped: 0`, Checkstyle sạch |

## 5. Kết quả lệnh

| Lệnh | Kết quả |
|---|---|
| `node scripts/dev/mvnw.mjs -B -DskipTests verify` | `BUILD SUCCESS`, Checkstyle 0 vi phạm (lần đầu có 2 vi phạm FileLength và 2 LineLength, đã sửa) |
| Lần 1: `node scripts/dev/mvnw.mjs -B verify -Dtest='RentalBillDAOTest,RentalBillConcurrencyTest,RentalBillCartLineTest,CartDAOTest,ArchitectureTest' -Dsurefire.failIfNoSpecifiedTests=false` | `ArchitectureTest` 10/10 xanh (không cần Docker). Bốn lớp DAO lỗi `initializationError`: `IllegalStateException: Could not find a valid Docker environment` (`docker version` lúc đó trả `500 Internal Server Error … dockerDesktopLinuxEngine/v1.55/version`) |
| Lần 2, cùng lệnh, sau khi Docker sống lại (server 29.6.2) | `BUILD SUCCESS`, 6:09 phút. `Tests run: 120, Failures: 0, Errors: 0, Skipped: 0`: ArchitectureTest 10, CartDAOTest 6 (346 giây, phần lớn là khởi động container dùng chung), RentalBillCartLineTest 35 (5 test thường cộng 2 ca lặp ×15), RentalBillConcurrencyTest 63, RentalBillDAOTest 6 |

Chưa chạy: hai biến thể làm đỏ ở mục 4 (chờ "lượt của 6G"); `mvnw verify` đủ (orchestrator chạy sau khi merge); Playwright (lane không dựng stack, theo brief).

## 6. Báo về orchestrator

- Không nhắn được "verify bắt đầu" / "verify xong": lane không có kênh nhắn giữa chừng, chỉ có báo cáo cuối. Lane chạy lệnh test lớp liên quan hai lần. Lần 1 khoảng 41 giây, hỏng ngay ở bước tìm Docker nên không tạo container. Lần 2 xong lúc 11:45 (container mysql:8.4.13 mà orchestrator thấy là của lần này). Sau đó không chạy thêm lượt nào.
- Duyệt hoặc bỏ bước khoá dòng giỏ trong `updateCart` (mục 2), rồi sửa câu chữ §6.1 và `tiem-dao-rules.md` nếu duyệt.
- Smoke `scripts/smoke/flow-m1-m2.mjs` không phụ thuộc nhánh đã bỏ ở doAddRentalBill (tìm theo `btnCreateRentalBill` và id, không theo câu báo cũ). Bảng phase-06 §6.1 dòng "Hai tab…" nên ghi kết quả mới: `SELECTED_BOOKS_CHANGED` ở SearchBookView, hoặc tạo phiếu đúng.
