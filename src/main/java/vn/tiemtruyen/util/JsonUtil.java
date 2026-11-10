package vn.tiemtruyen.util;

import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.json.JsonMapper;

/**
 * Sinh JSON props cho React island, nhúng trong {@code <script type="application/json">} (contracts §11).
 *
 * <p>Ngoài JSON hợp lệ, kết quả không chứa {@code <}, {@code >}, {@code &}, U+2028, U+2029 dạng thô: các kí tự này
 * chỉ có thể xuất hiện trong chuỗi JSON nên được thay bằng escape {@code \}{@code uXXXX} tương đương, nhờ đó
 * {@code </script>} hay {@code <!--} trong dữ liệu không thoát được khỏi thẻ. Chỉ đưa DTO của contracts §11 vào
 * đây, không đưa thẳng model (Book và BookCopy trỏ vòng). Ngày {@code java.time} ra chuỗi ISO
 * ({@code yyyy-MM-dd}), mặc định của Jackson 3.
 */
public final class JsonUtil {

    private static final ObjectMapper MAPPER = JsonMapper.builder().build();

    private JsonUtil() {
    }

    /**
     * Tuần tự hoá {@code value} thành JSON an toàn để nhúng trong thẻ script.
     *
     * @param value DTO, danh sách, bảng hoặc giá trị đơn; {@code null} cho ra {@code null}
     * @return chuỗi JSON đã escape
     * @throws tools.jackson.core.JacksonException khi Jackson không tuần tự hoá được {@code value}
     */
    public static String toScriptJson(Object value) {
        String json = MAPPER.writeValueAsString(value);
        StringBuilder out = new StringBuilder(json.length());
        for (int i = 0; i < json.length(); i++) {
            char c = json.charAt(i);
            switch (c) {
                case '<' -> out.append("\\u003c");
                case '>' -> out.append("\\u003e");
                case '&' -> out.append("\\u0026");
                case ' ' -> out.append("\\u2028");
                case ' ' -> out.append("\\u2029");
                default -> out.append(c);
            }
        }
        return out.toString();
    }
}
