package vn.tiemtruyen.util;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.util.OptionalInt;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;

class CodesTest {

    @ParameterizedTest
    @CsvSource({"1, DT001", "15, DT015", "21, DT021", "999, DT999", "1234, DT1234"})
    void bookCodePadsToThreeDigits(int id, String expected) {
        assertEquals(expected, Codes.bookCode(id));
    }

    @ParameterizedTest
    @CsvSource({"1, PM0001", "110, PM0110", "125, PM0125", "9999, PM9999", "12345, PM12345"})
    void rentalBillCodePadsToFourDigits(int id, String expected) {
        assertEquals(expected, Codes.rentalBillCode(id));
    }

    @ParameterizedTest
    @CsvSource({"1, 3, DT001-03", "20, 2, DT020-02", "2, 1, DT002-01", "15, 12, DT015-12", "7, 100, DT007-100"})
    void barcodeJoinsBookCodeAndTwoDigitCopyNumber(int bookId, int copyNumber, String expected) {
        assertEquals(expected, Codes.barcode(bookId, copyNumber));
    }

    @Test
    void rejectsNonPositiveIds() {
        assertThrows(IllegalArgumentException.class, () -> Codes.bookCode(0));
        assertThrows(IllegalArgumentException.class, () -> Codes.rentalBillCode(-1));
        assertThrows(IllegalArgumentException.class, () -> Codes.barcode(1, 0));
        assertThrows(IllegalArgumentException.class, () -> Codes.barcode(0, 1));
    }

    @ParameterizedTest
    @CsvSource({"PM0125, 125", "pm0125, 125", "Pm0125, 125", "pM0125, 125", "PM125, 125", "'  PM0117 ', 117",
        "PM0001, 1", "PM999999999, 999999999"})
    void parsesRentalBillCodeCaseInsensitively(String keyword, int expected) {
        assertEquals(OptionalInt.of(expected), Codes.parseRentalBillId(keyword));
    }

    @ParameterizedTest
    @ValueSource(strings = {"", "PM", "PM01A", "PM 0125", "XPM0125", "PM0125X", "Trần Minh Anh", "001203012345",
        "PM1234567890", "DT001", "PM-125", "ＰＭ０１２５"})
    void nonCodeKeywordsAreNotRentalBillIds(String keyword) {
        assertEquals(OptionalInt.empty(), Codes.parseRentalBillId(keyword));
    }

    @Test
    void roundTripsFormattedRentalBillCode() {
        assertEquals(OptionalInt.of(125), Codes.parseRentalBillId(Codes.rentalBillCode(125)));
    }
}
