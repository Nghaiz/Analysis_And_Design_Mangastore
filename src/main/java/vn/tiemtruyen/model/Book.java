package vn.tiemtruyen.model;

import java.io.Serial;
import java.io.Serializable;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

/**
 * Đầu truyện ({@code tblBook}) cùng các quyển của nó.
 *
 * <p>{@code listBookCopy} đọc từ {@code BookDAO.searchBook} chỉ gồm quyển đang sẵn sàng; số lượng hiện có là
 * {@code listBookCopy.size()}, tính lúc hiển thị. {@code publishYear} có thể {@code null}.
 */
public class Book implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    private int id;
    private String name;
    private String author;
    private String publisher;
    private Integer publishYear;
    private String category;
    private String description;
    private float rentalPrice;
    @SuppressWarnings("serial") // giá trị luôn là List tuần tự hoá được (ArrayList, List.of)
    private List<BookCopy> listBookCopy = new ArrayList<>();

    /** Đối tượng rỗng; {@code id = 0} nghĩa là chưa lưu, danh sách con rỗng. */
    public Book() {
    }

    public int getId() {
        return id;
    }

    public void setId(int id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getAuthor() {
        return author;
    }

    public void setAuthor(String author) {
        this.author = author;
    }

    public String getPublisher() {
        return publisher;
    }

    public void setPublisher(String publisher) {
        this.publisher = publisher;
    }

    public Integer getPublishYear() {
        return publishYear;
    }

    public void setPublishYear(Integer publishYear) {
        this.publishYear = publishYear;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public float getRentalPrice() {
        return rentalPrice;
    }

    public void setRentalPrice(float rentalPrice) {
        this.rentalPrice = rentalPrice;
    }

    public List<BookCopy> getListBookCopy() {
        return listBookCopy;
    }

    /** Thay danh sách; không nhận {@code null} (danh sách trống là danh sách rỗng). */
    public void setListBookCopy(List<BookCopy> listBookCopy) {
        this.listBookCopy = Objects.requireNonNull(listBookCopy, "listBookCopy");
    }
}
