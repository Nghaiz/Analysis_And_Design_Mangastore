package vn.tiemtruyen.util;

/**
 * 28 câu thông báo nguyên văn của báo cáo (docs/contracts.md §10.1). Tên hằng và câu đúng từng kí tự với bảng;
 * {@code MessagesTest} đọc bảng lúc chạy và so cả hai chiều. Không sửa, không thêm câu khi chưa có chủ dự án duyệt.
 */
public final class Messages {

    public static final String REGISTER_SUCCESS = "Đăng kí tài khoản thành công!";
    public static final String REGISTER_DUPLICATE =
            "Tên đăng nhập, số CCCD, số điện thoại hoặc email đã được sử dụng, vui lòng kiểm tra lại.";
    public static final String REGISTER_INVALID = "Thông tin không hợp lệ, vui lòng kiểm tra lại.";
    public static final String REGISTER_PASSWORD_MISMATCH = "Mật khẩu nhập lại không khớp, vui lòng nhập lại.";
    public static final String LOGIN_FAILED = "Đăng nhập thất bại, vui lòng thử lại.";
    public static final String BOOK_NOT_FOUND = "Không tìm thấy thông tin phù hợp.";
    /** Chứa chữ {@code N} đúng như báo cáo; trang dùng {@link #quantityExceeded(int)} để thay bằng số. */
    public static final String QUANTITY_EXCEEDED = "Số lượng vượt quá số quyển hiện có (hiện còn N quyển).";
    public static final String EXPECTED_DAYS_INVALID = "Số ngày thuê phải lớn hơn hoặc bằng 1.";
    public static final String PICKUP_TIME_INVALID = "Ngày giờ đến nhận phải sau thời điểm hiện tại.";
    public static final String NOT_ENOUGH_COPIES = "Không còn đủ quyển truyện, vui lòng chọn lại.";
    public static final String RENTAL_BILL_CREATED =
            "Tạo phiếu mượn thành công! Vui lòng đến quầy vào ngày giờ đã hẹn để đặt cọc và nhận truyện.";
    /** Câu hỏi trong hộp xác nhận huỷ (kèm ô "Lí do huỷ"), không phải thông báo kết quả. */
    public static final String CANCEL_CONFIRM = "Bạn có chắc chắn muốn huỷ phiếu mượn này?";
    public static final String CANCEL_SUCCESS = "Huỷ phiếu mượn thành công!";
    public static final String RENTAL_BILL_NOT_FOUND = "Không tìm thấy phiếu mượn phù hợp.";
    public static final String RENTAL_BILL_CANCELLED = "Phiếu mượn đã bị huỷ, không thể xử lí.";
    public static final String RENTAL_BILL_ALREADY_PROCESSED = "Phiếu mượn này đã được xử lí và đã giao truyện.";
    public static final String DUE_DATE_INVALID = "Ngày hẹn trả phải sau ngày mượn.";
    public static final String NO_COPY_RECEIVED = "Chưa chọn quyển truyện nào để giao cho khách hàng.";
    public static final String CONDITION_MISSING =
            "Vui lòng ghi nhận tình trạng cho tất cả các quyển truyện được giao.";
    public static final String COLLATERAL_MISSING = "Phiếu mượn chưa có khoản đặt cọc, vui lòng thêm khoản đặt cọc.";
    public static final String DAMAGE_NOT_FOUND = "Không tìm thấy loại lỗi phù hợp.";
    public static final String DAMAGE_ALREADY_RECORDED = "Lỗi này đã được ghi nhận cho quyển truyện.";
    public static final String DAMAGE_NAME_REQUIRED = "Vui lòng nhập tên lỗi.";
    public static final String DAMAGE_EXISTS = "Loại lỗi đã tồn tại.";
    public static final String COLLATERAL_NOT_FOUND = "Không tìm thấy loại tài sản phù hợp.";
    public static final String COLLATERAL_VALUE_REQUIRED = "Vui lòng nhập giá trị cho tất cả các khoản cọc.";
    public static final String COLLATERAL_NAME_REQUIRED = "Vui lòng nhập tên loại tài sản.";
    public static final String COLLATERAL_EXISTS = "Loại tài sản đã tồn tại.";

    // Ngoài báo cáo: docs/contracts.md §10.3 (chủ dự án duyệt 11/11/2026).
    public static final String DISCOUNT_INVALID = "Giảm giá không hợp lệ, vui lòng nhập lại.";
    public static final String QUANTITY_INVALID = "Số lượng phải là số nguyên lớn hơn hoặc bằng 1.";
    public static final String BOOK_NOT_CHOSEN = "Vui lòng chọn đầu truyện.";
    public static final String INPUT_TOO_LONG = "Nội dung nhập quá dài, vui lòng rút gọn.";
    public static final String RENTAL_BILL_CHANGED = "Phiếu mượn đang mở đã thay đổi, vui lòng chọn lại phiếu.";
    public static final String SESSION_EXPIRED = "Phiên làm việc đã hết hạn, vui lòng đăng nhập lại.";
    public static final String CANCEL_REASON_REQUIRED = "Vui lòng nhập lí do huỷ.";
    public static final String EXPECTED_DAYS_TOO_LONG = "Số ngày thuê tối đa là 30 ngày.";
    public static final String SELECTED_BOOKS_CHANGED = "Truyện đã chọn đã thay đổi, vui lòng kiểm tra lại.";

    /** Đoạn chứa chữ {@code N} duy nhất cần thay trong {@link #QUANTITY_EXCEEDED}. */
    private static final String QUANTITY_PLACEHOLDER = "(hiện còn N quyển)";

    private Messages() {
    }

    /**
     * Câu {@link #QUANTITY_EXCEEDED} với chữ {@code N} trong "(hiện còn N quyển)" thay bằng số quyển, viết bằng
     * chữ số, không đệm (contracts §10.1, ghi chú).
     *
     * @param available số quyển đang sẵn sàng chưa có trong giỏ hoặc trong danh sách đang sửa, không âm
     * @return ví dụ "Số lượng vượt quá số quyển hiện có (hiện còn 4 quyển)."
     * @throws IllegalArgumentException khi {@code available} âm
     */
    public static String quantityExceeded(int available) {
        if (available < 0) {
            throw new IllegalArgumentException("Số quyển hiện còn không được âm: " + available);
        }
        return QUANTITY_EXCEEDED.replace(QUANTITY_PLACEHOLDER, "(hiện còn " + available + " quyển)");
    }
}
