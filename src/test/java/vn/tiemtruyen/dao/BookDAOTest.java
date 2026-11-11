package vn.tiemtruyen.dao;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import vn.tiemtruyen.model.Book;
import vn.tiemtruyen.model.BookCopy;
import vn.tiemtruyen.model.RentalBill;
import vn.tiemtruyen.support.TestDatabase;
import vn.tiemtruyen.util.Codes;

/**
 * {@link BookDAO} trên catalog V10 e2e: DT001 (7 quyển), DT002 (4), DT015 (2), DT020 (4), DT021 (2). Test đổi
 * dữ liệu của các đầu truyện này thì dùng database riêng.
 */
class BookDAOTest {

    private static TestDatabase db;

    @BeforeAll
    static void createDatabase() {
        db = TestDatabase.createMigrated();
    }

    @AfterAll
    static void dropDatabase() {
        db.close();
    }

    @Test
    void searchDoraemonReturnsThreeTitlesWithAllAvailableCopies() throws Exception {
        try (BookDAO dao = new BookDAO(db.connection())) {
            List<Book> found = dao.searchBook("Doraemon");
            assertEquals(List.of(1, 2, 15), ids(found));
            assertEquals(List.of(7, 4, 2), copyCounts(found));

            Book first = found.get(0);
            assertEquals("Doraemon - Tập 1", first.getName());
            assertEquals("Fujiko F. Fujio", first.getAuthor());
            assertEquals("Kim Đồng", first.getPublisher());
            assertEquals(2023, first.getPublishYear());
            assertEquals("Thiếu nhi", first.getCategory());
            assertEquals(3000f, first.getRentalPrice());
            assertEquals(List.of("DT001-01", "DT001-02", "DT001-03", "DT001-04", "DT001-05", "DT001-06", "DT001-07"),
                    barcodes(first));
            assertCopiesSortedAndOwned(found);
        }
    }

    @Test
    void searchMatchesAuthorIgnoringCaseAndAccents() throws Exception {
        try (BookDAO dao = new BookDAO(db.connection())) {
            assertEquals(List.of(20, 21), ids(dao.searchBook("gosho")));
            assertEquals(List.of(20, 21), ids(dao.searchBook("tham tu lung danh")));
            assertEquals(List.of(1, 2, 15), ids(dao.searchBook("FUJIKO")));
            assertEquals(List.of(), dao.searchBook("Thần đồng đất Việt"));
        }
    }

    @Test
    void copiesHeldByUncancelledBillAreNotAvailable() throws Exception {
        try (TestDatabase own = TestDatabase.createMigrated(); BookDAO dao = new BookDAO(own.connection())) {
            execute(own, "INSERT INTO tblRentalBill (id, expectedPickupAt, expectedDays, status, clientId)"
                    + " VALUES (200, NOW(), 7, '" + RentalBill.STATUS_PENDING + "', 3)");
            execute(own, "INSERT INTO tblRentedBook (rentalPrice, rentalBillId, bookCopyId)"
                    + " SELECT 3000, 200, id FROM tblBookCopy WHERE barcode IN ('DT001-01', 'DT015-01', 'DT015-02')");

            List<Book> pending = dao.searchBook("Doraemon");
            assertEquals(List.of(1, 2, 15), ids(pending));
            assertEquals(List.of(6, 4, 0), copyCounts(pending));
            assertEquals("DT001-02", pending.get(0).getListBookCopy().get(0).getBarcode());
            assertFalse(barcodes(pending.get(0)).contains("DT001-01"));

            execute(own, "UPDATE tblRentalBill SET status = '" + RentalBill.STATUS_RENTING + "' WHERE id = 200");
            assertEquals(List.of(6, 4, 0), copyCounts(dao.searchBook("Doraemon")));

            execute(own, "UPDATE tblRentalBill SET status = '" + RentalBill.STATUS_CANCELLED + "' WHERE id = 200");
            List<Book> cancelled = dao.searchBook("Doraemon");
            assertEquals(List.of(7, 4, 2), copyCounts(cancelled));
            assertEquals("DT001-01", cancelled.get(0).getListBookCopy().get(0).getBarcode());
            assertCopiesSortedAndOwned(cancelled);
        }
    }

