package vn.tiemtruyen.schema;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Luật chung của mọi bảng, đọc từ đoạn mở đầu của {@code docs/contracts.md} §2: engine, collation và tên cột khoá
 * chính tự tăng ({@code Khoá chính `id` là `AUTO_INCREMENT`}; bảng có khoá chính khác tên, như {@code userId},
 * không tự tăng).
 *
 * @param engine engine bảng, ví dụ {@code InnoDB}
 * @param collation collation của bảng và mọi cột chữ
 * @param autoIncrementColumn tên cột khoá chính tự tăng
 */
record DocRules(String engine, String collation, String autoIncrementColumn) {

    private static final Pattern ENGINE = Pattern.compile("Engine (\\w+)");
    private static final Pattern COLLATION = Pattern.compile("collation `(\\w+)`");
    private static final Pattern AUTO_INCREMENT = Pattern.compile("Khoá chính `(\\w+)` là `AUTO_INCREMENT`");

    static DocRules from(String contractsText) {
        return new DocRules(find(ENGINE, contractsText), find(COLLATION, contractsText),
                find(AUTO_INCREMENT, contractsText));
    }

    private static String find(Pattern pattern, String text) {
        Matcher matcher = pattern.matcher(text);
        if (!matcher.find()) {
            throw new IllegalStateException("docs/contracts.md §2 không còn câu khớp /" + pattern.pattern()
                    + "/: tài liệu đổi cách viết thì sửa DocRules cho khớp, đừng bỏ kiểm");
        }
        return matcher.group(1);
    }
}
