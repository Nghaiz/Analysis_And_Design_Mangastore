package vn.tiemtruyen.model;

import java.io.Serial;
import java.io.Serializable;

/**
 * Một dòng giỏ ({@code tblSelectedBook}): một quyển khách đã chọn. Dòng giỏ không giữ quyển.
 */
public class SelectedBook implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    private int id;
    private BookCopy bookCopy;

    /** Đối tượng rỗng; {@code id = 0} nghĩa là chưa lưu. */
    public SelectedBook() {
    }

    public int getId() {
        return id;
    }

    public void setId(int id) {
        this.id = id;
    }

    public BookCopy getBookCopy() {
        return bookCopy;
    }

    public void setBookCopy(BookCopy bookCopy) {
        this.bookCopy = bookCopy;
    }
}
