// Sample data shared by the _demo island and its test. The JSP StyleGuideView must print the
// same strings (phase-05-ui-contract.md §5): bookId 1, "Thám tử lừng danh Conan - Tập 1".
// Messages are verbatim from docs/contracts.md §10.1 (Messages.java).
export const DEMO = {
  bookId: 1,
  bookName: 'Thám tử lừng danh Conan - Tập 1',
  rentalBillId: 125,
  rentalPrice: 3000,
  ticketTitle: 'Phiếu mượn',
  ticketBody: 'Khách: Nguyễn Thu Hà · Ngày mượn 25/09/2026 · Hẹn trả 02/10/2026',
  cardHeading: 'Truyện đã chọn',
  ledgerCaption: 'Danh sách truyện thuê',
  damageText: 'Rách bìa, Vết bẩn, viết vẽ',
  accentSample: 'Đã huỷ · Ố vàng · Nguyễn Thu Hà · Thám tử lừng danh Conan',
  messages: {
    success: 'Đăng kí tài khoản thành công!',
    error: 'Đăng nhập thất bại, vui lòng thử lại.',
    info: 'Không tìm thấy thông tin phù hợp.',
  },
} as const
