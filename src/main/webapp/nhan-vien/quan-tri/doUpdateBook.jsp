<%--
  doUpdateBook (D6, ngoài báo cáo; docs/contracts.md §9.2 "Trang quản trị D6", §5.3 updateBook, C10, C11, C12;
  phase-07-edge-cases.md §3.4). Không giao diện, chỉ nhận POST (C2: khác POST → 405).
  - Session R book (đầu truyện đã lưu, id > 0, do ManageBookView ghi khi bấm "Sửa"); không có → 302 ManageBookView,
    không ghi gì (đã lưu xong rồi bấm hai lần, Back rồi gửi lại, session hết). Input ẩn bookId khác book.id (hai thẻ
    sửa hai đầu truyện) → 302 ManageBookView, không ghi gì (C19). Khoá theo session id: request cùng phiên chạy lần lượt.
  - Kiểm ô như doAddBook (cùng luật, §3.4); txtCopyCount là số quyển THÊM MỚI, trống hay 0 là không thêm. Sai →
    forward EditBookView kèm invalidFields và message (INPUT_TOO_LONG trước QUANTITY_INVALID), không gọi DAO.
  - Hợp lệ: gán giá trị vào bản làm việc của book (cùng id), giữ các quyển đã có, thêm N BookCopy id = 0 mã vạch trống
    (BookDAO.updateBook đánh số nối tiếp số lớn nhất đang có, D8) → updateBook. Không xoá quyển (C12).
    false: forward EditBookView, không câu (C10); book trong session không đổi. true: thay phần tử cùng id trong
    listBook bằng bản vừa lưu (session tuần tự hoá từng thuộc tính riêng, §7), bỏ book, 302 ManageBookView (PRG).
--%>
<%@ page contentType="text/html; charset=UTF-8" pageEncoding="UTF-8" trimDirectiveWhitespaces="true" %>
<%@ page import="java.text.Normalizer, java.time.Year, java.util.ArrayList, java.util.LinkedHashSet, java.util.List, java.util.Set" %>
<%@ page import="vn.tiemtruyen.dao.BookDAO" %>
<%@ page import="vn.tiemtruyen.model.Book, vn.tiemtruyen.model.BookCopy" %>
<%@ page import="vn.tiemtruyen.util.Messages" %>
<%!
    /** Độ dài cột của tblBook (docs/contracts.md §2). */
    private static final int NAME_MAX = 255;
    private static final int AUTHOR_MAX = 100;
    private static final int PUBLISHER_MAX = 100;
    private static final int CATEGORY_MAX = 50;
    private static final int DESCRIPTION_MAX = 255;
    /** Năm xuất bản nhỏ nhất nhận (phase-07-edge-cases.md §3.4). */
    private static final int YEAR_MIN = 1900;
    /** tblBook.rentalPrice là float (C13): mọi số nguyên tới 2^24 giữ đúng, lớn hơn thì bị làm tròn khi lưu. */
    private static final int PRICE_MAX = 16_777_216;
    /** Số quyển tạo kèm (AddBook) hay thêm mới (EditBook) lớn nhất (phase-07-edge-cases.md §3.4). */
    private static final int COPY_COUNT_MAX = 99;

    /** Ô chữ đã trim + chuẩn hoá NFC (phase-06-integration.md §6.1); thiếu tham số → chuỗi rỗng. */
    private static String text(HttpServletRequest req, String name) {
        String raw = req.getParameter(name);
        return raw == null ? "" : Normalizer.normalize(raw, Normalizer.Form.NFC).strip();
    }

    /** Ô chữ có giới hạn độ dài; vượt → invalid + tooLong, bắt buộc mà trống → invalid. */
    private static String textField(HttpServletRequest req, String name, int max, boolean required,
            Set<String> invalid, Set<String> tooLong) {
        String value = text(req, name);
        if (value.codePointCount(0, value.length()) > max) {
            invalid.add(name);
            tooLong.add(name);
        } else if (required && value.isEmpty()) {
            invalid.add(name);
        }
        return value;
    }

    /** Năm xuất bản: trống → null; sai → invalid, trả null. */
    private static Integer publishYear(HttpServletRequest req, Set<String> invalid) {
        String value = text(req, "txtPublishYear");
        if (value.isEmpty()) {
            return null;
        }
        if (value.matches("\\d{4}")) {
            int year = Integer.parseInt(value);
            if (year >= YEAR_MIN && year <= Year.now().getValue()) {
                return year;
            }
        }
        invalid.add("txtPublishYear");
        return null;
    }

    /** Giá thuê theo ngày, số nguyên đồng từ 1 tới PRICE_MAX; sai → invalid, trả 0. */
    private static float rentalPrice(HttpServletRequest req, Set<String> invalid) {
        String value = text(req, "txtRentalPrice").replaceAll("\\s", "").replaceFirst("(?iu)đ$", "");
        if (value.matches("\\d{1,3}(\\.\\d{3})+")) {
            value = value.replace(".", "");
        }
        if (value.matches("\\d{1,8}")) {
            int price = Integer.parseInt(value);
            if (price >= 1 && price <= PRICE_MAX) {
                return price;
            }
        }
        invalid.add("txtRentalPrice");
        return 0;
    }

    /** Số quyển: trống → 0; số nguyên 0 tới COPY_COUNT_MAX; sai → invalid, trả -1. */
    private static int copyCount(HttpServletRequest req, Set<String> invalid) {
        String value = text(req, "txtCopyCount");
        if (value.isEmpty()) {
            return 0;
        }
        if (value.matches("\\d{1,2}") && Integer.parseInt(value) <= COPY_COUNT_MAX) {
            return Integer.parseInt(value);
        }
        invalid.add("txtCopyCount");
        return -1;
    }
