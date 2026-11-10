package vn.tiemtruyen.schema;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import vn.tiemtruyen.schema.TableSpec.ColumnSpec;

/**
 * Đọc các bảng máy đọc được của tài liệu schema: mỗi bảng một tiêu đề {@code ### tblX}, rồi bảng Markdown có header
 * đúng {@code | Cột | Kiểu | Null | Khoá |}, rồi ghi chú văn xuôi (tới tiêu đề kế tiếp).
 *
 * <p>Ghi chú được đọc cho ba loại ràng buộc không nằm trong ô Khoá: câu có {@code UNIQUE} nhắc đúng một cột
 * {@code `cột`} của bảng; {@code `cột DEFAULT giá trị`}; {@code Index `a`, `b`}. Câu UNIQUE nhắc 0 hoặc nhiều cột
 * của bảng thì ném lỗi (mơ hồ: chuyển ràng buộc vào ô Khoá). Định dạng sai cũng ném lỗi chứ không bỏ qua.
 */
final class SchemaDoc {

    static final List<String> HEADER = List.of("Cột", "Kiểu", "Null", "Khoá");

    private static final Pattern TABLE_HEADING = Pattern.compile("### (tbl\\w+)\\s*");
    private static final Pattern TYPE = Pattern.compile("int|date|timestamp|float|varchar\\(\\d+\\)");
    private static final Pattern FOREIGN_KEY = Pattern.compile("FK→tbl\\w+\\.\\w+");
    private static final Pattern CODE = Pattern.compile("`([^`]+)`");
    private static final Pattern UNIQUE_WORD = Pattern.compile("\\bUNIQUE\\b");
    private static final Pattern DEFAULT = Pattern.compile("`(\\w+) DEFAULT ([^`]+)`");
    private static final Pattern INDEX = Pattern.compile("\\bIndex ((?:`\\w+`(?:, )?)+)");

    private SchemaDoc() {
    }

    static Map<String, TableSpec> parse(Path path) {
        try {
            return parse(Files.readAllLines(path, StandardCharsets.UTF_8), path.toString());
        } catch (IOException e) {
            throw new UncheckedIOException("Không đọc được " + path.toAbsolutePath(), e);
        }
    }

    static Map<String, TableSpec> parse(List<String> lines, String source) {
        Map<String, TableSpec> tables = new LinkedHashMap<>();
        String current = null;
        List<List<String>> rows = new ArrayList<>();
        List<String> notes = new ArrayList<>();
        for (String line : lines) {
            if (line.startsWith("#")) {
                finish(tables, current, rows, notes, source);
                Matcher heading = TABLE_HEADING.matcher(line);
                current = heading.matches() ? heading.group(1) : null;
                rows = new ArrayList<>();
                notes = new ArrayList<>();
            } else if (current != null && line.startsWith("|")) {
                rows.add(cells(line));
            } else if (current != null && !line.isBlank()) {
                notes.add(line);
            }
        }
        finish(tables, current, rows, notes, source);
        return tables;
    }

    private static void finish(Map<String, TableSpec> tables, String name, List<List<String>> rows,
            List<String> notes, String source) {
        if (name == null) {
            return;
        }
        String where = source + " " + name;
        if (rows.size() < 3 || !HEADER.equals(rows.get(0))) {
            throw new IllegalStateException(where + ": cần bảng có header " + HEADER + " và ít nhất một cột");
        }
        Map<String, ColumnSpec> columns = new LinkedHashMap<>();
        for (List<String> row : rows.subList(2, rows.size())) {
            ColumnSpec column = column(row, where);
            if (columns.put(column.name(), column) != null) {
                throw new IllegalStateException(where + ": cột " + column.name() + " lặp");
            }
        }
        Map<String, String> defaults = new LinkedHashMap<>();
        Set<String> indexed = new TreeSet<>();
        for (String note : notes) {
            applyNote(note, columns, defaults, indexed, where);
        }
        if (tables.put(name, new TableSpec(name, columns, defaults, indexed)) != null) {
            throw new IllegalStateException(where + ": bảng lặp");
        }
    }

    private static ColumnSpec column(List<String> row, String where) {
        if (row.size() != HEADER.size()) {
            throw new IllegalStateException(where + ": dòng " + row + " không có đúng 4 ô");
        }
        String name = row.get(0);
        String at = where + "." + name;
        if (!TYPE.matcher(row.get(1)).matches()) {
            throw new IllegalStateException(at + ": kiểu \"" + row.get(1) + "\" ngoài quy ước");
        }
        if (!"NULL".equals(row.get(2)) && !"NOT NULL".equals(row.get(2))) {
            throw new IllegalStateException(at + ": ô Null \"" + row.get(2) + "\" phải là NULL hoặc NOT NULL");
        }
        Set<String> keys = new TreeSet<>();
        for (String key : row.get(3).split(",")) {
            String token = key.strip();
            if (token.isEmpty()) {
                continue;
            }
            if (!"PK".equals(token) && !"UNIQUE".equals(token) && !FOREIGN_KEY.matcher(token).matches()) {
                throw new IllegalStateException(at + ": khoá \"" + token + "\" ngoài quy ước");
            }
            keys.add(token);
        }
        return new ColumnSpec(name, row.get(1), "NULL".equals(row.get(2)), keys);
    }

    private static void applyNote(String note, Map<String, ColumnSpec> columns, Map<String, String> defaults,
            Set<String> indexed, String where) {
        if (UNIQUE_WORD.matcher(note).find()) {
            Set<String> mentioned = new LinkedHashSet<>();
            Matcher code = CODE.matcher(note);
            while (code.find()) {
                if (columns.containsKey(code.group(1))) {
                    mentioned.add(code.group(1));
                }
            }
            if (mentioned.size() != 1) {
                throw new IllegalStateException(where + ": ghi chú UNIQUE phải nhắc đúng một cột của bảng, thấy "
                        + mentioned + " trong \"" + note + "\". Chuyển ràng buộc vào ô Khoá.");
            }
            String name = mentioned.iterator().next();
            ColumnSpec old = columns.get(name);
            Set<String> keys = new TreeSet<>(old.keys());
            keys.add("UNIQUE");
            columns.put(name, new ColumnSpec(name, old.type(), old.nullable(), keys));
        }
        Matcher fallback = DEFAULT.matcher(note);
        while (fallback.find()) {
            defaults.put(known(fallback.group(1), columns, where), fallback.group(2).strip());
        }
        Matcher index = INDEX.matcher(note);
        while (index.find()) {
            Matcher code = CODE.matcher(index.group(1));
            while (code.find()) {
                indexed.add(known(code.group(1), columns, where));
            }
        }
    }

    private static String known(String column, Map<String, ColumnSpec> columns, String where) {
        if (!columns.containsKey(column)) {
            throw new IllegalStateException(where + ": ghi chú nhắc cột " + column + " không có trong bảng");
        }
        return column;
    }

    private static List<String> cells(String line) {
        String inner = line.strip();
        inner = inner.substring(1, inner.endsWith("|") ? inner.length() - 1 : inner.length());
        List<String> cells = new ArrayList<>();
        for (String cell : inner.split("\\|", -1)) {
            cells.add(cell.strip());
        }
        return cells;
    }
}
