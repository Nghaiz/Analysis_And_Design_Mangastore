package vn.tiemtruyen.util;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

/**
 * Định dạng hiển thị theo docs/contracts.md §13, dùng chung cho mọi trang JSP (gọi bằng scriptlet hoặc
 * {@code <%= Display.money(...) %>}). Chỉ định dạng, không tính tổng: tổng tính ở trang lúc hiển thị.
 *
 * <ul>
 *   <li>Tiền: làm tròn tới đồng, nhóm ba chữ số bằng dấu chấm, hậu tố {@code đ} liền sau
 *   ({@code 3000f → "3.000đ"}, {@code 0f → "0đ"}).</li>
 *   <li>Ngày: {@code dd/MM/yyyy}. Ngày giờ: {@code HH:mm dd/MM/yyyy}.</li>
 *   <li>Giá trị {@code null} (ngày chưa có) → chuỗi rỗng, không bịa chữ (C11).</li>
 * </ul>
 */
public final class Display {

    /** Số chữ số mỗi nhóm khi viết tiền (§13: {@code 1.234.567đ}). */
    private static final int GROUP = 3;
    private static final DateTimeFormatter DATE = DateTimeFormatter.ofPattern("dd/MM/yyyy", Locale.ROOT);
    private static final DateTimeFormatter DATE_TIME = DateTimeFormatter.ofPattern("HH:mm dd/MM/yyyy", Locale.ROOT);

    private Display() {
    }

    /**
     * Số tiền theo §13.
     *
     * @param amount số đồng (float như ch.9, C13)
     * @return ví dụ {@code 42.000đ}; số âm có dấu trừ đứng trước ({@code -3.000đ})
     */
    public static String money(double amount) {
        long rounded = Math.round(amount);
        String digits = Long.toString(Math.abs(rounded));
        StringBuilder grouped = new StringBuilder(digits.length() + digits.length() / GROUP + 2);
        int lead = digits.length() % GROUP;
        for (int i = 0; i < digits.length(); i++) {
            if (i > 0 && (i - lead) % GROUP == 0) {
                grouped.append('.');
            }
            grouped.append(digits.charAt(i));
        }
        return (rounded < 0 ? "-" : "") + grouped + "đ";
    }

    /**
     * Ngày theo §13.
     *
     * @param date ngày, có thể null
     * @return ví dụ {@code 25/09/2026}; null → chuỗi rỗng
     */
    public static String date(LocalDate date) {
        return date == null ? "" : DATE.format(date);
    }

    /**
     * Ngày giờ theo §13.
     *
     * @param dateTime ngày giờ, có thể null
     * @return ví dụ {@code 09:00 25/09/2026}; null → chuỗi rỗng
     */
    public static String dateTime(LocalDateTime dateTime) {
        return dateTime == null ? "" : DATE_TIME.format(dateTime);
    }
}
