package vn.tiemtruyen.dao;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import vn.tiemtruyen.model.Damage;

/** Loại lỗi của quyển truyện (contracts §5.3, ch.9 tr.85). */
public class DamageDAO extends DAO {

    private static final int MYSQL_DUPLICATE_ENTRY = 1062;

    private static final String SEARCH =
            "SELECT id, name, description FROM tblDamage WHERE name LIKE ? ORDER BY id";
    private static final String INSERT = "INSERT INTO tblDamage (name, description) VALUES (?, ?)";

    /**
     * Mượn một kết nối từ pool của ứng dụng.
     *
     * @throws SQLException khi không lấy được kết nối
     */
    public DamageDAO() throws SQLException {
        super();
    }

    /**
     * Dùng kết nối có sẵn (test).
     *
     * @param con kết nối đang mở, autocommit bật
     */
    protected DamageDAO(Connection con) {
        super(con);
    }

    /**
     * Loại lỗi có tên chứa từ khoá (collation {@code ai_ci}: không phân biệt hoa thường và dấu), sắp theo id.
     *
     * @param keyword từ khoá (trang không gọi với từ khoá trống, C9)
     * @return danh sách, rỗng khi không có loại nào khớp
     * @throws SQLException lỗi SQL
     */
    public List<Damage> searchDamage(String keyword) throws SQLException {
        Objects.requireNonNull(keyword, "keyword");
        List<Damage> result = new ArrayList<>();
        try (PreparedStatement ps = con().prepareStatement(SEARCH)) {
            ps.setString(1, "%" + keyword + "%");
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    Damage damage = new Damage();
                    damage.setId(rs.getInt("id"));
                    damage.setName(rs.getString("name"));
                    damage.setDescription(rs.getString("description"));
                    result.add(damage);
                }
            }
        }
        return result;
    }

    /**
     * Lưu loại lỗi mới, gán {@code damage.id} khi thành công.
     *
     * @param damage loại lỗi mới ({@code id = 0})
     * @return {@code false} khi tên đã tồn tại (so theo collation {@code ai_ci})
     * @throws SQLException lỗi SQL khác trùng UNIQUE
     */
    public boolean addDamage(Damage damage) throws SQLException {
        Objects.requireNonNull(damage, "damage");
        int[] newId = new int[1];
        boolean saved = inWriteTransaction(() -> {
            try (PreparedStatement ps = con().prepareStatement(INSERT, Statement.RETURN_GENERATED_KEYS)) {
                ps.setString(1, damage.getName());
                ps.setString(2, damage.getDescription());
                ps.executeUpdate();
                try (ResultSet keys = ps.getGeneratedKeys()) {
                    if (!keys.next()) {
                        throw new SQLException("INSERT tblDamage không trả id");
                    }
                    newId[0] = keys.getInt(1);
                }
                return true;
            } catch (SQLException e) {
                if (e.getErrorCode() == MYSQL_DUPLICATE_ENTRY) {
                    return false;
                }
                throw e;
            }
        });
        if (saved) {
            damage.setId(newId[0]);
        }
        return saved;
    }
}
