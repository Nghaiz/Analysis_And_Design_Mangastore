# Tiệm truyện: hợp đồng nghiệp vụ (luôn nạp)

Rule của dự án, không phải của kit (không sync-back). SSOT là `docs/contracts.md`; rule này chỉ trỏ số mục, không chép bảng. Brief §3 thầy đã duyệt: muốn đổi chỗ nào thì nói thẳng là đề xuất đổi thiết kế và hỏi chủ dự án, không gói thành "tối ưu".

## Rule

- **13 thực thể**, không thêm, không bớt: `docs/contracts.md` §1 (quan hệ), §2 (bảng MySQL), §3 (lớp model).
- **Trạng thái phiếu** chỉ ba giá trị `Chờ nhận` · `Đang cho thuê` · `Đã huỷ` (đúng từng kí tự, NFC), là hằng số trong `model`, không gõ lại ở trang (§4). Quyển không có cột trạng thái: quyển bận khi có `tblRentedBook` của phiếu chưa huỷ trỏ vào (§1).
- **Không lưu thuộc tính dẫn xuất**: không cột hay field số lượng, tổng tiền, trạng thái quyển (`quantity`, `total`, `availableCount`, `copyStatus`); tính lúc hiển thị (§2, §3, §13). `tblRentedBook.rentalPrice` là giá chốt, không phải dẫn xuất.
- **28 thông báo nguyên văn** (§10.1) cộng **8 câu ngoài báo cáo** chủ dự án duyệt 11/11/2026 (§10.3) là hằng của `vn.tiemtruyen.util.Messages`: không viết lại, không thêm câu khi chủ dự án chưa duyệt. Bốn điều kiện xác nhận phiếu: §10.2.
- Nguồn không trả lời thì theo §14 (C1–C13, đã chốt); không tự đặt luật nghiệp vụ mới. Thấy thiếu hay mâu thuẫn: dừng, báo orchestrator. Chỉ orchestrator sửa `docs/contracts.md` (`plans/261111-tiem-thue-truyen/contract.md` §8).
- Danh sách cấm đầy đủ: `AGENTS.md` §10.

## Đọc rule theo đường dẫn trước khi viết

Ba rule dưới có `paths:`, chỉ tự nạp sau khi phiên **đọc** một file khớp; viết file mới khi chưa đọc file nào khớp thì chúng không nạp. Nên trước khi viết, tự đọc:

- Java (`dao`, `model`, test DAO), migration, JSP gọi DAO: `.claude/rules/tiem-dao-rules.md`.
- JSP, filter, session: `.claude/rules/tiem-session-rules.md`.
- `frontend/**`, giao diện JSP: `.claude/rules/tiem-ui-theme.md`.

Kiểm bằng: `scripts/check/contracts-doc.test.mjs` (phase 2), `MessagesTest`, `SchemaConformanceTest`, `ArchitectureTest` (phase 3), agent `tiem-contract-guard`.
