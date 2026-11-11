<%--
  <ui:book-cover bookId="${book.id}" name="${book.name}" size="md" eager="false"/> : bìa truyện thật
  (phase-05-ui-contract.md §3, §3a; contract.md §6). Chỉ dùng ở chỗ hiển thị dữ liệu (kết quả tìm, chi tiết đầu
  truyện, phiếu mượn). srcset 160w/320w/640w từ APP_COVERS_BASE_URL/{bookId}/cover-{w}.webp (AppConfig,
  mặc định /covers, bỏ "/" cuối); thiếu file thì nginx trả /static/img/cover-fallback.svg với mã 200.
  size: sm (160) | md (320) | lg (640) là cỡ hiển thị; giá trị khác ném IllegalArgumentException.
  eager: true cho ảnh đầu màn hình, mặc định loading="lazy". alt = name. Bản React: BookCover.tsx (prop coversBase).
  Cây thẻ: span.tt-book-cover.tt-book-cover--{sm,md,lg} bọc img (src = cỡ hiển thị, sizes="{W}px", width/height 2:3).
--%>
<%@ tag body-content="empty" pageEncoding="UTF-8" trimDirectiveWhitespaces="true" %>
<%@ tag import="vn.tiemtruyen.util.AppConfig" %>
<%@ taglib prefix="fn" uri="jakarta.tags.functions" %>
<%@ attribute name="bookId" required="true" type="java.lang.Integer" %>
<%@ attribute name="name" required="true" %>
<%@ attribute name="size" required="true" %>
<%@ attribute name="eager" required="false" type="java.lang.Boolean" %>
<%
    String size = (String) jspContext.getAttribute("size");
    int width = switch (size == null ? "" : size) {
        case "sm" -> 160;
        case "md" -> 320;
        case "lg" -> 640;
        default -> throw new IllegalArgumentException("<ui:book-cover> size phải là sm, md hoặc lg, đang là \""
                + size + "\"");
    };
    Integer bookId = (Integer) jspContext.getAttribute("bookId");
    if (bookId == null || bookId <= 0) {
        throw new IllegalArgumentException("<ui:book-cover> bookId phải là số nguyên dương, đang là " + bookId);
    }
    String base = AppConfig.get().coversBaseUrl().replaceAll("/+$", "") + "/" + bookId;
    jspContext.setAttribute("coverWidth", width);
    jspContext.setAttribute("coverHeight", width * 3 / 2);
    jspContext.setAttribute("coverBase", base);
%>
<span class="tt-book-cover tt-book-cover--${size}"><img
     src="${fn:escapeXml(coverBase)}/cover-${coverWidth}.webp"
     srcset="${fn:escapeXml(coverBase)}/cover-160.webp 160w, ${fn:escapeXml(coverBase)}/cover-320.webp 320w, ${fn:escapeXml(coverBase)}/cover-640.webp 640w"
     sizes="${coverWidth}px"
     width="${coverWidth}" height="${coverHeight}"
     alt="${fn:escapeXml(name)}"
     loading="${eager ? 'eager' : 'lazy'}"
     decoding="async"></span>
