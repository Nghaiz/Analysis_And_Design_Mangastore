<%--
  AddRentalCollateralView (ch.9 tr.80–81; docs/contracts.md §9.2, §7, §11.3, C1, C6, C9). Trang xem, tự gửi, gọi
  CollateralDAO.searchCollateral.
  - Session R: rentalBill, listCollateral, listRentalCollateral.
  - Chỉ xử lí khi POST + dispatcher REQUEST (phase-06-integration.md §3). Trước khi xử lí nút, mọi lần gửi về đọc lại
    txtCollateralValue, txtCollateralNote (mỗi dòng "Các khoản cọc" một cặp theo STT; thiếu ô coi là trống, thừa bỏ;
    trim + NFC, toàn dấu cách là chưa nhập) vào listRentalCollateral (C1). Giá trị quá 100 hay ghi chú quá 255 kí tự
    → INPUT_TOO_LONG, aria-invalid, không xử lí nút.
  - "Tìm": từ khoá cắt 100; trống thì không gọi DAO (C9); searchCollateral → W listCollateral; rỗng → COLLATERAL_NOT_FOUND.
  - lnkChooseCollateral (value = id trong listCollateral): thêm một dòng (lần đầu thì tạo danh sách; hai dòng cùng loại
    được phép) → W listRentalCollateral. lnkDeleteRentalCollateral (value = STT): bỏ dòng. Giá trị sai thì bỏ qua.
  - "Lưu": còn dòng chưa có giá trị → COLLATERAL_VALUE_REQUIRED (aria-invalid), hiện lại trang; đủ → thêm các khoản
    cọc vào rentalBill → W rentalBill, bỏ listRentalCollateral (C6), sendRedirect ProcessRentalBillView (PRG).
  - "Thêm loại tài sản mới", "Quay lại" là <a href>; ProcessRentalBillView bỏ listRentalCollateral khi hiển thị (C6).
  - Bảng "Các khoản cọc", "Lưu", "Quay lại" là bản HTML đầy đủ (chạy khi tắt JS) trong khối
    data-island-fallback="CollateralDrawer"; "Quay lại" mang data-island-slot="CollateralDrawer:back"; div
    data-island đứng sau khối đó, trong form (quy ước gắn island, plans/reports/phase-07-islands-m3-261111-1057.md §4).
    Props collateral-drawer-props (§11.3) sinh bằng JsonUtil.toScriptJson từ DTO.
  Đầu trang (phase-07-edge-cases.md §3.1): (1) thiếu rentalBill → 302 SearchRentalBillView; (2) rentalBill không còn
  "Chờ nhận" → forward SearchRentalBillView kèm câu D9; (3) POST thiếu hoặc sai input ẩn rentalBillId → forward
  ProcessRentalBillView kèm RENTAL_BILL_CHANGED. Form có action trỏ về chính trang (doAddCollateral forward tới).
--%>
<%@ page contentType="text/html; charset=UTF-8" trimDirectiveWhitespaces="true" %>
<%@ page import="jakarta.servlet.DispatcherType, jakarta.servlet.http.HttpServletRequest, java.text.Normalizer,
                 java.util.ArrayList, java.util.LinkedHashMap, java.util.List, java.util.Map,
                 vn.tiemtruyen.dao.CollateralDAO, vn.tiemtruyen.model.Collateral, vn.tiemtruyen.model.RentalBill,
                 vn.tiemtruyen.model.RentalCollateral, vn.tiemtruyen.util.JsonUtil, vn.tiemtruyen.util.Messages" %>
