package vn.tiemtruyen.dao;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.stream.Collectors;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import vn.tiemtruyen.model.BookCopy;
import vn.tiemtruyen.model.Client;
import vn.tiemtruyen.model.Collateral;
import vn.tiemtruyen.model.Damage;
import vn.tiemtruyen.model.RentalBill;
import vn.tiemtruyen.model.RentalCollateral;
import vn.tiemtruyen.model.RentedBook;
import vn.tiemtruyen.model.RentedDamage;
import vn.tiemtruyen.model.Staff;
import vn.tiemtruyen.support.TestDatabase;

/** Từng hàm của {@link RentalBillDAO} trên V1 + V2 + V10 e2e; helper tĩnh dùng chung với hai lớp test cùng gói. */
class RentalBillDAOTest {

    static final int NAM = 3;
    static final int LAN = 4;
    static final int LONG = 5;
    static final int HANT = 1;

    private static TestDatabase db;

    @BeforeAll
    static void createDatabase() {
        db = TestDatabase.createMigrated();
    }

    @AfterAll
    static void dropDatabase() {
        db.close();
    }

    @BeforeEach
    void clearBills() throws SQLException {
        resetBills(db);
    }

    @Test
    void addKeepsChosenFreeCopiesAndAssignsIdsAfterCommit() throws Exception {
        RentalBill bill = newBill(db, NAM, "DT001-03", "DT020-02");
        assertTrue(add(db, bill));
        assertTrue(bill.getId() >= 125, "AUTO_INCREMENT của V10 bắt đầu ở 125");
        assertEquals(RentalBill.STATUS_PENDING, bill.getStatus());
        assertEquals(List.of("DT001-03", "DT020-02"), barcodes(bill));
        assertTrue(bill.getListRentedBook().stream().allMatch(row -> row.getId() > 0));
        assertEquals(RentalBill.STATUS_PENDING,
                text(db, "SELECT status FROM tblRentalBill WHERE id = ?", bill.getId()));
        assertEquals(1, number(db, "SELECT COUNT(*) FROM tblRentalBill WHERE id = ? AND createdAt IS NOT NULL",
                bill.getId()));
        assertEquals(1, held(db, "DT001-03"));
        assertEquals(1, held(db, "DT020-02"));
    }

    @Test
    void addReturnsFalseRollsBackAndLeavesObjectUntouchedWhenNotEnoughCopies() throws Exception {
        assertTrue(add(db, newBill(db, NAM, "DT015-01", "DT015-02")));
        RentalBill bill = newBill(db, LAN, "DT001-04", "DT015-01");
        assertFalse(add(db, bill));
        assertEquals(0, bill.getId());
        assertNull(bill.getStatus());
        assertEquals(List.of("DT001-04", "DT015-01"), barcodes(bill));
        assertTrue(bill.getListRentedBook().stream().allMatch(row -> row.getId() == 0));
        assertEquals(1, number(db, "SELECT COUNT(*) FROM tblRentalBill"));
        assertEquals(0, held(db, "DT001-04"), "dòng ghi trước khi thiếu quyển phải bị rollback");
    }

    @Test
    void listReturnsClientBillsNewestFirstWithWholeGraph() throws Exception {
        RentalBill older = newBill(db, NAM, "DT001-01");
        assertTrue(add(db, older));
        RentalBill bill = newBill(db, NAM, "DT002-01", "DT002-02");
        assertTrue(add(db, bill));
        confirm(bill);
        assertTrue(update(db, bill));
        try (RentalBillDAO dao = new RentalBillDAO(db.connection())) {
            assertTrue(dao.getRentalBillList(client(LAN)).isEmpty());
            List<RentalBill> list = dao.getRentalBillList(client(NAM));
            assertEquals(List.of(bill.getId(), older.getId()), list.stream().map(RentalBill::getId).toList());
            RentalBill read = list.get(0);
            assertEquals(RentalBill.STATUS_RENTING, read.getStatus());
            assertEquals(bill.getExpectedPickupAt(), read.getExpectedPickupAt());
            assertNotNull(read.getCreatedAt());
            assertEquals(7, read.getExpectedDays());
            assertEquals(LocalDate.of(2026, 9, 25), read.getBorrowDate());
            assertEquals(LocalDate.of(2026, 10, 2), read.getDueDate());
            assertEquals(1000f, read.getDiscount());
            assertEquals("Khách lấy sớm", read.getNote());
            assertEquals("Lê Hoàng Nam", read.getClient().getFullName());
            assertEquals("001098004512", read.getClient().getIdCard());
            assertNull(read.getClient().getPassword());
            assertEquals("Nguyễn Thu Hà", read.getStaff().getFullName());
            assertEquals("Nhân viên bán hàng", read.getStaff().getPosition());
            assertEquals(List.of("DT002-01", "DT002-02"), barcodes(read));
            RentedBook first = read.getListRentedBook().get(0);
            assertEquals("Doraemon - Tập 2", first.getBookCopy().getBook().getName());
            assertEquals(3000f, first.getRentalPrice());
            assertEquals("Bìa hơi cong", first.getConditionNote());
            assertNull(read.getListRentedBook().get(1).getConditionNote());
            assertEquals("Rách bìa", first.getListRentedDamage().get(0).getDamage().getName());
            assertEquals("góc phải", first.getListRentedDamage().get(0).getNote());
            assertEquals("Căn cước công dân", read.getListRentalCollateral().get(0).getCollateral().getName());
            assertEquals("001098004512", read.getListRentalCollateral().get(0).getValue());
            assertNull(list.get(1).getStaff());
            assertTrue(list.get(1).getListRentalCollateral().isEmpty());
        }
    }

