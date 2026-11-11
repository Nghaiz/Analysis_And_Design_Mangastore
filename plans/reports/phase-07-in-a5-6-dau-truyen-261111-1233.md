# Phase 7, lane 7I `in-a5-6`: bản in A5 của phiếu 6 đầu truyện

Trạng thái: **DONE**. Phiếu PM0130 có 6 đầu truyện, 3 khoản cọc và ghi chú 94 kí tự **vừa một trang A5**. Khi giả lập print, `.tt-ticket` cao **660 px** trong vùng in 484 × 718 px, còn dư 58 px. Chrome headless in ra **1 trang** A5 (MediaBox 420 × 595 pt) và nhúng font web thật. Edge case `phase-07-edge-cases.md` §3.3: PASS.

Stack `tiemtruyen-7e`, http://localhost:8087, nhân viên `hant`. Lane chỉ kiểm, không sửa code, không push, không dựng lại stack.

## 1. Dữ liệu chuẩn bị (SQL qua `db`)

- `tblRentalBill` id 130, `Chờ nhận`, khách `khach01` (id 3, Lê Hoàng Nam), `expectedDays` 7, `discount` 0. Ghi chú 94 kí tự: "Khách hẹn lấy buổi chiều sau giờ tan làm, nhờ để riêng sáu quyển này trong túi giấy có ghi tên".
- 6 `tblRentedBook` giá 3000. Mỗi đầu truyện lấy quyển trống có id nhỏ nhất (không có `tblRentedBook` nào của phiếu chưa huỷ trỏ vào). Trong danh mục E2E, 4 đầu truyện có tên dài nhất đều được chọn:

| Mã vạch | Đầu truyện (độ dài tên) |
|---|---|
| DT001-04 | Doraemon - Tập 1 (16) |
| DT002-01 | Doraemon - Tập 2 (16) |
| DT015-01 | Doraemon: Nobita và lâu đài dưới đáy biển (41, dài nhất kho E2E) |
| DT020-01 | Thám tử lừng danh Conan - Tập 1 (31) |
| DT021-01 | Thám tử lừng danh Conan - Tập 2 (31) |
| DT024-01 | Shin - Cậu bé bút chì - Tập 1 (29) |

## 2. Đường đi qua bàn quầy (trình duyệt Playwright MCP, cùng session đăng nhập)

Các bước giống `scripts/smoke/flow-m3.mjs`: LoginView nhân viên → SearchRentalBillView (tìm `PM0130`, chọn dòng) → ProcessRentalBillView → AddConditionView cho từng quyển → AddRentalCollateralView → doUpdateRentalBill → PrintRentalBillView. Lượt ghi tình trạng và lượt thêm cọc gửi form POST thật bằng `fetch` trong trang. Mỗi lượt kèm `csrf` và `rentalBillId` của trang vừa nhận, đúng field và giá trị mà form của trang sẽ gửi. Cả 31 request đều trả 200 và về đúng trang kế tiếp.

- Tình trạng: DT001-04 có **Rách bìa** và **Vết bẩn, viết vẽ**, mỗi lỗi một ghi chú, kèm ghi chú tình trạng "Gáy hơi lỏng". DT002-01 có **Ố vàng**. DT020-01 có **Rách bìa**. DT015-01, DT021-01 và DT024-01 không có lỗi.
- Khoản cọc (3): Căn cước công dân `001203012345`, Tiền mặt `200.000đ`, Thẻ sinh viên `B23DCCN600`.
- Xác nhận: tích "Nhận" cả 6 quyển, giữ nguyên ghi chú, vào thẳng trang in.
- Kiểm DB sau khi xác nhận: PM0130 `Đang cho thuê`, borrowDate 2026-11-11, dueDate 2026-11-18, staffId 1, 6 quyển, 3 khoản cọc, 4 dòng `tblRentedDamage`.
- Trang in hiển thị đủ: mã PM0130, khách, SĐT, CCCD, ngày mượn 11/11/2026, hẹn trả 18/11/2026, "Nhân viên xử lí: Nguyễn Thu Hà", ghi chú đủ 94 kí tự, 6 dòng quyển (mỗi dòng 21.000đ), 3 khoản cọc, "Tổng số quyển thuê: 6", "Giảm giá: 0đ", "Tổng tiền thuê: 126.000đ" (6 × 3.000đ × 7 ngày).

## 3. Đo bản in A5

### 3.1 Giả lập media print (cách của lane 7E, `phase-07-xac-minh-m3-261111-1203.md` §2 L1)

Khung nhìn đặt bằng vùng in 484 × 718 px (A5 trừ lề `@page { size: a5; margin: 10mm; }`, tức 128 × 190 mm). Dùng CSSOM chuyển `@media print` sang `all` (đổi được 1 khối).

