# Schema MySQL và ERD

<!-- updated 261111 -->

13 bảng của ch.8 (tr.53–55) và ERD `images/svg/design_database.svg`, khác báo cáo duy nhất ở `tblUser.password varchar(255)` (D1, [ADR-0002](adr/0002-password-varchar-255.md)).

- **SSOT là [`docs/contracts.md`](contracts.md) mục 2.** Bảng cột ở mục 3 dưới đây là bản chép **có chủ đích** để `SchemaConformanceTest` (phase 3) đọc máy. Chép bằng script, không gõ tay; hai file lệch nhau thì `contracts.md` thắng và file này phải chép lại.
- Ý nghĩa nghiệp vụ của từng cột, giá trị hằng và luật "không cột dẫn xuất": `docs/contracts.md` mục 1–4.
- Migration: `src/main/resources/db/migration/V1__schema.sql` (phase 3), chạy bằng Flyway lúc app khởi động ([ADR-0008](adr/0008-flyway-qua-listener.md)).

## 1. ERD

Thứ tự trong khối thuộc tính: kiểu, tên cột, khoá (`PK`, `FK`, `UK` = UNIQUE).

```mermaid
erDiagram
    tblUser ||--o| tblClient : "userId"
    tblUser ||--o| tblStaff : "userId"
    tblClient ||--|| tblCart : "clientId"
    tblCart ||--o{ tblSelectedBook : "cartId"
    tblBook ||--o{ tblBookCopy : "bookId"
    tblBookCopy ||--o{ tblSelectedBook : "bookCopyId"
    tblClient ||--o{ tblRentalBill : "clientId"
    tblStaff |o--o{ tblRentalBill : "staffId"
    tblRentalBill ||--o{ tblRentedBook : "rentalBillId"
    tblBookCopy ||--o{ tblRentedBook : "bookCopyId"
    tblSelectedBook |o--o{ tblRentedBook : "selectedBookId"
    tblRentedBook ||--o{ tblRentedDamage : "rentedBookId"
    tblDamage ||--o{ tblRentedDamage : "damageId"
    tblRentalBill ||--o{ tblRentalCollateral : "rentalBillId"
    tblCollateral ||--o{ tblRentalCollateral : "collateralId"
    tblUser {
        int id PK
        varchar(50) username UK
        varchar(255) password
        varchar(100) fullName
    }
    tblClient {
        int userId PK, FK
        date dob
        varchar(12) idCard UK
        varchar(10) phone UK
        varchar(100) email UK
        varchar(255) address
    }
    tblStaff {
        int userId PK, FK
        varchar(50) position
    }
    tblBook {
        int id PK
        varchar(255) name
        varchar(100) author
        varchar(100) publisher
        int publishYear
        varchar(50) category
        varchar(255) description
        float rentalPrice
    }
    tblBookCopy {
        int id PK
        varchar(20) barcode UK
        int bookId FK
    }
    tblDamage {
        int id PK
        varchar(100) name UK
        varchar(255) description
    }
    tblCollateral {
        int id PK
        varchar(100) name UK
        varchar(255) description
    }
    tblCart {
        int id PK
        int clientId FK, UK
    }
    tblSelectedBook {
        int id PK
        int cartId FK
        int bookCopyId FK
    }
    tblRentalBill {
        int id PK
        timestamp createdAt
        timestamp expectedPickupAt
        int expectedDays
        date borrowDate
        date dueDate
        float discount
        varchar(255) note
        varchar(20) status
        varchar(255) cancelReason
        int clientId FK
        int staffId FK
    }
    tblRentedBook {
        int id PK
        float rentalPrice
        varchar(255) conditionNote
        int rentalBillId FK
        int bookCopyId FK
        int selectedBookId FK
    }
    tblRentedDamage {
        int id PK
        varchar(255) note
        int rentedBookId FK
        int damageId FK
    }
    tblRentalCollateral {
        int id PK
        varchar(100) value
        varchar(255) note
        int rentalBillId FK
        int collateralId FK
    }
```

## 2. Quy ước đọc bảng

| Cột | Giá trị được dùng |
|---|---|
| Kiểu | Cú pháp MySQL: `int`, `varchar(n)`, `date`, `timestamp`, `float` |
| Null | `NULL` hoặc `NOT NULL` |
| Khoá | Trống, `PK`, `UNIQUE`, `FK→tblY.cột`, hoặc `PK, FK→tblY.cột` |

Ràng buộc không nằm trong cột Khoá (ghi ở ghi chú dưới bảng của `docs/contracts.md` mục 2), test vẫn phải kiểm:

- `tblCart.clientId` UNIQUE (quan hệ 1-1 Client – Cart).
- Index: `tblBook(name)`, `tblBook(author)`, `tblRentalBill(status)`, `tblRentedBook(bookCopyId)`.
- Mặc định: `tblRentalBill.createdAt DEFAULT CURRENT_TIMESTAMP`, `tblRentalBill.discount DEFAULT 0`.
- `id` là `AUTO_INCREMENT`, trừ `tblClient`, `tblStaff` (khoá chính `userId`). InnoDB, `utf8mb4`, collation `utf8mb4_0900_ai_ci`.

