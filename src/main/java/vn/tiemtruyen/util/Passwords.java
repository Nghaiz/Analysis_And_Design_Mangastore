package vn.tiemtruyen.util;

import com.password4j.Argon2Function;
import com.password4j.Password;
import com.password4j.types.Argon2;
import java.util.Objects;

/**
 * Băm và kiểm mật khẩu bằng Argon2id (Password4j), D1.
 *
 * <p>Tham số theo mức tối thiểu OWASP cho Argon2id: bộ nhớ 19 MiB, 2 vòng, 1 luồng, muối ngẫu nhiên 16 byte,
 * đầu ra 32 byte. Chuỗi kết quả dạng PHC ({@code $argon2id$v=19$m=19456,t=2,p=1$<muối>$<băm>}), khoảng 97 kí tự,
 * vừa cột {@code tblUser.password varchar(255)}. Khi kiểm, tham số đọc từ chính chuỗi băm, nên đổi tham số sau này
 * không làm hỏng các chuỗi cũ.
 */
public final class Passwords {

    private static final int MEMORY_KIB = 19_456;
    private static final int ITERATIONS = 2;
    private static final int PARALLELISM = 1;
    private static final int OUTPUT_BYTES = 32;
    private static final int SALT_BYTES = 16;
    private static final String ARGON2ID_PREFIX = "$argon2id$";

    private static final Argon2Function ARGON2ID =
            Argon2Function.getInstance(MEMORY_KIB, ITERATIONS, PARALLELISM, OUTPUT_BYTES, Argon2.ID);

    private Passwords() {
    }

    /**
     * Băm một mật khẩu thô với muối ngẫu nhiên mới.
     *
     * @param plain mật khẩu thô
     * @return chuỗi Argon2id dạng PHC
     */
    public static String hash(CharSequence plain) {
        Objects.requireNonNull(plain, "plain");
        return Password.hash(plain).addRandomSalt(SALT_BYTES).with(ARGON2ID).getResult();
    }

    /**
     * Kiểm mật khẩu thô với chuỗi băm đã lưu.
     *
     * @param plain mật khẩu thô người dùng nhập
     * @param hash chuỗi Argon2id đọc từ {@code tblUser.password}
     * @return {@code true} khi khớp
     * @throws IllegalArgumentException khi {@code hash} không phải chuỗi Argon2id (dữ liệu trong DB hỏng)
     */
    public static boolean verify(CharSequence plain, String hash) {
        Objects.requireNonNull(plain, "plain");
        Objects.requireNonNull(hash, "hash");
        if (!hash.startsWith(ARGON2ID_PREFIX)) {
            throw new IllegalArgumentException("Chuỗi băm mật khẩu không phải Argon2id");
        }
        return Password.check(plain, hash).with(Argon2Function.getInstanceFromHash(hash));
    }
}
