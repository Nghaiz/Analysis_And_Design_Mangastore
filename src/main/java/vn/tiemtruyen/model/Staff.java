package vn.tiemtruyen.model;

import java.io.Serial;

/**
 * Nhân viên ({@code tblStaff}), kế thừa {@link User}.
 */
public class Staff extends User {

    /** Chức vụ của nhân viên quầy (ch.2 2.3). */
    public static final String POSITION_SALES = "Nhân viên bán hàng";

    /** Chức vụ mở được trang quản trị {@code /nhan-vien/quan-tri/} (D6). */
    public static final String POSITION_MANAGER = "Quản lí";

    @Serial
    private static final long serialVersionUID = 1L;

    private String position;

    /** Đối tượng rỗng; {@code id = 0} nghĩa là chưa lưu. */
    public Staff() {
    }

    public String getPosition() {
        return position;
    }

    public void setPosition(String position) {
        this.position = position;
    }
}
