# Web "Tiệm thuê truyện tuổi thơ": brief cho /t1k:brainstorm

Tôi muốn dựng thành web thật hệ thống quản lí cửa hàng cho thuê truyện mà nhóm tôi đã phân tích và thiết kế trong môn PTTK. Phiên này là brainstorm rồi lập kế hoạch. Chưa viết code cho tới khi tôi duyệt thiết kế.

## 1. Nguồn phải đọc trước

Đọc hết rồi mới đề xuất. Bản báo cáo là nguồn chính, mọi thứ khác dùng để hiểu vì sao thiết kế ra như vậy.

- Báo cáo hoàn chỉnh: `D:\PTTK\Hệ thống quản lí cửa hàng cho thuê truyện\B23DCCN600 - Nguyen Duy Nghia - Bao cao tong hop.pdf` (116 trang, 11 chương). Bản Word cùng tên nằm cạnh nó.
- Ghi nhớ tích luỹ qua các phiên: `C:\Users\Nghaiz\.claude\projects\d--PTTK\memory\` (đọc cả hai file, nhất là `feedback-pttk-analysis-deliverables.md`, chứa mọi quyết định của tôi và nhận xét của thầy).
- Lịch sử làm việc: các file `*.jsonl` trong `C:\Users\Nghaiz\.claude\projects\d--PTTK\`. Chỉ tra khi cần lí do của một quyết định, đừng đọc tràn lan.
- Biểu đồ thực thể chính thức: `D:\PTTK\vpauto\images\design_entity_pa5.png`. Ghi chú thiết kế: `D:\PTTK\vpauto\NOTE_*.md`.

Thư mục `D:\PTTK` chỉ để đọc. Không sửa gì ở đó.

## 2. Phạm vi

Làm đúng 3 chức năng của module M1 trong báo cáo, cộng phần lõi để web chạy được thật:

1. Khách hàng đăng kí.
2. Khách hàng tìm và chọn truyện muốn thuê trực tuyến (đăng nhập, tìm đầu truyện theo tên hoặc tác giả, thêm vào "Truyện đã chọn", tạo và xác nhận phiếu mượn, xem và huỷ phiếu của mình).
3. Khách hàng đến nhận truyện tại quầy (nhân viên tìm phiếu, chỉnh danh sách truyện, ghi tình trạng và lỗi, thêm khoản đặt cọc, xác nhận và in phiếu).

Phần lõi thêm vào: dữ liệu thật crawl về (xem mục 6), dữ liệu mẫu cho phần còn lại (lỗi, loại tài sản cọc, vài khách và nhân viên) và một trang quản trị đơn giản để thêm đầu truyện, quyển truyện. Không làm trả truyện, phí phạt, thống kê. Ghi chúng vào mục "để sau" trong kế hoạch.

## 3. Hợp đồng nghiệp vụ (đã chốt, không thiết kế lại)

Thầy đã duyệt thiết kế này. Muốn đổi chỗ nào thì nói thẳng là đề xuất đổi thiết kế và hỏi tôi, đừng gói nó thành "tối ưu".

**13 thực thể:** User, Client, Staff (Client, Staff kế thừa User), Book, BookCopy, Damage, Collateral, Cart, SelectedBook, RentalBill, RentedBook, RentedDamage, RentalCollateral.

**Quan hệ chính:**
- Cart ◆ SelectedBook ◇ BookCopy. Một dòng giỏ là một quyển, không có cột số lượng. Số lượng hiển thị = số dòng cùng đầu truyện, màn hình gộp theo đầu truyện.
- RentalBill ◆ RentedBook ◇ BookCopy (quyển thực giao). RentedBook ◇ SelectedBook 0..1 (dòng giỏ nó sinh ra, để trống nếu nhân viên thêm tại quầy).
- RentedBook ◆ RentedDamage ◇ Damage. RentalBill ◆ RentalCollateral ◇ Collateral.
- Phiếu mượn chỉ giữ một danh sách: listRentedBook.

**Trạng thái phiếu:** "Chờ nhận", "Đang cho thuê", "Đã huỷ". BookCopy không có cột trạng thái: một quyển bận khi có RentedBook của phiếu chưa huỷ trỏ vào nó. Vì vậy phải kiểm tra quyển còn trống ngay trong transaction lưu phiếu (khoá dòng), không tin dữ liệu đã đọc trước đó.

**Bảng MySQL:** tblUser, tblClient, tblStaff (hai bảng này lấy userId làm khoá chính), tblBook, tblBookCopy, tblDamage, tblCollateral, tblCart, tblSelectedBook, tblRentalBill, tblRentedBook, tblRentedDamage, tblRentalCollateral. Cột và khoá ngoại lấy đúng chương 8. Không lưu thuộc tính dẫn xuất (số lượng, tổng tiền, trạng thái quyển). tblRentedBook.rentalPrice là giá chốt lúc lập phiếu, giữ lại.

**Quy tắc DAO (của thầy):**
- Lớp cha DAO giữ Connection. UserDAO, ClientDAO, StaffDAO, BookDAO, CartDAO, RentalBillDAO, DamageDAO, CollateralDAO.
- Không có DAO cho lớp trung gian phụ thuộc (SelectedBook, RentedBook, RentedDamage, RentalCollateral). Mọi thao tác đi qua DAO của đối tượng chủ: `CartDAO.updateCart(cart)`, `RentalBillDAO.updateRentalBill(rentalBill)`.
- Mỗi đối tượng gốc chỉ có một hàm cập nhật. Trang gán giá trị, hàm lưu.
- Không có getById. Đăng nhập trả về Client hoặc Staff đủ thông tin (`ClientDAO.checkLogin()` gọi `UserDAO.checkLogin()` rồi lấy thêm phần riêng). Danh sách đọc lên kèm con. Trang chọn theo id trong session.
- Danh sách hàm lấy đúng chương 9 (addClient, checkLogin, searchBook, getCart, updateCart, addRentalBill, updateRentalBill, getRentalBillList, searchRentalBill, searchDamage, addDamage, searchCollateral, addCollateral...). Những cặp trông giống nhau nhưng không thừa đã ghi trong file memory, đừng gộp.

**Quy tắc trang và session:**
- Mỗi lần ghi DB đi qua một trang `doXxx.jsp` không có giao diện. Trang tự tải lại chính nó khi tìm kiếm, đăng nhập, sửa bản sao trong session.
- Dòng được chọn trong danh sách (mọi nút trên dòng, cả "Xem chi tiết") do trang chứa danh sách lưu vào session, trang sau chỉ đọc.
- rentalBill được tạo khi mở "Tìm truyện". Session chỉ giữ cart và rentalBill trong lúc đang chọn. doAddRentalBill bỏ cả hai khỏi session.
- Xác nhận phiếu giữ đủ bốn điều kiện như chương 4, 5, 9, 10.

**Thông báo trích nguyên văn:**
- "Đăng nhập thất bại, vui lòng thử lại."
- "Đăng kí tài khoản thành công!"
- "Tên đăng nhập, số CCCD, số điện thoại hoặc email đã được sử dụng, vui lòng kiểm tra lại."
- "Không tìm thấy thông tin phù hợp."
- "Huỷ phiếu mượn thành công!"

**Trang JSP (tên lấy từ chương 9):** HomeView, RegisterView, doRegister, LoginView, ClientHomeView, StaffHomeView, SearchBookView, BookDetailView, doAddSelectedBook, doDeleteSelectedBook, ConfirmRentalBillView, doAddRentalBill, RentalBillListView, RentalBillDetailView, doCancelRentalBill, SearchRentalBillView, ProcessRentalBillView, EditRentedBookListView, AddRentedBookView, doUpdateRentedBookList, AddConditionView, AddDamageView, doAddDamage, AddRentalCollateralView, AddCollateralView, doAddCollateral, doUpdateRentalBill, PrintRentalBillView.

## 4. Công nghệ

Bắt buộc: **JSP + DAO + MySQL**, giữ kiến trúc JSP-DAO như báo cáo, không thêm lớp Servlet điều khiển hay Spring. Phần còn lại chọn bản mới và tốt nhất, ghi rõ phiên bản và lí do. Gợi ý để cân nhắc, không phải mệnh lệnh:

- Java 21, Jakarta EE 10 trên Tomcat 11, JSTL, Maven. JDBC thuần trong DAO, HikariCP, Flyway cho migration.
- Filter dùng chung: UTF-8, đăng nhập và phân quyền khách/nhân viên, CSRF token cho mọi form gửi tới doXxx.jsp, security headers. Mật khẩu băm bằng Argon2 hoặc BCrypt.
- Redis: lưu session (để chạy nhiều instance), cache kết quả tìm đầu truyện, giới hạn số lần đăng nhập sai.
- Giao diện: JSP render trang, **React island dùng shadcn/ui thật** cho các khối nhiều tương tác (giỏ "Truyện đã chọn", bàn xử lí phiếu tại quầy, form đặt cọc). Vite build Tailwind v4 và island, JSP nạp bundle và truyền dữ liệu qua `data-*` hoặc JSON nhúng. Island vẫn gửi form tới doXxx.jsp, không tạo API riêng phá kiến trúc. Three.js (react-three-fiber) và GSAP hoặc Motion cho cảnh 3D và chuyển động.
- Test: JUnit 5 + Testcontainers MySQL cho DAO, Vitest cho island, Playwright đi hết 3 kịch bản chuẩn trong chương 2.

Brainstorm hãy so ít nhất 2 cách nối JSP với React island (mount từng trang hay một bundle chung, cách truyền dữ liệu và CSRF) rồi khuyến nghị một cách.

## 5. Giao diện: tiệm thuê truyện tuổi thơ

Không chép giao diện trong báo cáo. Giữ đúng thành phần và thứ tự của từng màn hình (các bảng giao diện ở chương 2 và 9), còn hình thức làm mới hoàn toàn theo chủ đề: tiệm truyện đầu ngõ ở Việt Nam cuối thập niên 90, đầu 2000.

Ý tưởng để phát triển thêm:
- Trang chủ là một cảnh 3D: kệ gỗ xếp gáy truyện, ánh đèn vàng, quạt trần quay chậm. Rê chuột thì gáy truyện nhô ra, bấm vào thì rút quyển xuống mở trang tìm kiếm.
- Chất liệu: giấy ố vàng, mép giấy sờn, chữ đánh máy, nét bút bi xanh, con dấu đỏ, băng dính giấy.
- "Truyện đã chọn" trông như chồng truyện buộc dây. Phiếu mượn trông như tờ phiếu xé từ cuốn sổ, có số phiếu và dấu "CHỜ NHẬN", "ĐANG CHO THUÊ", "ĐÃ HUỶ".
- Màn hình nhân viên là cái bàn quầy: cuốn sổ ghi chép, ngăn kéo đựng đồ cọc, tem dán tình trạng truyện ("Rách bìa", "Ố vàng").
- Trang in phiếu dùng CSS in thật, ra khổ A5 như phiếu giấy.

Ràng buộc:
- Đẹp và có chủ đích, tránh kiểu giao diện AI rập khuôn (gradient tím, thẻ bo tròn giống nhau). Đề xuất bảng màu, font, spacing token cụ thể trước khi làm.
- Font phải hiển thị đúng tiếng Việt có dấu (kiểm tra subset vietnamese). Toàn bộ chữ trên giao diện bằng tiếng Việt.
- Bìa truyện thật lấy từ bước crawl chỉ hiện ở chỗ hiển thị dữ liệu (kết quả tìm, chi tiết đầu truyện, phiếu mượn). Phần trang trí của giao diện (logo tiệm, minh hoạ, cảnh 3D) tự vẽ, không dùng logo nhà xuất bản hay nhân vật có bản quyền.
- Có chế độ giảm chuyển động (`prefers-reduced-motion`), cảnh 3D có bản dự phòng tĩnh, chạy tốt trên điện thoại, đạt độ tương phản WCAG AA, Lighthouse từ 90 trở lên.

## 6. Dữ liệu: crawl truyện thật

Kho truyện phải là dữ liệu thật, không phải "Truyện A, Truyện B". Dự án mới tự crawl về, tôi không chuẩn bị sẵn.

- Mục tiêu: khoảng 300 đến 500 đầu truyện tranh quen thuộc với tuổi thơ Việt (Doraemon, Conan, Dragon Ball, Shin, Thần đồng đất Việt, Nhóc Maruko, Bảy viên ngọc rồng...), nhiều bộ có nhiều tập. Mỗi tập là một Book.
- Mỗi đầu truyện đủ các cột của tblBook: name, author, publisher, publishYear, category, description, rentalPrice. Kèm ảnh bìa và ảnh gáy hoặc ảnh phụ nếu có. rentalPrice tự sinh theo quy tắc hợp lí (ví dụ theo độ dày, độ hiếm), ghi quy tắc vào docs.
- Từ mỗi Book sinh 1 đến 5 BookCopy có barcode riêng, để màn hình có cảnh hết truyện, còn ít, còn nhiều.
- Nguồn: brainstorm tự tìm và so (API mở như Open Library, Google Books, Wikidata, trang của nhà sách và nhà xuất bản). Ưu tiên API trước, chỉ cào HTML khi không có API.
- Làm đàng hoàng: đọc `robots.txt` và điều khoản của từng nguồn, giới hạn tốc độ, đặt User-Agent chung chung (không ghi email hay tên tôi), có cache để chạy lại không gọi lại mạng.
- Pipeline tách riêng, chạy được nhiều lần: crawl, làm sạch (chuẩn hoá Unicode NFC, gộp trùng giữa các nguồn, sửa tên tác giả), tải và nén ảnh (WebP hoặc AVIF, nhiều kích thước), xuất seed SQL hoặc migration Flyway riêng cho dữ liệu.
- Ghi nguồn của từng bản ghi vào một file manifest. Ảnh tải về để ngoài git (volume hoặc thư mục bị ignore), repo chỉ giữ script và manifest. Nginx phục vụ ảnh với cache dài.
- Có bước kiểm tra: đếm bản ghi thiếu trường, ảnh lỗi, tên trùng, in báo cáo trước khi nạp vào DB. Chạy thử 10 đầu truyện, cho tôi xem kết quả rồi mới crawl hết.

## 7. Hạ tầng

- Docker Compose: app (Tomcat), MySQL 8.4, Redis, Nginx (reverse proxy, gzip/brotli, cache file tĩnh, security headers). Healthcheck cho từng service. Dữ liệu MySQL và Redis dùng named volume.
- Hai cấu hình dev và prod. `.env.example` liệt kê mọi biến với giá trị giả, `.env` thật nằm trong `.gitignore`.
- GitHub Actions: lint (Java + frontend), build, unit test, integration test với Testcontainers, E2E Playwright chạy trên compose, build image, quét lỗ hổng image. Mỗi job có `timeout-minutes`, workflow PR có `concurrency` huỷ lần chạy cũ. Có sẵn cấu hình prod cho VPS nhưng chưa deploy.
- Cây thư mục chuẩn, ghi rõ trong docs: mã Java (dao, model, filter, util), webapp (JSP, tag file, WEB-INF), frontend (island, style, 3D), migration, docker, nginx, test, docs.

## 8. Bộ công cụ cho AI trong dự án mới

Đây là phần tôi cần làm kĩ nhất, vì các phiên sau sẽ dựa vào nó:

- `CLAUDE.md` và `AGENTS.md` thật chi tiết: tổng quan, lệnh chạy, cây thư mục, kiến trúc JSP-DAO, toàn bộ hợp đồng nghiệp vụ ở mục 3, quy ước đặt tên, cách test, những điều cấm (getById, DAO cho lớp trung gian, lưu thuộc tính dẫn xuất, sửa thông báo nguyên văn).
- `.claude/rules/`: luật nghiệp vụ, luật DAO, luật session, luật giao diện chủ đề.
- `.claude/skills/` riêng cho dự án, ví dụ: thêm một trang JSP mới đúng quy ước, thêm hàm DAO kiểm tra trùng, viết migration Flyway, thêm một nguồn crawl mới vào pipeline dữ liệu, tạo React island, tạo component theo chủ đề hoài niệm, viết E2E theo kịch bản chương 2, mở một phiên cook theo mục 10 (đọc agent map, giao lane, gom kết quả).
- `.claude/agents/` nếu thật sự cần (ví dụ agent kiểm tra một thay đổi có trái hợp đồng nghiệp vụ không).
- `docs/`: PDR, kiến trúc, từ điển thuật ngữ Việt - Anh (phiếu mượn = RentalBill...), schema và ERD bằng Mermaid, sơ đồ luồng trang, ADR cho từng lựa chọn công nghệ, design token.

## 9. Đầu ra tôi cần từ phiên này

1. Đọc nguồn ở mục 1, rồi hỏi tôi những gì còn mơ hồ bằng câu hỏi lựa chọn.
2. Báo cáo brainstorm trong `plans/reports/`: các phương án đã so, phương án chọn, rủi ro (nhất là khoá quyển truyện khi lưu phiếu và cách nối JSP với island), tiêu chí nghiệm thu.
3. Sau khi tôi duyệt, chạy `/t1k:plan` ra kế hoạch chia phase, mỗi phase một file riêng có mục tiêu, file sẽ tạo, tiêu chí hoàn thành và lệnh kiểm tra. Mỗi phase ghi rõ lane nào chạy song song (tối đa 3), lane nào phải đi tuần tự, theo mục 10. Thứ tự gợi ý: khung dự án và hạ tầng, bộ công cụ AI (CLAUDE.md, AGENTS.md, rules, skills, docs), schema, pipeline crawl dữ liệu và seed, DAO và test, hệ thiết kế giao diện, chức năng 1, chức năng 2, chức năng 3, E2E và CI, hoàn thiện.

## 10. Tự động hoá và điều phối agent

Ghi toàn bộ mục này vào `CLAUDE.md`, `AGENTS.md` và một rule riêng trong `.claude/rules/`, để mọi phiên cook sau đều làm theo, kể cả sau khi phiên bị compact.

**Công cụ tự động.** Việc gì máy làm được thì máy làm, không đẩy sang tôi.
- Playwright MCP: làm xong mỗi trang hay mỗi chức năng thì mở web thật, đi lại kịch bản chuẩn và các ngoại lệ của chương 2, chụp màn hình ở khổ điện thoại và máy tính, đọc console và network. Chỉ khi console sạch và không có request hỏng mới tính là xong. Bộ test Playwright trong repo vẫn chạy trong CI như mục 7.
- cua-driver MCP: dùng khi cần thao tác phần mềm có giao diện trên Windows, ví dụ mở MySQL Workbench để reverse engineer schema rồi so ERD với chương 8. Việc nào làm được bằng dòng lệnh (`mysql` trong container, Flyway) thì dùng dòng lệnh. Sau mỗi lần bấm phải kiểm lại bằng `verify_state`, lệnh bấm không báo lỗi chưa có nghĩa là đã xong.
- context7 MCP để tra tài liệu thư viện.
- MCP nào chưa nạp trong phiên thì báo tôi khởi động lại, không lặng lẽ đổi sang cách khác yếu hơn.

**Mô hình điều phối của mỗi phiên cook.**
- Phiên chính là orchestrator: chia việc, giao việc, gom kết quả, cập nhật kế hoạch. Phần đã giao cho subagent thì orchestrator không tự làm lại.
- Đầu phiên, orchestrator tạo hoặc đọc lại agent map của phase (ví dụ `plans/<plan>/agent-map.md`). Mỗi lane ghi: làm việc gì, subagent nào nhận, được sửa những file nào, phụ thuộc lane nào, trạng thái. Giao hay nhận việc xong là cập nhật file này.
- Subagent dùng cùng model và cùng effort với orchestrator. Mọi lần spawn đều truyền rõ `model` và `effort` (effort lấy theo biến môi trường `CLAUDE_EFFORT`), không để agent tự rơi về model rẻ hơn.
- Tối đa 3 subagent chạy cùng lúc, tính cả agent con: subagent không tự spawn thêm agent. Từ việc độc lập thứ 4 trở đi thì xếp hàng, xong một lane mới mở lane tiếp theo. Luật này đè lên mức song song mặc định của kit.
- Trước khi chia việc song song, chốt hợp đồng chung vào một file: tên trang, tên field form (txtUsername...), tên thuộc tính session, chữ kí hàm DAO, props của island. Brief của mọi subagent trỏ tới file đó.
- Các subagent cùng sửa code thì mỗi lane một git worktree, hoặc một danh sách file không chồng nhau ghi rõ trong brief. File dùng chung (`pom.xml`, `package.json`, `web.xml`, migration) chỉ orchestrator sửa.

**Giữ bối cảnh khi phiên bị compact.**
- Kế hoạch, agent map, hợp đồng và báo cáo nằm trên đĩa. Chúng là nguồn sự thật, trí nhớ của phiên thì không. Sau mỗi lần compact, việc đầu tiên là đọc lại `CLAUDE.md`, agent map và file phase đang làm.
- Brief của subagent ngắn: việc cần làm, ràng buộc quyết định, đường dẫn file để nó tự đọc. Không dán nguyên nội dung file hay lịch sử chat vào brief.
- Subagent ghi kết quả chi tiết vào `plans/reports/`, chỉ trả về orchestrator bản tóm tắt ngắn kèm đường dẫn.
- Xong bước nào thì đánh dấu ngay trong file phase. Context gần đầy thì commit, lưu handoff (`/t1k:handoff save`) rồi mới làm tiếp.

**Chạy nền, không ngồi chờ.**
- Subagent spawn ở chế độ nền. Lệnh chạy lâu (build Maven, `docker compose up --build`, bộ test, pipeline crawl) cũng chạy nền.
- Trong lúc chờ, orchestrator làm việc không phụ thuộc: đọc báo cáo vừa về, soạn brief cho lane sau, cập nhật kế hoạch. Không dùng sleep để hỏi trạng thái liên tục, đợi thông báo xong việc.

## 11. Ràng buộc làm việc

- Dự án cá nhân. Không publish gì lên cloud, không tạo Artifact hay Claude Doc. Git remote dùng SSH vào tài khoản của tôi, chỉ push khi tôi bảo.
- Không suy đoán về nghiệp vụ. Chỗ nào báo cáo và memory không trả lời thì hỏi tôi.
- Mọi số liệu phiên bản thư viện tra qua context7 hoặc trang chính thức, không lấy theo trí nhớ.
