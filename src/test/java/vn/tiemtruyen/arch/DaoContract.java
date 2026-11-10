package vn.tiemtruyen.arch;

import java.nio.file.Files;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import vn.tiemtruyen.support.ContractsDoc;

/**
 * Bảng §5.3 "Chữ kí hàm" của {@code docs/contracts.md}, đọc lúc chạy: lớp DAO, lớp cha, và chữ kí UML của từng hàm
 * đổi sang descriptor JVM để so với file .class ({@code T[]} = {@code List<T>}, kiểu tên lớp = lớp trong
 * {@code vn.tiemtruyen.model}).
 */
final class DaoContract {

    static final String HEADING = "### 5.3 Chữ kí hàm";

    private static final Pattern CLASS_CELL = Pattern.compile("(\\w+)(?: extends (\\w+)| \\(lớp cha\\))");
    private static final Pattern METHOD = Pattern.compile("`(\\w+)\\(([^)]*)\\): ([\\w\\[\\]]+)`");
    private static final Pattern FIELD = Pattern.compile("`\\w+: \\w+`");
    private static final Pattern PARAMETER = Pattern.compile("\\w+: ([\\w\\[\\]]+)");
    private static final String MODEL = "vn/tiemtruyen/model/";

    /**
     * Một hàm của hợp đồng.
     *
     * @param name tên hàm
     * @param descriptor descriptor JVM, ví dụ {@code (Lvn/tiemtruyen/model/User;)Lvn/tiemtruyen/model/Client;}
     * @param uml chữ kí nguyên văn trong tài liệu
     */
    record Method(String name, String descriptor, String uml) {
    }

    /**
     * Một lớp DAO của hợp đồng.
     *
     * @param superName tên ngắn lớp cha, {@code null} cho lớp {@code DAO}
     * @param methods hàm public khai báo trong lớp
     */
    record DaoClass(String superName, List<Method> methods) {
    }

    private DaoContract() {
    }

    /** Lớp DAO theo tên ngắn, giữ thứ tự bảng. */
    static Map<String, DaoClass> read() {
        Map<String, DaoClass> classes = new LinkedHashMap<>();
        for (List<String> row : ContractsDoc.tableUnder(HEADING)) {
            Matcher cell = CLASS_CELL.matcher(row.get(0));
            if (!cell.matches()) {
                throw new IllegalStateException(HEADING + ": ô Lớp \"" + row.get(0) + "\" ngoài dạng X extends Y");
            }
            DaoClass dao = classes.computeIfAbsent(cell.group(1), k -> new DaoClass(cell.group(2),
                    new ArrayList<>()));
            if (cell.group(2) != null && !cell.group(2).equals(dao.superName())) {
                throw new IllegalStateException(HEADING + ": " + cell.group(1) + " ghi hai lớp cha khác nhau");
            }
            Matcher method = METHOD.matcher(row.get(1));
            if (method.matches()) {
                dao.methods().add(new Method(method.group(1), descriptor(method.group(2), method.group(3)),
                        row.get(1)));
            } else if (!FIELD.matcher(row.get(1)).matches()) {
                throw new IllegalStateException(HEADING + ": chữ kí \"" + row.get(1) + "\" không đọc được");
            }
        }
        return classes;
    }

    private static String descriptor(String parameters, String result) {
        StringBuilder descriptor = new StringBuilder("(");
        Matcher parameter = PARAMETER.matcher(parameters);
        while (parameter.find()) {
            descriptor.append(type(parameter.group(1)));
        }
        return descriptor.append(')').append(type(result)).toString();
    }

    private static String type(String uml) {
        if (uml.endsWith("[]")) {
            type(uml.substring(0, uml.length() - 2));
            return "Ljava/util/List;";
        }
        return switch (uml) {
            case "boolean" -> "Z";
            case "int" -> "I";
            case "float" -> "F";
            case "void" -> "V";
            case "String" -> "Ljava/lang/String;";
            default -> modelType(uml);
        };
    }

    private static String modelType(String name) {
        if (!Files.isRegularFile(CompiledClasses.root().resolve(MODEL + name + ".class"))) {
            throw new IllegalStateException(HEADING + ": kiểu \"" + name + "\" không phải lớp model đã biên dịch");
        }
        return "L" + MODEL + name + ";";
    }
}
