package vn.tiemtruyen.util;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.time.LocalDate;
import java.time.LocalDateTime;
import org.junit.jupiter.api.Test;

/** docs/contracts.md §13: tiền, ngày, ngày giờ. */
class DisplayTest {

    @Test
    void moneyGroupsThousandsWithDotsAndSuffixesDong() {
        assertEquals("0đ", Display.money(0));
        assertEquals("500đ", Display.money(500));
        assertEquals("3.000đ", Display.money(3000f));
        assertEquals("42.000đ", Display.money(42000f));
        assertEquals("150.000đ", Display.money(150000));
        assertEquals("1.234.567đ", Display.money(1234567));
        assertEquals("-3.000đ", Display.money(-3000));
    }

    @Test
    void moneyRoundsToWholeDong() {
        assertEquals("3.000đ", Display.money(2999.6f));
        assertEquals("21.000đ", Display.money(3000f * 1 * 7));
    }

    @Test
    void dateAndDateTimeUseContractPatterns() {
        assertEquals("25/09/2026", Display.date(LocalDate.of(2026, 9, 25)));
        assertEquals("09:00 25/09/2026", Display.dateTime(LocalDateTime.of(2026, 9, 25, 9, 0)));
        assertEquals("", Display.date(null));
        assertEquals("", Display.dateTime(null));
    }
}
