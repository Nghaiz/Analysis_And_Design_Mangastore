package vn.tiemtruyen.util;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.util.Arrays;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

class JsonReaderTest {

    @Test
    void readsNestedStructuresKeepingKeyOrder() {
        Object value = JsonReader.parse(" {\"b\": [1, -2.5e1, true, false, null], \"a\": {\"x\": \"y\"}, \"c\": {}} ");
        Map<?, ?> root = (Map<?, ?>) value;
        assertEquals(List.of("b", "a", "c"), List.copyOf(root.keySet()));
        assertEquals(Arrays.asList(1L, -25.0, true, false, null), root.get("b"));
        assertEquals(Map.of("x", "y"), root.get("a"));
        assertEquals(Map.of(), root.get("c"));
    }

    @Test
    void decodesEscapesAndUnicode() {
        assertEquals("a\"b\\c/d\n\t\u00e9 Tiệm", JsonReader.parse("\"a\\\"b\\\\c\\/d\\n\\t\\u00e9 Tiệm\""));
    }

    @Test
    void readsScalarsAndEmptyArray() {
        assertNull(JsonReader.parse("null"));
        assertEquals(0L, JsonReader.parse("0"));
        assertEquals(List.of(), JsonReader.parse("[ ]"));
    }

    @ParameterizedTest
    @ValueSource(strings = {"", "{", "[1,]", "{\"a\":1,}", "{\"a\" 1}", "01", "1.", "-", "\"abc", "tru", "nul",
        "{\"a\":1}x", "\"\\x\"", "\"\\u12\"", "{\"a\":1,\"a\":2}", "{a:1}", "'a'", "\"tab\there\""})
    void rejectsInvalidJson(String json) {
        assertThrows(IllegalArgumentException.class, () -> JsonReader.parse(json));
    }
}
