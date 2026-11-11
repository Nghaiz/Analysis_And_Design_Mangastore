package vn.tiemtruyen.dao;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.IdentityHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.OptionalInt;
import java.util.TreeSet;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.json.JsonMapper;
import vn.tiemtruyen.model.BookCopy;
import vn.tiemtruyen.model.Client;
import vn.tiemtruyen.model.RentalBill;
import vn.tiemtruyen.model.RentalCollateral;
import vn.tiemtruyen.model.RentedBook;
import vn.tiemtruyen.model.RentedDamage;
import vn.tiemtruyen.model.SelectedBook;
import vn.tiemtruyen.util.Codes;

/**
 * Phiếu mượn (contracts §5.3, §6): tạo phiếu có khoá K1, đọc phiếu kèm đủ con, cập nhật qua đối tượng chủ có khoá D9.
 * Đối tượng truyền vào chỉ đổi (id mới, quyển thực giao, trạng thái) sau commit. Hàm đọc dựng cả đồ thị phiếu trong
 * một câu SQL bằng {@code JSON_OBJECT}/{@code JSON_ARRAYAGG} (khoá JSON trùng tên thuộc tính model, contracts §3) rồi
 * Jackson gán vào JavaBean; {@code JSON_ARRAYAGG} không có thứ tự nên danh sách con được sắp theo id sau khi đọc.
 */
public class RentalBillDAO extends DAO {

