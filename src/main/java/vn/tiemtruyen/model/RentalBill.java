package vn.tiemtruyen.model;

import java.io.Serial;
import java.io.Serializable;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

/**
 * Phiếu mượn ({@code tblRentalBill}) cùng các dòng quyển và khoản cọc.
 *
 * <p>Trạng thái chỉ nhận ba hằng {@link #STATUS_PENDING}, {@link #STATUS_RENTING}, {@link #STATUS_CANCELLED}
 * (contracts §4); trang không gõ lại chuỗi. Tổng tiền, số lượng tính lúc hiển thị, không lưu.
 */
public class RentalBill implements Serializable {

    /** Phiếu khách vừa tạo, chờ đến quầy nhận truyện. */
    public static final String STATUS_PENDING = "Chờ nhận";

    /** Phiếu nhân viên đã xác nhận và giao truyện. */
    public static final String STATUS_RENTING = "Đang cho thuê";

    /** Phiếu đã huỷ; quyển của phiếu được giải phóng. */
    public static final String STATUS_CANCELLED = "Đã huỷ";

    /** Số ngày thuê dự kiến tối đa khách được chọn (docs/contracts.md §14 C15; câu {@code EXPECTED_DAYS_TOO_LONG}). */
    public static final int MAX_EXPECTED_DAYS = 30;

    @Serial
    private static final long serialVersionUID = 1L;

    private int id;
    private LocalDateTime createdAt;
    private LocalDateTime expectedPickupAt;
    private int expectedDays;
    private LocalDate borrowDate;
    private LocalDate dueDate;
    private float discount;
    private String note;
    private String status;
    private String cancelReason;
    private Client client;
    private Staff staff;
    @SuppressWarnings("serial") // giá trị luôn là List tuần tự hoá được (ArrayList, List.of)
    private List<RentedBook> listRentedBook = new ArrayList<>();
    @SuppressWarnings("serial") // giá trị luôn là List tuần tự hoá được (ArrayList, List.of)
    private List<RentalCollateral> listRentalCollateral = new ArrayList<>();

    /** Đối tượng rỗng; {@code id = 0} nghĩa là chưa lưu, danh sách con rỗng. */
    public RentalBill() {
    }

    public int getId() {
        return id;
    }

    public void setId(int id) {
        this.id = id;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getExpectedPickupAt() {
        return expectedPickupAt;
    }

    public void setExpectedPickupAt(LocalDateTime expectedPickupAt) {
        this.expectedPickupAt = expectedPickupAt;
    }

    public int getExpectedDays() {
        return expectedDays;
    }

    public void setExpectedDays(int expectedDays) {
        this.expectedDays = expectedDays;
    }

    public LocalDate getBorrowDate() {
        return borrowDate;
    }

    public void setBorrowDate(LocalDate borrowDate) {
        this.borrowDate = borrowDate;
    }

    public LocalDate getDueDate() {
        return dueDate;
    }

    public void setDueDate(LocalDate dueDate) {
        this.dueDate = dueDate;
    }

    public float getDiscount() {
        return discount;
    }

    public void setDiscount(float discount) {
        this.discount = discount;
    }

    public String getNote() {
        return note;
    }

    public void setNote(String note) {
        this.note = note;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getCancelReason() {
        return cancelReason;
    }

    public void setCancelReason(String cancelReason) {
        this.cancelReason = cancelReason;
    }

    public Client getClient() {
        return client;
    }

    public void setClient(Client client) {
        this.client = client;
    }

    public Staff getStaff() {
        return staff;
    }

    public void setStaff(Staff staff) {
        this.staff = staff;
    }

    public List<RentedBook> getListRentedBook() {
        return listRentedBook;
    }

    /** Thay danh sách; không nhận {@code null} (danh sách trống là danh sách rỗng). */
    public void setListRentedBook(List<RentedBook> listRentedBook) {
        this.listRentedBook = Objects.requireNonNull(listRentedBook, "listRentedBook");
    }

    public List<RentalCollateral> getListRentalCollateral() {
        return listRentalCollateral;
    }

    /** Thay danh sách; không nhận {@code null} (danh sách trống là danh sách rỗng). */
    public void setListRentalCollateral(List<RentalCollateral> listRentalCollateral) {
        this.listRentalCollateral = Objects.requireNonNull(listRentalCollateral, "listRentalCollateral");
    }
}
