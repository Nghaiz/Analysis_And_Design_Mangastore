<%--
  doAddSelectedBook (ch.9 tr.64; docs/contracts.md §9.2, §6.2, C10). Không giao diện, chỉ nhận POST (C2).
  - Field đọc: txtQuantity. Session R: book, cart. Thiếu một trong hai → 302 SearchBookView (§6.1 bảng M2).
  - Quyển đang sẵn sàng chưa có trong giỏ = book.listBookCopy (đã sắp theo id tăng dần, searchBook) trừ quyển đã có
    trong cart (thêm đầu truyện đã có trong giỏ thì cộng dồn). Số lượng vượt quá → Messages.quantityExceeded(N),
    ← BookDetailView (kể cả N = 0).
  - txtQuantity trống, 0, âm, thập phân, chữ, quá int → QUANTITY_INVALID (§10.3, C10), ← BookDetailView (ô
    aria-invalid, giữ số đã nhập). updateCart trả false: chưa có câu (C10), ← BookDetailView. Giỏ trong session giữ
    nguyên.
  - Hợp lệ: lấy quyển id nhỏ nhất trước (§6.2), mỗi quyển một SelectedBook mới, CartDAO.updateCart(cart) một lần,
    W cart, rồi 302 về SearchBookView (không câu báo nên chuyển hướng thay cho forward: F5 không thêm quyển lần hai).
  - Khoá theo session id: hai request cùng phiên (bấm hai lần) chạy lần lượt, request sau đọc giỏ đã lưu.
--%>
<%@ page contentType="text/html; charset=UTF-8" pageEncoding="UTF-8" trimDirectiveWhitespaces="true" %>
<%@ page import="java.util.ArrayList, java.util.HashSet, java.util.List, java.util.Set" %>
<%@ page import="vn.tiemtruyen.dao.CartDAO" %>
<%@ page import="vn.tiemtruyen.model.Book, vn.tiemtruyen.model.BookCopy, vn.tiemtruyen.model.Cart, vn.tiemtruyen.model.SelectedBook" %>
<%@ page import="vn.tiemtruyen.util.Messages" %>
<%
    if (!"POST".equals(request.getMethod())) {
        response.sendError(HttpServletResponse.SC_METHOD_NOT_ALLOWED);
        return;
    }
    synchronized (session.getId().intern()) {
        Book book = (Book) session.getAttribute("book");
        Cart cart = (Cart) session.getAttribute("cart");
        if (book == null || cart == null) {
            response.sendRedirect(request.getContextPath() + "/SearchBookView.jsp");
            return;
        }

        int quantity;
        try {
            String raw = request.getParameter("txtQuantity");
            quantity = raw == null ? 0 : Integer.parseInt(raw.strip());
        } catch (NumberFormatException e) {
            quantity = 0;
        }
        if (quantity < 1) {
            request.setAttribute("message", Messages.QUANTITY_INVALID);
            request.getRequestDispatcher("/BookDetailView.jsp").forward(request, response);
            return;
        }

        Set<Integer> copiesInCart = new HashSet<>();
        for (SelectedBook line : cart.getListSelectedBook()) {
            copiesInCart.add(line.getBookCopy().getId());
        }
        List<BookCopy> free = new ArrayList<>();
        for (BookCopy copy : book.getListBookCopy()) {
            if (!copiesInCart.contains(copy.getId())) {
                free.add(copy);
            }
        }
        if (quantity > free.size()) {
            request.setAttribute("message", Messages.quantityExceeded(free.size()));
            request.getRequestDispatcher("/BookDetailView.jsp").forward(request, response);
            return;
        }

        for (BookCopy copy : free.subList(0, quantity)) {
            SelectedBook line = new SelectedBook();
            line.setBookCopy(copy);
            cart.getListSelectedBook().add(line);
        }
        boolean saved;
        try (CartDAO cartDAO = new CartDAO()) {
            saved = cartDAO.updateCart(cart);
        }
        if (!saved) {
            // Giỏ trong session (Redis) chưa bị ghi đè: đối tượng vừa sửa chỉ sống trong request này.
            request.getRequestDispatcher("/BookDetailView.jsp").forward(request, response);
            return;
        }
        session.setAttribute("cart", cart);
        response.sendRedirect(request.getContextPath() + "/SearchBookView.jsp");
    }
%>
