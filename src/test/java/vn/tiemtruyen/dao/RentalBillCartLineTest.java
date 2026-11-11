package vn.tiemtruyen.dao;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static vn.tiemtruyen.dao.RentalBillDAOTest.LAN;
import static vn.tiemtruyen.dao.RentalBillDAOTest.NAM;
import static vn.tiemtruyen.dao.RentalBillDAOTest.add;
import static vn.tiemtruyen.dao.RentalBillDAOTest.client;
import static vn.tiemtruyen.dao.RentalBillDAOTest.copy;
import static vn.tiemtruyen.dao.RentalBillDAOTest.number;
import static vn.tiemtruyen.dao.RentalBillDAOTest.resetBills;
import static vn.tiemtruyen.dao.RentalBillDAOTest.update;

import java.sql.SQLException;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.Callable;
import java.util.concurrent.CyclicBarrier;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.RepeatedTest;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Timeout;
import vn.tiemtruyen.model.Cart;
import vn.tiemtruyen.model.RentalBill;
import vn.tiemtruyen.model.RentedBook;
import vn.tiemtruyen.model.SelectedBook;
import vn.tiemtruyen.support.TestDatabase;

/**
 * C21 (contracts §14): khách mở hai thiết bị. Thiết bị A giữ {@code rentalBill} lập từ giỏ cũ trong session; thiết bị
 * B xoá dòng "Truyện đã chọn" hoặc xác nhận phiếu từ cùng các dòng giỏ. {@code addRentalBill} phải trả {@code false}
 * (không lỗi khoá ngoại) khi dòng giỏ của phiếu không còn tự do, và {@code updateCart} không được xoá dòng vừa thành
 * dòng của phiếu. Ca song song dùng mỗi luồng một kết nối và một {@link CyclicBarrier} như
 * {@code RentalBillConcurrencyTest}.
 */
class RentalBillCartLineTest {

    private static final long WAIT_SECONDS = 30;
    private static final String BILLS_OF_NAM = "SELECT COUNT(*) FROM tblRentalBill WHERE clientId = " + NAM;

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
    void clearBills() throws Exception {
        resetBills(db);
    }

    /** (a) Thiết bị B xoá một dòng giỏ trước khi thiết bị A xác nhận: false, không phiếu nào, giỏ còn dòng kia. */
    @Test
    @Timeout(60)
    void cartLineDeletedBeforeConfirmMakesAddReturnFalse() throws Exception {
        Cart cart = cartWith(NAM, "DT001-01", "DT020-01");
        RentalBill deviceA = billFrom(cart);
        Cart deviceB = getCart(NAM);
        deviceB.getListSelectedBook().removeIf(line -> line.getBookCopy().getBarcode().equals("DT001-01"));
        assertTrue(updateCart(deviceB));

        assertFalse(add(db, deviceA));
        assertEquals(0, deviceA.getId(), "bên thua không được gán id");
        assertEquals(0, number(db, BILLS_OF_NAM));
        assertEquals(0, number(db, "SELECT COUNT(*) FROM tblRentedBook"));
        assertEquals(1, getCart(NAM).getListSelectedBook().size());
    }

    /** (b) Hai thiết bị xác nhận cùng giỏ lần lượt: phiếu đầu được lưu, lần sau false, chỉ một phiếu. */
    @Test
    @Timeout(60)
    void confirmingTheSameCartLinesTwiceCreatesOneBill() throws Exception {
        Cart cart = cartWith(NAM, "DT001-01", "DT020-01");
        RentalBill deviceA = billFrom(cart);
        RentalBill deviceB = billFrom(cart);
        assertTrue(add(db, deviceA));
        assertFalse(add(db, deviceB));
        assertEquals(0, deviceB.getId());
        assertEquals(1, number(db, BILLS_OF_NAM));
        assertEquals(2, number(db, "SELECT COUNT(*) FROM tblRentedBook"));
        assertTrue(getCart(NAM).getListSelectedBook().isEmpty(), "dòng giỏ đã thuộc phiếu không còn tự do");
    }

    /** (b) Hai thiết bị xác nhận cùng giỏ cùng lúc: đúng một phiếu, mỗi dòng giỏ chỉ thuộc một dòng phiếu. */
    @RepeatedTest(15)
    @Timeout(60)
    void twoDevicesConfirmingTheSameCartLinesAtOnceCreateExactlyOneBill() throws Exception {
        Cart cart = cartWith(NAM, "DT001-01", "DT020-01");
        RentalBill deviceA = billFrom(cart);
        RentalBill deviceB = billFrom(cart);
        List<Object> results = race(List.of(adding(deviceA), adding(deviceB)));
        assertEquals(1, results.stream().filter(Boolean.TRUE::equals).count(), "kết quả: " + results);
        assertEquals(1, number(db, BILLS_OF_NAM));
        assertEquals(2, number(db, "SELECT COUNT(*) FROM tblRentedBook"));
        assertEquals(2, number(db, "SELECT COUNT(DISTINCT selectedBookId) FROM tblRentedBook"));
    }

