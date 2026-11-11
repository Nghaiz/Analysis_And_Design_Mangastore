<%--
  AddConditionView (ch.9 tr.77–78; docs/contracts.md §9.2, §7, C1, C7, C9). Trang xem, tự gửi, gọi DamageDAO.searchDamage.
  - Session R: rentedBook (bản sao do ProcessRentalBillView lưu; mọi thay đổi chỉ làm trên bản sao), listDamage.
  - Chỉ xử lí khi POST + dispatcher REQUEST (phase-06-integration.md §3). Trước khi xử lí nút, mọi lần gửi về đọc lại
    txtDamageNote (mỗi dòng "Các lỗi đã ghi nhận" một ô, theo thứ tự) và txtConditionNote vào bản sao (C1).
  - "Tìm": từ khoá trống thì không gọi DAO (C9); searchDamage → W listDamage; rỗng → DAMAGE_NOT_FOUND.
  - lnkChooseDamage (value = id loại lỗi): thêm vào "Các lỗi đã ghi nhận"; đã có → DAMAGE_ALREADY_RECORDED.
    lnkDeleteRentedDamage (value = id loại lỗi): bỏ lỗi. Cả hai W rentedBook.
  - "Lưu tình trạng": ghi chú tình trạng (kể cả chuỗi rỗng, C7) vào bản sao, thay quyển cùng mã vạch trong rentalBill
    → W rentalBill, bỏ rentedBook, sendRedirect ProcessRentalBillView (PRG). Không có lỗi nào thì tình trạng hiển thị
    là "Không có lỗi" (§13). Tình trạng ghi vào DB khi xác nhận phiếu.
  - "Thêm lỗi mới", "Quay lại" là <a href>; ProcessRentalBillView bỏ bản sao rentedBook khi hiển thị (C6).
  Form có action trỏ về chính trang: trang còn được forward tới từ doAddDamage.jsp.
--%>
<%@ page contentType="text/html; charset=UTF-8" trimDirectiveWhitespaces="true" %>
<%@ page import="jakarta.servlet.DispatcherType, java.util.ArrayList, java.util.List, vn.tiemtruyen.dao.DamageDAO,
                 vn.tiemtruyen.model.Damage, vn.tiemtruyen.model.RentalBill, vn.tiemtruyen.model.RentedBook,
                 vn.tiemtruyen.model.RentedDamage, vn.tiemtruyen.util.Messages" %>
<%@ taglib prefix="t" tagdir="/WEB-INF/tags" %>
<%@ taglib prefix="ui" tagdir="/WEB-INF/tags/ui" %>
<%@ taglib prefix="c" uri="jakarta.tags.core" %>
<%@ taglib prefix="fn" uri="jakarta.tags.functions" %>
<%!
    /** id dương trong giá trị nút, 0 khi không phải số (không dòng nào khớp, nút không làm gì). */
    private static int idOf(String value) {
        return value != null && value.matches("\\d{1,9}") ? Integer.parseInt(value) : 0;
    }
