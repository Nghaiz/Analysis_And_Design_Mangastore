<%--
  doDeleteSelectedBook (ch.9 tr.63; docs/contracts.md §9.2). Không giao diện, chỉ nhận POST (C2).
  - Session R: book (SearchBookView ghi khi bấm "Xoá" trên dòng giỏ), cart. Thiếu một trong hai → 302 SearchBookView.
  - Bỏ mọi dòng của đầu truyện book khỏi cart, CartDAO.updateCart(cart) → W cart, → SearchBookView (forward, giữ các
    ô chkSelectedBook đang tích; F5 xoá lại cùng đầu truyện là không đổi gì).
  - updateCart trả false (chỉ khi có dòng mới trỏ quyển trùng, không thuộc nhánh xoá): giỏ trong session giữ nguyên
    (session ở Redis, readMode=REDIS: đối tượng vừa sửa chỉ sống trong request này), hiện lại trang, không câu (C10).
  - Khoá theo session id như doAddSelectedBook.
--%>
<%@ page contentType="text/html; charset=UTF-8" pageEncoding="UTF-8" trimDirectiveWhitespaces="true" %>
<%@ page import="java.util.ArrayList, java.util.List" %>
<%@ page import="vn.tiemtruyen.dao.CartDAO" %>
<%@ page import="vn.tiemtruyen.model.Book, vn.tiemtruyen.model.Cart, vn.tiemtruyen.model.SelectedBook" %>
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
        List<SelectedBook> kept = new ArrayList<>();
        for (SelectedBook line : cart.getListSelectedBook()) {
            if (line.getBookCopy().getBook().getId() != book.getId()) {
                kept.add(line);
            }
        }
        cart.setListSelectedBook(kept);
        boolean saved;
        try (CartDAO cartDAO = new CartDAO()) {
            saved = cartDAO.updateCart(cart);
        }
        if (saved) {
            session.setAttribute("cart", cart);
        }
        request.getRequestDispatcher("/SearchBookView.jsp").forward(request, response);
    }
%>