    private static final ObjectMapper JSON = JsonMapper.builder().build();
    private static final String BUSY = " AND NOT EXISTS (SELECT 1 FROM tblRentedBook x JOIN tblRentalBill y"
            + " ON y.id = x.rentalBillId WHERE x.bookCopyId = c.id AND y.status <> ?)";
    private static final String COPY_BOOKS = "SELECT bookId FROM tblBookCopy WHERE id IN (0";
    private static final String LOCK_BOOKS = "SELECT id FROM tblBook WHERE id IN (0";
    private static final String PICK_COPY = "SELECT c.id, c.barcode FROM tblBookCopy c JOIN tblBookCopy want"
            + " ON want.bookId = c.bookId WHERE want.id = ?" + BUSY + " ORDER BY c.id = want.id DESC, c.id LIMIT 1";
    private static final String LOCK_BILL = "SELECT status FROM tblRentalBill WHERE id = ? FOR UPDATE";
    private static final String INSERT_BILL = "INSERT INTO tblRentalBill (createdAt, expectedPickupAt, expectedDays,"
            + " discount, note, status, clientId) VALUES (COALESCE(?, CURRENT_TIMESTAMP), ?, ?, ?, ?, ?, ?)";
    private static final String UPDATE_BILL = "UPDATE tblRentalBill SET expectedPickupAt = ?, expectedDays = ?,"
            + " borrowDate = ?, dueDate = ?, discount = ?, note = ?, status = ?, cancelReason = ?, staffId = ?"
            + " WHERE id = ?";
    private static final String DELETE_DAMAGES = "DELETE rd FROM tblRentedDamage rd JOIN tblRentedBook rb"
            + " ON rb.id = rd.rentedBookId WHERE rb.rentalBillId = ?";
    private static final String DELETE_ROWS = "DELETE FROM tblRentedBook WHERE rentalBillId = ? AND id NOT IN (0";
    private static final String DELETE_COLLATERALS = "DELETE FROM tblRentalCollateral WHERE rentalBillId = ?";
    private static final String UPDATE_ROW = "UPDATE tblRentedBook SET conditionNote = ? WHERE id = ?"
            + " AND rentalBillId = ?";
    private static final String INSERT_ROW = "INSERT INTO tblRentedBook (rentalPrice, conditionNote, rentalBillId,"
            + " bookCopyId, selectedBookId) VALUES (?, ?, ?, ?, ?)";
    private static final String INSERT_DAMAGE = "INSERT INTO tblRentedDamage (note, rentedBookId, damageId)"
            + " VALUES (?, ?, ?)";
    private static final String INSERT_COLLATERAL = "INSERT INTO tblRentalCollateral (value, note, rentalBillId,"
            + " collateralId) VALUES (?, ?, ?, ?)";
    private static final String ISO_TIME = ", '%Y-%m-%dT%H:%i:%s')";
    private static final String BOOK_JSON = bookJson("b");
    private static final String DAMAGES_JSON = "(SELECT COALESCE(JSON_ARRAYAGG(JSON_OBJECT('id', rd.id, 'note',"
            + " rd.note, 'damage', JSON_OBJECT('id', d.id, 'name', d.name, 'description', d.description))),"
            + " JSON_ARRAY()) FROM tblRentedDamage rd JOIN tblDamage d ON d.id = rd.damageId"
            + " WHERE rd.rentedBookId = rb.id)";
    private static final String ROWS_JSON = "(SELECT COALESCE(JSON_ARRAYAGG(JSON_OBJECT('id', rb.id,"
            + " 'rentalPrice', rb.rentalPrice, 'conditionNote', rb.conditionNote, 'bookCopy', JSON_OBJECT('id', bc.id,"
            + " 'barcode', bc.barcode, 'book', " + BOOK_JSON + "), 'selectedBook', IF(sc.id IS NULL, NULL,"
            + " JSON_OBJECT('id', sb.id, 'bookCopy', JSON_OBJECT('id', sc.id, 'barcode', sc.barcode, 'book', "
            + BOOK_JSON + "))), 'listRentedDamage', " + DAMAGES_JSON + ")), JSON_ARRAY()) FROM tblRentedBook rb"
            + " JOIN tblBookCopy bc ON bc.id = rb.bookCopyId JOIN tblBook b ON b.id = bc.bookId"
            + " LEFT JOIN tblSelectedBook sb ON sb.id = rb.selectedBookId LEFT JOIN tblBookCopy sc"
            + " ON sc.id = sb.bookCopyId WHERE rb.rentalBillId = r.id)";
    private static final String COLLATERALS_JSON = "(SELECT COALESCE(JSON_ARRAYAGG(JSON_OBJECT('id', rc.id,"
            + " 'value', rc.value, 'note', rc.note, 'collateral', JSON_OBJECT('id', co.id, 'name', co.name,"
            + " 'description', co.description))), JSON_ARRAY()) FROM tblRentalCollateral rc JOIN tblCollateral co"
            + " ON co.id = rc.collateralId WHERE rc.rentalBillId = r.id)";
    private static final String BILLS = "SELECT JSON_OBJECT('id', r.id, 'createdAt', DATE_FORMAT(r.createdAt"
            + ISO_TIME + ", 'expectedPickupAt', DATE_FORMAT(r.expectedPickupAt" + ISO_TIME + ", 'expectedDays',"
            + " r.expectedDays, 'borrowDate', r.borrowDate, 'dueDate', r.dueDate, 'discount', r.discount, 'note',"
            + " r.note, 'status', r.status, 'cancelReason', r.cancelReason, 'client', JSON_OBJECT('id', c.userId,"
            + " 'username', cu.username, 'fullName', cu.fullName, 'dob', c.dob, 'idCard', c.idCard, 'phone', c.phone,"
            + " 'email', c.email, 'address', c.address), 'staff', IF(s.userId IS NULL, NULL, JSON_OBJECT('id',"
            + " s.userId, 'username', su.username, 'fullName', su.fullName, 'position', s.position)),"
            + " 'listRentedBook', " + ROWS_JSON + ", 'listRentalCollateral', " + COLLATERALS_JSON + ")"
            + " FROM tblRentalBill r JOIN tblClient c ON c.userId = r.clientId JOIN tblUser cu ON cu.id = c.userId"
            + " LEFT JOIN tblStaff s ON s.userId = r.staffId LEFT JOIN tblUser su ON su.id = s.userId WHERE ";

    public RentalBillDAO() throws SQLException {
        super();
    }

    protected RentalBillDAO(Connection con) {
        super(con);
    }

    /**
     * Tạo phiếu "Chờ nhận" cùng các dòng trong một transaction có khoá K1; {@code false} và rollback khi thiếu quyển.
     * Sau commit gán id phiếu, id dòng, trạng thái và quyển thực giao vào {@code RentedBook.bookCopy}.
     */
    public boolean addRentalBill(RentalBill rentalBill) throws SQLException {
        Objects.requireNonNull(rentalBill, "rentalBill");
        if (rentalBill.getListRentedBook().isEmpty()) {
            throw new IllegalArgumentException("Phiếu mượn mới phải có ít nhất một quyển");
        }
        List<Runnable> afterCommit = new ArrayList<>();
        boolean saved = inWriteTransaction(() -> {
            int id = insert(INSERT_BILL, rentalBill.getCreatedAt(), rentalBill.getExpectedPickupAt(),
                    rentalBill.getExpectedDays(), rentalBill.getDiscount(), rentalBill.getNote(),
                    RentalBill.STATUS_PENDING, rentalBill.getClient().getId());
            afterCommit.add(() -> rentalBill.setId(id));
            afterCommit.add(() -> rentalBill.setStatus(RentalBill.STATUS_PENDING));
            Map<RentedBook, Integer> rowIds = new IdentityHashMap<>();
            if (!reserveCopies(id, rentalBill.getListRentedBook(), rowIds, afterCommit)) {
                return false;
            }
            writeDetails(id, rentalBill, rowIds, afterCommit);
            return true;
        });
        if (saved) {
            afterCommit.forEach(Runnable::run);
        }
        return saved;
    }