%>
<%
    String base = request.getContextPath() + "/nhan-vien";
    RentedBook rentedBook = (RentedBook) session.getAttribute("rentedBook");
    if (rentedBook == null) {
        response.sendRedirect(base + "/ProcessRentalBillView.jsp");
        return;
    }
    @SuppressWarnings("unchecked")
    List<Damage> listDamage = (List<Damage>) session.getAttribute("listDamage");
    String message = (String) request.getAttribute("message");
    String messageKind = "error";

    boolean selfPost = "POST".equals(request.getMethod())
            && request.getDispatcherType() == DispatcherType.REQUEST;
    if (selfPost) {
        List<RentedDamage> damages = new ArrayList<>(rentedBook.getListRentedDamage());
        String[] notes = request.getParameterValues("txtDamageNote");
        // Số ô khác số dòng chỉ xảy ra với form cũ (trình duyệt quay lại trang trước): không gán lệch dòng.
        if (notes != null && notes.length == damages.size()) {
            for (int i = 0; i < notes.length; i++) {
                damages.get(i).setNote(notes[i]);
            }
        }
        String conditionNote = request.getParameter("txtConditionNote");
        if (conditionNote != null) {
            rentedBook.setConditionNote(conditionNote);
        }

        if (request.getParameter("btnSearch") != null) {
            String keyword = request.getParameter("txtKeyword") == null ? "" : request.getParameter("txtKeyword").strip();
            if (keyword.isEmpty()) {
                listDamage = new ArrayList<>();
            } else {
                try (DamageDAO dao = new DamageDAO()) {
                    listDamage = dao.searchDamage(keyword);
                }
            }
            session.setAttribute("listDamage", listDamage);
            if (listDamage.isEmpty()) {
                message = Messages.DAMAGE_NOT_FOUND;
                messageKind = "info";
            }
        } else if (request.getParameter("lnkChooseDamage") != null) {
            int damageId = idOf(request.getParameter("lnkChooseDamage"));
            Damage chosen = null;
            if (listDamage != null) {
                for (Damage damage : listDamage) {
                    if (damage.getId() == damageId) {
                        chosen = damage;
                    }
                }
            }
            boolean recorded = false;
            for (RentedDamage item : damages) {
                if (item.getDamage().getId() == damageId) {
                    recorded = true;
                }
            }
            if (recorded) {
                message = Messages.DAMAGE_ALREADY_RECORDED;
            } else if (chosen != null) {
                RentedDamage item = new RentedDamage();
                item.setDamage(chosen);
                damages.add(item);
            }
        } else if (request.getParameter("lnkDeleteRentedDamage") != null) {
            int damageId = idOf(request.getParameter("lnkDeleteRentedDamage"));
            damages.removeIf(item -> item.getDamage().getId() == damageId);
        }
        rentedBook.setListRentedDamage(damages);

        if (request.getParameter("btnSave") != null) {
            rentedBook.setConditionNote(conditionNote == null ? "" : conditionNote);
            RentalBill rentalBill = (RentalBill) session.getAttribute("rentalBill");
            if (rentalBill == null) {
                response.sendRedirect(base + "/SearchRentalBillView.jsp");
                return;
            }
            String barcode = rentedBook.getBookCopy().getBarcode();
            List<RentedBook> rows = new ArrayList<>(rentalBill.getListRentedBook());
            int index = -1;
            for (int i = 0; i < rows.size(); i++) {
                if (barcode.equals(rows.get(i).getBookCopy().getBarcode())) {
                    index = i;
                }
            }
            if (index < 0) {
                throw new IllegalStateException("Phiếu mượn " + rentalBill.getId() + " không có quyển " + barcode);
            }
            rows.set(index, rentedBook);
            rentalBill.setListRentedBook(rows);
            session.setAttribute("rentalBill", rentalBill);
            session.removeAttribute("rentedBook");
            response.sendRedirect(base + "/ProcessRentalBillView.jsp");
            return;
        }
        session.setAttribute("rentedBook", rentedBook);
    }

    pageContext.setAttribute("base", base);
    pageContext.setAttribute("rentedBook", rentedBook);
    pageContext.setAttribute("damageList", listDamage);
    pageContext.setAttribute("pageMessage", message);
    pageContext.setAttribute("messageKind", messageKind);
    pageContext.setAttribute("keywordValue", selfPost ? request.getParameter("txtKeyword") : null);
