package vn.tiemtruyen.dao;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static vn.tiemtruyen.dao.RentalBillDAOTest.LAN;
import static vn.tiemtruyen.dao.RentalBillDAOTest.NAM;
import static vn.tiemtruyen.dao.RentalBillDAOTest.add;
import static vn.tiemtruyen.dao.RentalBillDAOTest.client;
import static vn.tiemtruyen.dao.RentalBillDAOTest.copy;
import static vn.tiemtruyen.dao.RentalBillDAOTest.newBill;
import static vn.tiemtruyen.dao.RentalBillDAOTest.number;
import static vn.tiemtruyen.dao.RentalBillDAOTest.resetBills;
import static vn.tiemtruyen.dao.RentalBillDAOTest.row;
import static vn.tiemtruyen.dao.RentalBillDAOTest.text;
import static vn.tiemtruyen.dao.RentalBillDAOTest.update;

import java.sql.SQLException;
import java.util.List;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import vn.tiemtruyen.model.Cart;
import vn.tiemtruyen.model.Client;
import vn.tiemtruyen.model.RentalBill;
import vn.tiemtruyen.model.RentedBook;
import vn.tiemtruyen.model.SelectedBook;
import vn.tiemtruyen.support.TestDatabase;

/** {@link CartDAO}: giỏ chỉ hiện dòng tự do, lưu giỏ thêm và xoá dòng, không đụng dòng đã thuộc phiếu chưa huỷ. */
class CartDAOTest {

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
    void clearCarts() throws SQLException {
        resetBills(db);
    }

    @Test
    void emptyCartHasIdAndNoLines() throws Exception {
        Client nam = client(NAM);
        Cart cart = getCart(nam);
        assertEquals(number(db, "SELECT id FROM tblCart WHERE clientId = ?", NAM), cart.getId());
        assertSame(nam, cart.getClient());
        assertTrue(cart.getListSelectedBook().isEmpty());
    }

    @Test
    void updateCartInsertsNewLinesAndGetCartReadsThemWithCopyAndBook() throws Exception {
        Cart cart = cartWith(NAM, "DT001-01", "DT001-02", "DT020-01");
        assertTrue(cart.getListSelectedBook().stream().allMatch(line -> line.getId() > 0));
        List<SelectedBook> lines = getCart(client(NAM)).getListSelectedBook();
        assertEquals(List.of("DT001-01", "DT001-02", "DT020-01"),
                lines.stream().map(line -> line.getBookCopy().getBarcode()).toList());
        assertEquals("Doraemon - Tập 1", lines.get(0).getBookCopy().getBook().getName());
        assertEquals(3000f, lines.get(0).getBookCopy().getBook().getRentalPrice());
        assertEquals(2023, lines.get(0).getBookCopy().getBook().getPublishYear());
        assertSame(lines.get(0).getBookCopy().getBook(), lines.get(1).getBookCopy().getBook());
        assertEquals("Thám tử lừng danh Conan - Tập 1", lines.get(2).getBookCopy().getBook().getName());
        assertTrue(getCart(client(LAN)).getListSelectedBook().isEmpty(), "giỏ khách khác không bị ảnh hưởng");
    }

    @Test
    void updateCartDeletesLinesRemovedFromTheObject() throws Exception {
        Cart cart = cartWith(NAM, "DT001-01", "DT001-02", "DT020-01");
        cart.getListSelectedBook().removeIf(line -> line.getBookCopy().getBarcode().startsWith("DT001"));
        assertTrue(updateCart(cart));
        assertEquals(List.of("DT020-01"), barcodes(getCart(client(NAM))));
        assertEquals(1, number(db, "SELECT COUNT(*) FROM tblSelectedBook"));
    }

    @Test
    void newLineForCopyAlreadyInCartReturnsFalseAndWritesNothing() throws Exception {
        Cart cart = cartWith(NAM, "DT001-01");
        SelectedBook kept = cart.getListSelectedBook().get(0);
        cart.getListSelectedBook().remove(0);
        SelectedBook first = line("DT002-01");
        SelectedBook duplicate = line("DT001-01");
        cart.getListSelectedBook().addAll(List.of(kept, first, duplicate));
        assertFalse(updateCart(cart));
        assertEquals(0, first.getId());
        assertEquals(0, duplicate.getId());
        assertEquals(1, number(db, "SELECT COUNT(*) FROM tblSelectedBook"));
    }

    @Test
    void linesOfPendingBillAreHiddenAndUntouchedThenReturnWhenBillIsCancelled() throws Exception {
        Cart cart = cartWith(NAM, "DT002-01", "DT002-02");
        SelectedBook inBill = cart.getListSelectedBook().get(0);
        RentalBill bill = newBill(db, NAM);
        RentedBook rented = row(inBill.getBookCopy());
        rented.setSelectedBook(inBill);
        bill.getListRentedBook().add(rented);
        assertTrue(add(db, bill));
        assertEquals(List.of("DT002-02"), barcodes(getCart(client(NAM))));

        cart.getListSelectedBook().clear();
        assertTrue(updateCart(cart));
        assertEquals(1, number(db, "SELECT COUNT(*) FROM tblSelectedBook WHERE id = ?", inBill.getId()),
                "dòng đã thuộc phiếu Chờ nhận không bị xoá");
        assertTrue(getCart(client(NAM)).getListSelectedBook().isEmpty());

        bill.setStatus(RentalBill.STATUS_CANCELLED);
        assertTrue(update(db, bill));
        Cart again = getCart(client(NAM));
        assertEquals(List.of("DT002-01"), barcodes(again));
        again.getListSelectedBook().clear();
        assertTrue(updateCart(again));
        assertEquals(0, number(db, "SELECT COUNT(*) FROM tblSelectedBook"));
        assertNull(text(db, "SELECT selectedBookId FROM tblRentedBook WHERE rentalBillId = ?", bill.getId()),
                "dòng phiếu đã huỷ được gỡ liên kết trước khi xoá dòng giỏ");
    }

    private static Cart cartWith(int clientId, String... barcodes) throws SQLException {
        Cart cart = getCart(client(clientId));
        for (String barcode : barcodes) {
            cart.getListSelectedBook().add(line(barcode));
        }
        assertTrue(updateCart(cart));
        return cart;
    }

    private static SelectedBook line(String barcode) throws SQLException {
        SelectedBook line = new SelectedBook();
        line.setBookCopy(copy(db, barcode));
        return line;
    }

    private static List<String> barcodes(Cart cart) {
        return cart.getListSelectedBook().stream().map(line -> line.getBookCopy().getBarcode()).toList();
    }

    private static Cart getCart(Client client) throws SQLException {
        try (CartDAO dao = new CartDAO(db.connection())) {
            return dao.getCart(client);
        }
    }

    private static boolean updateCart(Cart cart) throws SQLException {
        try (CartDAO dao = new CartDAO(db.connection())) {
            return dao.updateCart(cart);
        }
    }
}