    @Test
    void searchMatchesCodeNameOrIdCardPerC9() throws Exception {
        RentalBill nam = newBill(db, NAM, "DT001-01");
        assertTrue(add(db, nam));
        RentalBill lan = newBill(db, LAN, "DT002-01");
        assertTrue(add(db, lan));
        try (RentalBillDAO dao = new RentalBillDAO(db.connection())) {
            assertEquals(List.of(nam.getId()), ids(dao.searchRentalBill(" pm0" + nam.getId() + " ")));
            assertEquals(List.of(lan.getId()), ids(dao.searchRentalBill("PM" + lan.getId())));
            assertEquals(List.of(nam.getId()), ids(dao.searchRentalBill("hoang nam")));
            assertEquals(List.of(lan.getId()), ids(dao.searchRentalBill("001301008833")));
            assertTrue(dao.searchRentalBill("0013010088").isEmpty(), "CCCD phải bằng, không chứa");
            assertTrue(dao.searchRentalBill("PM9999").isEmpty());
            assertTrue(dao.searchRentalBill("%").isEmpty(), "kí tự đại diện của LIKE được thoát");
            assertTrue(dao.searchRentalBill("   ").isEmpty());
            RentalBill found = dao.searchRentalBill("Đỗ Thị").get(0);
            assertEquals("0977334455", found.getClient().getPhone());
            assertEquals("DT002-01", found.getListRentedBook().get(0).getBookCopy().getBarcode());
        }
    }

    @Test
    void confirmRemovesUnreceivedRowWithItsDamagesAndLaterUpdatesAreRejected() throws Exception {
        RentalBill bill = newBill(db, NAM, "DT020-01", "DT020-02");
        assertTrue(add(db, bill));
        bill.getListRentedBook().get(1).getListRentedDamage().add(rentedDamage(2, "rách trang 5"));
        assertTrue(update(db, bill));
        bill.getListRentedBook().remove(1);
        confirm(bill);
        assertTrue(update(db, bill));
        assertEquals(1, number(db, "SELECT COUNT(*) FROM tblRentedBook WHERE rentalBillId = ?", bill.getId()));
        assertEquals(0, held(db, "DT020-02"));
        assertEquals(1, number(db, "SELECT COUNT(*) FROM tblRentedDamage"), "lỗi của dòng bị bỏ đã xoá");
        assertEquals(HANT, number(db, "SELECT staffId FROM tblRentalBill WHERE id = ?", bill.getId()));
        bill.setNote("sửa sau khi giao");
        assertFalse(update(db, bill), "D9: phiếu đã Đang cho thuê");
        assertEquals("Khách lấy sớm", text(db, "SELECT note FROM tblRentalBill WHERE id = ?", bill.getId()));
    }

    @Test
    void cancelFreesCopiesForOtherBills() throws Exception {
        RentalBill bill = newBill(db, NAM, "DT015-01", "DT015-02");
        assertTrue(add(db, bill));
        bill.setStatus(RentalBill.STATUS_CANCELLED);
        bill.setCancelReason("Bận việc đột xuất");
        assertTrue(update(db, bill));
        assertEquals("Bận việc đột xuất",
                text(db, "SELECT cancelReason FROM tblRentalBill WHERE id = ?", bill.getId()));
        assertEquals(2, number(db, "SELECT COUNT(*) FROM tblRentedBook WHERE rentalBillId = ?", bill.getId()));
        assertTrue(add(db, newBill(db, LAN, "DT015-01", "DT015-02")));
        assertFalse(update(db, bill), "phiếu đã huỷ không sửa lại được");
    }