    /** Phiếu của khách, mới nhất trước, kèm dòng (quyển, đầu truyện, lỗi), khoản cọc, nhân viên nếu có. */
    public List<RentalBill> getRentalBillList(Client client) throws SQLException {
        return readBills("r.clientId = ? ORDER BY r.id DESC", client.getId());
    }

    /** C9: {@code PM} + số thì theo mã phiếu, ngược lại tên khách chứa hoặc CCCD bằng từ khoá; trống thì rỗng. */
    public List<RentalBill> searchRentalBill(String keyword) throws SQLException {
        if (keyword == null || keyword.isBlank()) {
            return new ArrayList<>();
        }
        OptionalInt id = Codes.parseRentalBillId(keyword);
        if (id.isPresent()) {
            return readBills("r.id = ? ORDER BY r.id DESC", id.getAsInt());
        }
        String text = keyword.strip();
        String like = containsPattern(text);
        return readBills("cu.fullName LIKE ? OR c.idCard = ? ORDER BY r.id DESC", like, text);
    }

    /**
     * Lưu phiếu và mọi con: khoá dòng phiếu, chỉ ghi khi DB vẫn "Chờ nhận" (D9), {@code false} và rollback nếu đã
     * đổi hoặc thiếu quyển; dòng bị bỏ xoá cùng lỗi; dòng còn lại ghi {@code conditionNote}; dòng {@code id = 0} qua
     * K1; lỗi và khoản cọc ghi lại theo đối tượng.
     */
    public boolean updateRentalBill(RentalBill rentalBill) throws SQLException {
        Objects.requireNonNull(rentalBill, "rentalBill");
        List<Runnable> afterCommit = new ArrayList<>();
        boolean saved = inWriteTransaction(() -> saveBill(rentalBill, afterCommit));
        if (saved) {
            afterCommit.forEach(Runnable::run);
        }
        return saved;
    }

    private boolean saveBill(RentalBill bill, List<Runnable> afterCommit) throws SQLException {
        if (!RentalBill.STATUS_PENDING.equals(lockedStatus(bill.getId()))) {
            return false;
        }
        Map<RentedBook, Integer> rowIds = new IdentityHashMap<>();
        List<RentedBook> newRows = new ArrayList<>();
        for (RentedBook row : bill.getListRentedBook()) {
            if (row.getId() == 0) {
                newRows.add(row);
            } else {
                rowIds.put(row, row.getId());
            }
        }
        List<Object> keep = new ArrayList<>(List.of(bill.getId()));
        keep.addAll(rowIds.values());
        execute(DELETE_DAMAGES, bill.getId());
        execute(DELETE_ROWS + ",?".repeat(rowIds.size()) + ")", keep.toArray());
        for (Map.Entry<RentedBook, Integer> kept : rowIds.entrySet()) {
            if (execute(UPDATE_ROW, kept.getKey().getConditionNote(), kept.getValue(), bill.getId()) != 1) {
                throw new IllegalStateException("Dòng " + kept.getValue() + " không thuộc phiếu " + bill.getId());
            }
        }
        if (!newRows.isEmpty() && !reserveCopies(bill.getId(), newRows, rowIds, afterCommit)) {
            return false;
        }
        execute(UPDATE_BILL, bill.getExpectedPickupAt(), bill.getExpectedDays(), bill.getBorrowDate(),
                bill.getDueDate(), bill.getDiscount(), bill.getNote(), bill.getStatus(), bill.getCancelReason(),
                bill.getStaff() == null ? null : bill.getStaff().getId(), bill.getId());
        writeDetails(bill.getId(), bill, rowIds, afterCommit);
        return true;
    }

    private String lockedStatus(int billId) throws SQLException {
        try (PreparedStatement ps = prepare(LOCK_BILL, billId); ResultSet rs = ps.executeQuery()) {
            if (!rs.next()) {
                throw new IllegalArgumentException("Không có phiếu mượn id " + billId);
            }
            return rs.getString(1);
        }
    }

