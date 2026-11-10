package vn.tiemtruyen.model;

import java.io.Serial;
import java.io.Serializable;

/**
 * Loại tài sản đặt cọc ({@code tblCollateral}).
 */
public class Collateral implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    private int id;
    private String name;
    private String description;

    /** Đối tượng rỗng; {@code id = 0} nghĩa là chưa lưu. */
    public Collateral() {
    }

    public int getId() {
        return id;
    }

    public void setId(int id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }
}
