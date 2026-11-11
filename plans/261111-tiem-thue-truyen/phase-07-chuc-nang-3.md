# Phase 7: Chức năng 3 (M3) và trang quản trị D6

Lane: serial
Depends-on: 6
Effort: L
Owns: `src/main/webapp/nhan-vien/LoginView.jsp`, `src/main/webapp/nhan-vien/StaffHomeView.jsp`, `src/main/webapp/nhan-vien/SearchRentalBillView.jsp`, `src/main/webapp/nhan-vien/ProcessRentalBillView.jsp`, `src/main/webapp/nhan-vien/doUpdateRentalBill.jsp`, `src/main/webapp/nhan-vien/PrintRentalBillView.jsp`, `src/main/webapp/nhan-vien/EditRentedBookListView.jsp`, `src/main/webapp/nhan-vien/AddRentedBookView.jsp`, `src/main/webapp/nhan-vien/doUpdateRentedBookList.jsp`, `src/main/webapp/nhan-vien/AddConditionView.jsp`, `src/main/webapp/nhan-vien/AddDamageView.jsp`, `src/main/webapp/nhan-vien/doAddDamage.jsp`, `src/main/webapp/nhan-vien/AddRentalCollateralView.jsp`, `src/main/webapp/nhan-vien/AddCollateralView.jsp`, `src/main/webapp/nhan-vien/doAddCollateral.jsp`, `src/main/webapp/nhan-vien/quan-tri/**`, `frontend/src/islands/ProcessBillDesk/**`, `frontend/src/islands/CollateralDrawer/**`
Creates: `scripts/accept/phase-07.mjs`, `scripts/smoke/flow-m3.mjs`, `frontend/src/islands/ProcessBillDesk/index.tsx`, `frontend/src/islands/ProcessBillDesk/ProcessBillDesk.test.tsx`, `frontend/src/islands/CollateralDrawer/index.tsx`, `frontend/src/islands/CollateralDrawer/CollateralDrawer.test.tsx`, `src/main/webapp/nhan-vien/quan-tri/ManageBookView.jsp`
AX: AX-04 và AX-05 cho `scripts/smoke/flow-m3.mjs` và `scripts/accept/phase-07.mjs` (exit 1 kèm bước kịch bản ch.2 hỏng, trang, câu chờ và câu nhận); AX-07 không hỏi tương tác
Accept: `node scripts/accept/phase-07.mjs`

## Mục tiêu

