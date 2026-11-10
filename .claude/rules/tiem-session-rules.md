---
paths: ["src/main/webapp/**", "src/main/java/vn/tiemtruyen/filter/**", "src/test/java/vn/tiemtruyen/filter/**", "e2e/**"]
---
# Tiệm truyện: luật trang và session

SSOT: `docs/contracts.md` §7 (session), §8 (quy ước trang), §9 (từng trang), §12 (phân quyền). Rule trỏ, không chép bảng.

## Rule

- **Ghi DB chỉ qua `doXxx.jsp`** không giao diện, chỉ nhận POST (GET trả 405, C2). `XxxView.jsp` chỉ gọi hàm DAO đọc và tự gửi về chính nó khi tìm, đăng nhập, sửa bản sao trong session (§8).
- **Đúng 12 thuộc tính session nghiệp vụ** của §7, đúng tên và đúng trang ghi, đọc, bỏ; không thêm thuộc tính nghiệp vụ.
- **Dòng được chọn** (mọi nút trên dòng, kể cả "Xem chi tiết") do **trang chứa danh sách** lưu vào session; trang sau chỉ đọc. Chọn theo id trong danh sách đã có trong session, không đọc DB theo id.
- **Vòng đời `rentalBill`**: tạo khi mở SearchBookView lúc chưa có `cart`; session chỉ giữ `cart` và `rentalBill` trong lúc khách đang chọn; `doAddRentalBill` thành công bỏ cả hai. Phía nhân viên và trường hợp D9: theo §7 và §6.3. Trang đầu mối dọn thuộc tính tạm theo C6.
- **Bản sao** `rentedBook`, `listRentedBook`: sửa trên bản sao, chỉ thay vào `rentalBill` khi "Lưu". Session trong Redis tuần tự hoá từng thuộc tính riêng: sửa `rentalBill` mà danh sách còn hiển thị thì thay cả phần tử cùng id trong `listRentalBill` (§7).
- Không giữ mật khẩu trong session; `client` của doRegister có `id = 0` và không tính là đã đăng nhập (C5).
- **Form**: `method="post"`, có `<t:csrf/>`, `name` và `id` đúng §9 và C1; nút sang `doXxx.jsp` dùng `formaction`; "Quay lại" là `<a href>`. Thông báo đặt vào request attribute `message` rồi forward (C2). Không có JS vẫn gửi được.
- Thư mục trang và quyền vào theo §8, §12 (`nhan-vien/`, `nhan-vien/quan-tri/` chỉ cho "Quản lí", `dev/` luôn mở).

Kiểm bằng: test filter (phase 3), E2E ch.2 (phase 8), Playwright MCP sau mỗi trang, agent `tiem-contract-guard`.
