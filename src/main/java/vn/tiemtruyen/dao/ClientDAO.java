package vn.tiemtruyen.dao;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.time.LocalDate;
import java.util.Objects;
import vn.tiemtruyen.model.Client;
import vn.tiemtruyen.model.User;
import vn.tiemtruyen.util.Passwords;

/** Đăng nhập và đăng kí của khách (contracts §5.3, ch.9 tr.60). */
public class ClientDAO extends UserDAO {

    private static final String SELECT_CLIENT =
            "SELECT dob, idCard, phone, email, address FROM tblClient WHERE userId = ?";
    private static final String INSERT_USER = "INSERT INTO tblUser (username, password, fullName) VALUES (?, ?, ?)";
    private static final String INSERT_CLIENT =
            "INSERT INTO tblClient (userId, dob, idCard, phone, email, address) VALUES (?, ?, ?, ?, ?, ?)";
    private static final String INSERT_CART = "INSERT INTO tblCart (clientId) VALUES (?)";

    /**
     * Mượn một kết nối từ pool của ứng dụng.
     *
     * @throws SQLException khi không lấy được kết nối
     */
    public ClientDAO() throws SQLException {
        super();
    }

    /**
     * Dùng kết nối có sẵn (test).
     *
     * @param con kết nối đang mở, autocommit bật
     */
    protected ClientDAO(Connection con) {
        super(con);
    }

    /**
     * Gọi {@link UserDAO#checkLogin(User)} rồi lấy phần riêng của khách.
     *
     * @param user mang {@code username} và mật khẩu thô
     * @return Client đủ thông tin (không mang mật khẩu); {@code null} khi sai hoặc tài khoản không phải khách
     * @throws SQLException lỗi SQL
     */
    @Override
    public Client checkLogin(User user) throws SQLException {
        User found = super.checkLogin(user);
        if (found == null) {
            return null;
        }
        try (PreparedStatement ps = con().prepareStatement(SELECT_CLIENT)) {
            ps.setInt(1, found.getId());
            try (ResultSet rs = ps.executeQuery()) {
                if (!rs.next()) {
                    return null;
                }
                Client client = new Client();
                client.setId(found.getId());
                client.setUsername(found.getUsername());
                client.setFullName(found.getFullName());
                client.setDob(rs.getObject("dob", LocalDate.class));
                client.setIdCard(rs.getString("idCard"));
                client.setPhone(rs.getString("phone"));
                client.setEmail(rs.getString("email"));
                client.setAddress(rs.getString("address"));
                return client;
            }
        }
    }

    /**
     * Lưu tài khoản khách (mật khẩu băm Argon2id) cùng giỏ của khách trong một transaction. Gán {@code client.id}
     * khi thành công; đối tượng giữ nguyên khi trả {@code false}.
     *
     * @param client khách mới ({@code id = 0}) mang mật khẩu thô
     * @return {@code false} khi tên đăng nhập, CCCD, điện thoại hoặc email đã dùng (không để lại dòng nào)
     * @throws SQLException lỗi SQL khác trùng UNIQUE
     */
    public boolean addClient(Client client) throws SQLException {
        Objects.requireNonNull(client, "client");
        Objects.requireNonNull(client.getPassword(), "client.password");
        if (client.getId() != 0) {
            throw new IllegalArgumentException("addClient cần khách chưa lưu (id = 0), đang là " + client.getId());
        }
        String passwordHash = Passwords.hash(client.getPassword());
        int[] newId = new int[1];
        boolean saved = inWriteTransaction(() -> {
            try {
                newId[0] = insertUser(client, passwordHash);
                insertClient(client, newId[0]);
                insertCart(newId[0]);
                return true;
            } catch (SQLException e) {
                if (isDuplicateEntry(e)) {
                    return false;
                }
                throw e;
            }
        });
        if (saved) {
            client.setId(newId[0]);
        }
        return saved;
    }

    private int insertUser(Client client, String passwordHash) throws SQLException {
        try (PreparedStatement ps = con().prepareStatement(INSERT_USER, Statement.RETURN_GENERATED_KEYS)) {
            int p = 1;
            ps.setString(p++, client.getUsername());
            ps.setString(p++, passwordHash);
            ps.setString(p, client.getFullName());
            ps.executeUpdate();
            try (ResultSet keys = ps.getGeneratedKeys()) {
                if (!keys.next()) {
                    throw new SQLException("INSERT tblUser không trả id");
                }
                return keys.getInt(1);
            }
        }
    }

    private void insertClient(Client client, int userId) throws SQLException {
        try (PreparedStatement ps = con().prepareStatement(INSERT_CLIENT)) {
            int p = 1;
            ps.setInt(p++, userId);
            ps.setObject(p++, client.getDob());
            ps.setString(p++, client.getIdCard());
            ps.setString(p++, client.getPhone());
            ps.setString(p++, client.getEmail());
            ps.setString(p, client.getAddress());
            ps.executeUpdate();
        }
    }

    private void insertCart(int clientId) throws SQLException {
        try (PreparedStatement ps = con().prepareStatement(INSERT_CART)) {
            ps.setInt(1, clientId);
            ps.executeUpdate();
        }
    }
}
