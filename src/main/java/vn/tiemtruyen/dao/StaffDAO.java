package vn.tiemtruyen.dao;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import vn.tiemtruyen.model.Staff;
import vn.tiemtruyen.model.User;

/** Đăng nhập của nhân viên (contracts §5.3, ch.9 tr.84–85). */
public class StaffDAO extends UserDAO {

    private static final String SELECT_STAFF = "SELECT position FROM tblStaff WHERE userId = ?";

    /**
     * Mượn một kết nối từ pool của ứng dụng.
     *
     * @throws SQLException khi không lấy được kết nối
     */
    public StaffDAO() throws SQLException {
        super();
    }

    /**
     * Dùng kết nối có sẵn (test).
     *
     * @param con kết nối đang mở, autocommit bật
     */
    protected StaffDAO(Connection con) {
        super(con);
    }

    /**
     * Gọi {@link UserDAO#checkLogin(User)} rồi lấy chức vụ.
     *
     * @param user mang {@code username} và mật khẩu thô
     * @return Staff đủ thông tin (không mang mật khẩu); {@code null} khi sai hoặc tài khoản không phải nhân viên
     * @throws SQLException lỗi SQL
     */
    @Override
    public Staff checkLogin(User user) throws SQLException {
        User found = super.checkLogin(user);
        if (found == null) {
            return null;
        }
        try (PreparedStatement ps = con().prepareStatement(SELECT_STAFF)) {
            ps.setInt(1, found.getId());
            try (ResultSet rs = ps.executeQuery()) {
                if (!rs.next()) {
                    return null;
                }
                Staff staff = new Staff();
                staff.setId(found.getId());
                staff.setUsername(found.getUsername());
                staff.setFullName(found.getFullName());
                staff.setPosition(rs.getString("position"));
                return staff;
            }
        }
    }
}
