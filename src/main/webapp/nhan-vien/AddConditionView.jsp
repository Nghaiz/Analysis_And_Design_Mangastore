<%--
  AddConditionView (ch.9 tr.77–78; docs/contracts.md §9.2, §7, C1, C7, C9). Trang xem, tự gửi, gọi DamageDAO.searchDamage.
  - Session R: rentedBook (bản sao do ProcessRentalBillView lưu; mọi thay đổi chỉ làm trên bản sao), listDamage.
  - Chỉ xử lí khi POST + dispatcher REQUEST (phase-06-integration.md §3). Trước khi xử lí nút, mọi lần gửi về đọc lại
    txtDamageNote (mỗi dòng "Các lỗi đã ghi nhận" một ô theo thứ tự; thiếu ô coi là trống, thừa bỏ) và
    txtConditionNote vào bản sao (C1). Ô dài quá 255 kí tự → INPUT_TOO_LONG, aria-invalid, không xử lí nút.
  - "Tìm": từ khoá trim + NFC, cắt 100; trống thì không gọi DAO (C9); searchDamage → W listDamage; rỗng → DAMAGE_NOT_FOUND.
  - lnkChooseDamage (value = id loại lỗi trong listDamage): thêm vào "Các lỗi đã ghi nhận"; đã có →
    DAMAGE_ALREADY_RECORDED. lnkDeleteRentedDamage (value = id loại lỗi): bỏ lỗi. Id không có thì bỏ qua. W rentedBook.
  - "Lưu tình trạng": ghi chú tình trạng (kể cả chuỗi rỗng, C7) vào bản sao, thay quyển cùng mã vạch trong rentalBill
    → W rentalBill, bỏ rentedBook, sendRedirect ProcessRentalBillView (PRG). Không có lỗi nào thì tình trạng hiển thị
    là "Không có lỗi" (§13). Tình trạng ghi vào DB khi xác nhận phiếu.
  - "Thêm lỗi mới", "Quay lại" là <a href>; ProcessRentalBillView bỏ bản sao rentedBook khi hiển thị (C6).
  Đầu trang (phase-07-edge-cases.md §3.1): (1) thiếu rentalBill → 302 SearchRentalBillView, thiếu rentedBook → 302
  ProcessRentalBillView; (2) rentalBill không còn "Chờ nhận" → forward SearchRentalBillView kèm câu D9; (3) POST thiếu
  hoặc sai input ẩn rentalBillId → forward ProcessRentalBillView kèm RENTAL_BILL_CHANGED.
  Form có action trỏ về chính trang: trang còn được forward tới từ doAddDamage.jsp.
--%>
<%@ page contentType="text/html; charset=UTF-8" trimDirectiveWhitespaces="true" %>
<%@ page import="jakarta.servlet.DispatcherType, jakarta.servlet.http.HttpServletRequest, java.text.Normalizer,
                 java.util.ArrayList, java.util.LinkedHashMap, java.util.List, java.util.Map, vn.tiemtruyen.dao.DamageDAO,
                 vn.tiemtruyen.model.Damage, vn.tiemtruyen.model.RentalBill, vn.tiemtruyen.model.RentedBook,
                 vn.tiemtruyen.model.RentedDamage, vn.tiemtruyen.util.Messages" %>
<%@ taglib prefix="t" tagdir="/WEB-INF/tags" %>
<%@ taglib prefix="ui" tagdir="/WEB-INF/tags/ui" %>
<%@ taglib prefix="c" uri="jakarta.tags.core" %>
<%@ taglib prefix="fn" uri="jakarta.tags.functions" %>
<%!
    /** Độ dài tối đa của từ khoá tìm (cắt) và của ô ghi chú (cột varchar(255), docs/contracts.md §2). */
    private static final int KEYWORD_MAX = 100;
    private static final int NOTE_MAX = 255;

    /** Bước (2), (3) đầu trang M3 (phase-07-edge-cases.md §3.1); null khi được xử lí tiếp. */
    private static String billGuard(HttpServletRequest request, RentalBill bill, boolean checkFormId) {
        if (!RentalBill.STATUS_PENDING.equals(bill.getStatus())) {
            request.setAttribute("message", RentalBill.STATUS_CANCELLED.equals(bill.getStatus())
                    ? Messages.RENTAL_BILL_CANCELLED : Messages.RENTAL_BILL_ALREADY_PROCESSED);
            return "/nhan-vien/SearchRentalBillView.jsp";
        }
        String formId = request.getParameter("rentalBillId");
        if (checkFormId && (formId == null || !formId.strip().equals(String.valueOf(bill.getId())))) {
            request.setAttribute("message", Messages.RENTAL_BILL_CHANGED);
            return "/nhan-vien/ProcessRentalBillView.jsp";
        }
        return null;
    }

    /** Ô chữ đã trim và chuẩn hoá NFC (phase-06-integration.md §6.1); thiếu tham số thì chuỗi rỗng. */
    private static String clean(String value) {
        return value == null ? "" : Normalizer.normalize(value.strip(), Normalizer.Form.NFC);
    }

    /** id dương trong giá trị nút, 0 khi không phải số (không dòng nào khớp, nút không làm gì). */
    private static int idOf(String value) {
        String text = clean(value);
        return text.matches("\\d{1,9}") ? Integer.parseInt(text) : 0;
    }
