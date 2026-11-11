package vn.tiemtruyen.dao;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.IdentityHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import vn.tiemtruyen.model.Book;
import vn.tiemtruyen.model.BookCopy;
import vn.tiemtruyen.model.Cart;
import vn.tiemtruyen.model.Client;
import vn.tiemtruyen.model.RentalBill;
import vn.tiemtruyen.model.SelectedBook;

/**
 * Giỏ truyện (contracts §5.3): đọc giỏ cùng các dòng còn tự do và lưu giỏ qua đối tượng chủ.
 *
 * <p>Dòng giỏ "tự do" là dòng chưa thuộc phiếu mượn nào, trừ phiếu đã huỷ. Dòng đã thuộc phiếu chưa huỷ không
 * hiện trong {@link #getCart(Client)} và {@link #updateCart(Cart)} không bao giờ đụng tới nó. Giỏ không giữ quyển
 * nên không khoá (contracts §6.1).
 */
public class CartDAO extends DAO {

    private static final String CART_OF_CLIENT = "SELECT id FROM tblCart WHERE clientId = ?";
    private static final String NOT_IN_ACTIVE_BILL = " AND NOT EXISTS (SELECT 1 FROM tblRentedBook rb"
            + " JOIN tblRentalBill r ON r.id = rb.rentalBillId WHERE rb.selectedBookId = sb.id AND r.status <> ?)";
    private static final String FREE_LINES = "SELECT sb.id, bc.id AS copyId, bc.barcode, b.id AS bookId, "
            + bookColumns("b")
            + " FROM tblSelectedBook sb JOIN tblBookCopy bc ON bc.id = sb.bookCopyId JOIN tblBook b ON b.id = bc.bookId"
            + " WHERE sb.cartId = ?" + NOT_IN_ACTIVE_BILL + " ORDER BY sb.id";
    private static final String FREE_LINE_COPIES = "SELECT sb.id, sb.bookCopyId FROM tblSelectedBook sb"
            + " WHERE sb.cartId = ?" + NOT_IN_ACTIVE_BILL;
    private static final String DETACH_FROM_CANCELLED = "UPDATE tblRentedBook rb JOIN tblRentalBill r"
            + " ON r.id = rb.rentalBillId SET rb.selectedBookId = NULL WHERE rb.selectedBookId = ? AND r.status = ?";
    private static final String DELETE_LINE = "DELETE FROM tblSelectedBook WHERE id = ? AND cartId = ?";
    private static final String INSERT_LINE = "INSERT INTO tblSelectedBook (cartId, bookCopyId) VALUES (?, ?)";

    /**
     * Mượn kết nối từ pool của ứng dụng.
     *
     * @throws SQLException khi không lấy được kết nối
     */
    public CartDAO() throws SQLException {
        super();
    }

    /**
     * Dùng kết nối có sẵn (test).
     *
     * @param con kết nối đang mở
     */
    protected CartDAO(Connection con) {
        super(con);
    }

    /**
     * Giỏ của khách cùng các dòng tự do, mỗi dòng kèm quyển và đầu truyện; các dòng cùng đầu truyện dùng chung một
     * đối tượng {@link Book}. {@code Book.listBookCopy} không được nạp (số quyển sẵn sàng là việc của
     * {@code BookDAO.searchBook}).
     *
     * @param client khách đã đăng nhập ({@code id > 0})
     * @return giỏ, danh sách rỗng khi giỏ trống
     * @throws SQLException lỗi SQL
     * @throws IllegalStateException khi khách không có giỏ (mọi khách có giỏ từ {@code addClient})
     */
    public Cart getCart(Client client) throws SQLException {
        Objects.requireNonNull(client, "client");
        Cart cart = new Cart();
        cart.setClient(client);
        try (PreparedStatement ps = con().prepareStatement(CART_OF_CLIENT)) {
            ps.setInt(1, client.getId());
            try (ResultSet rs = ps.executeQuery()) {
                if (!rs.next()) {
                    throw new IllegalStateException("Khách " + client.getId() + " không có giỏ");
                }
                cart.setId(rs.getInt(1));
            }
        }
        cart.setListSelectedBook(readFreeLines(cart.getId()));
        return cart;
    }

