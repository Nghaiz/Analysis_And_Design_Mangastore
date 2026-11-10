package vn.tiemtruyen.model;

import java.io.Serial;
import java.io.Serializable;

/**
 * Một lỗi ghi nhận cho một dòng phiếu khi giao ({@code tblRentedDamage}).
 */
public class RentedDamage implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    private int id;
    private String note;
    private Damage damage;

    /** Đối tượng rỗng; {@code id = 0} nghĩa là chưa lưu. */
    public RentedDamage() {
    }

    public int getId() {
        return id;
    }

    public void setId(int id) {
        this.id = id;
    }

    public String getNote() {
        return note;
    }

    public void setNote(String note) {
        this.note = note;
    }

    public Damage getDamage() {
        return damage;
    }

    public void setDamage(Damage damage) {
        this.damage = damage;
    }
}
