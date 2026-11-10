# Phase 3, lane 3C `dao-cart-bill`: báo cáo

Nhánh `lane/03-schema-dao/dao-cart-bill`, worktree `D:/Coding/mangastore-wt/03-dao-cart-bill`. Đã merge `phase/03-schema-dao` (9c2c8b0, V2 mật khẩu `<username>@123`) trước lần verify cuối. Trạng thái: **DONE_WITH_CONCERNS** (cách đọc đồ thị phiếu bằng JSON của MySQL, mục 3.1; ba đề xuất ở mục 5).

## 1. Kết quả

`./mvnw -B -ntp verify` (JDK 25.0.5) xanh: Checkstyle 0 vi phạm, 207 test, 0 hỏng (74 test mới của lane). `RentalBillConcurrencyTest` chạy thêm hai lần riêng, cả hai xanh (tổng 3 × 63 lượt).

| Test | Số ca | Kiểm |
|---|---|---|
| `CartDAOTest` | 5 | Giỏ trống có id; `updateCart` thêm dòng (id gán sau commit), `getCart` đọc quyển + đầu truyện (dòng cùng đầu truyện chung một `Book`); xoá dòng bị bỏ; dòng mới trùng quyển đã có trong giỏ → `false`, không ghi; dòng thuộc phiếu "Chờ nhận" bị ẩn và không bị xoá, phiếu huỷ thì dòng hiện lại và xoá được |
| `RentalBillDAOTest` | 6 | `addRentalBill` giữ quyển đã chọn khi còn trống, id ≥ 125, "Chờ nhận"; thiếu quyển → `false`, rollback cả dòng đã ghi, đối tượng không đổi; `getRentalBillList` mới nhất trước, đủ đồ thị (dòng → quyển → đầu truyện, lỗi, khoản cọc, nhân viên, ngày, giảm giá); `searchRentalBill` theo C9 (`" pm0125 "`, tên không dấu, CCCD bằng chứ không chứa, `%` được thoát, từ khoá trống); xác nhận bỏ dòng không nhận (xoá cả lỗi của nó) rồi D9 chặn lần ghi sau; huỷ giải phóng quyển |
| `RentalBillConcurrencyTest` | 7 (63 lượt) | 4 ca tranh chấp và 3 ca K1 tuần tự, mục 2 |

## 2. Test tranh chấp

Mỗi luồng mượn một `Connection` riêng từ pool của `TestDatabase` **trước** khi chờ, rồi cùng qua một `CyclicBarrier` nên các transaction bắt đầu cùng lúc. Mỗi lượt có `@Timeout(60)`; barrier và `Future.get` chờ tối đa 30 giây. Dữ liệu được dọn trước mỗi lượt.

| Ca | Lặp | Dựng | Kiểm |
|---|---|---|---|
| (1) Hai luồng tranh quyển cuối | 25 | DT015-01 đã bị giữ; hai khách cùng xin DT015-02 | Đúng 1 `true`; DT015-02 bị giữ đúng 1 lần; bên thua không để lại phiếu |
| (2) N luồng tranh M quyển | 15 | 10 luồng cùng xin DT001-01 (đầu truyện 1 có 7 quyển) | Đúng 7 `true`; 7 dòng, 7 quyển khác nhau; mã vạch trả về không trùng; bên thua `id = 0` |
| (3) Quyển đã chọn bị giữ thì đổi | 10 | Hai luồng cùng xin DT001-01 | Cả hai `true`; quyển thực giao là {DT001-01, DT001-02} |
| (4) Huỷ và xác nhận cùng lúc | 10 | Phiếu "Chờ nhận" 2 quyển; hai bản đọc lại bằng `searchRentalBill("PM"+id)`, một bản huỷ, một bản xác nhận (bỏ 1 quyển, gán nhân viên) | Đúng 1 `true`; DB khớp bên thắng (huỷ: lí do, không nhân viên, 2 dòng; xác nhận: không lí do, nhân viên 1, 1 dòng) |
| K1 tuần tự | 1 mỗi ca | Thêm phiếu xin [DT001-01 bận, DT001-02]; `updateRentalBill` thêm dòng xin quyển bận; thêm dòng khi đầu truyện hết quyển | Đổi sang quyển trống nhỏ nhất chưa có trong phiếu; `false` thì rollback cả dòng đã xoá, `conditionNote`, `note` |

### 2.1 Làm đỏ có chủ đích (tiêu chí 2)

Đổi `") ORDER BY id FOR UPDATE"` thành `") ORDER BY id"` ở bước (1) của K1 trong `RentalBillDAO.reserveCopies`, chạy `./mvnw -B -ntp test -Dtest=RentalBillConcurrencyTest`:

