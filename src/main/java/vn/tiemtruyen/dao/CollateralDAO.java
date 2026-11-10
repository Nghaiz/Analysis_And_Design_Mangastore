package vn.tiemtruyen.dao;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import vn.tiemtruyen.model.Collateral;

/** Loại tài sản đặt cọc (contracts §5.3, ch.9 tr.85). */
public class CollateralDAO extends DAO {

    private static final int MYSQL_DUPLICATE_ENTRY = 1062;

    private static final String SEARCH =
            "SELECT id, name, description FROM tblCollateral WHERE name LIKE ? ORDER BY id";
    private static final String INSERT = "INSERT INTO tblCollateral (name, description) VALUES (?, ?)";

    /**
     * Mượn một kết nối từ pool của ứng dụng.
     *
     * @throws SQLException khi không lấy được kết nối
     */
    public CollateralDAO() throws SQLException {
        super();
    }

    /**
     * Dùng kết nối có sẵn (test).
     *
     * @param con kết nối đang mở, autocommit bật
     */
    protected CollateralDAO(Connection con) {
        super(con);
    }

    /**
     * Loại tài sản có tên chứa từ khoá (collation {@code ai_ci}: không phân biệt hoa thường và dấu), sắp theo id.
     *
     * @param keyword từ khoá (trang không gọi với từ khoá trống, C9)
     * @return danh sách, rỗng khi không có loại nào khớp
     * @throws SQLException lỗi SQL
     */
    public List<Collateral> searchCollateral(String keyword) throws SQLException {
        Objects.requireNonNull(keyword, "keyword");
        List<Collateral> result = new ArrayList<>();
        try (PreparedStatement ps = con().prepareStatement(SEARCH)) {
            ps.setString(1, "%" + keyword + "%");
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    Collateral collateral = new Collateral();
                    collateral.setId(rs.getInt("id"));
                    collateral.setName(rs.getString("name"));
                    collateral.setDescription(rs.getString("description"));
                    result.add(collateral);
                }
            }
        }
        return result;
    }

    /**
     * Lưu loại tài sản mới, gán {@code collateral.id} khi thành công.
     *
     * @param collateral loại tài sản mới ({@code id = 0})
     * @return {@code false} khi tên đã tồn tại (so theo collation {@code ai_ci})
     * @throws SQLException lỗi SQL khác trùng UNIQUE
     */
    public boolean addCollateral(Collateral collateral) throws SQLException {
        Objects.requireNonNull(collateral, "collateral");
        int[] newId = new int[1];
        boolean saved = inWriteTransaction(() -> {
            try (PreparedStatement ps = con().prepareStatement(INSERT, Statement.RETURN_GENERATED_KEYS)) {
                ps.setString(1, collateral.getName());
                ps.setString(2, collateral.getDescription());
                ps.executeUpdate();
                try (ResultSet keys = ps.getGeneratedKeys()) {
                    if (!keys.next()) {
                        throw new SQLException("INSERT tblCollateral không trả id");
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
            collateral.setId(newId[0]);
        }
        return saved;
    }
}