    // ----- helper dùng chung (RentalBillConcurrencyTest, CartDAOTest) -----

    static void resetBills(TestDatabase db) throws SQLException {
        try (Connection con = db.connection(); Statement st = con.createStatement()) {
            for (String table : List.of("tblRentalCollateral", "tblRentedDamage", "tblRentedBook", "tblRentalBill",
                    "tblSelectedBook")) {
                st.executeUpdate("DELETE FROM " + table);
            }
        }
    }

    static RentalBill newBill(TestDatabase db, int clientId, String... barcodes) throws SQLException {
        RentalBill bill = new RentalBill();
        bill.setClient(client(clientId));
        bill.setExpectedPickupAt(LocalDateTime.now().plusDays(1).truncatedTo(ChronoUnit.SECONDS));
        bill.setExpectedDays(7);
        for (String barcode : barcodes) {
            bill.getListRentedBook().add(row(copy(db, barcode)));
        }
        return bill;
    }

    static RentedBook row(BookCopy copy) {
        RentedBook row = new RentedBook();
        row.setRentalPrice(3000f);
        row.setBookCopy(copy);
        return row;
    }

    static BookCopy copy(TestDatabase db, String barcode) throws SQLException {
        BookCopy copy = new BookCopy();
        copy.setId(number(db, "SELECT id FROM tblBookCopy WHERE barcode = ?", barcode));
        copy.setBarcode(barcode);
        return copy;
    }

    static Client client(int id) {
        Client client = new Client();
        client.setId(id);
        return client;
    }

    static boolean add(TestDatabase db, RentalBill bill) throws SQLException {
        try (RentalBillDAO dao = new RentalBillDAO(db.connection())) {
            return dao.addRentalBill(bill);
        }
    }

    static boolean update(TestDatabase db, RentalBill bill) throws SQLException {
        try (RentalBillDAO dao = new RentalBillDAO(db.connection())) {
            return dao.updateRentalBill(bill);
        }
    }

    /** Số dòng phiếu chưa huỷ đang giữ quyển có mã vạch này. */
    static int held(TestDatabase db, String barcode) throws SQLException {
        return number(db, "SELECT COUNT(*) FROM tblRentedBook rb JOIN tblRentalBill r ON r.id = rb.rentalBillId"
                + " JOIN tblBookCopy c ON c.id = rb.bookCopyId WHERE c.barcode = ? AND r.status <> 'Đã huỷ'", barcode);
    }

    static int number(TestDatabase db, String sql, Object... params) throws SQLException {
        return Integer.parseInt(text(db, sql, params));
    }

    static String text(TestDatabase db, String sql, Object... params) throws SQLException {
        try (Connection con = db.connection(); PreparedStatement ps = con.prepareStatement(sql)) {
            for (int i = 0; i < params.length; i++) {
                ps.setObject(i + 1, params[i]);
            }
            try (ResultSet rs = ps.executeQuery()) {
                assertTrue(rs.next(), sql);
                return rs.getString(1);
            }
        }
    }

    static List<String> barcodes(RentalBill bill) {
        return bill.getListRentedBook().stream().map(row -> row.getBookCopy().getBarcode())
                .collect(Collectors.toList());
    }

    private static List<Integer> ids(List<RentalBill> bills) {
        return bills.stream().map(RentalBill::getId).toList();
    }

    private static void confirm(RentalBill bill) {
        RentedBook first = bill.getListRentedBook().get(0);
        first.setConditionNote("Bìa hơi cong");
        first.getListRentedDamage().add(rentedDamage(1, "góc phải"));
        bill.getListRentalCollateral().add(rentalCollateral(1, "001098004512"));
        bill.setStatus(RentalBill.STATUS_RENTING);
        bill.setStaff(new Staff());
        bill.getStaff().setId(HANT);
        bill.setBorrowDate(LocalDate.of(2026, 9, 25));
        bill.setDueDate(LocalDate.of(2026, 10, 2));
        bill.setDiscount(1000f);
        bill.setNote("Khách lấy sớm");
    }

    private static RentedDamage rentedDamage(int damageId, String note) {
        RentedDamage item = new RentedDamage();
        item.setDamage(new Damage());
        item.getDamage().setId(damageId);
        item.setNote(note);
        return item;
    }

    static RentalCollateral rentalCollateral(int collateralId, String value) {
        RentalCollateral item = new RentalCollateral();
        item.setCollateral(new Collateral());
        item.getCollateral().setId(collateralId);
        item.setValue(value);
        return item;
    }
}