```
Tests run: 63, Failures: 40, Errors: 10
twoThreadsRacingForTheLastCopyExactlyOneWins:81 kết quả: [true, true] ==> expected: <1> but was: <2>     (25/25 lượt)
manyThreadsRacingForFewerCopiesHoldEachCopyOnce:95 kết quả: [true × 10] ==> expected: <7> but was: <10>  (15/15 lượt)
chosenCopyTakenConcurrentlyIsSwappedForAnotherFreeCopy: IllegalArgumentException: duplicate element: DT001-01 (10/10 lượt)
```

Cả ba ca giữ quyển đều đỏ ở mọi lượt, không cần chèn độ trễ: không có khoá thì hai transaction READ COMMITTED cùng đọc thấy quyển trống và cùng ghi. Ca (4) vẫn xanh vì nó do khoá dòng phiếu của D9 giữ, không phải K1. Trả lại `FOR UPDATE` (bản xanh) thì cả 63 lượt xanh. Bản lỗi không được commit.

## 3. Cách làm

### 3.1 `RentalBillDAO`

- **Đọc** (`getRentalBillList`, `searchRentalBill`): một câu SQL dựng cả đồ thị phiếu bằng `JSON_OBJECT`/`JSON_ARRAYAGG` (khoá JSON trùng tên thuộc tính model §3), Jackson 3 (`JsonMapper`, đã có trong `pom.xml` cho `JsonUtil`) gán vào JavaBean. `JSON_ARRAYAGG` không giữ thứ tự nên dòng, lỗi, khoản cọc được sắp theo id sau khi đọc. Ngày giờ ra ISO bằng `DATE_FORMAT`; round-trip `expectedPickupAt` được test so bằng. Không đọc `password` của khách hay nhân viên.
  **Vì sao:** Checkstyle đặt `FileLength max=300` cho mọi file và `ArchitectureTest` (3D) cho phép đúng 9 lớp trong gói `dao`, không lớp lồng; bản ánh xạ `ResultSet` tay dài 469 dòng. Bản JSON 299 dòng. Đây là chỗ cần orchestrator duyệt (mục 5.1).
- **K1** (`reserveCopies`, dùng cho `addRentalBill` và nhánh dòng `id = 0` của `updateRentalBill`): (1) đọc `bookId` của các quyển xin, `SELECT id FROM tblBook WHERE id IN (…) ORDER BY id FOR UPDATE`; (2)–(3) với từng dòng một câu: quyển xin nếu không có dòng của phiếu chưa huỷ nào trỏ vào, ngược lại quyển trống id nhỏ nhất cùng đầu truyện (`ORDER BY c.id = want.id DESC, c.id LIMIT 1`); (4) ghi dòng ngay. Dòng vừa ghi và dòng còn lại của chính phiếu cũng tính là "bận", nên quyển đã có trong phiếu không bị chọn lại; đây là cách thực hiện "trừ chính phiếu này … chưa có trong phiếu" của §6.1.
  Hệ quả nhỏ: chọn theo từng dòng theo thứ tự danh sách, nên khi dòng đầu xin quyển bận và lấy quyển trống nhỏ nhất, quyển đó có thể là quyển dòng sau đã chọn; dòng sau khi ấy được đổi tiếp. Tập quyển thực giao như nhau, chỉ khác dòng nào nhận quyển nào (cùng đầu truyện, cùng giá).
- **`addRentalBill`**: ghi phiếu (`createdAt` = giá trị đối tượng hoặc `CURRENT_TIMESTAMP`), K1, lỗi và khoản cọc nếu đối tượng có. Danh sách quyển rỗng → `IllegalArgumentException`. Luôn ghi "Chờ nhận".
- **`updateRentalBill`**: `SELECT status … FOR UPDATE`, khác "Chờ nhận" → `false` (D9); không có phiếu → `IllegalArgumentException`. Rồi: xoá lỗi của mọi dòng, xoá dòng không còn trong đối tượng, ghi `conditionNote` dòng còn lại (dòng có id không thuộc phiếu → `IllegalStateException`), K1 cho dòng mới, ghi thông tin phiếu (`expectedPickupAt`, `expectedDays`, `borrowDate`, `dueDate`, `discount`, `note`, `status`, `cancelReason`, `staffId`; không đổi `clientId`, `createdAt`), ghi lại lỗi và khoản cọc. Lỗi và khoản cọc được **ghi lại toàn bộ** (xoá rồi chèn) nên id của chúng đổi sau mỗi lần lưu; không bảng nào trỏ vào hai bảng này. `rentalPrice` của dòng cũ không bị ghi đè (giá chốt).
- Mọi thay đổi lên đối tượng truyền vào (id phiếu, id dòng, quyển thực giao, id lỗi và khoản cọc, trạng thái) chạy sau commit; `false` thì đối tượng giữ nguyên (doUpdateRentedBookList cần điều này).
- Thứ tự khoá: `updateRentalBill` khoá dòng phiếu rồi mới khoá đầu truyện tăng dần; `addRentalBill` chỉ khoá đầu truyện. Không có chu trình; 63 lượt không gặp deadlock.

