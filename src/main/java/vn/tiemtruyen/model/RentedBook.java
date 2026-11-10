package vn.tiemtruyen.model;

import java.io.Serial;
import java.io.Serializable;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

/**
 * Một dòng phiếu mượn ({@code tblRentedBook}): quyển thực giao, giá chốt và tình trạng khi giao.
 *
 * <p>{@code selectedBook} là {@code null} khi nhân viên thêm quyển tại quầy; {@code conditionNote} là {@code null}
 * khi chưa ghi nhận tình trạng (C7).
 */
public class RentedBook implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    private int id;
    private float rentalPrice;
    private String conditionNote;
    private BookCopy bookCopy;
    private SelectedBook selectedBook;
    @SuppressWarnings("serial") // giá trị luôn là List tuần tự hoá được (ArrayList, List.of)
    private List<RentedDamage> listRentedDamage = new ArrayList<>();

    /** Đối tượng rỗng; {@code id = 0} nghĩa là chưa lưu, danh sách con rỗng. */
    public RentedBook() {
    }

    public int getId() {
        return id;
    }

    public void setId(int id) {
        this.id = id;
    }

    public float getRentalPrice() {
        return rentalPrice;
    }

    public void setRentalPrice(float rentalPrice) {
        this.rentalPrice = rentalPrice;
    }

    public String getConditionNote() {
        return conditionNote;
    }

    public void setConditionNote(String conditionNote) {
        this.conditionNote = conditionNote;
    }

    public BookCopy getBookCopy() {
        return bookCopy;
    }

    public void setBookCopy(BookCopy bookCopy) {
        this.bookCopy = bookCopy;
    }

    public SelectedBook getSelectedBook() {
        return selectedBook;
    }

    public void setSelectedBook(SelectedBook selectedBook) {
        this.selectedBook = selectedBook;
    }

    public List<RentedDamage> getListRentedDamage() {
        return listRentedDamage;
    }

    /** Thay danh sách; không nhận {@code null} (danh sách trống là danh sách rỗng). */
    public void setListRentedDamage(List<RentedDamage> listRentedDamage) {
        this.listRentedDamage = Objects.requireNonNull(listRentedDamage, "listRentedDamage");
    }
}
