package vn.tiemtruyen.dao;

import java.sql.Connection;
import java.sql.SQLException;
import java.util.Objects;
import java.util.concurrent.Callable;
import vn.tiemtruyen.util.Db;

/**
 * Lớp cha của tám DAO (contracts §5): giữ một {@link Connection} mượn từ pool và trả nó khi {@link #close()}.
 *
 * <p>Quy ước cho lớp con (lane 3B, 3C):
 * <ul>
 *   <li>Mỗi DAO có hai constructor: {@code public XxxDAO() throws SQLException { super(); }} cho trang (mượn kết
 *   nối qua {@link Db#getConnection()}) và {@code protected XxxDAO(Connection con) { super(con); }} cho test cùng
 *   package đưa kết nối Testcontainers vào. DAO đóng kết nối được đưa vào khi {@link #close()}.</li>
 *   <li>Kết nối đọc bằng {@link #con()}. Checkstyle của dự án cấm trường {@code protected}
 *   ({@code VisibilityModifier protectedAllowed=false}), nên {@code con} là trường riêng có accessor
 *   {@code protected final}.</li>
 *   <li>Hàm đọc chạy autocommit, không gọi helper. Hàm ghi bọc toàn bộ thân trong
 *   {@link #inWriteTransaction(Callable)}: trả {@code true} thì commit, {@code false} thì rollback.</li>
 *   <li>Lỗi SQL không lường trước thì ném ra, không nuốt và không đổi thành {@code false} (contracts §5.2).</li>
 * </ul>
 *
 * <p>Khuôn hàm ghi (trùng UNIQUE = mã MySQL 1062 thì trả {@code false}; gán id vào đối tượng chỉ sau khi helper trả
 * {@code true}, tức là sau commit):
 * <pre>{@code
 * public boolean addDamage(Damage damage) throws SQLException {
 *     int[] newId = new int[1];
 *     boolean saved = inWriteTransaction(() -> {
 *         try (PreparedStatement ps = con().prepareStatement(SQL, Statement.RETURN_GENERATED_KEYS)) {
 *             ...
 *             newId[0] = ...;
 *             return true;
 *         } catch (SQLException e) {
 *             if (e.getErrorCode() == MYSQL_DUPLICATE_ENTRY) {
 *                 return false;
 *             }
 *             throw e;
 *         }
 *     });
 *     if (saved) {
 *         damage.setId(newId[0]);
 *     }
 *     return saved;
 * }
 * }</pre>
 *
 * <p>Lớp này không có lớp lồng (kể cả interface) để thư mục {@code dao} đã biên dịch chỉ chứa đúng chín lớp
 * DAO mà {@code ArchitectureTest} đếm. Hàm public duy nhất lớp này thêm là {@link #close()}.
 */
public abstract class DAO implements AutoCloseable {

    private final Connection con;

    /**
     * Mượn một kết nối từ pool HikariCP của ứng dụng.
     *
     * @throws SQLException khi không lấy được kết nối trong thời gian chờ
     */
    public DAO() throws SQLException {
        this(Db.getConnection());
    }

    /**
     * Dùng một kết nối có sẵn (test đưa kết nối Testcontainers vào). DAO sở hữu kết nối và đóng nó khi
     * {@link #close()}.
     *
     * @param con kết nối đang mở, autocommit bật
     */
    protected DAO(Connection con) {
        this.con = Objects.requireNonNull(con, "con");
    }

    /**
     * Kết nối của DAO; lớp con dùng để tạo {@code PreparedStatement}.
     *
     * @return kết nối mượn lúc tạo DAO
     */
    protected final Connection con() {
        return con;
    }

    /**
     * Chạy một thao tác ghi trong một transaction theo contracts §5.2: tắt autocommit, mức cô lập
     * {@code READ_COMMITTED}; {@code work} trả {@code true} thì commit, {@code false} thì rollback; ngoại lệ thì
     * rollback rồi ném lại. Sau cùng trả autocommit và mức cô lập về như trước.
     *
     * <p>Không lồng được: gọi khi kết nối đang ở giữa transaction (autocommit tắt) thì ném
     * {@link IllegalStateException}. Ngoại lệ kiểm tra khác {@link SQLException} được bọc trong
     * {@link SQLException}.
     *
     * @param work thân hàm ghi, trả {@code true} khi ghi xong, {@code false} khi nghiệp vụ từ chối
     * @return giá trị {@code work} trả
     * @throws SQLException lỗi SQL của {@code work}, của commit hoặc rollback
     */
    protected final boolean inWriteTransaction(Callable<Boolean> work) throws SQLException {
        Objects.requireNonNull(work, "work");
        if (!con.getAutoCommit()) {
            throw new IllegalStateException("inWriteTransaction không lồng được: kết nối đang ở giữa transaction");
        }
        int previousIsolation = con.getTransactionIsolation();
        con.setTransactionIsolation(Connection.TRANSACTION_READ_COMMITTED);
        con.setAutoCommit(false);
        try {
            return commitOrRollback(work);
        } finally {
            con.setAutoCommit(true);
            con.setTransactionIsolation(previousIsolation);
        }
    }

    private boolean commitOrRollback(Callable<Boolean> work) throws SQLException {
        try {
            Boolean result = work.call();
            if (result == null) {
                throw new IllegalStateException("Thân hàm ghi trả null, phải trả true hoặc false");
            }
            if (result) {
                con.commit();
            } else {
                con.rollback();
            }
            return result;
        } catch (SQLException | RuntimeException e) {
            rollbackAfter(e);
            throw e;
        } catch (Exception e) {
            SQLException wrapped = new SQLException("Thao tác ghi lỗi: " + e.getMessage(), e);
            rollbackAfter(wrapped);
            throw wrapped;
        }
    }

    private void rollbackAfter(Exception failure) {
        try {
            con.rollback();
        } catch (SQLException rollbackFailure) {
            failure.addSuppressed(rollbackFailure);
        }
    }

    /**
     * Trả kết nối về pool (hoặc đóng kết nối test đã đưa vào).
     *
     * @throws SQLException khi đóng kết nối lỗi
     */
    @Override
    public void close() throws SQLException {
        con.close();
    }
}