| Đo | Giá trị |
|---|---|
| `.tt-ticket` | rộng 484, **cao 660 px** (top 0 → bottom 660), ≤ 718 → **vừa**, dư 58 px |
| `documentElement.scrollHeight` / `scrollWidth` | 718 / 484: không cuộn dọc, không tràn ngang |
| Các khối | răng cưa 16, đầu phiếu 46, thân 566 (thông tin 95, nhãn 16, bảng quyển 264, nhãn 16, bảng cọc 79, tổng 60) |
| Hàng bảng quyển | 62 (DT001-04 có 2 lỗi), 5 hàng × 34. Hàng bảng cọc 3 × 19 |
| Chữ | `.tt-ticket` 12px, `td` 11.33px, `overflow-wrap: normal` (không vỡ chữ giữa từ như L1 cũ) |
| Ngoài phiếu | không còn phần tử hiện nào ngoài `.tt-ticket`; nút "In phiếu" ẩn |

Ước lượng để tham khảo: mỗi quyển thêm khoảng 34 px, nên phần dư 58 px còn chứa thêm khoảng 1 quyển. Phiếu từ 8 quyển trở lên, hoặc 7 quyển mà nhiều quyển có 2 lỗi, sẽ tràn. §3.3 chỉ đòi 6 đầu truyện.

### 3.2 In PDF thật bằng Chrome headless (font web có nạp)

Lấy HTML đã render của trang in, phục vụ cùng origin bằng một proxy node tạm (thư mục scratchpad, chuyển `/static/*` về :8087), nên CSS và font nạp đúng. Lần đo của lane 7E chạy từ `file://` nên không có font web. Lệnh in: `chrome --headless=new --no-pdf-header-footer --print-to-pdf`.

- Kết quả: **1 trang** (`/Count 1`), MediaBox `[0 0 420 594.96]` = A5. PDF có nhúng MomoTrustSans, FuzzyBubbles, MomoSignature và Nunito.
- File: `screens/phase-07/m3/22-print-a5-pm0130-6dt.pdf`.

## 4. Ảnh

Thư mục `plans/reports/screens/phase-07/m3/`:

- `20-print-6dt-1440.png`: trang in ở khổ 1440 × 900, toàn trang.
- `20-print-6dt-390.png`: trang in ở khổ 390 × 844, toàn trang. `scrollWidth` 390 = `clientWidth`, không tràn ngang; phiếu rộng 358.
- `21-print-a5-6dt-gia-lap.png`: ảnh giả lập print 484 × 718.
- `22-print-a5-pm0130-6dt.pdf`: PDF A5 một trang.

## 5. Console và network

- Console của trình duyệt MCP cả phiên (`all: true`, mức warning): **0 error, 0 warning**.
- Network của trang in: 17 request (trang, CSS, JS, 12 font, 2 SVG), tất cả 200.
- Log nginx từ 12:26:45 (lúc phiên này bắt đầu): không có request ≥ 400 nào từ Chrome. Bảy dòng 403/405 lúc 12:24 có UA `node`, là các ca âm cố ý của smoke script chạy trước phiên này, không do lane gây ra.
- Log `app`: không có exception hay SEVERE.

## 6. Quan sát, không chặn

1. **Mã vạch xuống dòng ở dấu gạch** ("DT001-" / "04") trong cột "Mã vạch" khi in A5. Đây là chỗ ngắt dòng hợp lệ, không vỡ chữ giữa từ, vẫn đọc được. Nếu muốn mã liền một dòng thì cho ô mã vạch `white-space: nowrap`, tốn khoảng 10 px chiều ngang. Lane không sửa.
2. **Ghi chú của từng lỗi và ghi chú tình trạng không lên bản in.** Bản in chỉ có tên lỗi ("Rách bìa, Vết bẩn, viết vẽ"); "Gáy hơi lỏng" và các ghi chú lỗi không hiện. Smoke 7E cũng kì vọng như vậy, nên lane không coi là lỗi. Nếu báo cáo ch.9 (PrintRentalBillView) muốn in cả ghi chú thì phải đo lại, vì phiếu sẽ cao thêm.
3. **Một lần bấm không gửi form, chưa tái hiện được.** Lượt đầu trên SearchRentalBillView, `browser_click` vào `#btnSearch` (và một lần nhấn Enter) báo thành công nhưng nginx không ghi POST nào. Lượt đầu bấm `lnkChooseRentalBill` cũng vậy. `form.requestSubmit(button)` thì đi bình thường. Bấm lại lúc 12:32 thì form gửi đúng. Không có JS nào trong `frontend/src` chặn submit ở trang này; theo grep, `preventDefault` chỉ có trong ProcessBillDesk và CollateralDrawer. Có thể do trình duyệt MCP dùng chung cả phiên. Chưa đủ bằng chứng để gọi là lỗi của app. Ghi lại để orchestrator theo dõi nếu E2E phase 8 gặp lại.

## 7. Trạng thái dữ liệu để lại

PM0130 vẫn ở **`Đang cho thuê`**, chưa đặt lại (brief cho phép để nguyên). 6 quyển DT001-04, DT002-01, DT015-01, DT020-01, DT021-01 và DT024-01 đang bận vì PM0130. Lượt sau cần các quyển này trống thì chạy theo thứ tự `DELETE tblRentedDamage` → `tblRentedBook` → `tblRentalCollateral` → `tblRentalBill` với `rentalBillId` / `id` = 130.