%>
<%
    if (!"POST".equals(request.getMethod())) {
        response.sendError(HttpServletResponse.SC_METHOD_NOT_ALLOWED);
        return;
    }
    String ctx = request.getContextPath();
    synchronized (session.getId().intern()) {
        Book current = (Book) session.getAttribute("book");
        if (current == null || current.getId() < 1
                || !String.valueOf(current.getId()).equals(text(request, "bookId"))) {
            response.sendRedirect(ctx + "/nhan-vien/quan-tri/ManageBookView.jsp");
            return;
        }

        Set<String> invalid = new LinkedHashSet<>();
        Set<String> tooLong = new LinkedHashSet<>();
        Book book = new Book();
        book.setId(current.getId());
        book.setName(textField(request, "txtName", NAME_MAX, true, invalid, tooLong));
        book.setAuthor(textField(request, "txtAuthor", AUTHOR_MAX, true, invalid, tooLong));
        book.setPublisher(textField(request, "txtPublisher", PUBLISHER_MAX, false, invalid, tooLong));
        book.setPublishYear(publishYear(request, invalid));
        book.setCategory(textField(request, "txtCategory", CATEGORY_MAX, true, invalid, tooLong));
        String description = textField(request, "txtDescription", DESCRIPTION_MAX, false, invalid, tooLong);
        book.setDescription(description.isEmpty() ? null : description);
        book.setRentalPrice(rentalPrice(request, invalid));
        int copies = copyCount(request, invalid);

        if (!invalid.isEmpty()) {
            request.setAttribute("invalidFields", invalid);
            if (!tooLong.isEmpty()) {
                request.setAttribute("message", Messages.INPUT_TOO_LONG);
            } else if (invalid.contains("txtCopyCount")) {
                request.setAttribute("message", Messages.QUANTITY_INVALID);
            }
            request.getRequestDispatcher("/nhan-vien/quan-tri/EditBookView.jsp").forward(request, response);
            return;
        }

        List<BookCopy> listBookCopy = new ArrayList<>();
        for (BookCopy existing : current.getListBookCopy()) {
            BookCopy copy = new BookCopy();
            copy.setId(existing.getId());
            copy.setBarcode(existing.getBarcode());
            copy.setBook(book);
            listBookCopy.add(copy);
        }
        for (int i = 0; i < copies; i++) {
            listBookCopy.add(new BookCopy());
        }
        book.setListBookCopy(listBookCopy);
        boolean saved;
        try (BookDAO bookDAO = new BookDAO()) {
            saved = bookDAO.updateBook(book);
        }
        if (!saved) {
            request.getRequestDispatcher("/nhan-vien/quan-tri/EditBookView.jsp").forward(request, response);
            return;
        }

        @SuppressWarnings("unchecked")
        List<Book> listBook = (List<Book>) session.getAttribute("listBook");
        if (listBook != null) {
            List<Book> refreshed = new ArrayList<>(listBook);
            refreshed.replaceAll(b -> b.getId() == book.getId() ? book : b);
            session.setAttribute("listBook", refreshed);
        }
        session.removeAttribute("book");
        response.sendRedirect(ctx + "/nhan-vien/quan-tri/ManageBookView.jsp");
    }
%>
