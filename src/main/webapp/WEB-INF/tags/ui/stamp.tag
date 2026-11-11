<%--
  <ui:stamp status="${rentalBill.status}"/> : dấu trạng thái phiếu (phase-05-ui-contract.md §3, §3a; docs/contracts.md §4).
  status phải đúng một trong ba hằng RentalBill.STATUS_* ("Chờ nhận", "Đang cho thuê", "Đã huỷ"); giá trị khác
  ném IllegalArgumentException (không lặng lẽ in dấu sai). Chữ trong dấu viết sẵn đúng §4 (CHỜ NHẬN,
  ĐANG CHO THUÊ, ĐÃ HUỶ), có trong DOM, không text-transform, không chỉ dựa vào màu. Bản React: Stamp.tsx.
  Cây thẻ: span.tt-stamp.tt-stamp--{pending,renting,cancelled}.
--%>
<%@ tag body-content="empty" pageEncoding="UTF-8" trimDirectiveWhitespaces="true" %>
<%@ tag import="vn.tiemtruyen.model.RentalBill" %>
<%@ attribute name="status" required="true" %>
<%
    String status = (String) jspContext.getAttribute("status");
    String modifier;
    String label;
    if (RentalBill.STATUS_PENDING.equals(status)) {
        modifier = "pending";
        label = "CHỜ NHẬN";
    } else if (RentalBill.STATUS_RENTING.equals(status)) {
        modifier = "renting";
        label = "ĐANG CHO THUÊ";
    } else if (RentalBill.STATUS_CANCELLED.equals(status)) {
        modifier = "cancelled";
        label = "ĐÃ HUỶ";
    } else {
        throw new IllegalArgumentException("<ui:stamp> status phải là \"" + RentalBill.STATUS_PENDING + "\", \""
                + RentalBill.STATUS_RENTING + "\" hoặc \"" + RentalBill.STATUS_CANCELLED + "\", đang là \""
                + status + "\"");
    }
    jspContext.setAttribute("stampModifier", modifier);
    jspContext.setAttribute("stampLabel", label);
%>
<span class="tt-stamp tt-stamp--${stampModifier}">${stampLabel}</span>