%>
<%
    String base = request.getContextPath() + "/nhan-vien";
    RentalBill rentalBill = (RentalBill) session.getAttribute("rentalBill");
    if (rentalBill == null) {
        response.sendRedirect(base + "/SearchRentalBillView.jsp");
        return;
    }
    RentedBook rentedBook = (RentedBook) session.getAttribute("rentedBook");
    if (rentedBook == null) {
        response.sendRedirect(base + "/ProcessRentalBillView.jsp");
        return;
    }
    boolean selfPost = "POST".equals(request.getMethod())
            && request.getDispatcherType() == DispatcherType.REQUEST;
    String guard = billGuard(request, rentalBill, selfPost);
    if (guard != null) {
        request.getRequestDispatcher(guard).forward(request, response);
        return;
    }

    @SuppressWarnings("unchecked")
    List<Damage> listDamage = (List<Damage>) session.getAttribute("listDamage");
    String message = (String) request.getAttribute("message");
    String messageKind = "error";
    boolean conditionTooLong = false;
    List<Integer> tooLongRows = new ArrayList<>();
    String keyword = clean(request.getParameter("txtKeyword"));
    // Từ khoá dài quá KEYWORD_MAX kí tự: INPUT_TOO_LONG, không gọi DAO (docs/contracts.md §10.3).
    boolean keywordTooLong = keyword.codePointCount(0, keyword.length()) > KEYWORD_MAX;

    if (selfPost) {
        List<RentedDamage> damages = new ArrayList<>(rentedBook.getListRentedDamage());
        String[] notes = request.getParameterValues("txtDamageNote");
        for (int i = 0; i < damages.size(); i++) {
            String note = notes != null && i < notes.length ? clean(notes[i]) : "";
            if (note.length() > NOTE_MAX) {
                tooLongRows.add(i);
            }
            damages.get(i).setNote(note.isEmpty() ? null : note);
        }
        String conditionNote = clean(request.getParameter("txtConditionNote"));
        conditionTooLong = conditionNote.length() > NOTE_MAX;
        rentedBook.setConditionNote(conditionNote);

        if (conditionTooLong || !tooLongRows.isEmpty()) {
            message = Messages.INPUT_TOO_LONG;
        } else if (request.getParameter("btnSearch") != null && keywordTooLong) {
            message = Messages.INPUT_TOO_LONG;
        } else if (request.getParameter("btnSearch") != null) {
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
            if (chosen != null && recorded) {
                message = Messages.DAMAGE_ALREADY_RECORDED;
            } else if (chosen != null) {
                RentedDamage item = new RentedDamage();
                item.setDamage(chosen);
                damages.add(item);
            }
        } else if (request.getParameter("lnkDeleteRentedDamage") != null) {
            int damageId = idOf(request.getParameter("lnkDeleteRentedDamage"));
            damages.removeIf(item -> item.getDamage().getId() == damageId);
        } else if (request.getParameter("btnSave") != null) {
            String barcode = rentedBook.getBookCopy().getBarcode();
            List<RentedBook> rows = new ArrayList<>(rentalBill.getListRentedBook());
            int index = -1;
            for (int i = 0; i < rows.size(); i++) {
                if (barcode.equals(rows.get(i).getBookCopy().getBarcode())) {
                    index = i;
                }
            }
            if (index < 0) {
                // Quyển đã rời phiếu (danh sách vừa lưu ở thẻ khác): bản sao không còn chỗ thay, coi như phiếu đã đổi.
                request.setAttribute("message", Messages.RENTAL_BILL_CHANGED);
                request.getRequestDispatcher("/nhan-vien/ProcessRentalBillView.jsp").forward(request, response);
                return;
            }
            rentedBook.setListRentedDamage(damages);
            rows.set(index, rentedBook);
            rentalBill.setListRentedBook(rows);
            session.setAttribute("rentalBill", rentalBill);
            session.removeAttribute("rentedBook");
            response.sendRedirect(base + "/ProcessRentalBillView.jsp");
            return;
        }
        rentedBook.setListRentedDamage(damages);
        session.setAttribute("rentedBook", rentedBook);
    }

    List<Map<String, Object>> recordedRows = new ArrayList<>();
    for (int i = 0; i < rentedBook.getListRentedDamage().size(); i++) {
        RentedDamage item = rentedBook.getListRentedDamage().get(i);
        Map<String, Object> view = new LinkedHashMap<>();
        view.put("damageId", item.getDamage().getId());
        view.put("name", item.getDamage().getName());
        view.put("description", item.getDamage().getDescription());
        view.put("note", item.getNote());
        view.put("invalid", tooLongRows.contains(i));
        recordedRows.add(view);
    }
    pageContext.setAttribute("base", base);
    pageContext.setAttribute("billId", rentalBill.getId());
    pageContext.setAttribute("barcode", rentedBook.getBookCopy().getBarcode());
    pageContext.setAttribute("bookName", rentedBook.getBookCopy().getBook().getName());
    pageContext.setAttribute("conditionNote", rentedBook.getConditionNote());
    pageContext.setAttribute("conditionTooLong", conditionTooLong);
    pageContext.setAttribute("damageList", listDamage);
    pageContext.setAttribute("recordedRows", recordedRows);
    pageContext.setAttribute("pageMessage", message);
    pageContext.setAttribute("messageKind", messageKind);
    pageContext.setAttribute("keywordValue", selfPost ? keyword : "");
