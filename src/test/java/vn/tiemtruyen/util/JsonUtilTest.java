package vn.tiemtruyen.util;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;

import java.time.LocalDate;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class JsonUtilTest {

    record Row(int bookId, String bookCode, String name, double rentalPrice, String note, LocalDate dueDate) {
    }

    @Test
    void escapesCharactersThatCouldBreakOutOfScriptTag() {
        String json = JsonUtil.toScriptJson(Map.of("name", "</script><!-- a & b > c \u2028 d \u2029 e"));
        assertEquals("{\"name\":\"\\u003c/script\\u003e\\u003c!-- a \\u0026 b \\u003e c \\u2028 d \\u2029 e\"}",
                json);
        for (char unsafe : new char[] {'<', '>', '&', '\u2028', '\u2029'}) {
            assertFalse(json.indexOf(unsafe) >= 0, "Kết quả còn kí tự thô U+" + Integer.toHexString(unsafe));
        }
    }

    @Test
    void escapedOutputStillParsesBackToTheSameValue() {
        String original = "Rách bìa, Vết bẩn, viết vẽ <b>&amp;</b> \u2028\u2029 \"quote\" \\ /";
        String json = JsonUtil.toScriptJson(List.of(original));
        assertEquals(List.of(original), JsonReader.parse(json));
    }

    @Test
    void keepsVietnameseAsIsAndWritesIsoDatesAndNulls() {
        Row row = new Row(1, "DT001", "Doraemon - Tập 1", 3000, null, LocalDate.of(2026, 10, 2));
        Map<?, ?> parsed = (Map<?, ?>) JsonReader.parse(JsonUtil.toScriptJson(row));
        Map<String, Object> expected = new LinkedHashMap<>();
        expected.put("bookId", 1L);
        expected.put("bookCode", "DT001");
        expected.put("name", "Doraemon - Tập 1");
        expected.put("rentalPrice", 3000.0);
        expected.put("note", null);
        expected.put("dueDate", "2026-10-02");
        assertEquals(expected, parsed);
        assertFalse(JsonUtil.toScriptJson(row).contains("\\u1ead"), "Chữ tiếng Việt không bị escape");
    }

    @Test
    void writesNullAndNestedCollections() {
        assertEquals("null", JsonUtil.toScriptJson(null));
        assertEquals(Arrays.asList(List.of(), null), JsonReader.parse(JsonUtil.toScriptJson(Arrays.asList(List.of(),
                null))));
    }
}
