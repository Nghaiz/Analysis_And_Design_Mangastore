package vn.tiemtruyen.util;

import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Bộ đọc JSON nhỏ, chặt (RFC 8259), chỉ để đọc file máy sinh ra như manifest của Vite; dự án chưa có thư viện
 * JSON trong {@code pom.xml}.
 *
 * <p>Kết quả: object → {@code Map<String, Object>} giữ thứ tự khoá, array → {@code List<Object>}, chuỗi →
 * {@code String}, số → {@code Long} hoặc {@code Double}, {@code true}/{@code false} → {@code Boolean},
 * {@code null} → {@code null}. Sai cú pháp thì ném {@link IllegalArgumentException} kèm vị trí.
 */
public final class JsonReader {

    private static final int HEX_RADIX = 16;
    private static final int UNICODE_ESCAPE_LENGTH = 4;

    private final String text;
    private int pos;

    private JsonReader(String text) {
        this.text = text;
    }

    /**
     * Đọc một tài liệu JSON hoàn chỉnh.
     *
     * @param text nội dung JSON
     * @return giá trị gốc
     * @throws IllegalArgumentException khi sai cú pháp hoặc còn kí tự thừa sau giá trị gốc
     */
    public static Object parse(String text) {
        JsonReader reader = new JsonReader(text);
        Object value = reader.readValue();
        reader.skipWhitespace();
        if (reader.pos != text.length()) {
            throw reader.error("còn kí tự thừa sau giá trị gốc");
        }
        return value;
    }

    private Object readValue() {
        skipWhitespace();
        if (pos >= text.length()) {
            throw error("hết dữ liệu khi đang chờ một giá trị");
        }
        char c = text.charAt(pos);
        return switch (c) {
            case '{' -> readObject();
            case '[' -> readArray();
            case '"' -> readString();
            case 't' -> readLiteral("true", Boolean.TRUE);
            case 'f' -> readLiteral("false", Boolean.FALSE);
            case 'n' -> readLiteral("null", null);
            default -> readNumber();
        };
    }

    private Map<String, Object> readObject() {
        expect('{');
        Map<String, Object> result = new LinkedHashMap<>();
        skipWhitespace();
        if (peek() == '}') {
            pos++;
            return Collections.unmodifiableMap(result);
        }
        do {
            skipWhitespace();
            String key = readString();
            skipWhitespace();
            expect(':');
            if (result.containsKey(key)) {
                throw error("khoá bị lặp: " + key);
            }
            result.put(key, readValue());
            skipWhitespace();
        } while (tryConsume(','));
        expect('}');
        return Collections.unmodifiableMap(result);
    }

    private List<Object> readArray() {
        expect('[');
        List<Object> result = new ArrayList<>();
        skipWhitespace();
        if (peek() == ']') {
            pos++;
            return Collections.unmodifiableList(result);
        }
        do {
            result.add(readValue());
            skipWhitespace();
        } while (tryConsume(','));
        expect(']');
        return Collections.unmodifiableList(result);
    }

    private String readString() {
        expect('"');
        StringBuilder sb = new StringBuilder();
        while (true) {
            if (pos >= text.length()) {
                throw error("chuỗi chưa đóng");
            }
            char c = text.charAt(pos++);
            if (c == '"') {
                return sb.toString();
            }
            if (c < ' ') {
                throw error("kí tự điều khiển trong chuỗi");
            }
            sb.append(c == '\\' ? readEscape() : c);
        }
    }

    private char readEscape() {
        if (pos >= text.length()) {
            throw error("escape chưa xong");
        }
        char c = text.charAt(pos++);
        return switch (c) {
            case '"', '\\', '/' -> c;
            case 'b' -> '\b';
            case 'f' -> '\f';
            case 'n' -> '\n';
            case 'r' -> '\r';
            case 't' -> '\t';
            case 'u' -> readUnicodeEscape();
            default -> throw error("escape không hợp lệ: \\" + c);
        };
    }

    private char readUnicodeEscape() {
        if (pos + UNICODE_ESCAPE_LENGTH > text.length()) {
            throw error("\\u thiếu chữ số");
        }
        String hex = text.substring(pos, pos + UNICODE_ESCAPE_LENGTH);
        pos += UNICODE_ESCAPE_LENGTH;
        try {
            return (char) Integer.parseInt(hex, HEX_RADIX);
        } catch (NumberFormatException e) {
            throw error("\\u" + hex + " không phải số hex");
        }
    }

    private Object readLiteral(String word, Object value) {
        if (!text.startsWith(word, pos)) {
            throw error("chờ " + word);
        }
        pos += word.length();
        return value;
    }

    private Object readNumber() {
        int start = pos;
        tryConsume('-');
        if (!tryConsume('0')) {
            requireDigits();
        }
        boolean decimal = false;
        if (tryConsume('.')) {
            decimal = true;
            requireDigits();
        }
        if (tryConsume('e') || tryConsume('E')) {
            decimal = true;
            if (!tryConsume('+')) {
                tryConsume('-');
            }
            requireDigits();
        }
        String number = text.substring(start, pos);
        return decimal ? (Object) Double.parseDouble(number) : (Object) Long.parseLong(number);
    }

    private void requireDigits() {
        int start = pos;
        while (pos < text.length() && text.charAt(pos) >= '0' && text.charAt(pos) <= '9') {
            pos++;
        }
        if (pos == start) {
            throw error("chờ chữ số");
        }
    }

    private void skipWhitespace() {
        while (pos < text.length() && " \t\r\n".indexOf(text.charAt(pos)) >= 0) {
            pos++;
        }
    }

    private char peek() {
        return pos < text.length() ? text.charAt(pos) : '\0';
    }

    private boolean tryConsume(char c) {
        if (pos < text.length() && text.charAt(pos) == c) {
            pos++;
            return true;
        }
        return false;
    }

    private void expect(char c) {
        if (!tryConsume(c)) {
            throw error("chờ '" + c + "'");
        }
    }

    private IllegalArgumentException error(String message) {
        return new IllegalArgumentException("JSON sai ở vị trí " + pos + ": " + message);
    }
}