<%@ taglib prefix="t" tagdir="/WEB-INF/tags" %>
<%@ taglib prefix="ui" tagdir="/WEB-INF/tags/ui" %>
<%@ taglib prefix="c" uri="jakarta.tags.core" %>
<%@ taglib prefix="fn" uri="jakarta.tags.functions" %>
<%!
    /** Độ dài tối đa: từ khoá (cắt), giá trị cọc varchar(100), ghi chú varchar(255) (docs/contracts.md §2). */
    private static final int KEYWORD_MAX = 100;
    private static final int VALUE_MAX = 100;
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

    /** Ô thứ i của nhóm ô trên dòng; thiếu ô coi là trống (phase-07-edge-cases.md §3.2). */
    private static String cell(String[] values, int i) {
        return values != null && i < values.length ? clean(values[i]) : "";
    }

    /** Số nguyên dương trong giá trị nút, 0 khi không phải số (không dòng nào khớp, nút không làm gì). */
    private static int numberOf(String value) {
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
    boolean selfPost = "POST".equals(request.getMethod())
            && request.getDispatcherType() == DispatcherType.REQUEST;
    String guard = billGuard(request, rentalBill, selfPost);
    if (guard != null) {
        request.getRequestDispatcher(guard).forward(request, response);
        return;
    }

    @SuppressWarnings("unchecked")
    List<Collateral> listCollateral = (List<Collateral>) session.getAttribute("listCollateral");
    @SuppressWarnings("unchecked")
    List<RentalCollateral> stored = (List<RentalCollateral>) session.getAttribute("listRentalCollateral");
    List<RentalCollateral> listRentalCollateral = stored == null ? null : new ArrayList<>(stored);
    String message = (String) request.getAttribute("message");
    String messageKind = "error";
    List<Integer> valueInvalid = new ArrayList<>();
    List<Integer> noteInvalid = new ArrayList<>();
    String keyword = clean(request.getParameter("txtKeyword"));
    // Từ khoá dài quá KEYWORD_MAX kí tự: INPUT_TOO_LONG, không gọi DAO (docs/contracts.md §10.3).
    boolean keywordTooLong = keyword.codePointCount(0, keyword.length()) > KEYWORD_MAX;

    if (selfPost) {
        if (listRentalCollateral != null) {
            String[] values = request.getParameterValues("txtCollateralValue");
            String[] notes = request.getParameterValues("txtCollateralNote");
            for (int i = 0; i < listRentalCollateral.size(); i++) {
                String value = cell(values, i);
                String note = cell(notes, i);
                if (value.length() > VALUE_MAX) {
                    valueInvalid.add(i);
                }
                if (note.length() > NOTE_MAX) {
                    noteInvalid.add(i);
                }
                listRentalCollateral.get(i).setValue(value.isEmpty() ? null : value);
                listRentalCollateral.get(i).setNote(note.isEmpty() ? null : note);
            }
        }

        if (!valueInvalid.isEmpty() || !noteInvalid.isEmpty()) {
            message = Messages.INPUT_TOO_LONG;
        } else if (request.getParameter("btnSearch") != null && keywordTooLong) {
            message = Messages.INPUT_TOO_LONG;
        } else if (request.getParameter("btnSearch") != null) {
            if (keyword.isEmpty()) {
                listCollateral = new ArrayList<>();
            } else {
                try (CollateralDAO dao = new CollateralDAO()) {
                    listCollateral = dao.searchCollateral(keyword);
                }
            }
            session.setAttribute("listCollateral", listCollateral);
            if (listCollateral.isEmpty()) {
                message = Messages.COLLATERAL_NOT_FOUND;
                messageKind = "info";
            }
        } else if (request.getParameter("lnkChooseCollateral") != null) {
            int collateralId = numberOf(request.getParameter("lnkChooseCollateral"));
            if (listCollateral != null) {
                for (Collateral collateral : listCollateral) {
                    if (collateral.getId() == collateralId) {
                        if (listRentalCollateral == null) {
                            listRentalCollateral = new ArrayList<>();
                        }
                        RentalCollateral item = new RentalCollateral();
                        item.setCollateral(collateral);
                        listRentalCollateral.add(item);
                    }
                }
            }
        } else if (request.getParameter("lnkDeleteRentalCollateral") != null && listRentalCollateral != null) {
            int index = numberOf(request.getParameter("lnkDeleteRentalCollateral"));
            if (index >= 1 && index <= listRentalCollateral.size()) {
                listRentalCollateral.remove(index - 1);
            }
        } else if (request.getParameter("btnSave") != null) {
            List<RentalCollateral> added = listRentalCollateral == null ? List.of() : listRentalCollateral;
            for (int i = 0; i < added.size(); i++) {
                if (added.get(i).getValue() == null) {
                    valueInvalid.add(i);
                }
            }
            if (!valueInvalid.isEmpty()) {
                message = Messages.COLLATERAL_VALUE_REQUIRED;
            } else {
                List<RentalCollateral> all = new ArrayList<>(rentalBill.getListRentalCollateral());
                all.addAll(added);
                rentalBill.setListRentalCollateral(all);
                session.setAttribute("rentalBill", rentalBill);
                session.removeAttribute("listRentalCollateral");
                response.sendRedirect(base + "/ProcessRentalBillView.jsp");
                return;
            }
        }
        if (listRentalCollateral != null) {
            session.setAttribute("listRentalCollateral", listRentalCollateral);
        }
    }

    List<Map<String, Object>> rows = new ArrayList<>();
    List<Map<String, Object>> drawerRows = new ArrayList<>();
    if (listRentalCollateral != null) {
        for (int i = 0; i < listRentalCollateral.size(); i++) {
            RentalCollateral item = listRentalCollateral.get(i);
            Map<String, Object> view = new LinkedHashMap<>();
            view.put("index", i + 1);
            view.put("name", item.getCollateral().getName());
            view.put("value", item.getValue());
            view.put("note", item.getNote());
            view.put("valueInvalid", valueInvalid.contains(i));
            view.put("noteInvalid", noteInvalid.contains(i));
            rows.add(view);

            Map<String, Object> drawer = new LinkedHashMap<>();
            drawer.put("index", i + 1);
            drawer.put("collateralId", item.getCollateral().getId());
            drawer.put("collateralName", item.getCollateral().getName());
            drawer.put("collateralDescription", item.getCollateral().getDescription());
            drawer.put("value", item.getValue());
            drawer.put("note", item.getNote());
            drawerRows.add(drawer);
        }
    }
    Map<String, Object> drawerProps = new LinkedHashMap<>();
    drawerProps.put("rows", drawerRows);

    pageContext.setAttribute("base", base);
    pageContext.setAttribute("billId", rentalBill.getId());
    pageContext.setAttribute("collateralList", listCollateral);
    pageContext.setAttribute("rows", rows);
    pageContext.setAttribute("drawerPropsJson", JsonUtil.toScriptJson(drawerProps));
    pageContext.setAttribute("pageMessage", message);
    pageContext.setAttribute("messageKind", messageKind);
    pageContext.setAttribute("keywordValue", selfPost ? keyword : "");
%>
<t:layout title="Thêm khoản đặt cọc">
  <section class="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8">
    <h1 class="font-sign text-ink">Thêm khoản đặt cọc</h1>
    <c:if test="${not empty pageMessage}"><ui:message-box kind="${messageKind}" text="${pageMessage}"/></c:if>
    <form method="post" action="${base}/AddRentalCollateralView.jsp" class="flex flex-col gap-6">
      <t:csrf/>
      <input type="hidden" name="rentalBillId" value="${billId}">
      <p class="m-0 flex flex-wrap items-center gap-4">
        <label for="txtKeyword" class="sr-only">Từ khoá</label>
        <input type="text" id="txtKeyword" name="txtKeyword" value="${fn:escapeXml(keywordValue)}" maxlength="100" placeholder="Nhập tên loại tài sản thế chấp…" class="h-9 min-w-0 flex-1 rounded-paper border border-input bg-paper px-3 py-1 text-ink">
        <button type="submit" id="btnSearch" name="btnSearch" class="rounded-paper bg-primary px-4 py-2 text-primary-foreground shadow-paper">Tìm</button>
      </p>
      <div class="overflow-x-auto">
        <table id="tblCollateral" class="tt-ledger-table">
          <caption class="tt-ledger-table__caption">Danh sách loại tài sản thế chấp</caption>
          <thead>
            <tr><th scope="col">Tên loại tài sản</th><th scope="col">Mô tả</th></tr>
          </thead>
          <tbody>
            <c:forEach var="collateral" items="${collateralList}">
              <tr>
                <td><button type="submit" name="lnkChooseCollateral" value="${collateral.id}" class="text-left text-pen-blue underline"><c:out value="${collateral.name}"/></button></td>
                <td><c:out value="${collateral.description}"/></td>
              </tr>
            </c:forEach>
          </tbody>
        </table>
      </div>
      <p class="m-0"><a id="lnkAddCollateral" href="${base}/AddCollateralView.jsp" class="inline-block rounded-paper border border-ink-soft bg-paper px-4 py-2 text-ink shadow-paper">Thêm loại tài sản mới</a></p>
      <div data-island-fallback="CollateralDrawer">
      <div class="overflow-x-auto">
        <table id="tblRentalCollateral" class="tt-ledger-table">
          <caption class="tt-ledger-table__caption">Các khoản cọc</caption>
          <thead>
            <tr><th scope="col" class="text-right">STT</th><th scope="col">Loại tài sản</th><th scope="col">Giá trị</th><th scope="col">Ghi chú</th><th scope="col">Thao tác</th></tr>
          </thead>
          <tbody>
            <c:forEach var="row" items="${rows}">
              <tr>
                <td class="font-num text-right">${row.index}</td>
                <td><c:out value="${row.name}"/></td>
                <td><input type="text" name="txtCollateralValue" value="${fn:escapeXml(row.value)}" maxlength="100" placeholder="nhập giá trị" aria-label="Giá trị khoản cọc ${row.index}" class="h-9 w-full min-w-0 rounded-paper border border-input bg-paper px-3 py-1 font-num text-ink aria-invalid:border-destructive"${row.valueInvalid ? ' aria-invalid="true"' : ''}></td>
                <td><input type="text" name="txtCollateralNote" value="${fn:escapeXml(row.note)}" maxlength="255" placeholder="nhập ghi chú" aria-label="Ghi chú khoản cọc ${row.index}" class="h-9 w-full min-w-0 rounded-paper border border-input bg-paper px-3 py-1 text-ink aria-invalid:border-destructive"${row.noteInvalid ? ' aria-invalid="true"' : ''}></td>
                <td><button type="submit" name="lnkDeleteRentalCollateral" value="${row.index}" class="rounded-paper border border-ink-soft bg-paper px-2 py-1 text-sm text-ink">Xoá</button></td>
              </tr>
            </c:forEach>
          </tbody>
        </table>
      </div>
      <p class="m-0 mt-6 flex flex-wrap gap-4">
        <button type="submit" id="btnSave" name="btnSave" class="rounded-paper bg-primary px-4 py-2 text-primary-foreground shadow-paper">Lưu</button>
        <a id="lnkBack" href="${base}/ProcessRentalBillView.jsp" data-island-slot="CollateralDrawer:back" class="rounded-paper border border-ink-soft bg-paper px-4 py-2 text-ink shadow-paper">Quay lại</a>
      </p>
      </div>
      <div data-island="CollateralDrawer" data-props="collateral-drawer-props"></div>
      <script type="application/json" id="collateral-drawer-props">${drawerPropsJson}</script>
    </form>
  </section>
</t:layout>
