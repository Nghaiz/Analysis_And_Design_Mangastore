package vn.tiemtruyen.dao;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import vn.tiemtruyen.model.Book;
import vn.tiemtruyen.model.BookCopy;
import vn.tiemtruyen.model.RentalBill;
import vn.tiemtruyen.util.Codes;

/**
 * Đầu truyện và quyển truyện (contracts §5.3). {@code searchBook} của ch.9 tr.70; {@code addBook},
 * {@code updateBook} ngoài báo cáo (D6). Quyển truyện không có DAO riêng: đi qua Book chủ (C12).
 */
public class BookDAO extends DAO {

    /**
     * Mỗi dòng là một đầu truyện khớp từ khoá ghép với một quyển đang sẵn sàng (không có {@code tblRentedBook} của
     * phiếu chưa huỷ trỏ vào, contracts §1); đầu truyện hết quyển ra một dòng với cột quyển NULL.
     */
    private static final String SEARCH = "SELECT b.id, b.name, b.author, b.publisher, b.publishYear, b.category,"
            + " b.description, b.rentalPrice, c.id AS copyId, c.barcode"
            + " FROM tblBook b"
            + " LEFT JOIN tblBookCopy c ON c.bookId = b.id AND NOT EXISTS ("
            + "   SELECT 1 FROM tblRentedBook rb JOIN tblRentalBill r ON r.id = rb.rentalBillId"
            + "   WHERE rb.bookCopyId = c.id AND r.status <> ?)"
            + " WHERE b.name LIKE ? OR b.author LIKE ?"
            + " ORDER BY b.id, c.id";
    private static final String INSERT_BOOK = "INSERT INTO tblBook"
            + " (name, author, publisher, publishYear, category, description, rentalPrice)"
            + " VALUES (?, ?, ?, ?, ?, ?, ?)";
    private static final String UPDATE_BOOK = "UPDATE tblBook SET name = ?, author = ?, publisher = ?,"
            + " publishYear = ?, category = ?, description = ?, rentalPrice = ? WHERE id = ?";
    private static final String COUNT_COPIES = "SELECT COUNT(*) FROM tblBookCopy WHERE bookId = ?";
    private static final String INSERT_COPY = "INSERT INTO tblBookCopy (barcode, bookId) VALUES (?, ?)";

    /**
     * Mượn một kết nối từ pool của ứng dụng.
     *
     * @throws SQLException khi không lấy được kết nối
     */
    public BookDAO() throws SQLException {
        super();
    }

    /**
     * Dùng kết nối có sẵn (test).
     *
     * @param con kết nối đang mở, autocommit bật
     */
    protected BookDAO(Connection con) {
        super(con);
    }

    /**
     * Đầu truyện có tên hoặc tác giả chứa từ khoá (collation {@code ai_ci}), sắp theo id. Mỗi đầu truyện kèm các
     * quyển đang sẵn sàng sắp theo id tăng dần (Deferred #10); đầu truyện hết quyển vẫn có, danh sách rỗng.
     *
     * @param keyword từ khoá (trang không gọi với từ khoá trống, C9)
     * @return danh sách, rỗng khi không có đầu truyện nào khớp
     * @throws SQLException lỗi SQL
     */
    public List<Book> searchBook(String keyword) throws SQLException {
        Objects.requireNonNull(keyword, "keyword");
        String pattern = containsPattern(keyword);
        List<Book> result = new ArrayList<>();
        try (PreparedStatement ps = con().prepareStatement(SEARCH)) {
            int p = 1;
            ps.setString(p++, RentalBill.STATUS_CANCELLED);
            ps.setString(p++, pattern);
            ps.setString(p, pattern);
            try (ResultSet rs = ps.executeQuery()) {
                Book current = null;
                while (rs.next()) {
                    int bookId = rs.getInt("id");
                    if (current == null || current.getId() != bookId) {
                        current = readBook(rs, bookId);
                        result.add(current);
                    }
                    int copyId = rs.getInt("copyId");
                    if (!rs.wasNull()) {
                        current.getListBookCopy().add(newCopy(copyId, rs.getString("barcode"), current));
                    }
                }
            }
        }
        return result;
    }

