package vn.tiemtruyen.schema;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.junit.jupiter.api.Test;

/** Bộ đọc bảng tài liệu: ô khoá nhiều khoá, ghi chú UNIQUE/DEFAULT/Index, định dạng sai thì ném lỗi. */
class SchemaDocTest {

    private static List<String> doc(String... extra) {
        List<String> lines = new ArrayList<>(List.of("## 2. Bảng", "", "### tblA", "",
                "| Cột | Kiểu | Null | Khoá |", "|---|---|---|---|",
                "| id | int | NOT NULL | PK |",
                "| bId | int | NOT NULL | FK→tblB.id, UNIQUE |",
                "| at | timestamp | NOT NULL | |",
                "| name | varchar(50) | NULL | |", ""));
        lines.addAll(List.of(extra));
        lines.add("## 3. Khác");
        lines.add("| không | phải | bảng | schema |");
        return lines;
    }

    @Test
    void readsKeysFromCellAndConstraintsFromNotes() {
        Map<String, TableSpec> tables = SchemaDoc.parse(doc("`name` còn có ràng buộc UNIQUE.",
                "Mặc định: `at DEFAULT CURRENT_TIMESTAMP`. Index `name`, `at`."), "mẫu");
        TableSpec table = tables.get("tblA");
        assertEquals(Set.of("tblA"), tables.keySet());
        assertEquals(Set.of("FK→tblB.id", "UNIQUE"), table.columns().get("bId").keys());
        assertEquals(Set.of("UNIQUE"), table.columns().get("name").keys());
        assertTrue(table.columns().get("name").nullable());
        assertEquals(Map.of("at", "CURRENT_TIMESTAMP"), table.defaults());
        assertEquals(Set.of("name", "at"), table.indexed());
    }

    @Test
    void ambiguousUniqueNoteFails() {
        IllegalStateException e = assertThrows(IllegalStateException.class,
                () -> SchemaDoc.parse(doc("`name` và `at` UNIQUE."), "mẫu"));
        assertTrue(e.getMessage().contains("tblA"), e.getMessage());
    }

    @Test
    void unknownTypeOrKeyFails() {
        List<String> badType = doc();
        badType.set(9, "| name | text | NULL | |");
        assertThrows(IllegalStateException.class, () -> SchemaDoc.parse(badType, "mẫu"));
        List<String> badKey = doc();
        badKey.set(9, "| name | varchar(50) | NULL | INDEX |");
        assertThrows(IllegalStateException.class, () -> SchemaDoc.parse(badKey, "mẫu"));
    }

    @Test
    void noteNamingUnknownColumnFails() {
        assertThrows(IllegalStateException.class,
                () -> SchemaDoc.parse(doc("Mặc định: `ghost DEFAULT 0`."), "mẫu"));
    }
}
