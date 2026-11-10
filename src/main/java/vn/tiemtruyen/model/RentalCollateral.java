package vn.tiemtruyen.model;

import java.io.Serial;
import java.io.Serializable;

/**
 * Một khoản đặt cọc của phiếu mượn ({@code tblRentalCollateral}); {@code value} là chuỗi tự do.
 */
public class RentalCollateral implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    private int id;
    private String value;
    private String note;
    private Collateral collateral;

    /** Đối tượng rỗng; {@code id = 0} nghĩa là chưa lưu. */
    public RentalCollateral() {
    }

    public int getId() {
        return id;
    }

    public void setId(int id) {
        this.id = id;
    }

    public String getValue() {
        return value;
    }

    public void setValue(String value) {
        this.value = value;
    }

    public String getNote() {
        return note;
    }

    public void setNote(String note) {
        this.note = note;
    }

    public Collateral getCollateral() {
        return collateral;
    }

    public void setCollateral(Collateral collateral) {
        this.collateral = collateral;
    }
}
