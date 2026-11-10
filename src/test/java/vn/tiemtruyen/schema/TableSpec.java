package vn.tiemtruyen.schema;

import java.util.Map;
import java.util.Set;

/**
 * Mô tả một bảng, dùng chung cho bảng đọc từ tài liệu ({@link SchemaDoc}) và bảng đọc từ
 * {@code information_schema} ({@link LiveSchema}).
 *
 * @param name tên bảng
 * @param columns cột theo tên (giữ thứ tự khai báo)
 * @param defaults giá trị mặc định theo tên cột; chỉ cột có mặc định
 * @param indexed cột là cột đầu của ít nhất một index (tài liệu: index ghi trong ghi chú)
 */
record TableSpec(String name, Map<String, ColumnSpec> columns, Map<String, String> defaults, Set<String> indexed) {

    /**
     * Một cột.
     *
     * @param name tên cột
     * @param type kiểu MySQL viết thường: {@code int}, {@code varchar(n)}, {@code date}, {@code timestamp},
     *     {@code float}
     * @param nullable {@code true} khi cột nhận NULL
     * @param keys các khoá một cột: {@code PK}, {@code UNIQUE}, {@code FK→tblY.cột}
     */
    record ColumnSpec(String name, String type, boolean nullable, Set<String> keys) {

        String nullText() {
            return nullable ? "NULL" : "NOT NULL";
        }
    }
}
