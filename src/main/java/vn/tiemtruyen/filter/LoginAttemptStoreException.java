package vn.tiemtruyen.filter;

/** Lỗi hạ tầng của bộ đếm đăng nhập sai (Redis không tới được, chưa cấu hình). Filter trả 500, không cho qua. */
class LoginAttemptStoreException extends RuntimeException {

    private static final long serialVersionUID = 1L;

    LoginAttemptStoreException(String message) {
        super(message);
    }

    LoginAttemptStoreException(String message, Throwable cause) {
        super(message, cause);
    }
}
