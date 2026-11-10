package vn.tiemtruyen.schema;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import java.util.TreeSet;
import vn.tiemtruyen.schema.TableSpec.ColumnSpec;

/**
 * Đọc schema thật của một database từ {@code information_schema} (TABLES, COLUMNS, TABLE_CONSTRAINTS,
 * KEY_COLUMN_USAGE, STATISTICS) về cùng dạng {@link TableSpec} với tài liệu.
 */
final class LiveSchema {

    private static final String TABLES = "SELECT TABLE_NAME, ENGINE, TABLE_COLLATION FROM information_schema.TABLES"
            + " WHERE TABLE_SCHEMA = ?";
    private static final String COLUMNS = "SELECT TABLE_NAME, COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT,"
            + " EXTRA, COLLATION_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ?"
            + " ORDER BY TABLE_NAME, ORDINAL_POSITION";
    private static final String CONSTRAINTS = "SELECT tc.TABLE_NAME, tc.CONSTRAINT_NAME, tc.CONSTRAINT_TYPE,"
            + " k.COLUMN_NAME, k.REFERENCED_TABLE_NAME, k.REFERENCED_COLUMN_NAME"
            + " FROM information_schema.TABLE_CONSTRAINTS tc JOIN information_schema.KEY_COLUMN_USAGE k"
            + " ON k.CONSTRAINT_SCHEMA = tc.CONSTRAINT_SCHEMA AND k.TABLE_NAME = tc.TABLE_NAME"
            + " AND k.CONSTRAINT_NAME = tc.CONSTRAINT_NAME WHERE tc.TABLE_SCHEMA = ?"
            + " ORDER BY tc.TABLE_NAME, tc.CONSTRAINT_NAME, k.ORDINAL_POSITION";
    private static final String STATISTICS = "SELECT TABLE_NAME, COLUMN_NAME FROM information_schema.STATISTICS"
            + " WHERE TABLE_SCHEMA = ? AND SEQ_IN_INDEX = 1";

    /**
     * Một bảng thật.
     *
     * @param spec cột, khoá, mặc định, index
     * @param engine engine
     * @param collation collation của bảng
     * @param autoIncrement cột có {@code auto_increment}
     * @param columnCollations collation theo cột chữ
     */
    record LiveTable(TableSpec spec, String engine, String collation, Set<String> autoIncrement,
            Map<String, String> columnCollations) {
    }

    /**
     * Toàn bộ schema.
     *
     * @param tables bảng theo tên
     * @param problems ràng buộc không biểu diễn được bằng khoá một cột (khoá nhiều cột)
     */
    record Snapshot(Map<String, LiveTable> tables, List<String> problems) {
    }

    private LiveSchema() {
    }

    static Snapshot read(Connection con, String schema) throws SQLException {
        Map<String, LiveTable> tables = new TreeMap<>();
        for (List<String> row : query(con, TABLES, schema)) {
            TableSpec spec = new TableSpec(row.get(0), new LinkedHashMap<>(), new TreeMap<>(), new TreeSet<>());
            tables.put(row.get(0), new LiveTable(spec, row.get(1), row.get(2), new TreeSet<>(), new TreeMap<>()));
        }
        for (List<String> row : query(con, COLUMNS, schema)) {
            LiveTable table = tables.get(row.get(0));
            String column = row.get(1);
            table.spec().columns().put(column, new ColumnSpec(column, row.get(2).toLowerCase(Locale.ROOT),
                    "YES".equals(row.get(3)), new TreeSet<>()));
            if (row.get(4) != null) {
                table.spec().defaults().put(column, row.get(4));
            }
            if (row.get(5) != null && row.get(5).toLowerCase(Locale.ROOT).contains("auto_increment")) {
                table.autoIncrement().add(column);
            }
            if (row.get(6) != null) {
                table.columnCollations().put(column, row.get(6));
            }
        }
        List<String> problems = new ArrayList<>();
        addKeys(tables, query(con, CONSTRAINTS, schema), problems);
        for (List<String> row : query(con, STATISTICS, schema)) {
            tables.get(row.get(0)).spec().indexed().add(row.get(1));
        }
        return new Snapshot(tables, problems);
    }

    private static void addKeys(Map<String, LiveTable> tables, List<List<String>> rows, List<String> problems) {
        Map<String, List<List<String>>> byConstraint = new LinkedHashMap<>();
        for (List<String> row : rows) {
            byConstraint.computeIfAbsent(row.get(0) + "/" + row.get(1), k -> new ArrayList<>()).add(row);
        }
        for (List<List<String>> parts : byConstraint.values()) {
            List<String> first = parts.get(0);
            String table = first.get(0);
            if (parts.size() > 1) {
                List<String> columns = parts.stream().map(p -> p.get(3)).toList();
                problems.add(table + ": ràng buộc " + first.get(2) + " " + first.get(1) + " nhiều cột " + columns
                        + ", hợp đồng chỉ có khoá một cột");
                continue;
            }
            String key = switch (first.get(2)) {
                case "PRIMARY KEY" -> "PK";
                case "UNIQUE" -> "UNIQUE";
                case "FOREIGN KEY" -> "FK→" + first.get(4) + "." + first.get(5);
                default -> throw new IllegalStateException("Loại ràng buộc lạ: " + first);
            };
            tables.get(table).spec().columns().get(first.get(3)).keys().add(key);
        }
    }

    private static List<List<String>> query(Connection con, String sql, String schema) throws SQLException {
        List<List<String>> rows = new ArrayList<>();
        try (PreparedStatement ps = con.prepareStatement(sql)) {
            ps.setString(1, schema);
            try (ResultSet rs = ps.executeQuery()) {
                int width = rs.getMetaData().getColumnCount();
                while (rs.next()) {
                    List<String> row = new ArrayList<>(width);
                    for (int i = 1; i <= width; i++) {
                        row.add(rs.getString(i));
                    }
                    rows.add(row);
                }
            }
        }
        return rows;
    }
}
