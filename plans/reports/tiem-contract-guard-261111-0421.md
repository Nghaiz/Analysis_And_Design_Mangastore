# tiem-contract-guard: báo cáo

- Base: phase/02-bo-cong-cu-ai (d8104fca62a698af6572275fdb250b0860c39b56) · Head: HEAD = dryrun/02-contract-guard (a4d165f75d8eaa2bdbbd24335682d1c2cc1c74c2) · Lúc chạy: 2026-11-11 04:21
- File trong diff: 2 · Thay đổi chưa commit: không
- Kết luận: 2 vi phạm, 2 cảnh báo

## Vi phạm

| # | Vị trí | Luật | Mục hợp đồng | Bằng chứng |
|---|---|---|---|---|
| 1 | `src/main/java/vn/tiemtruyen/dao/BookDAO.java:32` | G1 hàm đọc theo id; G5 hàm DAO ngoài §5.3 | `docs/contracts.md` §5.1, §5.3 | `public Book getBookById(int id) throws SQLException {` |
| 2 | `src/main/resources/db/migration/V1__schema.sql:6` | G3 cột dẫn xuất (`quantity` trong `tblSelectedBook`); G5 cột không có trong bảng §2 của `tblSelectedBook` | `docs/contracts.md` §1, §2 | `  quantity int NOT NULL DEFAULT 1,` |

## Cảnh báo

| # | Vị trí | Luật | Mục hợp đồng | Bằng chứng |
|---|---|---|---|---|
| 1 | `src/main/java/vn/tiemtruyen/dao/BookDAO.java:14` | rule `tiem-dao-rules` (hàm §5.3 đúng nghĩa): `searchBook` không điền `listBookCopy` các quyển đang sẵn sàng (cũng không gán `author`, `publisher`, `category`, `rentalPrice`…) | `docs/contracts.md` §3, §5.3 | `public List<Book> searchBook(String keyword) throws SQLException {` |
| 2 | `src/main/resources/db/migration/V1__schema.sql:2` | rule `tiem-business-contract` (bảng theo §2): `CREATE TABLE` không khai báo engine InnoDB, `utf8mb4`, collation `utf8mb4_0900_ai_ci` | `docs/contracts.md` §2 | `CREATE TABLE tblSelectedBook (` |

## Đã kiểm

G1–G8 trên 55 dòng thêm của 2 file (`src/main/java/vn/tiemtruyen/dao/BookDAO.java`, `src/main/resources/db/migration/V1__schema.sql`), diff `phase/02-bo-cong-cu-ai...HEAD`; rule đã đọc: `tiem-business-contract.md`, `tiem-cook-orchestration.md`, `tiem-dao-rules.md`, `tiem-session-rules.md`, `tiem-ui-theme.md`. Mục hợp đồng đã đọc: §1–§3, §5, §7, §9.1, §10.1, §11, §12.

Ứng viên grep đã đọc lại trong ngữ cảnh và loại: `BookDAO.java:12` (`class BookDAO`, là một trong tám DAO, không phạm G2); `V1__schema.sql:2` (`tblSelectedBook` thuộc 13 bảng, không phạm G5); `BookDAO.java:14` (`searchBook` có ở §5.3, chữ kí đúng). `BookDAO.java:18-19` ghép `%` vào giá trị tham số `setString`, không nối chuỗi SQL. Không có dòng thêm nào trong `Messages.java`, `*.jsp`, `web.xml`, `pom.xml`, `frontend/src/islands/**`, nên G4, G6, G7, G8 và phần session/trang của G5 không có ứng viên.

## Không kiểm được

Không có. Ghi chú ngoài G1–G8 (không tính): ở head không có `vn/tiemtruyen/dao/DAO.java` và `vn/tiemtruyen/model/Book.java` mà `BookDAO` cần; `V1__schema.sql` tạo khoá ngoại tới `tblCart`, `tblBookCopy` chưa được tạo trong cùng migration.
