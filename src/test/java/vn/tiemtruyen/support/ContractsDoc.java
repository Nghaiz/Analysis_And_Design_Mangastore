package vn.tiemtruyen.support;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;

/**
 * Đọc bảng Markdown của {@code docs/contracts.md} (SSOT) lúc chạy test, để test so code với tài liệu mà không chép
 * nội dung tài liệu vào test. Surefire chạy với thư mục làm việc là gốc dự án.
 */
public final class ContractsDoc {

    /** Đường dẫn tới hợp đồng, tính từ gốc dự án. */
    public static final Path PATH = Path.of("docs", "contracts.md");

    private ContractsDoc() {
    }

    /**
     * Các dòng dữ liệu của bảng đầu tiên ngay dưới một tiêu đề (bỏ dòng tiêu đề bảng và dòng {@code |---|}).
     *
     * @param heading dòng tiêu đề đúng nguyên văn, ví dụ {@code "### 10.1 28 câu"}
     * @return mỗi dòng là danh sách ô đã bỏ khoảng trắng hai đầu
     */
    public static List<List<String>> tableUnder(String heading) {
        List<String> lines = readLines();
        int start = lines.indexOf(heading);
        if (start < 0) {
            throw new IllegalStateException("Không thấy tiêu đề \"" + heading + "\" trong " + PATH);
        }
        List<List<String>> rows = new ArrayList<>();
        boolean inTable = false;
        for (int i = start + 1; i < lines.size(); i++) {
            String line = lines.get(i);
            if (line.startsWith("|")) {
                inTable = true;
                rows.add(cells(line));
            } else if (inTable || line.startsWith("#")) {
                break;
            }
        }
        if (rows.size() < 2) {
            throw new IllegalStateException("Không thấy bảng dưới \"" + heading + "\" trong " + PATH);
        }
        return rows.subList(2, rows.size());
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

    private static List<String> readLines() {
        try {
            return Files.readAllLines(PATH, StandardCharsets.UTF_8);
        } catch (IOException e) {
            throw new UncheckedIOException("Không đọc được " + PATH.toAbsolutePath(), e);
        }
    }
}