    /**
     * K1 (contracts §6.1, §6.2) cho dòng mới. (1) khoá đầu truyện theo id tăng dần; (2)–(3) từng dòng giữ quyển đã chọn
     * nếu không có dòng của phiếu chưa huỷ nào trỏ vào, ngược lại lấy quyển trống id nhỏ nhất cùng đầu truyện; dòng
     * còn lại của chính phiếu và dòng vừa ghi cũng tính là bận nên quyển đã có trong phiếu không bị chọn lại; (4) ghi.
     */
    private boolean reserveCopies(int billId, List<RentedBook> rows, Map<RentedBook, Integer> rowIds,
            List<Runnable> afterCommit) throws SQLException {
        Object[] requested = rows.stream().map(row -> row.getBookCopy().getId()).toArray();
        TreeSet<Integer> bookIds = new TreeSet<>();
        try (PreparedStatement ps = prepare(COPY_BOOKS + ",?".repeat(requested.length) + ")", requested);
                ResultSet rs = ps.executeQuery()) {
            while (rs.next()) {
                bookIds.add(rs.getInt(1));
            }
        }
        String lock = LOCK_BOOKS + ",?".repeat(bookIds.size()) + ") ORDER BY id FOR UPDATE";
        try (PreparedStatement ps = prepare(lock, bookIds.toArray())) {
            ps.executeQuery(); // Connector/J đọc hết kết quả: mọi dòng đầu truyện đã bị khoá khi lệnh trả về
        }
        for (RentedBook row : rows) {
            BookCopy given = new BookCopy();
            try (PreparedStatement ps = prepare(PICK_COPY, row.getBookCopy().getId(), RentalBill.STATUS_CANCELLED);
                    ResultSet rs = ps.executeQuery()) {
                if (!rs.next()) {
                    return false;
                }
                given.setId(rs.getInt(1));
                given.setBarcode(rs.getString(2));
                given.setBook(row.getBookCopy().getBook());
            }
            SelectedBook line = row.getSelectedBook();
            int id = insert(INSERT_ROW, row.getRentalPrice(), row.getConditionNote(), billId, given.getId(),
                    line == null ? null : line.getId());
            rowIds.put(row, id);
            afterCommit.add(() -> {
                row.setId(id);
                row.setBookCopy(given);
            });
        }
        return true;
    }

    /** Ghi lại lỗi của mọi dòng và khoản cọc của phiếu theo đối tượng (lỗi cũ đã được xoá trước đó). */
    private void writeDetails(int billId, RentalBill bill, Map<RentedBook, Integer> rowIds,
            List<Runnable> afterCommit) throws SQLException {
        for (RentedBook row : bill.getListRentedBook()) {
            for (RentedDamage damage : row.getListRentedDamage()) {
                int id = insert(INSERT_DAMAGE, damage.getNote(), rowIds.get(row), damage.getDamage().getId());
                afterCommit.add(() -> damage.setId(id));
            }
        }
        execute(DELETE_COLLATERALS, billId);
        for (RentalCollateral item : bill.getListRentalCollateral()) {
            int id = insert(INSERT_COLLATERAL, item.getValue(), item.getNote(), billId, item.getCollateral().getId());
            afterCommit.add(() -> item.setId(id));
        }
    }

    private List<RentalBill> readBills(String where, Object... params) throws SQLException {
        List<RentalBill> bills = new ArrayList<>();
        try (PreparedStatement ps = prepare(BILLS + where, params); ResultSet rs = ps.executeQuery()) {
            while (rs.next()) {
                RentalBill bill = JSON.readValue(rs.getString(1), RentalBill.class);
                bill.getListRentedBook().sort(Comparator.comparingInt(RentedBook::getId));
                bill.getListRentedBook().forEach(row -> row.getListRentedDamage()
                        .sort(Comparator.comparingInt(RentedDamage::getId)));
                bill.getListRentalCollateral().sort(Comparator.comparingInt(RentalCollateral::getId));
                bills.add(bill);
            }
        }
        return bills;
    }

    private PreparedStatement prepare(String sql, Object... params) throws SQLException {
        PreparedStatement ps = con().prepareStatement(sql, Statement.RETURN_GENERATED_KEYS);
        for (int i = 0; i < params.length; i++) {
            ps.setObject(i + 1, params[i]);
        }
        return ps;
    }

    private int execute(String sql, Object... params) throws SQLException {
        try (PreparedStatement ps = prepare(sql, params)) {
            return ps.executeUpdate();
        }
    }

    private int insert(String sql, Object... params) throws SQLException {
        try (PreparedStatement ps = prepare(sql, params)) {
            ps.executeUpdate();
            try (ResultSet keys = ps.getGeneratedKeys()) {
                keys.next();
                return keys.getInt(1);
            }
        }
    }
}
