package vn.tiemtruyen.schema;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.TreeMap;
import java.util.TreeSet;
import vn.tiemtruyen.schema.LiveSchema.LiveTable;
import vn.tiemtruyen.schema.LiveSchema.Snapshot;
import vn.tiemtruyen.schema.TableSpec.ColumnSpec;

/** So hai mô tả schema, trả mỗi chỗ lệch một dòng có tên bảng hoặc {@code bảng.cột}. Rỗng là khớp. */
final class SchemaDiff {

    private SchemaDiff() {
    }

    /**
     * So schema thật với tài liệu: bảng, cột, kiểu, NULL, khoá (cả hai chiều), mặc định (cả hai chiều), index ghi
     * trong ghi chú, engine, collation, cột tự tăng.
     */
    static List<String> live(Map<String, TableSpec> doc, String docName, DocRules rules, Snapshot snapshot,
            Set<String> ignoredTables) {
        List<String> diffs = new ArrayList<>(snapshot.problems());
        Map<String, TableSpec> actual = new TreeMap<>();
        snapshot.tables().forEach((name, table) -> {
            if (!ignoredTables.contains(name)) {
                actual.put(name, table.spec());
            }
        });
        diffs.addAll(tables(doc, docName, actual, "DB"));
        for (TableSpec expected : doc.values()) {
            LiveTable table = snapshot.tables().get(expected.name());
            if (table != null) {
                diffs.addAll(tableRules(expected, docName, rules, table));
            }
        }
        return diffs;
    }

    /** So hai tài liệu: bảng, cột, kiểu, NULL, khoá. */
    static List<String> docs(Map<String, TableSpec> expected, String expectedName, Map<String, TableSpec> actual,
            String actualName) {
        return tables(expected, expectedName, actual, actualName);
    }

    private static List<String> tables(Map<String, TableSpec> expected, String expectedName,
            Map<String, TableSpec> actual, String actualName) {
        List<String> diffs = new ArrayList<>();
        for (String name : minus(actual.keySet(), expected.keySet())) {
            diffs.add(name + ": bảng có trong " + actualName + " nhưng không có trong " + expectedName);
        }
        for (String name : minus(expected.keySet(), actual.keySet())) {
            diffs.add(name + ": bảng của " + expectedName + " thiếu trong " + actualName);
        }
        for (TableSpec table : expected.values()) {
            TableSpec other = actual.get(table.name());
            if (other != null) {
                diffs.addAll(columns(table, expectedName, other, actualName));
            }
        }
        return diffs;
    }

    private static List<String> columns(TableSpec expected, String expectedName, TableSpec actual,
            String actualName) {
        List<String> diffs = new ArrayList<>();
        String table = expected.name();
        for (String name : minus(actual.columns().keySet(), expected.columns().keySet())) {
            diffs.add(table + "." + name + ": cột thừa trong " + actualName + ", không có trong " + expectedName);
        }
        for (String name : minus(expected.columns().keySet(), actual.columns().keySet())) {
            diffs.add(table + "." + name + ": cột của " + expectedName + " thiếu trong " + actualName);
        }
        for (ColumnSpec want : expected.columns().values()) {
            ColumnSpec got = actual.columns().get(want.name());
            if (got == null) {
                continue;
            }
            String at = table + "." + want.name() + ": ";
            compare(diffs, at + "kiểu", want.type(), expectedName, got.type(), actualName);
            compare(diffs, at + "Null", want.nullText(), expectedName, got.nullText(), actualName);
            compare(diffs, at + "khoá", want.keys(), expectedName, got.keys(), actualName);
        }
        return diffs;
    }

    private static List<String> tableRules(TableSpec expected, String docName, DocRules rules, LiveTable live) {
        List<String> diffs = new ArrayList<>();
        String table = expected.name();
        compare(diffs, table + ": mặc định", expected.defaults(), docName, live.spec().defaults(), "DB");
        for (String column : minus(expected.indexed(), live.spec().indexed())) {
            diffs.add(table + "." + column + ": " + docName + " ghi có index, DB không có index bắt đầu bằng cột này");
        }
        compare(diffs, table + ": engine", rules.engine(), docName, live.engine(), "DB");
        compare(diffs, table + ": collation", rules.collation(), docName, live.collation(), "DB");
        live.columnCollations().forEach((column, collation) -> compare(diffs, table + "." + column + ": collation",
                rules.collation(), docName, collation, "DB"));
        Set<String> primary = new TreeSet<>();
        expected.columns().values().stream().filter(c -> c.keys().contains("PK")).forEach(c -> primary.add(c.name()));
        Set<String> autoIncrement = primary.equals(Set.of(rules.autoIncrementColumn())) ? primary : Set.of();
        compare(diffs, table + ": cột AUTO_INCREMENT", autoIncrement, docName, live.autoIncrement(), "DB");
        return diffs;
    }

    private static void compare(List<String> diffs, String what, Object expected, String expectedName,
            Object actual, String actualName) {
        if (!Objects.equals(expected, actual)) {
            diffs.add(what + " " + actualName + " " + actual + ", " + expectedName + " " + expected);
        }
    }

    private static Set<String> minus(Set<String> left, Set<String> right) {
        Set<String> result = new TreeSet<>(left);
        result.removeAll(right);
        return result;
    }
}
