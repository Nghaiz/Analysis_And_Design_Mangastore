package vn.tiemtruyen.dao;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.Objects;
import vn.tiemtruyen.model.User;
import vn.tiemtruyen.util.Passwords;

/**
 * Đăng nhập chung của khách và nhân viên (contracts §5.3, ch.9 tr.60). {@link ClientDAO} và {@link StaffDAO} kế
 * thừa lớp này và gọi {@link #checkLogin(User)} trên cùng kết nối (contracts §5.2).
 */
public class UserDAO extends DAO {

    private static final String SELECT_BY_USERNAME =
            "SELECT id, username, password, fullName FROM tblUser WHERE username = ?";

    /**
     * Mượn một kết nối từ pool của ứng dụng.
     *
     * @throws SQLException khi không lấy được kết nối
     */
    public UserDAO() throws SQLException {
        super();
    }

    /**
     * Dùng kết nối có sẵn (test).
     *
     * @param con kết nối đang mở, autocommit bật
     */
    protected UserDAO(Connection con) {
        super(con);
    }

    /**
     * Kiểm tên đăng nhập và mật khẩu. Mật khẩu so bằng {@link Passwords#verify(CharSequence, String)}, không so
     * trong SQL. Đối tượng trả về không mang chuỗi băm mật khẩu (trang đưa nó vào session, C5).
     *
     * @param user mang {@code username} và mật khẩu thô người dùng nhập
     * @return User có {@code id}, {@code username}, {@code fullName}; {@code null} khi sai tên hoặc mật khẩu
     * @throws SQLException lỗi SQL
     */
    public User checkLogin(User user) throws SQLException {
        Objects.requireNonNull(user, "user");
        if (user.getUsername() == null || user.getPassword() == null) {
            return null;
        }
        try (PreparedStatement ps = con().prepareStatement(SELECT_BY_USERNAME)) {
            ps.setString(1, user.getUsername());
            try (ResultSet rs = ps.executeQuery()) {
                if (!rs.next() || !Passwords.verify(user.getPassword(), rs.getString("password"))) {
                    return null;
                }
                User found = new User();
                found.setId(rs.getInt("id"));
                found.setUsername(rs.getString("username"));
                found.setFullName(rs.getString("fullName"));
                return found;
            }
        }
    }
}
