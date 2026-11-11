<%--
  AddRentalCollateralView (ch.9 tr.80–81; docs/contracts.md §9.2, §7, §11.3, C1, C6, C9). Trang xem, tự gửi, gọi
  CollateralDAO.searchCollateral.
  - Session R: rentalBill, listCollateral, listRentalCollateral.
  - Chỉ xử lí khi POST + dispatcher REQUEST (phase-06-integration.md §3). Trước khi xử lí nút, mọi lần gửi về đọc lại
    txtCollateralValue, txtCollateralNote (mỗi dòng "Các khoản cọc" một cặp, theo STT) vào listRentalCollateral (C1).
  - "Tìm": từ khoá trống thì không gọi DAO (C9); searchCollateral → W listCollateral; rỗng → COLLATERAL_NOT_FOUND.
  - lnkChooseCollateral (value = id loại tài sản): thêm một dòng (lần đầu thì tạo danh sách) → W listRentalCollateral.
    lnkDeleteRentalCollateral (value = STT): bỏ dòng.
  - "Lưu": còn dòng chưa có giá trị → COLLATERAL_VALUE_REQUIRED, hiện lại trang; đủ → thêm các khoản cọc vào
    rentalBill → W rentalBill, bỏ listRentalCollateral (C6), sendRedirect ProcessRentalBillView (PRG).
  - "Thêm loại tài sản mới", "Quay lại" là <a href>; ProcessRentalBillView bỏ listRentalCollateral khi hiển thị (C6).
  - Bảng "Các khoản cọc" là bản HTML đầy đủ (chạy khi tắt JS); island CollateralDrawer gắn ngay sau, props
    collateral-drawer-props (§11.3) sinh bằng JsonUtil.toScriptJson từ DTO.
  Form có action trỏ về chính trang: trang còn được forward tới từ doAddCollateral.jsp.
--%>
<%@ page contentType="text/html; charset=UTF-8" trimDirectiveWhitespaces="true" %>
<%@ page import="jakarta.servlet.DispatcherType, java.util.ArrayList, java.util.LinkedHashMap, java.util.List,
                 java.util.Map, vn.tiemtruyen.dao.CollateralDAO, vn.tiemtruyen.model.Collateral,
                 vn.tiemtruyen.model.RentalBill, vn.tiemtruyen.model.RentalCollateral, vn.tiemtruyen.util.JsonUtil,
                 vn.tiemtruyen.util.Messages" %>
<%@ taglib prefix="t" tagdir="/WEB-INF/tags" %>
<%@ taglib prefix="ui" tagdir="/WEB-INF/tags/ui" %>
<%@ taglib prefix="c" uri="jakarta.tags.core" %>
<%@ taglib prefix="fn" uri="jakarta.tags.functions" %>
<%!
    /** Số nguyên dương trong giá trị nút, 0 khi không phải số (không dòng nào khớp, nút không làm gì). */
    private static int numberOf(String value) {
        return value != null && value.matches("\\d{1,9}") ? Integer.parseInt(value) : 0;
    }

    /** Chuỗi đã bỏ khoảng trắng hai đầu; trống thì null (giá trị "chưa nhập", §11.3). */
    private static String blankToNull(String value) {
        if (value == null || value.strip().isEmpty()) {
            return null;
        }
        return value.strip();
    }
