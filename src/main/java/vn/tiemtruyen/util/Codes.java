package vn.tiemtruyen.util;

import java.util.Locale;
import java.util.Objects;
import java.util.OptionalInt;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Mã hiển thị và mã vạch theo D8 (docs/contracts.md §2 tblBookCopy, §13, C9).
 *
 * <ul>
 *   <li>Mã đầu truyện: {@code DT} + id đủ 3 chữ số, chỉ lúc hiển thị (id 1 → {@code DT001}).</li>
 *   <li>Mã phiếu mượn: {@code PM} + id đủ 4 chữ số, chỉ lúc hiển thị (id 125 → {@code PM0125}).</li>
 *   <li>Mã vạch quyển: mã đầu truyện + {@code -} + số thứ tự quyển đủ 2 chữ số, lưu thật trong DB
 *   ({@code DT001-03}).</li>
 * </ul>
 * "Đủ N chữ số" là đệm số 0 tới tối thiểu N chữ số; id lớn hơn thì giữ nguyên các chữ số.
 */
public final class Codes {

    /** Từ khoá dạng {@code PM} + chữ số (không phân biệt hoa thường), tối đa 9 chữ số để vừa {@code int}. */
    private static final Pattern RENTAL_BILL_CODE = Pattern.compile("(?i)PM(\\d{1,9})");

    private Codes() {
    }

    /**
     * Mã đầu truyện.
     *
     * @param bookId id đầu truyện, từ 1
     * @return ví dụ {@code DT001}
     */
    public static String bookCode(int bookId) {
        return String.format(Locale.ROOT, "DT%03d", requirePositive(bookId, "bookId"));
    }

    /**
     * Mã phiếu mượn.
     *
     * @param rentalBillId id phiếu mượn, từ 1
     * @return ví dụ {@code PM0125}
     */
    public static String rentalBillCode(int rentalBillId) {
        return String.format(Locale.ROOT, "PM%04d", requirePositive(rentalBillId, "rentalBillId"));
    }

    /**
     * Mã vạch của một quyển.
     *
     * @param bookId id đầu truyện, từ 1
     * @param copyNumber số thứ tự quyển trong đầu truyện, từ 1
     * @return ví dụ {@code DT001-03}
     */
    public static String barcode(int bookId, int copyNumber) {
        return bookCode(bookId) + String.format(Locale.ROOT, "-%02d", requirePositive(copyNumber, "copyNumber"));
    }

    /**
     * Tách id phiếu từ từ khoá tìm kiếm dạng {@code PM} + số (C9), bỏ khoảng trắng hai đầu.
     *
     * @param keyword từ khoá người dùng nhập
     * @return id khi từ khoá đúng dạng (ví dụ {@code pm0125} → 125), rỗng khi không phải mã phiếu
     */
    public static OptionalInt parseRentalBillId(String keyword) {
        Objects.requireNonNull(keyword, "keyword");
        Matcher matcher = RENTAL_BILL_CODE.matcher(keyword.strip());
        if (!matcher.matches()) {
            return OptionalInt.empty();
        }
        return OptionalInt.of(Integer.parseInt(matcher.group(1)));
    }

    private static int requirePositive(int value, String name) {
        if (value < 1) {
            throw new IllegalArgumentException(name + " phải từ 1, đang là " + value);
        }
        return value;
    }
}
