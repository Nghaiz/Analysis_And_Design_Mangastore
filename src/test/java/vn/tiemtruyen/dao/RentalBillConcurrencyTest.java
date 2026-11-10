package vn.tiemtruyen.dao;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static vn.tiemtruyen.dao.RentalBillDAOTest.HANT;
import static vn.tiemtruyen.dao.RentalBillDAOTest.LAN;
import static vn.tiemtruyen.dao.RentalBillDAOTest.LONG;
import static vn.tiemtruyen.dao.RentalBillDAOTest.NAM;
import static vn.tiemtruyen.dao.RentalBillDAOTest.add;
import static vn.tiemtruyen.dao.RentalBillDAOTest.barcodes;
import static vn.tiemtruyen.dao.RentalBillDAOTest.copy;
import static vn.tiemtruyen.dao.RentalBillDAOTest.held;
import static vn.tiemtruyen.dao.RentalBillDAOTest.newBill;
import static vn.tiemtruyen.dao.RentalBillDAOTest.number;
import static vn.tiemtruyen.dao.RentalBillDAOTest.rentalCollateral;
import static vn.tiemtruyen.dao.RentalBillDAOTest.resetBills;
import static vn.tiemtruyen.dao.RentalBillDAOTest.row;
import static vn.tiemtruyen.dao.RentalBillDAOTest.text;
import static vn.tiemtruyen.dao.RentalBillDAOTest.update;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
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
import vn.tiemtruyen.model.RentalBill;
import vn.tiemtruyen.model.RentedBook;
import vn.tiemtruyen.model.Staff;
import vn.tiemtruyen.support.TestDatabase;

/**
 * Khoá K1 và D9 dưới tranh chấp thật (contracts §6.1, §6.3): mỗi luồng một {@code Connection} riêng mượn trước, rồi
 * cùng chờ ở một {@link CyclicBarrier} để mọi transaction bắt đầu cùng lúc. Ca (1), (2) lặp nhiều vòng để bắt lỗi thưa.
 * Cuối lớp là các ca K1 tuần tự: đổi quyển khi thêm phiếu, và nhánh thêm dòng của {@code updateRentalBill}.
 */
class RentalBillConcurrencyTest {

    private static final long WAIT_SECONDS = 30;
    /** Đầu truyện 1 (Doraemon - Tập 1) có 7 quyển trong V10. */
    private static final int BOOK_ONE_COPIES = 7;
    private static final int RACERS = 10;

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

    /** (1) Hai luồng tranh quyển cuối của DT015: đúng một thành công, quyển chỉ bị giữ một lần. */
    @RepeatedTest(25)
    @Timeout(60)
    void twoThreadsRacingForTheLastCopyExactlyOneWins() throws Exception {
        assertTrue(add(db, newBill(db, NAM, "DT015-01")));
        RentalBill lan = newBill(db, LAN, "DT015-02");
        RentalBill vuLong = newBill(db, LONG, "DT015-02");
        List<Boolean> results = race(List.of(lan, vuLong), true);
        assertEquals(1, results.stream().filter(Boolean::booleanValue).count(), "kết quả: " + results);
        assertEquals(1, held(db, "DT015-02"));
        assertEquals(2, number(db, "SELECT COUNT(*) FROM tblRentalBill"), "bên thua không để lại phiếu");
    }