%>
<%
    String base = request.getContextPath() + "/nhan-vien";
    RentalBill rentalBill = (RentalBill) session.getAttribute("rentalBill");
    if (rentalBill == null) {
        response.sendRedirect(base + "/SearchRentalBillView.jsp");
        return;
    }
    @SuppressWarnings("unchecked")
    List<Collateral> listCollateral = (List<Collateral>) session.getAttribute("listCollateral");
    @SuppressWarnings("unchecked")
    List<RentalCollateral> stored = (List<RentalCollateral>) session.getAttribute("listRentalCollateral");
    List<RentalCollateral> listRentalCollateral = stored == null ? null : new ArrayList<>(stored);
    String message = (String) request.getAttribute("message");
    String messageKind = "error";
    boolean valueMissing = false;

    boolean selfPost = "POST".equals(request.getMethod())
            && request.getDispatcherType() == DispatcherType.REQUEST;
    if (selfPost) {
        if (listRentalCollateral != null) {
            String[] values = request.getParameterValues("txtCollateralValue");
            String[] notes = request.getParameterValues("txtCollateralNote");
            // Số ô khác số dòng chỉ xảy ra với form cũ (trình duyệt quay lại trang trước): không gán lệch dòng.
            if (values != null && values.length == listRentalCollateral.size()) {
                for (int i = 0; i < values.length; i++) {
                    listRentalCollateral.get(i).setValue(blankToNull(values[i]));
                }
            }
            if (notes != null && notes.length == listRentalCollateral.size()) {
                for (int i = 0; i < notes.length; i++) {
                    listRentalCollateral.get(i).setNote(blankToNull(notes[i]));
                }
            }
        }

        if (request.getParameter("btnSearch") != null) {
            String keyword = request.getParameter("txtKeyword") == null ? "" : request.getParameter("txtKeyword").strip();
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
            for (RentalCollateral item : added) {
                if (item.getValue() == null) {
                    valueMissing = true;
                }
            }
            if (valueMissing) {
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
            view.put("invalid", valueMissing && item.getValue() == null);
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
    pageContext.setAttribute("collateralList", listCollateral);
    pageContext.setAttribute("rows", rows);
    pageContext.setAttribute("drawerPropsJson", JsonUtil.toScriptJson(drawerProps));
    pageContext.setAttribute("pageMessage", message);
    pageContext.setAttribute("messageKind", messageKind);
    pageContext.setAttribute("keywordValue", selfPost ? request.getParameter("txtKeyword") : null);
%>
<t:layout title="Thêm khoản đặt cọc">
  <section class="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8">
    <h1 class="font-sign text-ink">Thêm khoản đặt cọc</h1>
    <c:if test="${not empty pageMessage}"><ui:message-box kind="${messageKind}" text="${pageMessage}"/></c:if>
    <form method="post" action="${base}/AddRentalCollateralView.jsp" class="flex flex-col gap-6">
      <t:csrf/>
      <p class="m-0 flex flex-wrap items-center gap-4">
        <label for="txtKeyword" class="sr-only">Từ khoá</label>
        <input type="text" id="txtKeyword" name="txtKeyword" value="${fn:escapeXml(keywordValue)}" placeholder="Nhập tên loại tài sản thế chấp…" class="h-9 min-w-0 flex-1 rounded-paper border border-input bg-paper px-3 py-1 text-ink">
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
                <td><input type="text" name="txtCollateralValue" value="${fn:escapeXml(row.value)}" maxlength="100" placeholder="nhập giá trị" aria-label="Giá trị khoản cọc ${row.index}" class="h-9 w-full min-w-0 rounded-paper border border-input bg-paper px-3 py-1 font-num text-ink aria-invalid:border-destructive"${row.invalid ? ' aria-invalid="true"' : ''}></td>
                <td><input type="text" name="txtCollateralNote" value="${fn:escapeXml(row.note)}" maxlength="255" placeholder="nhập ghi chú" aria-label="Ghi chú khoản cọc ${row.index}" class="h-9 w-full min-w-0 rounded-paper border border-input bg-paper px-3 py-1 text-ink"></td>
                <td><button type="submit" name="lnkDeleteRentalCollateral" value="${row.index}" class="rounded-paper border border-ink-soft bg-paper px-2 py-1 text-sm text-ink">Xoá</button></td>
              </tr>
            </c:forEach>
          </tbody>
        </table>
      </div>
      <div data-island="CollateralDrawer" data-props="collateral-drawer-props"></div>
      <script type="application/json" id="collateral-drawer-props">${drawerPropsJson}</script>
      <p class="m-0 flex flex-wrap gap-4">
        <button type="submit" id="btnSave" name="btnSave" class="rounded-paper bg-primary px-4 py-2 text-primary-foreground shadow-paper">Lưu</button>
        <a id="lnkBack" href="${base}/ProcessRentalBillView.jsp" class="rounded-paper border border-ink-soft bg-paper px-4 py-2 text-ink shadow-paper">Quay lại</a>
      </p>
    </form>
  </section>
</t:layout>
