<%--
  Trang công cụ của phase 5 (lane 5C): bản dựng thử trang chủ có gắn island ShelfScene, làm trước khi có HomeView thật.
  Từ phase 6 (lane 6B) HomeView.jsp là trang thật, có đủ props §11.4 (kể cả posterNarrowSrc); trang này forward sang
  đó để chỉ một nơi dựng props và cây <picture> của ảnh tĩnh (không chép lại mã đọc thể loại). Vẫn trả 200 ở
  /dev/HomePreviewView.jsp cho Accept phase 5 (scripts/accept/phase-05.mjs bước 6).
--%>
<%@ page contentType="text/html; charset=UTF-8" session="false" trimDirectiveWhitespaces="true" %>
<jsp:forward page="/HomeView.jsp"/>