%>
<t:layout title="Thêm tình trạng truyện">
  <div class="flex flex-col gap-6">
    <header class="flex flex-col gap-2 border-b border-dashed border-ink-soft pb-4">
      <nav aria-label="Đường dẫn" class="text-sm text-ink-soft">
        <ol class="m-0 flex list-none flex-wrap items-center gap-x-2 gap-y-1 p-0">
          <li><a href="${base}/StaffHomeView.jsp">Trang chủ nhân viên</a></li>
          <li class="flex items-center gap-2"><svg aria-hidden="true" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg><a href="${base}/SearchRentalBillView.jsp">Tìm phiếu mượn</a></li>
          <li class="flex items-center gap-2"><svg aria-hidden="true" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg><a href="${base}/ProcessRentalBillView.jsp">Xử lí phiếu mượn</a></li>
          <li aria-current="page" class="flex items-center gap-2"><svg aria-hidden="true" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>Thêm tình trạng truyện</li>
        </ol>
      </nav>
      <h1 class="m-0">Thêm tình trạng truyện</h1>
      <p class="m-0 max-w-3xl text-ink-soft">Ghi tình trạng quyển trước khi giao: chọn các lỗi nhìn thấy, ghi chú nếu cần rồi bấm Lưu tình trạng. Quyển không có lỗi thì để trống danh sách lỗi và bấm Lưu tình trạng.</p>
    </header>
    <c:if test="${not empty pageMessage}"><ui:message-box kind="${messageKind}" text="${pageMessage}"/></c:if>
    <dl class="tt-paper-card m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
      <dt>Mã vạch:</dt><dd id="barcode" class="m-0 font-num"><c:out value="${barcode}"/></dd>
      <dt>Tên đầu truyện:</dt><dd id="bookName" class="m-0"><c:out value="${bookName}"/></dd>
    </dl>
    <form method="post" action="${base}/AddConditionView.jsp" class="flex flex-col gap-6">
      <t:csrf/>
      <input type="hidden" name="rentalBillId" value="${billId}">
      <div class="tt-paper-card grid gap-2">
        <label for="txtKeyword">Từ khoá</label>
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
          <input type="text" id="txtKeyword" name="txtKeyword" value="${fn:escapeXml(keywordValue)}" maxlength="100" placeholder="Nhập tên lỗi…" aria-describedby="txtKeyword-hint" class="h-11 min-w-0 flex-1 rounded-paper border border-input bg-paper px-3 text-ink">
          <button type="submit" id="btnSearch" name="btnSearch" class="tt-btn tt-btn--primary"><svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg><span>Tìm</span></button>
        </div>
        <p id="txtKeyword-hint" class="m-0 text-sm text-ink-soft">Tìm theo tên lỗi, rồi bấm tên lỗi trong bảng để ghi nhận cho quyển này.</p>
      </div>
      <div class="flex flex-col gap-3">
        <div class="overflow-x-auto">
          <table id="tblDamage" class="tt-ledger-table">
            <caption class="tt-ledger-table__caption">Danh sách loại lỗi</caption>
            <thead>
              <tr><th scope="col">Tên lỗi</th><th scope="col">Mô tả</th></tr>
            </thead>
            <tbody>
              <c:forEach var="damage" items="${damageList}">
                <tr>
                  <td><button type="submit" name="lnkChooseDamage" value="${damage.id}" class="cursor-pointer border-0 bg-transparent p-0 text-left text-pen-blue underline underline-offset-[3px]"><c:out value="${damage.name}"/></button></td>
                  <td><c:out value="${damage.description}"/></td>
                </tr>
              </c:forEach>
            </tbody>
          </table>
        </div>
        <c:if test="${empty damageList}"><p class="m-0 border border-dashed border-ink-soft bg-paper-deep px-4 py-3 text-ink">Chưa có loại lỗi nào trong bảng. Nhập từ khoá ở ô trên rồi bấm Tìm.</p></c:if>
        <p class="m-0 flex flex-wrap items-center gap-3 text-ink-soft">Không thấy lỗi phù hợp? <a id="lnkAddDamage" href="${base}/AddDamageView.jsp" class="tt-btn tt-btn--ghost tt-btn--sm"><svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg><span>Thêm lỗi mới</span></a></p>
      </div>
      <div class="flex flex-col gap-3">
        <div class="overflow-x-auto">
          <table id="tblRentedDamage" class="tt-ledger-table">
            <caption class="tt-ledger-table__caption">Các lỗi đã ghi nhận</caption>
            <thead>
              <tr><th scope="col">Tên lỗi</th><th scope="col">Mô tả</th><th scope="col">Ghi chú</th><th scope="col">Thao tác</th></tr>
            </thead>
            <tbody>
              <c:forEach var="item" items="${recordedRows}">
                <tr>
                  <td><c:out value="${item.name}"/></td>
                  <td><c:out value="${item.description}"/></td>
                  <td><input type="text" name="txtDamageNote" value="${fn:escapeXml(item.note)}" maxlength="255" placeholder="nhập ghi chú" aria-label="Ghi chú cho lỗi ${fn:escapeXml(item.name)}" class="h-11 w-full min-w-0 rounded-paper border border-input bg-paper px-3 text-ink aria-invalid:border-destructive"${item.invalid ? ' aria-invalid="true"' : ''}></td>
                  <td><button type="submit" name="lnkDeleteRentedDamage" value="${item.damageId}" class="tt-btn tt-btn--ghost tt-btn--sm">Xoá</button></td>
                </tr>
              </c:forEach>
            </tbody>
          </table>
        </div>
        <c:if test="${empty recordedRows}"><p class="m-0 border border-dashed border-ink-soft bg-paper-deep px-4 py-3 text-ink">Chưa ghi nhận lỗi nào. Quyển lành lặn thì cứ bấm Lưu tình trạng, phiếu sẽ ghi là không có lỗi.</p></c:if>
      </div>
      <div class="tt-paper-card grid gap-2">
        <label for="txtConditionNote">Ghi chú tình trạng:</label>
        <input type="text" id="txtConditionNote" name="txtConditionNote" value="${fn:escapeXml(conditionNote)}" maxlength="255" aria-describedby="txtConditionNote-hint" class="h-11 w-full min-w-0 rounded-paper border border-input bg-paper px-3 text-ink aria-invalid:border-destructive"${conditionTooLong ? ' aria-invalid="true"' : ''}>
        <p id="txtConditionNote-hint" class="m-0 text-sm text-ink-soft">Không bắt buộc, tối đa 255 kí tự. Ví dụ: còn mới, gáy hơi lỏng.</p>
      </div>
      <div class="flex flex-wrap gap-3 border-t border-dashed border-ink-soft pt-4">
        <button type="submit" id="btnSave" name="btnSave" class="tt-btn tt-btn--primary"><svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg><span>Lưu tình trạng</span></button>
        <a id="lnkBack" href="${base}/ProcessRentalBillView.jsp" class="tt-btn tt-btn--ghost"><svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg><span>Quay lại</span></a>
      </div>
    </form>
  </div>
</t:layout>