%>
<t:layout title="Thêm tình trạng truyện">
  <section class="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8">
    <h1 class="font-sign text-ink">Thêm tình trạng truyện</h1>
    <c:if test="${not empty pageMessage}"><ui:message-box kind="${messageKind}" text="${pageMessage}"/></c:if>
    <dl class="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
      <dt>Mã vạch:</dt><dd id="barcode" class="m-0 font-num"><c:out value="${rentedBook.bookCopy.barcode}"/></dd>
      <dt>Tên đầu truyện:</dt><dd id="bookName" class="m-0"><c:out value="${rentedBook.bookCopy.book.name}"/></dd>
    </dl>
    <form method="post" action="${base}/AddConditionView.jsp" class="flex flex-col gap-6">
      <t:csrf/>
      <p class="m-0 flex flex-wrap items-center gap-4">
        <label for="txtKeyword" class="sr-only">Từ khoá</label>
        <input type="text" id="txtKeyword" name="txtKeyword" value="${fn:escapeXml(keywordValue)}" placeholder="Nhập tên lỗi…" class="h-9 min-w-0 flex-1 rounded-paper border border-input bg-paper px-3 py-1 text-ink">
        <button type="submit" id="btnSearch" name="btnSearch" class="rounded-paper bg-primary px-4 py-2 text-primary-foreground shadow-paper">Tìm</button>
      </p>
      <div class="overflow-x-auto">
        <table id="tblDamage" class="tt-ledger-table">
          <caption class="tt-ledger-table__caption">Danh sách loại lỗi</caption>
          <thead>
            <tr><th scope="col">Tên lỗi</th><th scope="col">Mô tả</th></tr>
          </thead>
          <tbody>
            <c:forEach var="damage" items="${damageList}">
              <tr>
                <td><button type="submit" name="lnkChooseDamage" value="${damage.id}" class="text-left text-pen-blue underline"><c:out value="${damage.name}"/></button></td>
                <td><c:out value="${damage.description}"/></td>
              </tr>
            </c:forEach>
          </tbody>
        </table>
      </div>
      <p class="m-0"><a id="lnkAddDamage" href="${base}/AddDamageView.jsp" class="inline-block rounded-paper border border-ink-soft bg-paper px-4 py-2 text-ink shadow-paper">Thêm lỗi mới</a></p>
      <div class="overflow-x-auto">
        <table id="tblRentedDamage" class="tt-ledger-table">
          <caption class="tt-ledger-table__caption">Các lỗi đã ghi nhận</caption>
          <thead>
            <tr><th scope="col">Tên lỗi</th><th scope="col">Mô tả</th><th scope="col">Ghi chú</th><th scope="col">Thao tác</th></tr>
          </thead>
          <tbody>
            <c:forEach var="item" items="${rentedBook.listRentedDamage}">
              <tr>
                <td><c:out value="${item.damage.name}"/></td>
                <td><c:out value="${item.damage.description}"/></td>
                <td><input type="text" name="txtDamageNote" value="${fn:escapeXml(item.note)}" maxlength="255" placeholder="nhập ghi chú" aria-label="Ghi chú cho lỗi ${fn:escapeXml(item.damage.name)}" class="h-9 w-full min-w-0 rounded-paper border border-input bg-paper px-3 py-1 text-ink"></td>
                <td><button type="submit" name="lnkDeleteRentedDamage" value="${item.damage.id}" class="rounded-paper border border-ink-soft bg-paper px-2 py-1 text-sm text-ink">Xoá</button></td>
              </tr>
            </c:forEach>
          </tbody>
        </table>
      </div>
      <p class="m-0 flex flex-wrap items-center gap-4">
        <label for="txtConditionNote">Ghi chú tình trạng:</label>
        <input type="text" id="txtConditionNote" name="txtConditionNote" value="${fn:escapeXml(rentedBook.conditionNote)}" maxlength="255" class="h-9 min-w-0 flex-1 rounded-paper border border-input bg-paper px-3 py-1 text-ink">
      </p>
      <p class="m-0 flex flex-wrap gap-4">
        <button type="submit" id="btnSave" name="btnSave" class="rounded-paper bg-primary px-4 py-2 text-primary-foreground shadow-paper">Lưu tình trạng</button>
        <a id="lnkBack" href="${base}/ProcessRentalBillView.jsp" class="rounded-paper border border-ink-soft bg-paper px-4 py-2 text-ink shadow-paper">Quay lại</a>
      </p>
    </form>
  </section>
</t:layout>