    /**
     * Lưu đầu truyện mới cùng {@code listBookCopy} trong một transaction. Quyển có mã vạch trống được sinh mã theo
     * D8 từ id đầu truyện và thứ tự của quyển trong danh sách (từ 1). Khi thành công gán id cho Book và từng quyển,
     * mã vạch sinh ra và {@code bookCopy.book}; khi {@code false} đối tượng giữ nguyên.
     *
     * @param book đầu truyện mới ({@code id = 0}), các quyển cũng mới
     * @return {@code false} khi một mã vạch đã tồn tại (không để lại dòng nào)
     * @throws SQLException lỗi SQL khác trùng UNIQUE
     */
    public boolean addBook(Book book) throws SQLException {
        Objects.requireNonNull(book, "book");
        requireUnsaved(book.getId(), "book");
        List<BookCopy> copies = book.getListBookCopy();
        for (BookCopy copy : copies) {
            requireUnsaved(copy.getId(), "bookCopy");
        }
        int[] newBookId = new int[1];
        int[] newCopyIds = new int[copies.size()];
        String[] barcodes = new String[copies.size()];
        boolean saved = inWriteTransaction(() -> {
            try {
                newBookId[0] = insertBook(book);
                insertCopies(newBookId[0], copies, 0, newCopyIds, barcodes);
                return true;
            } catch (SQLException e) {
                return falseOnDuplicate(e);
            }
        });
        if (saved) {
            book.setId(newBookId[0]);
            applyCopies(book, copies, newCopyIds, barcodes);
        }
        return saved;
    }

    /**
     * Sửa các cột của đầu truyện và thêm các quyển mới ({@code id = 0}) trong {@code listBookCopy}, trong một
     * transaction. Không sửa, không xoá quyển đã có (C12: {@code listBookCopy} đọc từ {@code searchBook} chỉ gồm
     * quyển đang sẵn sàng). Mã vạch trống được sinh theo D8, nối tiếp số quyển hiện có của đầu truyện.
     *
     * @param book đầu truyện đã lưu ({@code id > 0})
     * @return {@code false} khi không có đầu truyện mang id đó hoặc một mã vạch mới đã tồn tại
     * @throws SQLException lỗi SQL khác trùng UNIQUE
     */
    public boolean updateBook(Book book) throws SQLException {
        Objects.requireNonNull(book, "book");
        if (book.getId() < 1) {
            throw new IllegalArgumentException("updateBook cần đầu truyện đã lưu, id đang là " + book.getId());
        }
        List<BookCopy> newCopies = new ArrayList<>();
        for (BookCopy copy : book.getListBookCopy()) {
            if (copy.getId() == 0) {
                newCopies.add(copy);
            }
        }
        int[] newCopyIds = new int[newCopies.size()];
        String[] barcodes = new String[newCopies.size()];
        boolean saved = inWriteTransaction(() -> {
            try {
                // UPDATE khoá dòng tblBook trước khi đếm quyển: hai updateBook cùng đầu truyện không sinh trùng số.
                if (!updateBookRow(book)) {
                    return false;
                }
                insertCopies(book.getId(), newCopies, countCopies(book.getId()), newCopyIds, barcodes);
                return true;
            } catch (SQLException e) {
                return falseOnDuplicate(e);
            }
        });
        if (saved) {
            applyCopies(book, newCopies, newCopyIds, barcodes);
        }
        return saved;
    }

    /** Trùng UNIQUE (mã 1062) thành {@code false}; lỗi khác ném lại (contracts §5.2). */
    private static boolean falseOnDuplicate(SQLException e) throws SQLException {
        if (isDuplicateEntry(e)) {
            return false;
        }
        throw e;
    }