    /** (2) N luồng cùng xin một quyển của đầu truyện có M quyển: M luồng thắng, M quyển khác nhau bị giữ. */
    @RepeatedTest(15)
    @Timeout(60)
    void manyThreadsRacingForFewerCopiesHoldEachCopyOnce() throws Exception {
        List<RentalBill> bills = new ArrayList<>();
        for (int i = 0; i < RACERS; i++) {
            bills.add(newBill(db, NAM + i % 3, "DT001-01"));
        }
        List<Boolean> results = race(bills, true);
        assertEquals(BOOK_ONE_COPIES, results.stream().filter(Boolean::booleanValue).count(), "kết quả: " + results);
        String rows = "FROM tblRentedBook rb JOIN tblBookCopy c ON c.id = rb.bookCopyId WHERE c.bookId = 1";
        assertEquals(BOOK_ONE_COPIES, number(db, "SELECT COUNT(*) " + rows));
        assertEquals(BOOK_ONE_COPIES, number(db, "SELECT COUNT(DISTINCT rb.bookCopyId) " + rows));
        Set<String> given = new HashSet<>();
        for (int i = 0; i < RACERS; i++) {
            RentalBill bill = bills.get(i);
            if (results.get(i)) {
                assertTrue(given.add(bill.getListRentedBook().get(0).getBookCopy().getBarcode()));
            } else {
                assertEquals(0, bill.getId(), "bên thua không được gán id");
            }
        }
    }

    /** (3) Hai luồng cùng chọn DT001-01: cả hai thành công, bên đến sau được đổi sang quyển trống nhỏ nhất. */
    @RepeatedTest(10)
    @Timeout(60)
    void chosenCopyTakenConcurrentlyIsSwappedForAnotherFreeCopy() throws Exception {
        RentalBill nam = newBill(db, NAM, "DT001-01");
        RentalBill lan = newBill(db, LAN, "DT001-01");
        assertEquals(List.of(true, true), race(List.of(nam, lan), true));
        Set<String> barcodes = Set.of(nam.getListRentedBook().get(0).getBookCopy().getBarcode(),
                lan.getListRentedBook().get(0).getBookCopy().getBarcode());
        assertEquals(Set.of("DT001-01", "DT001-02"), barcodes);
        assertEquals(1, held(db, "DT001-01"));
        assertEquals(1, held(db, "DT001-02"));
    }

    /** (4) Khách huỷ đúng lúc nhân viên xác nhận (D9): một bên thắng, bên kia nhận false, DB khớp bên thắng. */
    @RepeatedTest(10)
    @Timeout(60)
    void cancelAndConfirmAtTheSameTimeLetExactlyOneWin() throws Exception {
        RentalBill created = newBill(db, NAM, "DT020-01", "DT020-02");
        assertTrue(add(db, created));
        RentalBill cancel = reread(created.getId());
        cancel.setStatus(RentalBill.STATUS_CANCELLED);
        cancel.setCancelReason("Đổi ý");
        RentalBill confirm = reread(created.getId());
        confirm.getListRentedBook().remove(1);
        confirm.setStatus(RentalBill.STATUS_RENTING);
        confirm.setStaff(new Staff());
        confirm.getStaff().setId(HANT);
        confirm.setBorrowDate(LocalDate.of(2026, 9, 25));
        confirm.setDueDate(LocalDate.of(2026, 10, 2));
        List<Boolean> results = race(List.of(cancel, confirm), false);
        assertEquals(1, results.stream().filter(Boolean::booleanValue).count(), "kết quả: " + results);
        String status = text(db, "SELECT status FROM tblRentalBill WHERE id = ?", created.getId());
        String reason = text(db, "SELECT cancelReason FROM tblRentalBill WHERE id = ?", created.getId());
        String staff = text(db, "SELECT staffId FROM tblRentalBill WHERE id = ?", created.getId());
        int rows = number(db, "SELECT COUNT(*) FROM tblRentedBook WHERE rentalBillId = ?", created.getId());
        if (results.get(0)) {
            assertEquals(RentalBill.STATUS_CANCELLED, status);
            assertEquals("Đổi ý", reason);
            assertNull(staff);
            assertEquals(2, rows);
        } else {
            assertEquals(RentalBill.STATUS_RENTING, status);
            assertNull(reason);
            assertEquals(String.valueOf(HANT), staff);
            assertEquals(1, rows);
        }
    }