### 3.2 `CartDAO`

- `getCart`: dòng tự do = `NOT EXISTS` dòng phiếu chưa huỷ trỏ vào `selectedBookId`; dòng cùng đầu truyện dùng chung một `Book`; `Book.listBookCopy` để rỗng (số quyển sẵn sàng là việc của `searchBook`). Khách không có giỏ → `IllegalStateException`.
- `updateCart`: một transaction, không khoá. Giữ dòng `id > 0` còn tự do, xoá dòng tự do không còn trong đối tượng, chèn dòng `id = 0`. Dòng đã thuộc phiếu chưa huỷ không bao giờ bị đụng. **`false`** khi một dòng mới trỏ vào quyển đã có trong giỏ (bất biến của §6.2); đây là trường hợp `false` duy nhất, C10 không định nghĩa nên lane chọn.
- Dòng giỏ từng thuộc phiếu **đã huỷ** hiện lại trong giỏ (§5.3). Muốn xoá nó thì phải gỡ `tblRentedBook.selectedBookId` của phiếu huỷ đó (đặt NULL) trước, vì khoá ngoại chặn xoá. Phiếu huỷ mất liên kết tới dòng giỏ gốc, quyển thực giao vẫn còn.

## 4. Quyết định cần orchestrator biết

| Điểm | Lane chọn |
|---|---|
| `searchRentalBill` | `%`, `_`, `\` trong từ khoá được thoát trước `LIKE`; kết quả mới nhất trước |
| `getRentalBillList` | `ORDER BY id DESC` (ch.2 bước 24.1: PM0125, PM0117, PM0110) |
| Danh sách `Client` của phiếu đọc lên | Đối tượng `Client` mới đọc từ DB (không tái dùng đối tượng truyền vào), không có mật khẩu |
| `RentedBook.selectedBook` đọc lên | `id` và `bookCopy` (id, mã vạch) của dòng giỏ gốc |

## 5. Đề xuất cho orchestrator

1. **Duyệt cách đọc JSON trong `RentalBillDAO`** (mục 3.1), hoặc nới luật để viết ánh xạ `ResultSet` thường: (a) cho `FileLength` miễn file DAO, hay nâng lên khoảng 500; hoặc (b) thêm vào `DAO.java` (lane 3A) các helper `protected` dùng chung `prepare(sql, Object...)`, `execute`, `insert` (sinh khoá) và một hàm đọc `Book` từ `ResultSet`. Hiện `CartDAO.readBook` và đoạn `BOOK_JSON` của `RentalBillDAO` lặp lại việc ánh xạ Book mà `BookDAO` (3B) chắc cũng có.
2. **`docs/contracts.md` §6.1**: ghi rõ "dòng còn lại của chính phiếu tính là bận với dòng mới" và thứ tự chọn từng dòng (mục 3.1), và §5.3 `updateCart` trả `false` khi dòng mới trùng quyển đã có trong giỏ (mục 3.2), và việc gỡ `selectedBookId` của phiếu huỷ khi xoá dòng giỏ.
3. **Skill `tiem-add-dao-duplicate-check`** (cây chính, không có trong worktree này): khuôn transaction dùng trường `con` đã cũ, như báo cáo 3A mục 5.4. Nên trỏ tới `inWriteTransaction` và nêu khuôn "đổi đối tượng sau commit" (danh sách `Runnable`) của lane này.

## 6. File của lane

- `src/main/java/vn/tiemtruyen/dao/CartDAO.java`
- `src/main/java/vn/tiemtruyen/dao/RentalBillDAO.java`
- `src/test/java/vn/tiemtruyen/dao/CartDAOTest.java`
- `src/test/java/vn/tiemtruyen/dao/RentalBillDAOTest.java` (giữ helper tĩnh dùng chung cho hai lớp test kia)
- `src/test/java/vn/tiemtruyen/dao/RentalBillConcurrencyTest.java`
- báo cáo này

Không sửa file khác. Không chạy `docker compose`.
