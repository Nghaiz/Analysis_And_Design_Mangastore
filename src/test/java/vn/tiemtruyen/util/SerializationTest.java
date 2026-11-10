package vn.tiemtruyen.util;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotSame;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertSame;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.ObjectInputStream;
import java.io.ObjectOutputStream;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;
import vn.tiemtruyen.model.Book;
import vn.tiemtruyen.model.BookCopy;
import vn.tiemtruyen.model.Cart;
import vn.tiemtruyen.model.Client;
import vn.tiemtruyen.model.Collateral;
import vn.tiemtruyen.model.Damage;
import vn.tiemtruyen.model.RentalBill;
import vn.tiemtruyen.model.RentalCollateral;
import vn.tiemtruyen.model.RentedBook;
import vn.tiemtruyen.model.RentedDamage;
import vn.tiemtruyen.model.SelectedBook;
import vn.tiemtruyen.model.Staff;

/** Session nằm trong Redis (D7): cả đồ thị Cart và RentalBill phải tuần tự hoá rồi đọc lại được. */
class SerializationTest {

    @Test
    void cartGraphRoundTripsWithCyclicBookAndCopy() throws Exception {
        Book book = book(1, "Doraemon - Tập 1", 3000f);
        BookCopy copy = copy(3, "DT001-03", book);
        Cart cart = new Cart();
        cart.setId(7);
        cart.setClient(client());
        SelectedBook selected = new SelectedBook();
        selected.setId(11);
        selected.setBookCopy(copy);
        cart.setListSelectedBook(List.of(selected));

        Cart restored = roundTrip(cart);

        assertNotSame(cart, restored);
        assertEquals(7, restored.getId());
        assertClient(restored.getClient());
        SelectedBook restoredSelected = restored.getListSelectedBook().get(0);
        assertEquals(11, restoredSelected.getId());
        BookCopy restoredCopy = restoredSelected.getBookCopy();
        assertEquals("DT001-03", restoredCopy.getBarcode());
        Book restoredBook = restoredCopy.getBook();
        assertEquals("Doraemon - Tập 1", restoredBook.getName());
        assertEquals(2023, restoredBook.getPublishYear());
        assertEquals(3000f, restoredBook.getRentalPrice());
        assertSame(restoredCopy, restoredBook.getListBookCopy().get(0), "Vòng Book ↔ BookCopy giữ nguyên");
    }

    @Test
    void rentalBillGraphRoundTripsWithRentedBooksDamagesAndCollaterals() throws Exception {
        Book book = book(20, "Thám tử lừng danh Conan - Tập 1", 3000f);
        BookCopy copy = copy(41, "DT020-02", book);
        Damage damage = new Damage();
        damage.setId(1);
        damage.setName("Rách bìa");
        damage.setDescription("Bìa truyện bị rách");
        RentedDamage rentedDamage = new RentedDamage();
        rentedDamage.setId(5);
        rentedDamage.setNote("Góc trên");
        rentedDamage.setDamage(damage);
        RentedBook rentedBook = new RentedBook();
        rentedBook.setId(9);
        rentedBook.setRentalPrice(3000f);
        rentedBook.setConditionNote("");
        rentedBook.setBookCopy(copy);
        rentedBook.setListRentedDamage(List.of(rentedDamage));
        Collateral collateral = new Collateral();
        collateral.setId(2);
        collateral.setName("Tiền mặt");
        RentalCollateral rentalCollateral = new RentalCollateral();
        rentalCollateral.setId(3);
        rentalCollateral.setValue("100.000đ");
        rentalCollateral.setCollateral(collateral);
        Staff staff = new Staff();
        staff.setId(1);
        staff.setUsername("hant");
        staff.setFullName("Nguyễn Thu Hà");
        staff.setPosition(Staff.POSITION_SALES);

        RentalBill bill = new RentalBill();
        bill.setId(125);
        bill.setCreatedAt(LocalDateTime.of(2026, 9, 24, 20, 15));
        bill.setExpectedPickupAt(LocalDateTime.of(2026, 9, 25, 9, 0));
        bill.setExpectedDays(7);
        bill.setBorrowDate(LocalDate.of(2026, 9, 25));
        bill.setDueDate(LocalDate.of(2026, 10, 2));
        bill.setDiscount(0f);
        bill.setStatus(RentalBill.STATUS_PENDING);
        bill.setClient(client());
        bill.setStaff(staff);
        bill.setListRentedBook(List.of(rentedBook));
        bill.setListRentalCollateral(List.of(rentalCollateral));

        RentalBill restored = roundTrip(bill);

        assertEquals(125, restored.getId());
        assertEquals(LocalDateTime.of(2026, 9, 25, 9, 0), restored.getExpectedPickupAt());
        assertEquals(LocalDate.of(2026, 10, 2), restored.getDueDate());
        assertEquals(7, restored.getExpectedDays());
        assertEquals("Chờ nhận", restored.getStatus());
        assertNull(restored.getNote());
        assertClient(restored.getClient());
        assertEquals(Staff.POSITION_SALES, restored.getStaff().getPosition());
        RentedBook restoredRented = restored.getListRentedBook().get(0);
        assertEquals("", restoredRented.getConditionNote());
        assertNull(restoredRented.getSelectedBook());
        assertEquals("DT020-02", restoredRented.getBookCopy().getBarcode());
        assertEquals(20, restoredRented.getBookCopy().getBook().getId());
        assertEquals("Rách bìa", restoredRented.getListRentedDamage().get(0).getDamage().getName());
        assertEquals("Góc trên", restoredRented.getListRentedDamage().get(0).getNote());
        assertEquals("100.000đ", restored.getListRentalCollateral().get(0).getValue());
        assertEquals("Tiền mặt", restored.getListRentalCollateral().get(0).getCollateral().getName());
    }

