# ADR: các quyết định kiến trúc

<!-- updated 261111 -->

Mỗi quyết định một file `NNNN-<slug>.md`, mục: Trạng thái, Bối cảnh, Quyết định, Hệ quả, Phương án đã loại. Quyết định mới lấy số kế tiếp; quyết định bị thay thì đổi Trạng thái thành "Bị thay bởi ADR-NNNN", không xoá file.

| # | Quyết định | Nguồn |
|---|---|---|
| [0001](0001-jsp-dao-khong-controller.md) | Kiến trúc JSP-DAO, không Servlet điều khiển, không Spring | brief §4, ch.9 |
| [0002](0002-password-varchar-255.md) | `tblUser.password varchar(255)` | D1 |
| [0003](0003-jakarta-ee-11-tomcat-java-25.md) | Jakarta EE 11 trên Tomcat 11.0.27, Java 25; bảng phiên bản đã ghim | brainstorm §5 |
| [0004](0004-island-cach-b.md) | React island cách B | brainstorm §3 |
| [0005](0005-khoa-k1-dong-dau-truyen.md) | Khoá K1 khi giữ quyển | brainstorm §4 |
| [0006](0006-session-redis-redisson.md) | Session trong Redis qua Redisson | D7 |
| [0007](0007-password4j-argon2id.md) | Password4j, Argon2id | brainstorm §5 |
| [0008](0008-flyway-qua-listener.md) | Flyway qua listener trong app | Deferred #8, #9 |
| [0009](0009-motion-thay-gsap.md) | Motion thay GSAP | brainstorm §5 |
| [0010](0010-nguon-du-lieu-kim-dong-tiki.md) | Nguồn dữ liệu Kim Đồng + Tiki, nội dung ngoài git | D11 |
| [0011](0011-font-tu-host.md) | Font tự host, subset vietnamese | Deferred #17 |
| [0012](0012-pipeline-bang-node.md) | Pipeline dữ liệu bằng Node | Deferred #5 |
| [0013](0013-chi-chay-localhost.md) | Chỉ chạy localhost | Deferred #28 |