    @Test
    void addBookSavesCopiesAndGeneratesBlankBarcodes() throws Exception {
        try (BookDAO dao = new BookDAO(db.connection())) {
            Book book = newBook("Shin - Cậu bé bút chì - Tập 1", copy(null), copy("SHIN-TAY-01"), copy(" "));
            assertTrue(dao.addBook(book));
            int id = book.getId();
            assertNotEquals(0, id);
            String code = Codes.bookCode(id);
            assertEquals(List.of(code + "-01", "SHIN-TAY-01", code + "-03"), barcodes(book));
            for (BookCopy saved : book.getListBookCopy()) {
                assertNotEquals(0, saved.getId());
                assertSame(book, saved.getBook());
            }

            List<Book> found = dao.searchBook("Cậu bé bút chì");
            assertEquals(List.of(id), ids(found));
            assertEquals(barcodes(book), barcodes(found.get(0)));
            assertNull(found.get(0).getPublishYear());
            assertNull(found.get(0).getDescription());

            Book empty = newBook("Shin - Cậu bé bút chì - Tập 2");
            assertTrue(dao.addBook(empty));
            assertEquals(List.of(0), copyCounts(dao.searchBook("Cậu bé bút chì - Tập 2")));
        }
    }

    @Test
    void addBookWithExistingBarcodeReturnsFalseAndLeavesNoRows() throws Exception {
        int books = queryInt(db, "SELECT COUNT(*) FROM tblBook");
        int copies = queryInt(db, "SELECT COUNT(*) FROM tblBookCopy");
        try (BookDAO dao = new BookDAO(db.connection())) {
            Book book = newBook("Truyện trùng mã vạch", copy(null), copy("DT001-01"));
            assertFalse(dao.addBook(book));
            assertEquals(0, book.getId());
            for (BookCopy unsaved : book.getListBookCopy()) {
                assertEquals(0, unsaved.getId());
                assertNull(unsaved.getBook());
            }
            assertNull(book.getListBookCopy().get(0).getBarcode());
            assertTrue(dao.con().getAutoCommit());
        }
        assertEquals(books, queryInt(db, "SELECT COUNT(*) FROM tblBook"));
        assertEquals(copies, queryInt(db, "SELECT COUNT(*) FROM tblBookCopy"));
    }

    @Test
    void updateBookEditsColumnsAndOnlyAddsNewCopies() throws Exception {
        try (TestDatabase own = TestDatabase.createMigrated(); BookDAO dao = new BookDAO(own.connection())) {
            Book book = dao.searchBook("Doraemon - Tập 1").get(0);
            book.setName("Doraemon - Tập 1 (tái bản)");
            book.setRentalPrice(3500f);
            book.getListBookCopy().remove(0);
            BookCopy eighth = copy(null);
            BookCopy ninth = copy("");
            book.getListBookCopy().add(eighth);
            book.getListBookCopy().add(ninth);

            assertTrue(dao.updateBook(book));
            assertEquals("DT001-08", eighth.getBarcode());
            assertEquals("DT001-09", ninth.getBarcode());
            assertTrue(eighth.getId() > 0 && ninth.getId() > eighth.getId());
            assertSame(book, eighth.getBook());

            Book reread = dao.searchBook("Doraemon - Tập 1").get(0);
            assertEquals("Doraemon - Tập 1 (tái bản)", reread.getName());
            assertEquals(3500f, reread.getRentalPrice());
            assertEquals(9, reread.getListBookCopy().size());
            assertEquals("DT001-01", reread.getListBookCopy().get(0).getBarcode());

            reread.setName("Không được lưu");
            reread.getListBookCopy().add(copy("DT002-01"));
            assertFalse(dao.updateBook(reread));
            assertTrue(dao.con().getAutoCommit());
            Book afterFalse = dao.searchBook("Doraemon - Tập 1").get(0);
            assertEquals("Doraemon - Tập 1 (tái bản)", afterFalse.getName());
            assertEquals(9, afterFalse.getListBookCopy().size());
            assertEquals(4, dao.searchBook("Doraemon - Tập 2").get(0).getListBookCopy().size());

            Book missing = newBook("Không có trong DB", copy(null));
            missing.setId(9999);
            assertFalse(dao.updateBook(missing));
            assertEquals(0, queryInt(own, "SELECT COUNT(*) FROM tblBookCopy WHERE bookId = 9999"));
        }
    }