    @Test
    void freshObjectsHaveEmptyChildListsAndRoundTrip() throws Exception {
        RentalBill restored = roundTrip(new RentalBill());
        assertEquals(0, restored.getId());
        assertEquals(List.of(), restored.getListRentedBook());
        assertEquals(List.of(), restored.getListRentalCollateral());
        assertEquals(List.of(), roundTrip(new Cart()).getListSelectedBook());
        assertEquals(List.of(), roundTrip(new Book()).getListBookCopy());
        assertEquals(List.of(), roundTrip(new RentedBook()).getListRentedDamage());
    }

    private static Book book(int id, String name, float price) {
        Book book = new Book();
        book.setId(id);
        book.setName(name);
        book.setAuthor("Fujiko F. Fujio");
        book.setPublisher("Kim Đồng");
        book.setPublishYear(2023);
        book.setCategory("Thiếu nhi");
        book.setRentalPrice(price);
        return book;
    }

    private static BookCopy copy(int id, String barcode, Book book) {
        BookCopy copy = new BookCopy();
        copy.setId(id);
        copy.setBarcode(barcode);
        copy.setBook(book);
        book.setListBookCopy(new ArrayList<>(List.of(copy)));
        return copy;
    }

    private static Client client() {
        Client client = new Client();
        client.setId(6);
        client.setUsername("minhanh");
        client.setFullName("Trần Minh Anh");
        client.setDob(LocalDate.of(2003, 5, 12));
        client.setIdCard("001203012345");
        client.setPhone("0912345678");
        client.setEmail("minhanh@example.com");
        client.setAddress("Hà Nội");
        return client;
    }

    private static void assertClient(Client client) {
        assertEquals(6, client.getId());
        assertEquals("minhanh", client.getUsername());
        assertNull(client.getPassword());
        assertEquals("Trần Minh Anh", client.getFullName());
        assertEquals(LocalDate.of(2003, 5, 12), client.getDob());
        assertEquals("001203012345", client.getIdCard());
    }

    @SuppressWarnings("unchecked")
    private static <T> T roundTrip(T value) throws IOException, ClassNotFoundException {
        ByteArrayOutputStream bytes = new ByteArrayOutputStream();
        try (ObjectOutputStream out = new ObjectOutputStream(bytes)) {
            out.writeObject(value);
        }
        try (ObjectInputStream in = new ObjectInputStream(new ByteArrayInputStream(bytes.toByteArray()))) {
            return (T) in.readObject();
        }
    }
}
