package vn.tiemtruyen.model;

import java.io.Serial;
import java.io.Serializable;

/**
 * Một quyển truyện ({@code tblBookCopy}) có mã vạch riêng dạng {@code DT001-03} (D8).
 *
 * <p>{@code book} và {@link Book#getListBookCopy()} trỏ vòng: không đưa thẳng vào JSON, dùng DTO.
 */
public class BookCopy implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    private int id;
    private String barcode;
    private Book book;

    /** Đối tượng rỗng; {@code id = 0} nghĩa là chưa lưu. */
    public BookCopy() {
    }

    public int getId() {
        return id;
    }

    public void setId(int id) {
        this.id = id;
    }

    public String getBarcode() {
        return barcode;
    }

    public void setBarcode(String barcode) {
        this.barcode = barcode;
    }

    public Book getBook() {
        return book;
    }

    public void setBook(Book book) {
        this.book = book;
    }
}
