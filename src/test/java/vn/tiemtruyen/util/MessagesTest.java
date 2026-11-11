package vn.tiemtruyen.util;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.lang.reflect.Field;
import java.lang.reflect.Modifier;
import java.text.Normalizer;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import org.junit.jupiter.api.Test;
import vn.tiemtruyen.support.ContractsDoc;

class MessagesTest {

    private static final int EXPECTED_COUNT = 28;
    /** §10.3: câu ngoài báo cáo, chủ dự án duyệt 11/11/2026. */
    private static final int EXTRA_COUNT = 9;
    private static final String EXTRA_HEADING = "### 10.3 Câu ngoài báo cáo (chủ dự án duyệt 11/11/2026)";

    @Test
    void constantsMatchContractTableExactlyInBothDirections() throws IllegalAccessException {
        Map<String, String> documented = documentedMessages();
        assertEquals(EXPECTED_COUNT, documented.size(), "Bảng §10.1 của " + ContractsDoc.PATH + " phải có 28 câu");
        Map<String, String> extra = documentedExtraMessages();
        assertEquals(EXTRA_COUNT, extra.size(),
                "Bảng §10.3 của " + ContractsDoc.PATH + " phải có " + EXTRA_COUNT + " câu");
        for (String name : extra.keySet()) {
            assertEquals(null, documented.put(name, extra.get(name)), "Tên hằng trùng giữa §10.1 và §10.3: " + name);
        }

        Map<String, String> declared = declaredMessages();
        assertEquals(new TreeMap<>(documented), new TreeMap<>(declared),
                "Messages phải có đúng 28 hằng của §10.1 và " + EXTRA_COUNT
                        + " hằng của §10.3, đúng tên và đúng từng kí tự (không thiếu, không thừa)");
    }

    @Test
    void everyMessageIsNfc() throws IllegalAccessException {
        for (Map.Entry<String, String> entry : declaredMessages().entrySet()) {
            String value = entry.getValue();
            assertEquals(Normalizer.normalize(value, Normalizer.Form.NFC), value, entry.getKey() + " phải ở dạng NFC");
        }
    }

    @Test
    void quantityExceededReplacesExactlyTheSingleN() {
        assertEquals("Số lượng vượt quá số quyển hiện có (hiện còn 4 quyển).", Messages.quantityExceeded(4));
        assertEquals("Số lượng vượt quá số quyển hiện có (hiện còn 0 quyển).", Messages.quantityExceeded(0));
        assertEquals("Số lượng vượt quá số quyển hiện có (hiện còn 12 quyển).", Messages.quantityExceeded(12));
        assertEquals(1, Messages.QUANTITY_EXCEEDED.chars().filter(c -> c == 'N').count(),
                "QUANTITY_EXCEEDED phải chứa đúng một chữ N");
        assertTrue(Messages.QUANTITY_EXCEEDED.contains("(hiện còn N quyển)"));
    }

    @Test
    void quantityExceededRejectsNegative() {
        assertThrows(IllegalArgumentException.class, () -> Messages.quantityExceeded(-1));
    }

    private static Map<String, String> documentedMessages() {
        Map<String, String> documented = new LinkedHashMap<>();
        for (List<String> row : ContractsDoc.tableUnder("### 10.1 28 câu")) {
            assertEquals(2, row.size(), "Dòng bảng §10.1 phải có 2 ô: " + row);
            String previous = documented.put(row.get(0), row.get(1));
            assertEquals(null, previous, "Tên hằng lặp trong §10.1: " + row.get(0));
        }
        return documented;
    }

    private static Map<String, String> documentedExtraMessages() {
        Map<String, String> documented = new LinkedHashMap<>();
        for (List<String> row : ContractsDoc.tableUnder(EXTRA_HEADING)) {
            assertEquals(3, row.size(), "Dòng bảng §10.3 phải có 3 ô (hằng, câu, dùng ở): " + row);
            assertEquals(null, documented.put(row.get(0), row.get(1)), "Tên hằng lặp trong §10.3: " + row.get(0));
        }
        return documented;
    }

    private static Map<String, String> declaredMessages() throws IllegalAccessException {
        Map<String, String> declared = new LinkedHashMap<>();
        for (Field field : Messages.class.getDeclaredFields()) {
            int modifiers = field.getModifiers();
            if (!Modifier.isPublic(modifiers)) {
                continue;
            }
            assertTrue(Modifier.isStatic(modifiers) && Modifier.isFinal(modifiers) && field.getType() == String.class,
                    "Trường public của Messages phải là hằng String: " + field.getName());
            declared.put(field.getName(), (String) field.get(null));
        }
        return declared;
    }
}
