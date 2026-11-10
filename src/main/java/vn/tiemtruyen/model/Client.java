package vn.tiemtruyen.model;

import java.io.Serial;
import java.time.LocalDate;

/**
 * Khách hàng ({@code tblClient}), kế thừa {@link User}.
 */
public class Client extends User {

    @Serial
    private static final long serialVersionUID = 1L;

    private LocalDate dob;
    private String idCard;
    private String phone;
    private String email;
    private String address;

    /** Đối tượng rỗng; {@code id = 0} nghĩa là chưa lưu. */
    public Client() {
    }

    public LocalDate getDob() {
        return dob;
    }

    public void setDob(LocalDate dob) {
        this.dob = dob;
    }

    public String getIdCard() {
        return idCard;
    }

    public void setIdCard(String idCard) {
        this.idCard = idCard;
    }

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getAddress() {
        return address;
    }

    public void setAddress(String address) {
        this.address = address;
    }
}
