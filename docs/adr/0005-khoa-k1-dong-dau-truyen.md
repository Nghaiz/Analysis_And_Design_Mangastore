# ADR-0005: Khoá K1, khoá dòng đầu truyện khi giữ quyển

<!-- updated 261111 -->

- Trạng thái: Đã chấp nhận (11/11/2026)
- Nguồn: brainstorm §4; [`docs/contracts.md`](../contracts.md) mục 6

## Bối cảnh

`tblBookCopy` không có cột trạng thái: một quyển bận khi có `tblRentedBook` của phiếu chưa huỷ trỏ vào nó. Hai khách có thể lập phiếu cùng lúc cho quyển cuối cùng. Brief đòi kiểm quyển còn trống ngay trong transaction lưu phiếu, có khoá dòng, không tin dữ liệu đã đọc trước. Đây là rủi ro lớn nhất của dự án.

## Quyết định

**K1**: mọi đường tạo `tblRentedBook` (`addRentalBill` và nhánh thêm quyển của `updateRentalBill`), trong một transaction READ COMMITTED:

1. `SELECT id FROM tblBook WHERE id IN (…) ORDER BY id FOR UPDATE` (theo id tăng dần để tránh deadlock).
2. Đọc lại quyển còn trống bằng `NOT EXISTS` trên phiếu chưa huỷ, trừ chính phiếu này.
3. Quyển đã bận thì đổi sang quyển trống khác cùng đầu truyện; không đủ thì rollback, trả `false`.
4. Ghi phiếu và dòng, commit.

Chi tiết từng bước, cách chọn quyển (id nhỏ nhất, Deferred #10) và chặn trạng thái D9: `docs/contracts.md` mục 6.

## Hệ quả

- Hai khách lập phiếu cùng đầu truyện chờ nhau vài mili giây; không đổi schema.
- Huỷ phiếu, bỏ quyển và `updateCart` không cần khoá (chỉ giải phóng hoặc không giữ quyển).
- Bắt buộc test tranh chấp bằng Testcontainers (phase 3): hai luồng tranh quyển cuối, N luồng tranh M quyển, đổi quyển khi bị giữ, huỷ đúng lúc xác nhận.

## Phương án đã loại

| Phương án | Lí do loại |
|---|---|
| K2. Khoá dòng `tblBookCopy` | Khoá nhiều dòng, vẫn phải khoá cả đầu truyện khi đổi quyển: phức tạp hơn mà không lợi |
| K3. `SERIALIZABLE` | Gap lock của InnoDB gây deadlock khó đoán, phải retry |
| K4. Cột sinh `activeCopyId` + UNIQUE | Đổi schema |
