package vn.tiemtruyen.model;

import java.io.Serial;
import java.io.Serializable;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

/**
 * Giỏ truyện của một khách ({@code tblCart}); mỗi dòng giỏ là một quyển, không có số lượng.
 */
public class Cart implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    private int id;
    private Client client;
    @SuppressWarnings("serial") // giá trị luôn là List tuần tự hoá được (ArrayList, List.of)
    private List<SelectedBook> listSelectedBook = new ArrayList<>();

    /** Đối tượng rỗng; {@code id = 0} nghĩa là chưa lưu, danh sách con rỗng. */
    public Cart() {
    }

    public int getId() {
        return id;
    }

    public void setId(int id) {
        this.id = id;
    }

    public Client getClient() {
        return client;
    }

    public void setClient(Client client) {
        this.client = client;
    }

    public List<SelectedBook> getListSelectedBook() {
        return listSelectedBook;
    }

    /** Thay danh sách; không nhận {@code null} (danh sách trống là danh sách rỗng). */
    public void setListSelectedBook(List<SelectedBook> listSelectedBook) {
        this.listSelectedBook = Objects.requireNonNull(listSelectedBook, "listSelectedBook");
    }
}
