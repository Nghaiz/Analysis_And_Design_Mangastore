<%--
  Trang lỗi 500 (web.xml error-page cho mã 500 và mọi java.lang.Throwable không bắt; lane 6A, phase-06-integration.md §2). Tiếng Việt, khung <t:layout>, không CSS
  riêng, không in chi tiết lỗi hay stack trace. Đặt lại đúng mã 500 để cả lần mở thẳng đường dẫn này cũng giữ mã.
  session="false": trang lỗi không tạo session. Cố ý không thêm gì có thể hỏng ngoài khung trang đã có: không
  scriptlet đọc session, không gọi DAO, chỉ một nút về trang chủ chung. Hình minh hoạ tự vẽ (SVG nội tuyến, aria-hidden).
--%>
<%@ page contentType="text/html; charset=UTF-8" session="false" trimDirectiveWhitespaces="true" %>
<%@ taglib prefix="t" tagdir="/WEB-INF/tags" %>
<%@ taglib prefix="ui" tagdir="/WEB-INF/tags/ui" %>
<% response.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR); %>
<t:layout title="Tiệm đang gặp trục trặc">
  <div class="mx-auto max-w-4xl">
    <ui:paper-card heading="" taped="true">
      <div class="grid items-center gap-6 md:grid-cols-[1fr_auto]">
        <div>
          <h1 class="tt-sign m-0 mb-6 text-3xl">500 · Tiệm đang gặp trục trặc</h1>
          <p class="mb-6">Có lỗi xảy ra ở phía tiệm nên chưa làm được việc bạn vừa gửi. Bạn thử lại sau ít phút nhé.</p>
          <p class="m-0 flex flex-wrap gap-3"><a href="${pageContext.request.contextPath}/" class="tt-btn tt-btn--primary">Về trang chủ</a></p>
        </div>
        <svg class="order-first mx-auto h-auto w-40 text-ink md:order-none md:w-56" aria-hidden="true" viewBox="0 0 200 160" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14 150h172"/>
          <rect x="30" y="128" width="74" height="22" class="text-stamp-red" fill="currentColor" stroke="none" opacity="0.85"/>
          <rect x="30" y="128" width="74" height="22"/>
          <rect x="38" y="108" width="62" height="20" class="text-paper-deep" fill="currentColor" stroke="none"/>
          <rect x="38" y="108" width="62" height="20"/>
          <path d="m48 108 10-34 58 16-10 34z" class="text-tape" fill="currentColor" stroke="none"/>
          <path d="m48 108 10-34 58 16-10 34z"/>
          <path d="m128 150 6-30 26 5-6 30z" class="text-stamp-green" fill="currentColor" stroke="none" opacity="0.8"/>
          <path d="m128 150 6-30 26 5-6 30z"/>
          <path d="M150 30a14 14 0 0 0-18 18l-30 30 8 8 30-30a14 14 0 0 0 18-18l-9 9-8-8z" class="text-pen-blue"/>
          <path d="M74 52l-6-10M90 48l2-12M60 62l-12-4" class="text-stamp-amber" stroke-width="2.5"/>
        </svg>
      </div>
    </ui:paper-card>
  </div>
</t:layout>
