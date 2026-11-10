package vn.tiemtruyen.util;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

class PasswordsTest {

    private static final int PASSWORD_COLUMN_LENGTH = 255;

    @Test
    void hashIsArgon2idAndFitsPasswordColumn() {
        String hash = Passwords.hash("hant@123");
        assertTrue(hash.startsWith("$argon2id$v=19$m=19456,t=2,p=1$"), hash);
        assertTrue(hash.length() <= PASSWORD_COLUMN_LENGTH, "Dài " + hash.length() + " kí tự");
    }

    @Test
    void verifyAcceptsRightPasswordAndRejectsWrongOne() {
        String hash = Passwords.hash("Khach01@123");
        assertTrue(Passwords.verify("Khach01@123", hash));
        assertFalse(Passwords.verify("khach01@123", hash));
        assertFalse(Passwords.verify("Khach01@1234", hash));
        assertFalse(Passwords.verify("", hash));
    }

    @Test
    void sameSecretHashesDifferentlyEachTime() {
        String first = Passwords.hash("Anh@2003");
        String second = Passwords.hash("Anh@2003");
        assertNotEquals(first, second);
        assertTrue(Passwords.verify("Anh@2003", first));
        assertTrue(Passwords.verify("Anh@2003", second));
    }

    @Test
    void handlesVietnameseAndLongPasswords() {
        String plain = "Mật khẩu tiếng Việt có dấu ".repeat(10);
        String hash = Passwords.hash(plain);
        assertTrue(hash.length() <= PASSWORD_COLUMN_LENGTH);
        assertTrue(Passwords.verify(plain, hash));
    }

    @Test
    void rejectsHashThatIsNotArgon2id() {
        assertThrows(IllegalArgumentException.class, () -> Passwords.verify("hant@123", "hant@123"));
        assertThrows(IllegalArgumentException.class, () -> Passwords.verify("hant@123", "@@HASH:hant@@"));
        assertThrows(NullPointerException.class, () -> Passwords.verify("hant@123", null));
    }

    /** Chuỗi sinh sẵn cho V2 (docs/dev-accounts.md); báo cáo lane 3A ghi cùng các chuỗi này. */
    @ParameterizedTest
    @CsvSource(delimiter = ';', value = {
        "hant@123;" + DevAccountHashes.HANT,
        "Quanli@123;" + DevAccountHashes.QUANLI,
        "Khach01@123;" + DevAccountHashes.KHACH01,
        "Khach02@123;" + DevAccountHashes.KHACH02,
        "Khach03@123;" + DevAccountHashes.KHACH03,
    })
    void pregeneratedDevAccountHashesVerify(String plain, String hash) {
        assertTrue(hash.length() <= PASSWORD_COLUMN_LENGTH);
        assertTrue(Passwords.verify(plain, hash));
        assertFalse(Passwords.verify(plain + "x", hash));
    }
}
