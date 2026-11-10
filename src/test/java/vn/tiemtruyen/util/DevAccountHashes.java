package vn.tiemtruyen.util;

/**
 * Chuỗi Argon2id sinh sẵn bằng {@link Passwords#hash(CharSequence)} cho năm tài khoản mẫu của
 * {@code docs/dev-accounts.md}; orchestrator chép vào {@code V2__catalog_seed.sql} thay {@code @@HASH:<user>@@}.
 * {@code PasswordsTest} kiểm mỗi chuỗi khớp đúng mật khẩu gốc.
 */
final class DevAccountHashes {

    static final String HANT =
            "$argon2id$v=19$m=19456,t=2,p=1$Z7/ga5InHhW9wZ1E0Nwo2g$6OHItTnti86VDbCM3ZI9PqzZZPkQfllb9oYdM2EpeQc";
    static final String QUANLI =
            "$argon2id$v=19$m=19456,t=2,p=1$WsKuqJ2Jb0qcqNNwbZR39w$7NtBlGWwDTKTeCpfFOMQjJF6QonuXxP8gVoJhxIilcM";
    static final String KHACH01 =
            "$argon2id$v=19$m=19456,t=2,p=1$gdrTiFlWIsrtIXCgO3arpQ$m7eD1URB+sOant0IbjBlnN8GdYVR+ROvGN1jPqVv6Y8";
    static final String KHACH02 =
            "$argon2id$v=19$m=19456,t=2,p=1$x2BL8YwmgrEsyfrA1BkqQQ$TaMxzVYriJjvujQDEniQiKdpL8bMy/TQafZLXVdswYA";
    static final String KHACH03 =
            "$argon2id$v=19$m=19456,t=2,p=1$qiUpoXh7tG+GFctny1Qp3w$NIo7Dc1E6R/oJz967vGc2hqXcSZFiNMjYrypLo7lKi4";

    private DevAccountHashes() {
    }
}