    private int insertBook(Book book) throws SQLException {
        try (PreparedStatement ps = con().prepareStatement(INSERT_BOOK, Statement.RETURN_GENERATED_KEYS)) {
            setBookColumns(ps, book);
            ps.executeUpdate();
            return generatedId(ps, "tblBook");
        }
    }

    private boolean updateBookRow(Book book) throws SQLException {
        try (PreparedStatement ps = con().prepareStatement(UPDATE_BOOK)) {
            int next = setBookColumns(ps, book);
            ps.setInt(next, book.getId());
            return ps.executeUpdate() == 1;
        }
    }

    /** Đặt bảy cột của Book theo thứ tự trong INSERT/UPDATE; trả chỉ số tham số kế tiếp. */
    private static int setBookColumns(PreparedStatement ps, Book book) throws SQLException {
        int p = 1;
        ps.setString(p++, book.getName());
        ps.setString(p++, book.getAuthor());
        ps.setString(p++, book.getPublisher());
        ps.setObject(p++, book.getPublishYear());
        ps.setString(p++, book.getCategory());
        ps.setString(p++, book.getDescription());
        ps.setFloat(p++, book.getRentalPrice());
        return p;
    }

    private int countCopies(int bookId) throws SQLException {
        try (PreparedStatement ps = con().prepareStatement(COUNT_COPIES)) {
            ps.setInt(1, bookId);
            try (ResultSet rs = ps.executeQuery()) {
                rs.next();
                return rs.getInt(1);
            }
        }
    }

    /**
     * Chèn các quyển; quyển thứ {@code i} (từ 0) có mã vạch trống nhận số {@code existing + i + 1}. Ghi id và mã vạch
     * dùng vào hai mảng, chưa đụng đối tượng (gán sau commit).
     */
    private void insertCopies(int bookId, List<BookCopy> copies, int existing, int[] ids, String[] barcodes)
            throws SQLException {
        try (PreparedStatement ps = con().prepareStatement(INSERT_COPY, Statement.RETURN_GENERATED_KEYS)) {
            for (int i = 0; i < copies.size(); i++) {
                String barcode = copies.get(i).getBarcode();
                if (barcode == null || barcode.isBlank()) {
                    barcode = Codes.barcode(bookId, existing + i + 1);
                }
                ps.setString(1, barcode);
                ps.setInt(2, bookId);
                ps.executeUpdate();
                ids[i] = generatedId(ps, "tblBookCopy");
                barcodes[i] = barcode;
            }
        }
    }

    private static void applyCopies(Book book, List<BookCopy> copies, int[] ids, String[] barcodes) {
        for (int i = 0; i < copies.size(); i++) {
            BookCopy copy = copies.get(i);
            copy.setId(ids[i]);
            copy.setBarcode(barcodes[i]);
            copy.setBook(book);
        }
    }

    private static int generatedId(PreparedStatement ps, String table) throws SQLException {
        try (ResultSet keys = ps.getGeneratedKeys()) {
            if (!keys.next()) {
                throw new SQLException("INSERT " + table + " không trả id");
            }
            return keys.getInt(1);
        }
    }

    private static Book readBook(ResultSet rs, int bookId) throws SQLException {
        Book book = new Book();
        book.setId(bookId);
        book.setName(rs.getString("name"));
        book.setAuthor(rs.getString("author"));
        book.setPublisher(rs.getString("publisher"));
        book.setPublishYear(rs.getObject("publishYear", Integer.class));
        book.setCategory(rs.getString("category"));
        book.setDescription(rs.getString("description"));
        book.setRentalPrice(rs.getFloat("rentalPrice"));
        return book;
    }

    private static BookCopy newCopy(int id, String barcode, Book book) {
        BookCopy copy = new BookCopy();
        copy.setId(id);
        copy.setBarcode(barcode);
        copy.setBook(book);
        return copy;
    }

    private static void requireUnsaved(int id, String what) {
        if (id != 0) {
            throw new IllegalArgumentException("addBook cần " + what + " chưa lưu (id = 0), đang là " + id);
        }
    }
}