    /** Số quyển mới nối tiếp hậu tố lớn nhất của mã D8 đang có, không theo số quyển (mã lạc số không sinh trùng). */
    @Test
    void updateBookNumbersNewCopiesAfterTheHighestExistingSuffix() throws Exception {
        try (TestDatabase own = TestDatabase.createMigrated(); BookDAO dao = new BookDAO(own.connection())) {
            Book book = newBook("Truyện mã lạc số", copy(null), copy("TAY-99"));
            assertTrue(dao.addBook(book));
            String code = Codes.bookCode(book.getId());
            execute(own, "INSERT INTO tblBookCopy (barcode, bookId) VALUES ('" + code + "-05', " + book.getId() + ")");

            // Có -01, -05 và TAY-99 (không theo D8): đếm 3 quyển sẽ sinh -04, -05 (trùng -05); đúng là -06, -07.
            BookCopy sixth = copy(null);
            BookCopy seventh = copy(" ");
            book.getListBookCopy().addAll(List.of(sixth, seventh));
            assertTrue(dao.updateBook(book));
            assertEquals(List.of(code + "-06", code + "-07"), List.of(sixth.getBarcode(), seventh.getBarcode()));

            // Mã cùng tiền tố nằm ở đầu truyện khác (nhập tay, chữ thường) vẫn được tính: không sinh trùng UNIQUE.
            Book other = newBook("Đầu truyện khác", copy(code.toLowerCase(Locale.ROOT) + "-09"));
            assertTrue(dao.addBook(other));
            BookCopy next = copy(null);
            book.getListBookCopy().add(next);
            assertTrue(dao.updateBook(book));
            assertEquals(code + "-10", next.getBarcode());
            assertEquals(6, queryInt(own, "SELECT COUNT(*) FROM tblBookCopy WHERE bookId = " + book.getId()));
        }
    }

    private static Book newBook(String name, BookCopy... copies) {
        Book book = new Book();
        book.setName(name);
        book.setAuthor("Yoshito Usui");
        book.setPublisher("Kim Đồng");
        book.setCategory("Thiếu nhi");
        book.setRentalPrice(3000f);
        book.setListBookCopy(new ArrayList<>(List.of(copies)));
        return book;
    }

    private static BookCopy copy(String barcode) {
        BookCopy copy = new BookCopy();
        copy.setBarcode(barcode);
        return copy;
    }

    private static List<Integer> ids(List<Book> books) {
        return books.stream().map(Book::getId).toList();
    }

    private static List<Integer> copyCounts(List<Book> books) {
        return books.stream().map(b -> b.getListBookCopy().size()).toList();
    }

    private static List<String> barcodes(Book book) {
        return book.getListBookCopy().stream().map(BookCopy::getBarcode).toList();
    }

    private static void assertCopiesSortedAndOwned(List<Book> books) {
        for (Book book : books) {
            int previous = 0;
            for (BookCopy bookCopy : book.getListBookCopy()) {
                assertTrue(bookCopy.getId() > previous, bookCopy.getBarcode());
                assertSame(book, bookCopy.getBook());
                previous = bookCopy.getId();
            }
        }
    }

    private static void execute(TestDatabase database, String sql) throws SQLException {
        try (Connection con = database.connection(); Statement statement = con.createStatement()) {
            statement.executeUpdate(sql);
        }
    }

    private static int queryInt(TestDatabase database, String sql) throws SQLException {
        try (Connection con = database.connection(); Statement statement = con.createStatement();
                ResultSet rs = statement.executeQuery(sql)) {
            assertTrue(rs.next());
            return rs.getInt(1);
        }
    }
}