    /**
     * Lưu giỏ trong một transaction: thêm dòng {@code id = 0}, xoá dòng tự do không còn trong {@code cart}; dòng đã
     * thuộc phiếu chưa huỷ giữ nguyên dù đối tượng có hay không. Dòng tự do từng thuộc phiếu đã huỷ được gỡ liên kết
     * {@code tblRentedBook.selectedBookId} của phiếu huỷ đó trước khi xoá. Id dòng mới được gán sau khi commit.
     *
     * @param cart giỏ đọc bằng {@link #getCart(Client)} rồi sửa
     * @return {@code false} (rollback, đối tượng không đổi) khi một dòng mới trỏ vào quyển đã có trong giỏ
     * @throws SQLException lỗi SQL
     */
    public boolean updateCart(Cart cart) throws SQLException {
        Objects.requireNonNull(cart, "cart");
        Map<SelectedBook, Integer> newIds = new IdentityHashMap<>();
        boolean saved = inWriteTransaction(() -> saveLines(cart, newIds));
        if (saved) {
            newIds.forEach(SelectedBook::setId);
        }
        return saved;
    }

    private boolean saveLines(Cart cart, Map<SelectedBook, Integer> newIds) throws SQLException {
        Map<Integer, Integer> freeLines = readFreeLineCopies(cart.getId());
        Set<Integer> keptLines = new HashSet<>();
        Set<Integer> copies = new HashSet<>();
        for (SelectedBook line : cart.getListSelectedBook()) {
            if (line.getId() > 0 && freeLines.containsKey(line.getId())) {
                keptLines.add(line.getId());
                copies.add(freeLines.get(line.getId()));
            }
        }
        for (SelectedBook line : cart.getListSelectedBook()) {
            if (line.getId() == 0 && !copies.add(line.getBookCopy().getId())) {
                return false;
            }
        }
        for (Integer lineId : freeLines.keySet()) {
            if (!keptLines.contains(lineId)) {
                deleteLine(lineId, cart.getId());
            }
        }
        for (SelectedBook line : cart.getListSelectedBook()) {
            if (line.getId() == 0) {
                newIds.put(line, insertLine(cart.getId(), line.getBookCopy().getId()));
            }
        }
        return true;
    }

    private List<SelectedBook> readFreeLines(int cartId) throws SQLException {
        List<SelectedBook> lines = new ArrayList<>();
        Map<Integer, Book> books = new HashMap<>();
        try (PreparedStatement ps = con().prepareStatement(FREE_LINES)) {
            ps.setInt(1, cartId);
            ps.setString(2, RentalBill.STATUS_CANCELLED);
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    Book book = books.get(rs.getInt("bookId"));
                    if (book == null) {
                        book = readBook(rs, "bookId");
                        books.put(book.getId(), book);
                    }
                    BookCopy copy = new BookCopy();
                    copy.setId(rs.getInt("copyId"));
                    copy.setBarcode(rs.getString("barcode"));
                    copy.setBook(book);
                    SelectedBook line = new SelectedBook();
                    line.setId(rs.getInt("id"));
                    line.setBookCopy(copy);
                    lines.add(line);
                }
            }
        }
        return lines;
    }

    private Map<Integer, Integer> readFreeLineCopies(int cartId) throws SQLException {
        Map<Integer, Integer> lineCopies = new HashMap<>();
        try (PreparedStatement ps = con().prepareStatement(FREE_LINE_COPIES)) {
            ps.setInt(1, cartId);
            ps.setString(2, RentalBill.STATUS_CANCELLED);
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    lineCopies.put(rs.getInt(1), rs.getInt(2));
                }
            }
        }
        return lineCopies;
    }

    private void deleteLine(int lineId, int cartId) throws SQLException {
        try (PreparedStatement detach = con().prepareStatement(DETACH_FROM_CANCELLED);
                PreparedStatement delete = con().prepareStatement(DELETE_LINE)) {
            detach.setInt(1, lineId);
            detach.setString(2, RentalBill.STATUS_CANCELLED);
            detach.executeUpdate();
            delete.setInt(1, lineId);
            delete.setInt(2, cartId);
            delete.executeUpdate();
        }
    }

    private int insertLine(int cartId, int bookCopyId) throws SQLException {
        try (PreparedStatement ps = con().prepareStatement(INSERT_LINE, Statement.RETURN_GENERATED_KEYS)) {
            ps.setInt(1, cartId);
            ps.setInt(2, bookCopyId);
            ps.executeUpdate();
            try (ResultSet keys = ps.getGeneratedKeys()) {
                keys.next();
                return keys.getInt(1);
            }
        }
    }
}