    /**
     * (a) Thiết bị B xoá dòng giỏ đúng lúc thiết bị A xác nhận: hoặc phiếu được lưu và dòng ở lại với phiếu, hoặc
     * dòng bị xoá và A nhận false. Không bên nào ném lỗi (khoá ngoại, deadlock).
     */
    @RepeatedTest(15)
    @Timeout(60)
    void deletingACartLineWhileConfirmingNeverFails() throws Exception {
        Cart cart = cartWith(NAM, "DT001-01", "DT020-01");
        RentalBill deviceA = billFrom(cart);
        Cart deviceB = getCart(NAM);
        deviceB.getListSelectedBook().removeIf(line -> line.getBookCopy().getBarcode().equals("DT001-01"));
        List<Object> results = race(List.of(adding(deviceA), () -> updateCart(deviceB)));
        assertEquals(true, results.get(1), "updateCart không có dòng mới trùng quyển nên luôn true");
        if (Boolean.TRUE.equals(results.get(0))) {
            assertEquals(1, number(db, BILLS_OF_NAM));
            assertEquals(2, number(db, "SELECT COUNT(*) FROM tblSelectedBook"), "dòng của phiếu không bị xoá");
        } else {
            assertEquals(0, number(db, BILLS_OF_NAM));
            assertEquals(1, number(db, "SELECT COUNT(*) FROM tblSelectedBook"));
        }
    }

    @Test
    @Timeout(60)
    void cartLineOfAnotherClientIsRejected() throws Exception {
        Cart lanCart = cartWith(LAN, "DT001-01");
        RentalBill bill = billFrom(lanCart);
        bill.setClient(client(NAM));
        assertFalse(add(db, bill));
        assertEquals(0, number(db, "SELECT COUNT(*) FROM tblRentalBill"));
    }

    @Test
    @Timeout(60)
    void sameCartLineTwiceInOneBillIsRejected() throws Exception {
        Cart cart = cartWith(NAM, "DT001-01");
        RentalBill bill = billFrom(cart);
        RentedBook twin = row(cart.getListSelectedBook().get(0));
        bill.getListRentedBook().add(twin);
        assertFalse(add(db, bill));
        assertEquals(0, number(db, "SELECT COUNT(*) FROM tblRentalBill"));
    }

    /** Dòng giỏ từng thuộc phiếu đã huỷ là dòng tự do (contracts §5.3 getCart): lập phiếu mới từ nó vẫn được. */
    @Test
    @Timeout(60)
    void cartLineReleasedByACancelledBillCanBeConfirmedAgain() throws Exception {
        Cart cart = cartWith(NAM, "DT001-01");
        RentalBill first = billFrom(cart);
        assertTrue(add(db, first));
        first.setStatus(RentalBill.STATUS_CANCELLED);
        first.setCancelReason("Đổi ý");
        assertTrue(update(db, first));
        Cart again = getCart(NAM);
        assertEquals(1, again.getListSelectedBook().size());
        assertTrue(add(db, billFrom(again)));
        assertEquals(2, number(db, BILLS_OF_NAM));
    }

    // ----- helper -----

    private static Cart cartWith(int clientId, String... barcodes) throws SQLException {
        Cart cart = getCart(clientId);
        for (String barcode : barcodes) {
            SelectedBook line = new SelectedBook();
            line.setBookCopy(copy(db, barcode));
            cart.getListSelectedBook().add(line);
        }
        assertTrue(updateCart(cart));
        return cart;
    }

    private static Cart getCart(int clientId) throws SQLException {
        try (CartDAO dao = new CartDAO(db.connection())) {
            return dao.getCart(client(clientId));
        }
    }

    private static boolean updateCart(Cart cart) throws SQLException {
        try (CartDAO dao = new CartDAO(db.connection())) {
            return dao.updateCart(cart);
        }
    }

    /** Phiếu như SearchBookView lập: mỗi dòng giỏ một dòng phiếu trỏ về dòng giỏ đó. */
    private static RentalBill billFrom(Cart cart) {
        RentalBill bill = new RentalBill();
        bill.setClient(cart.getClient());
        bill.setExpectedPickupAt(LocalDateTime.now().plusDays(1).truncatedTo(ChronoUnit.SECONDS));
        bill.setExpectedDays(7);
        for (SelectedBook line : cart.getListSelectedBook()) {
            bill.getListRentedBook().add(row(line));
        }
        return bill;
    }

    private static RentedBook row(SelectedBook line) {
        RentedBook row = new RentedBook();
        row.setSelectedBook(line);
        row.setBookCopy(line.getBookCopy());
        row.setRentalPrice(3000f);
        return row;
    }

    private static Callable<Object> adding(RentalBill bill) {
        return () -> {
            try (RentalBillDAO dao = new RentalBillDAO(db.connection())) {
                return dao.addRentalBill(bill);
            }
        };
    }

    /** Mỗi việc một luồng; mọi luồng mượn kết nối trong việc, qua barrier cùng lúc. Kết quả theo thứ tự việc. */
    private static List<Object> race(List<Callable<Object>> jobs) throws Exception {
        CyclicBarrier start = new CyclicBarrier(jobs.size());
        ExecutorService pool = Executors.newFixedThreadPool(jobs.size());
        try {
            List<Future<Object>> futures = new ArrayList<>();
            for (Callable<Object> job : jobs) {
                futures.add(pool.submit(() -> {
                    start.await(WAIT_SECONDS, TimeUnit.SECONDS);
                    return job.call();
                }));
            }
            List<Object> results = new ArrayList<>();
            for (Future<Object> future : futures) {
                results.add(future.get(WAIT_SECONDS, TimeUnit.SECONDS));
            }
            return results;
        } finally {
            pool.shutdownNow();
        }
    }
}