Định dạng máy đọc: mỗi bảng một heading `### tblX`, một dòng trống, rồi bảng có header đúng `| Cột | Kiểu | Null | Khoá |`. Không chèn gì giữa heading và bảng.

## 3. Bảng cột

### tblUser

| Cột | Kiểu | Null | Khoá |
|---|---|---|---|
| id | int | NOT NULL | PK |
| username | varchar(50) | NOT NULL | UNIQUE |
| password | varchar(255) | NOT NULL | |
| fullName | varchar(100) | NOT NULL | |

### tblClient

| Cột | Kiểu | Null | Khoá |
|---|---|---|---|
| userId | int | NOT NULL | PK, FK→tblUser.id |
| dob | date | NOT NULL | |
| idCard | varchar(12) | NOT NULL | UNIQUE |
| phone | varchar(10) | NOT NULL | UNIQUE |
| email | varchar(100) | NOT NULL | UNIQUE |
| address | varchar(255) | NOT NULL | |

### tblStaff

| Cột | Kiểu | Null | Khoá |
|---|---|---|---|
| userId | int | NOT NULL | PK, FK→tblUser.id |
| position | varchar(50) | NOT NULL | |

### tblBook

| Cột | Kiểu | Null | Khoá |
|---|---|---|---|
| id | int | NOT NULL | PK |
| name | varchar(255) | NOT NULL | |
| author | varchar(100) | NOT NULL | |
| publisher | varchar(100) | NOT NULL | |
| publishYear | int | NULL | |
| category | varchar(50) | NOT NULL | |
| description | varchar(255) | NULL | |
| rentalPrice | float | NOT NULL | |

### tblBookCopy

| Cột | Kiểu | Null | Khoá |
|---|---|---|---|
| id | int | NOT NULL | PK |
| barcode | varchar(20) | NOT NULL | UNIQUE |
| bookId | int | NOT NULL | FK→tblBook.id |

### tblDamage

| Cột | Kiểu | Null | Khoá |
|---|---|---|---|
| id | int | NOT NULL | PK |
| name | varchar(100) | NOT NULL | UNIQUE |
| description | varchar(255) | NULL | |

### tblCollateral

| Cột | Kiểu | Null | Khoá |
|---|---|---|---|
| id | int | NOT NULL | PK |
| name | varchar(100) | NOT NULL | UNIQUE |
| description | varchar(255) | NULL | |

### tblCart

| Cột | Kiểu | Null | Khoá |
|---|---|---|---|
| id | int | NOT NULL | PK |
| clientId | int | NOT NULL | FK→tblClient.userId |

### tblSelectedBook

| Cột | Kiểu | Null | Khoá |
|---|---|---|---|
| id | int | NOT NULL | PK |
| cartId | int | NOT NULL | FK→tblCart.id |
| bookCopyId | int | NOT NULL | FK→tblBookCopy.id |

### tblRentalBill

| Cột | Kiểu | Null | Khoá |
|---|---|---|---|
| id | int | NOT NULL | PK |
| createdAt | timestamp | NOT NULL | |
| expectedPickupAt | timestamp | NOT NULL | |
| expectedDays | int | NOT NULL | |
| borrowDate | date | NULL | |
| dueDate | date | NULL | |
| discount | float | NOT NULL | |
| note | varchar(255) | NULL | |
| status | varchar(20) | NOT NULL | |
| cancelReason | varchar(255) | NULL | |
| clientId | int | NOT NULL | FK→tblClient.userId |
| staffId | int | NULL | FK→tblStaff.userId |

### tblRentedBook

| Cột | Kiểu | Null | Khoá |
|---|---|---|---|
| id | int | NOT NULL | PK |
| rentalPrice | float | NOT NULL | |
| conditionNote | varchar(255) | NULL | |
| rentalBillId | int | NOT NULL | FK→tblRentalBill.id |
| bookCopyId | int | NOT NULL | FK→tblBookCopy.id |
| selectedBookId | int | NULL | FK→tblSelectedBook.id |

### tblRentedDamage

| Cột | Kiểu | Null | Khoá |
|---|---|---|---|
| id | int | NOT NULL | PK |
| note | varchar(255) | NULL | |
| rentedBookId | int | NOT NULL | FK→tblRentedBook.id |
| damageId | int | NOT NULL | FK→tblDamage.id |

### tblRentalCollateral

| Cột | Kiểu | Null | Khoá |
|---|---|---|---|
| id | int | NOT NULL | PK |
| value | varchar(100) | NOT NULL | |
| note | varchar(255) | NULL | |
| rentalBillId | int | NOT NULL | FK→tblRentalBill.id |
| collateralId | int | NOT NULL | FK→tblCollateral.id |