    @Test
    @Timeout(60)
    void addSwapsBusyCopyToAnotherFreeCopyNotInBill() throws Exception {
        assertTrue(add(db, newBill(db, NAM, "DT001-01")));
        RentalBill bill = newBill(db, LAN, "DT001-01", "DT001-02");
        assertTrue(add(db, bill));
        assertEquals(Set.of("DT001-02", "DT001-03"), Set.copyOf(barcodes(bill)));
        assertEquals(1, held(db, "DT001-01"));
        assertEquals(1, held(db, "DT001-02"));
        assertEquals(1, held(db, "DT001-03"));
    }

    @Test
    @Timeout(60)
    void updateAddsNewRowThroughK1AndRewritesCollaterals() throws Exception {
        assertTrue(add(db, newBill(db, LAN, "DT001-02")));
        RentalBill bill = newBill(db, NAM, "DT001-01");
        assertTrue(add(db, bill));
        bill.getListRentalCollateral().add(rentalCollateral(1, "001098004512"));
        assertTrue(update(db, bill));
        RentedBook added = row(copy(db, "DT001-02"));
        bill.getListRentedBook().add(added);
        bill.getListRentalCollateral().set(0, rentalCollateral(2, "100.000đ"));
        assertTrue(update(db, bill));
        assertTrue(added.getId() > 0);
        assertEquals("DT001-03", added.getBookCopy().getBarcode(), "DT001-02 bận nên đổi sang quyển trống nhỏ nhất");
        assertTrue(bill.getListRentalCollateral().get(0).getId() > 0);
        assertEquals("100.000đ", text(db, "SELECT GROUP_CONCAT(value) FROM tblRentalCollateral WHERE rentalBillId = ?",
                bill.getId()));
    }

    @Test
    @Timeout(60)
    void updateReturnsFalseAndRollsBackEverythingWhenNewRowHasNoFreeCopy() throws Exception {
        assertTrue(add(db, newBill(db, LAN, "DT015-02")));
        RentalBill bill = newBill(db, NAM, "DT015-01", "DT002-01");
        assertTrue(add(db, bill));
        bill.getListRentedBook().remove(1);
        bill.getListRentedBook().get(0).setConditionNote("đã xem");
        RentedBook added = row(copy(db, "DT015-02"));
        bill.getListRentedBook().add(added);
        bill.setNote("ghi chú mới");
        assertFalse(update(db, bill));
        assertEquals(0, added.getId());
        assertEquals(1, held(db, "DT002-01"), "dòng bị bỏ được khôi phục khi rollback");
        assertNull(text(db, "SELECT note FROM tblRentalBill WHERE id = ?", bill.getId()));
        assertNull(text(db, "SELECT MAX(conditionNote) FROM tblRentedBook WHERE rentalBillId = ?", bill.getId()));
    }

    private static RentalBill reread(int billId) throws Exception {
        try (RentalBillDAO dao = new RentalBillDAO(db.connection())) {
            return dao.searchRentalBill("PM" + billId).get(0);
        }
    }

    /**
     * Mỗi phiếu một luồng, một kết nối mượn trước khi chờ; mọi luồng qua barrier cùng lúc rồi gọi
     * {@code addRentalBill} ({@code adding}) hoặc {@code updateRentalBill}. Kết quả theo thứ tự {@code bills}.
     */
    private static List<Boolean> race(List<RentalBill> bills, boolean adding) throws Exception {
        CyclicBarrier start = new CyclicBarrier(bills.size());
        ExecutorService pool = Executors.newFixedThreadPool(bills.size());
        try {
            List<Future<Boolean>> futures = new ArrayList<>();
            for (RentalBill bill : bills) {
                futures.add(pool.submit(() -> {
                    try (RentalBillDAO dao = new RentalBillDAO(db.connection())) {
                        start.await(WAIT_SECONDS, TimeUnit.SECONDS);
                        return adding ? dao.addRentalBill(bill) : dao.updateRentalBill(bill);
                    }
                }));
            }
            List<Boolean> results = new ArrayList<>();
            for (Future<Boolean> future : futures) {
                results.add(future.get(WAIT_SECONDS, TimeUnit.SECONDS));
            }
            return results;
        } finally {
            pool.shutdownNow();
        }
    }
}
