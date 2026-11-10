package vn.tiemtruyen.model;

import java.io.Serial;
import java.io.Serializable;

/**
 * Tài khoản đăng nhập ({@code tblUser}); lớp cha của {@link Client} và {@link Staff}.
 *
 * <p>{@code password} chỉ chứa mật khẩu thô trên đường đăng nhập/đăng kí; trong DB luôn là chuỗi Argon2id (D1).
 */
public class User implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    private int id;
    private String username;
    private String password;
    private String fullName;

    /** Đối tượng rỗng; {@code id = 0} nghĩa là chưa lưu. */
    public User() {
    }

    public int getId() {
        return id;
    }

    public void setId(int id) {
        this.id = id;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public String getFullName() {
        return fullName;
    }

    public void setFullName(String fullName) {
        this.fullName = fullName;
    }
}
