-- V1: 13 bảng theo chương 8 của báo cáo (tên bảng, tên cột giữ nguyên) và brainstorm §2.1.
-- Khác báo cáo duy nhất: tblUser.password varchar(255) để chứa chuỗi băm Argon2id (D1).
-- Không có cột dẫn xuất: số lượng hiện có, tổng tiền, trạng thái quyển đều tính từ các bảng khác.
-- tblClient.userId và tblStaff.userId vừa là khoá chính vừa là khoá ngoại tới tblUser (bước 4 ch.8).

CREATE TABLE tblUser (
    id INT NOT NULL AUTO_INCREMENT,
    username VARCHAR(50) NOT NULL,
    password VARCHAR(255) NOT NULL,
    fullName VARCHAR(100) NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uq_tblUser_username UNIQUE (username)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

CREATE TABLE tblClient (
    userId INT NOT NULL,
    dob DATE NOT NULL,
    idCard VARCHAR(12) NOT NULL,
    phone VARCHAR(10) NOT NULL,
    email VARCHAR(100) NOT NULL,
    address VARCHAR(255) NOT NULL,
    PRIMARY KEY (userId),
    CONSTRAINT uq_tblClient_idCard UNIQUE (idCard),
    CONSTRAINT uq_tblClient_phone UNIQUE (phone),
    CONSTRAINT uq_tblClient_email UNIQUE (email),
    CONSTRAINT fk_tblClient_user FOREIGN KEY (userId) REFERENCES tblUser (id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

CREATE TABLE tblStaff (
    userId INT NOT NULL,
    position VARCHAR(50) NOT NULL,
    PRIMARY KEY (userId),
    CONSTRAINT fk_tblStaff_user FOREIGN KEY (userId) REFERENCES tblUser (id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

CREATE TABLE tblBook (
    id INT NOT NULL AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    author VARCHAR(100) NOT NULL,
    publisher VARCHAR(100) NOT NULL,
    publishYear INT NULL,
    category VARCHAR(50) NOT NULL,
    description VARCHAR(255) NULL,
    rentalPrice FLOAT NOT NULL,
    PRIMARY KEY (id),
    INDEX ix_tblBook_name (name),
    INDEX ix_tblBook_author (author)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

CREATE TABLE tblBookCopy (
    id INT NOT NULL AUTO_INCREMENT,
    barcode VARCHAR(20) NOT NULL,
    bookId INT NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uq_tblBookCopy_barcode UNIQUE (barcode),
    CONSTRAINT fk_tblBookCopy_book FOREIGN KEY (bookId) REFERENCES tblBook (id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

CREATE TABLE tblDamage (
    id INT NOT NULL AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(255) NULL,
    PRIMARY KEY (id),
    CONSTRAINT uq_tblDamage_name UNIQUE (name)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

CREATE TABLE tblCollateral (
    id INT NOT NULL AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(255) NULL,
    PRIMARY KEY (id),
    CONSTRAINT uq_tblCollateral_name UNIQUE (name)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

CREATE TABLE tblCart (
    id INT NOT NULL AUTO_INCREMENT,
    clientId INT NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uq_tblCart_clientId UNIQUE (clientId),
    CONSTRAINT fk_tblCart_client FOREIGN KEY (clientId) REFERENCES tblClient (userId)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

CREATE TABLE tblSelectedBook (
    id INT NOT NULL AUTO_INCREMENT,
    cartId INT NOT NULL,
    bookCopyId INT NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_tblSelectedBook_cart FOREIGN KEY (cartId) REFERENCES tblCart (id),
    CONSTRAINT fk_tblSelectedBook_bookCopy FOREIGN KEY (bookCopyId) REFERENCES tblBookCopy (id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

CREATE TABLE tblRentalBill (
    id INT NOT NULL AUTO_INCREMENT,
    createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expectedPickupAt TIMESTAMP NOT NULL,
    expectedDays INT NOT NULL,
    borrowDate DATE NULL,
    dueDate DATE NULL,
    discount FLOAT NOT NULL DEFAULT 0,
    note VARCHAR(255) NULL,
    status VARCHAR(20) NOT NULL,
    cancelReason VARCHAR(255) NULL,
    clientId INT NOT NULL,
    staffId INT NULL,
    PRIMARY KEY (id),
    INDEX ix_tblRentalBill_status (status),
    CONSTRAINT fk_tblRentalBill_client FOREIGN KEY (clientId) REFERENCES tblClient (userId),
    CONSTRAINT fk_tblRentalBill_staff FOREIGN KEY (staffId) REFERENCES tblStaff (userId)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

CREATE TABLE tblRentedBook (
    id INT NOT NULL AUTO_INCREMENT,
    rentalPrice FLOAT NOT NULL,
    conditionNote VARCHAR(255) NULL,
    rentalBillId INT NOT NULL,
    bookCopyId INT NOT NULL,
    selectedBookId INT NULL,
    PRIMARY KEY (id),
    INDEX ix_tblRentedBook_bookCopyId (bookCopyId),
    CONSTRAINT fk_tblRentedBook_rentalBill FOREIGN KEY (rentalBillId) REFERENCES tblRentalBill (id),
    CONSTRAINT fk_tblRentedBook_bookCopy FOREIGN KEY (bookCopyId) REFERENCES tblBookCopy (id),
    CONSTRAINT fk_tblRentedBook_selectedBook FOREIGN KEY (selectedBookId) REFERENCES tblSelectedBook (id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

CREATE TABLE tblRentedDamage (
    id INT NOT NULL AUTO_INCREMENT,
    note VARCHAR(255) NULL,
    rentedBookId INT NOT NULL,
    damageId INT NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_tblRentedDamage_rentedBook FOREIGN KEY (rentedBookId) REFERENCES tblRentedBook (id),
    CONSTRAINT fk_tblRentedDamage_damage FOREIGN KEY (damageId) REFERENCES tblDamage (id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

CREATE TABLE tblRentalCollateral (
    id INT NOT NULL AUTO_INCREMENT,
    value VARCHAR(100) NOT NULL,
    note VARCHAR(255) NULL,
    rentalBillId INT NOT NULL,
    collateralId INT NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_tblRentalCollateral_rentalBill FOREIGN KEY (rentalBillId) REFERENCES tblRentalBill (id),
    CONSTRAINT fk_tblRentalCollateral_collateral FOREIGN KEY (collateralId) REFERENCES tblCollateral (id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;