Mọi trang M3 của ch.9: đăng nhập nhân viên (D5), trang chính nhân viên, tìm phiếu, xử lí phiếu tại quầy (island `ProcessBillDesk`), chỉnh danh sách truyện, thêm tình trạng và loại lỗi, thêm khoản cọc và loại tài sản (island `CollateralDrawer`), xác nhận với đủ bốn điều kiện, in phiếu A5. Huỷ phiếu từ quầy dùng lại `doCancelRentalBill.jsp` của phase 6 (Deferred #13, không sửa file đó). Cộng trang quản trị đơn giản thêm đầu truyện và quyển truyện cho Staff có `position = "Quản lí"` (D6, ngoài báo cáo).

Hợp đồng: `docs/contracts.md` (trang, field, session, DAO, props `ProcessBillDesk` và `CollateralDrawer`, bốn điều kiện xác nhận, D9, Deferred #11, #14). Kịch bản: ch.2 mục 2.3 (trang in 11–19). Chi tiết trang: ch.9 mục 9.3 (trang in 71–86; số trang PDF = trang in + 2). Màn hình: `images/svg/ui_m3_*.svg`.

## Các bước

- [x] **7.0 Orchestrator, tuần tự (test trước):** (xong 11/11/2026, 7debd3f; `web.xml` không cần đổi: chuỗi filter và trang lỗi của phase 6 a96abb6 đã đủ; smoke dùng lại `scripts/smoke/lib/http.mjs` của phase 6. Chạy song song phase 6 nên 7A, 7B, 7C mở trước 7.0 khi hợp đồng đã đủ) `scripts/smoke/flow-m3.mjs` (HTTP thuần với cookie jar, chạy sau phần M2 của smoke phase 6 để có PM0125: đăng nhập nhân viên sai rồi đúng, tìm "PM0152" không thấy rồi tìm theo CCCD, xử lí PM0125: thêm tình trạng "Rách bìa" và "Vết bẩn, viết vẽ" cho DT001-03, "Truyện còn mới, không có lỗi" cho DT020-02, thêm cọc "Căn cước công dân" và "Tiền mặt 100.000đ", xác nhận ra trạng thái "Đang cho thuê", trang in; mọi câu khớp từng chữ; thử từng điều kiện xác nhận bị vi phạm; trang quản trị chặn nhân viên không phải "Quản lí"); sửa `web.xml` nếu cần; `scripts/accept/phase-07.mjs`. Commit; smoke đỏ lúc này là đúng.
- [ ] **7.1 Lane 7A `quay-xu-li`**, **7.2 Lane 7B `tinh-trang-coc`**, **7.3 Lane 7C `islands-m3`** song song (3 chỗ).
- [x] **7.4 Lane 7D `quan-tri`** xếp hàng, mở khi có chỗ trống. (mở 11/11/2026 sau khi 7C xong)
- [ ] **7.5 Orchestrator:** merge 7A, 7B, 7C; chạy nền compose e2e; mở **7.6 Lane 7E `xac-minh-m3`**.
- [ ] **7.7 Orchestrator:** merge 7D; mở **7.8 Lane 7F `xac-minh-quan-tri`**.
- [ ] **7.9 Orchestrator:** `tiem-contract-guard` trên diff của phase; chạy Accept, đánh dấu, push nhánh phase, mở PR vào `main` và merge bằng merge commit (`contract.md` §9).

## Lane trong phase

Tối đa 3 agent cùng lúc: 7A, 7B, 7C → 7D vào chỗ trống đầu tiên → 7E, 7F khi phần chúng kiểm đã merge.

| Lane | Việc | Agent | Owns (không chồng nhau) | Phụ thuộc |
|---|---|---|---|---|
| 7A `quay-xu-li` | `nhan-vien/LoginView.jsp` (gọi `StaffDAO.checkLogin`), `StaffHomeView.jsp` (họ tên, chức vụ, nút "Xử lí phiếu mượn"; thêm nút quản trị khi là "Quản lí"), `SearchRentalBillView.jsp` (tìm theo mã PM, tên khách hoặc CCCD; chọn dòng kiểm trạng thái, hai câu D9), `ProcessRentalBillView.jsp` (khung phiếu, các quyển tích sẵn "Nhận", tự gửi về chính nó khi bỏ tích hoặc nhập giảm giá để tính lại tổng, chỗ gắn `ProcessBillDesk`, nút "Xác nhận và in phiếu mượn", "Huỷ phiếu mượn" gửi tới `/doCancelRentalBill.jsp`), `doUpdateRentalBill.jsp` (bốn điều kiện theo thứ tự ch.9, gán nhân viên xử lí, trạng thái "Đang cho thuê", D9), `PrintRentalBillView.jsp` (dùng `print.css` của phase 5, khổ A5, gộp quyển cùng đầu truyện thành một dòng, nút "In phiếu" rồi về `StaffHomeView`) | `t1k-web-core-developer` | 6 trang đầu ở dòng Owns | 7.0 |
| 7B `tinh-trang-coc` | `EditRentedBookListView.jsp`, `AddRentedBookView.jsp`, `doUpdateRentedBookList.jsp` (quyển thêm mới đi qua K1 trong `updateRentalBill`; câu "Không còn đủ quyển truyện…" khi thiếu), `AddConditionView.jsp` (tìm loại lỗi, bảng "Các lỗi đã ghi nhận", ghi chú tình trạng; hiển thị "Không có lỗi" khi không chọn lỗi; câu "Lỗi này đã được ghi nhận cho quyển truyện."), `AddDamageView.jsp`, `doAddDamage.jsp` (hai câu "Vui lòng nhập tên lỗi.", "Loại lỗi đã tồn tại."), `AddRentalCollateralView.jsp` (chỗ gắn `CollateralDrawer`, câu "Vui lòng nhập giá trị cho tất cả các khoản cọc."), `AddCollateralView.jsp`, `doAddCollateral.jsp` | `t1k-web-core-developer` | 9 trang tiếp theo ở dòng Owns | 7.0 |
| 7C `islands-m3` | `ProcessBillDesk` (bàn quầy, cuốn sổ, ô "Nhận", tem tình trạng dán lên dòng, hiện tổng tạm ngay khi tích hoặc nhập giảm giá nhưng vẫn gửi về trang để session đổi), `CollateralDrawer` (ngăn kéo đồ cọc, nhập giá trị và ghi chú từng dòng, xoá dòng); cả hai chỉ đổi input thật trong form của trang rồi `requestSubmit`; test Vitest (không `fetch`, đúng tên field, giảm chuyển động) | `t1k-web-core-developer` | `frontend/src/islands/ProcessBillDesk/**`, `frontend/src/islands/CollateralDrawer/**` | 7.0 |
| 7D `quan-tri` | `nhan-vien/quan-tri/ManageBookView.jsp` (tìm qua `BookDAO.searchBook`), `AddBookView.jsp`, `doAddBook.jsp` (`BookDAO.addBook`), `EditBookView.jsp` (thêm quyển, barcode theo D8), `doUpdateBook.jsp` (`BookDAO.updateBook`); ghi rõ trên trang là phần ngoài báo cáo | `t1k-web-core-developer` | `src/main/webapp/nhan-vien/quan-tri/**` | 7.0 |
| 7E `xac-minh-m3` | Playwright MCP đi kịch bản ch.2 mục 2.3 và mọi ngoại lệ (bước 2 đăng nhập sai, bước 6 nhầm mã PM0152, các ngoại lệ còn lại của mục 2.3), thử từng điều kiện xác nhận, khi tắt JS bản HTML vẫn xử lí được; xem trước bản in A5 (giả lập media print); khổ 390×844 và 1440×900; ảnh vào `plans/reports/screens/phase-07/m3/` | `t1k-web-testing-tester` | chỉ ghi `plans/reports/` | 7A, 7B, 7C đã merge |
| 7F `xac-minh-quan-tri` | Playwright MCP: thêm đầu truyện, thêm quyển, nhân viên thường bị chặn; ảnh vào `plans/reports/screens/phase-07/quan-tri/` | `t1k-web-testing-tester` | chỉ ghi `plans/reports/` | 7D đã merge |

Mọi spawn: `model: "opus"`, `effort` = giá trị `CLAUDE_EFFORT`, chạy nền; agent con không spawn agent. Không sửa file của phase 6 (`doCancelRentalBill.jsp`, filter, tag); cần đổi thì báo orchestrator. Trang dùng tag của phase 5. Mọi form gửi tới `doXxx.jsp` có `<t:csrf/>`.

## Tiêu chí hoàn thành

1. `mvnw -B verify` và test frontend xanh, có test của hai island.
2. `scripts/smoke/flow-m3.mjs` xanh trên compose e2e (sau smoke M1–M2): đủ kịch bản 2.3, PM0125 chuyển "Đang cho thuê" với nhân viên Nguyễn Thu Hà, tình trạng "Rách bìa, Vết bẩn, viết vẽ" và "Không có lỗi", hai khoản cọc, tổng 42.000đ; mỗi điều kiện xác nhận bị vi phạm cho đúng câu; câu D9 đúng khi phiếu đã huỷ hoặc đã giao; trang quản trị chặn nhân viên không phải "Quản lí".
3. Báo cáo 7E, 7F: console sạch, không request hỏng, có ảnh hai khổ cho mỗi trang, bản in vừa một trang A5.
4. `tiem-contract-guard` không báo vi phạm còn mở.
5. Accept phase 6 vẫn xanh (smoke M1–M2 chạy lại).

## Lệnh kiểm

Accept (một lệnh): `node scripts/accept/phase-07.mjs` chạy tiêu chí 1, 2, 5. Tiêu chí 3–4 ghi trong báo cáo. Bước làm đỏ có chủ đích: tạm bỏ điều kiện "đã có khoản cọc" khỏi `doUpdateRentalBill.jsp` thì smoke phải FAIL.

## Playwright MCP

Áp dụng: sau mỗi chức năng (7E cho M3, 7F cho quản trị).

## Rủi ro

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Sót một trong bốn điều kiện xác nhận | medium | high | Smoke thử từng điều kiện; bản đủ ở `docs/contracts.md` |
| Khách huỷ đúng lúc nhân viên xử lí | medium | medium | D9 trong `updateRentalBill` (đã test ở phase 3); smoke thử hai trường hợp |
| Bản in A5 tràn trang khi nhiều quyển | medium | low | Gộp quyển theo đầu truyện như ch.9, `print.css` giảm cỡ chữ theo số dòng; 7E chụp bản in |
| Trang quản trị bị lẫn vào luồng của báo cáo | low | medium | Thư mục riêng `quan-tri/`, chỉ "Quản lí", ghi rõ ngoài báo cáo |
| Session của nhân viên giữ danh sách cũ | medium | medium | Trang bỏ danh sách cũ khỏi session theo D9 và đọc lại bằng hàm danh sách |

## Rollback

`git revert -m 1 <merge phase 7>`; schema và dữ liệu không đổi.

## Ước lượng

Effort L: khoảng 10–14 giờ agent (ESTIMATED: 7A khoảng 4 giờ; 7B khoảng 4 giờ; 7C khoảng 3 giờ; 7D khoảng 2 giờ xếp hàng sau; hai lần kiểm MCP khoảng 2 giờ; tích hợp khoảng 1 giờ).
