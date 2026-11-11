<%--
  Sổ mẫu giao diện (phase 5, lane 5A; trang công cụ /dev/, luôn mở). Mọi token, chất liệu giấy, component
  JSP (WEB-INF/tags/ui/) và mọi biến thể; chuỗi thử dấu ở cả bốn font; mục cuối đặt bản JSP cạnh bản React
  (island _demo của lane 5B, cùng dữ liệu mẫu). Không <style>, không style= (CSP style-src 'self').
  Chữ nghiệp vụ lấy từ hằng (RentalBill.STATUS_*, Messages.*), không gõ lại.
--%>
<%@ page contentType="text/html; charset=UTF-8" session="false" trimDirectiveWhitespaces="true" %>
<%@ page import="vn.tiemtruyen.model.RentalBill, vn.tiemtruyen.util.Messages" %>
<%@ taglib prefix="t" tagdir="/WEB-INF/tags" %>
<%@ taglib prefix="ui" tagdir="/WEB-INF/tags/ui" %>
<t:layout title="Sổ mẫu giao diện">
  <header class="mb-12 flex flex-wrap items-center gap-6 border-b-2 border-ink-soft pb-6">
    <img src="${pageContext.request.contextPath}/static/img/logo-tiem.svg" alt="" width="72" height="72">
    <div>
      <p class="tt-sign m-0 text-3xl">Tiệm thuê truyện tuổi thơ</p>
      <h1 class="m-0 font-type text-xl font-normal tracking-wide">Sổ mẫu giao diện</h1>
    </div>
  </header>

  <nav aria-label="Mục lục" class="mb-12">
    <ul class="tt-typed flex flex-wrap gap-x-6 gap-y-2 p-0">
      <li class="list-none"><a href="#mau">Màu</a></li>
      <li class="list-none"><a href="#font">Font</a></li>
      <li class="list-none"><a href="#khoang-cach">Khoảng cách, bo góc, bóng</a></li>
      <li class="list-none"><a href="#chat-lieu">Chất liệu giấy</a></li>
      <li class="list-none"><a href="#component">Component JSP</a></li>
      <li class="list-none"><a href="#hai-ban">Bản JSP và bản React</a></li>
      <li class="list-none"><a href="#in">In phiếu</a></li>
    </ul>
  </nav>

  <%-- ===================== Màu ===================== --%>
  <section id="mau" class="mb-16" aria-labelledby="mau-h">
    <h2 id="mau-h">Màu</h2>
    <p class="text-ink-soft">Giá trị: <code>docs/design-tokens.md</code> §1, cài ở <code>frontend/src/styles/tokens.css</code>. Mọi màu chữ đạt AA 4.5:1 trên ba nền giấy.</p>
    <ul class="grid grid-cols-2 gap-4 p-0 sm:grid-cols-3 lg:grid-cols-4">
      <li class="list-none"><div class="h-16 border border-ink-soft bg-paper"></div><p class="tt-typed m-0 mt-1">--color-paper</p><p class="m-0 text-sm text-ink-soft">Nền giấy ố</p></li>
      <li class="list-none"><div class="h-16 border border-ink-soft bg-paper-deep"></div><p class="tt-typed m-0 mt-1">--color-paper-deep</p><p class="m-0 text-sm text-ink-soft">Mép giấy, thẻ</p></li>
      <li class="list-none"><div class="h-16 border border-ink-soft bg-tape"></div><p class="tt-typed m-0 mt-1">--color-tape</p><p class="m-0 text-sm text-ink-soft">Băng dính giấy</p></li>
      <li class="list-none"><div class="h-16 border border-ink-soft bg-ink"></div><p class="tt-typed m-0 mt-1">--color-ink</p><p class="m-0 text-sm text-ink-soft">Chữ chính</p></li>
      <li class="list-none"><div class="h-16 border border-ink-soft bg-ink-soft"></div><p class="tt-typed m-0 mt-1">--color-ink-soft</p><p class="m-0 text-sm text-ink-soft">Chữ phụ</p></li>
      <li class="list-none"><div class="h-16 border border-ink-soft bg-pen-blue"></div><p class="tt-typed m-0 mt-1">--color-pen-blue</p><p class="m-0 text-sm text-ink-soft">Nét bút bi, link</p></li>
      <li class="list-none"><div class="h-16 border border-ink-soft bg-stamp-red"></div><p class="tt-typed m-0 mt-1">--color-stamp-red</p><p class="m-0 text-sm text-ink-soft">Dấu ĐÃ HUỶ, lỗi</p></li>
      <li class="list-none"><div class="h-16 border border-ink-soft bg-stamp-green"></div><p class="tt-typed m-0 mt-1">--color-stamp-green</p><p class="m-0 text-sm text-ink-soft">Dấu ĐANG CHO THUÊ</p></li>
      <li class="list-none"><div class="h-16 border border-ink-soft bg-stamp-amber"></div><p class="tt-typed m-0 mt-1">--color-stamp-amber</p><p class="m-0 text-sm text-ink-soft">Dấu CHỜ NHẬN</p></li>
      <li class="list-none"><div class="h-16 border border-ink-soft bg-wood"></div><p class="tt-typed m-0 mt-1">--color-wood</p><p class="m-0 text-sm text-ink-soft">Kệ, quầy</p></li>
      <li class="list-none"><div class="h-16 border border-ink-soft bg-lamp"></div><p class="tt-typed m-0 mt-1">--color-lamp</p><p class="m-0 text-sm text-ink-soft">Ánh đèn, chỉ trang trí</p></li>
    </ul>

    <h3 class="mt-8">Chữ trên ba nền</h3>
    <div class="grid gap-4 md:grid-cols-3">
      <div class="bg-paper border border-ink-soft p-4">
        <p class="tt-typed m-0 mb-2 text-sm">nền paper</p>
        <p class="m-0 text-ink">Chữ chính · Nguyễn Thu Hà</p>
        <p class="m-0 text-ink-soft">Chữ phụ · Ngày mượn 25/09/2026</p>
        <p class="m-0 text-pen-blue">Bút bi · Ghi chú của quầy</p>
        <p class="m-0 text-stamp-red">Đỏ dấu · ĐÃ HUỶ</p>
        <p class="m-0 text-stamp-green">Xanh dấu · ĐANG CHO THUÊ</p>
        <p class="m-0 text-stamp-amber">Hổ phách · CHỜ NHẬN</p>
      </div>
      <div class="bg-paper-deep border border-ink-soft p-4">
        <p class="tt-typed m-0 mb-2 text-sm">nền paper-deep</p>
        <p class="m-0 text-ink">Chữ chính · Nguyễn Thu Hà</p>
        <p class="m-0 text-ink-soft">Chữ phụ · Ngày mượn 25/09/2026</p>
        <p class="m-0 text-pen-blue">Bút bi · Ghi chú của quầy</p>
        <p class="m-0 text-stamp-red">Đỏ dấu · ĐÃ HUỶ</p>
        <p class="m-0 text-stamp-green">Xanh dấu · ĐANG CHO THUÊ</p>
        <p class="m-0 text-stamp-amber">Hổ phách · CHỜ NHẬN</p>
      </div>
      <div class="bg-tape border border-ink-soft p-4">
        <p class="tt-typed m-0 mb-2 text-sm">nền tape</p>
        <p class="m-0 text-ink">Chữ chính · Nguyễn Thu Hà</p>
        <p class="m-0 text-ink-soft">Chữ phụ · Ngày mượn 25/09/2026</p>
        <p class="m-0 text-pen-blue">Bút bi · Ghi chú của quầy</p>
        <p class="m-0 text-stamp-red">Đỏ dấu · ĐÃ HUỶ</p>
        <p class="m-0 text-stamp-green">Xanh dấu · ĐANG CHO THUÊ</p>
        <p class="m-0 text-stamp-amber">Hổ phách · CHỜ NHẬN</p>
      </div>
    </div>
    <div class="mt-4 bg-wood p-4">
      <p class="m-0 text-paper">Chữ paper trên gỗ · Kệ truyện</p>
      <p class="m-0 text-lamp">Ánh đèn trên gỗ · chỉ trang trí</p>
    </div>
  </section>

  <%-- ===================== Font ===================== --%>
  <section id="font" class="mb-16" aria-labelledby="font-h">
    <h2 id="font-h">Font</h2>
    <p class="text-ink-soft">Tự host, chỉ subset latin và vietnamese. Be Vietnam Pro và Xanh Mono được preload; Patrick Hand và Fraunces nạp lười.</p>
    <dl class="grid gap-4">
      <div class="border-b border-ink-soft pb-3">
        <dt class="tt-typed text-sm text-ink-soft">--font-body · Be Vietnam Pro 400</dt>
        <dd class="m-0 font-body text-2xl font-normal">Đã huỷ · Ố vàng · Nguyễn Thu Hà · Thám tử lừng danh Conan</dd>
      </div>
      <div class="border-b border-ink-soft pb-3">
        <dt class="tt-typed text-sm text-ink-soft">--font-body · Be Vietnam Pro 500</dt>
        <dd class="m-0 font-body text-2xl font-medium">Đã huỷ · Ố vàng · Nguyễn Thu Hà · Thám tử lừng danh Conan</dd>
      </div>
      <div class="border-b border-ink-soft pb-3">
        <dt class="tt-typed text-sm text-ink-soft">--font-body · Be Vietnam Pro 600</dt>
        <dd class="m-0 font-body text-2xl font-semibold">Đã huỷ · Ố vàng · Nguyễn Thu Hà · Thám tử lừng danh Conan</dd>
      </div>
      <div class="border-b border-ink-soft pb-3">
        <dt class="tt-typed text-sm text-ink-soft">--font-type · Xanh Mono 400</dt>
        <dd class="m-0 font-type text-2xl">Đã huỷ · Ố vàng · Nguyễn Thu Hà · Thám tử lừng danh Conan</dd>
      </div>
      <div class="border-b border-ink-soft pb-3">
        <dt class="tt-typed text-sm text-ink-soft">--font-pen · Patrick Hand 400</dt>
        <dd class="m-0 font-pen text-2xl">Đã huỷ · Ố vàng · Nguyễn Thu Hà · Thám tử lừng danh Conan</dd>
      </div>
      <div class="border-b border-ink-soft pb-3">
        <dt class="tt-typed text-sm text-ink-soft">--font-sign · Fraunces (trục SOFT)</dt>
        <dd class="tt-sign m-0 text-2xl">Đã huỷ · Ố vàng · Nguyễn Thu Hà · Thám tử lừng danh Conan</dd>
      </div>
    </dl>
    <p class="mt-4 text-sm">Cỡ nhỏ nhất (dấu chồng không bị cắt): <span class="font-type">ĐÃ HUỶ · Ẩ Ặ Ồ Ỡ Ữ</span> · <span class="font-pen">ẫ ặ ố ỡ ự</span> · <span class="tt-sign">Ổ Ẵ Ự</span></p>
  </section>

  <%-- ===================== Khoảng cách, bo góc, bóng ===================== --%>
  <section id="khoang-cach" class="mb-16" aria-labelledby="khoang-cach-h">
    <h2 id="khoang-cach-h">Khoảng cách, bo góc, bóng</h2>
    <h3>Khoảng cách bậc 4px</h3>
    <ul class="grid gap-2 p-0">
      <li class="flex list-none items-center gap-4"><span class="tt-typed w-32 text-sm">--s-1 · 4px</span><span class="block h-3 w-1 bg-pen-blue"></span></li>
      <li class="flex list-none items-center gap-4"><span class="tt-typed w-32 text-sm">--s-2 · 8px</span><span class="block h-3 w-2 bg-pen-blue"></span></li>
      <li class="flex list-none items-center gap-4"><span class="tt-typed w-32 text-sm">--s-3 · 12px</span><span class="block h-3 w-3 bg-pen-blue"></span></li>
      <li class="flex list-none items-center gap-4"><span class="tt-typed w-32 text-sm">--s-4 · 16px</span><span class="block h-3 w-4 bg-pen-blue"></span></li>
      <li class="flex list-none items-center gap-4"><span class="tt-typed w-32 text-sm">--s-5 · 24px</span><span class="block h-3 w-6 bg-pen-blue"></span></li>
      <li class="flex list-none items-center gap-4"><span class="tt-typed w-32 text-sm">--s-6 · 32px</span><span class="block h-3 w-8 bg-pen-blue"></span></li>
      <li class="flex list-none items-center gap-4"><span class="tt-typed w-32 text-sm">--s-7 · 48px</span><span class="block h-3 w-12 bg-pen-blue"></span></li>
      <li class="flex list-none items-center gap-4"><span class="tt-typed w-32 text-sm">--s-8 · 64px</span><span class="block h-3 w-16 bg-pen-blue"></span></li>
    </ul>
    <h3 class="mt-8">Bo góc và bóng</h3>
    <div class="flex flex-wrap gap-8">
      <div class="w-40 rounded-none border border-ink-soft bg-paper p-4 text-sm"><span class="tt-typed">rounded-none</span><br>Tờ phiếu, thẻ, bảng</div>
      <div class="w-40 rounded-paper border border-ink-soft bg-paper p-4 text-sm"><span class="tt-typed">rounded-paper</span><br>Nút, ô nhập, tem (2px)</div>
      <div class="w-40 bg-paper p-4 text-sm shadow-paper"><span class="tt-typed">shadow-paper</span><br>Giấy đặt trên bàn</div>
      <div class="w-40 bg-paper p-4 text-sm shadow-lift"><span class="tt-typed">shadow-lift</span><br>Đang được nhấc lên</div>
    </div>
  </section>

  <%-- ===================== Chất liệu giấy ===================== --%>
  <section id="chat-lieu" class="mb-16" aria-labelledby="chat-lieu-h">
    <h2 id="chat-lieu-h">Chất liệu giấy</h2>
    <div class="grid gap-8 md:grid-cols-2">
      <div class="tt-paper border border-ink-soft p-6"><span class="tt-typed">.tt-paper</span> · nền giấy ố, hạt giấy và vệt ố</div>
      <div class="tt-worn bg-paper p-6"><span class="tt-typed">.tt-worn</span> · mép giấy sờn, sẫm dần ra mép</div>
      <div class="p-6"><span class="tt-tape">.tt-tape · băng dính giấy</span></div>
      <div class="grid gap-2 p-6">
        <p class="tt-typed m-0">.tt-typed · Số phiếu PM0125 · Mã vạch DT001-03</p>
        <p class="tt-pen m-0">.tt-pen · Rách bìa, Vết bẩn, viết vẽ</p>
        <p class="tt-sign m-0 text-2xl">.tt-sign · Tiệm thuê truyện tuổi thơ</p>
      </div>
    </div>
  </section>

  <%-- ===================== Component JSP, mọi biến thể ===================== --%>
  <section id="component" class="mb-16" aria-labelledby="component-h">
    <h2 id="component-h">Component JSP</h2>

    <h3 class="mt-8"><code>&lt;ui:ticket&gt;</code> phiếu xé từ sổ</h3>
    <div class="grid gap-8 lg:grid-cols-2">
      <ui:ticket title="Phiếu mượn" code="PM0125">
        <p class="mb-4">Khách: Nguyễn Thu Hà · Ngày mượn 25/09/2026 · Hẹn trả 02/10/2026</p>
        <ui:stamp status="${RentalBill.STATUS_PENDING}"/>
      </ui:ticket>
      <ui:ticket title="Phiếu nháp">
        <p class="m-0 text-ink-soft">Phiếu chưa có số (thuộc tính <code>code</code> để trống).</p>
      </ui:ticket>
    </div>

    <h3 class="mt-8"><code>&lt;ui:stamp&gt;</code> dấu trạng thái</h3>
    <div class="flex flex-wrap items-center gap-8 bg-paper p-4">
      <ui:stamp status="${RentalBill.STATUS_PENDING}"/>
      <ui:stamp status="${RentalBill.STATUS_RENTING}"/>
      <ui:stamp status="${RentalBill.STATUS_CANCELLED}"/>
    </div>
    <div class="mt-4 flex flex-wrap items-center gap-8 bg-paper-deep p-4">
      <ui:stamp status="${RentalBill.STATUS_PENDING}"/>
      <ui:stamp status="${RentalBill.STATUS_RENTING}"/>
      <ui:stamp status="${RentalBill.STATUS_CANCELLED}"/>
    </div>

    <h3 class="mt-8"><code>&lt;ui:condition-tag&gt;</code> tem tình trạng</h3>
    <div class="flex flex-wrap items-center gap-6">
      <ui:condition-tag text=""/>
      <ui:condition-tag text="Không có lỗi"/>
      <ui:condition-tag text="Ố vàng"/>
      <ui:condition-tag text="Rách bìa, Vết bẩn, viết vẽ"/>
    </div>

    <h3 class="mt-8"><code>&lt;ui:paper-card&gt;</code> thẻ giấy</h3>
    <div class="grid gap-8 md:grid-cols-3">
      <ui:paper-card heading="Truyện đã chọn" taped="true">
        <p class="m-0">Có băng dính góc trên (<code>taped="true"</code>).</p>
      </ui:paper-card>
      <ui:paper-card heading="Thông tin khách hàng">
        <p class="m-0">Không có băng dính.</p>
      </ui:paper-card>
      <ui:paper-card>
        <p class="m-0">Không có tiêu đề (<code>heading</code> để trống).</p>
      </ui:paper-card>
    </div>

    <h3 class="mt-8"><code>&lt;ui:ledger-table&gt;</code> bảng sổ</h3>
    <ui:ledger-table caption="Danh sách truyện thuê">
      <thead>
        <tr><th scope="col">Mã</th><th scope="col">Tên đầu truyện</th><th scope="col">Mã vạch</th><th scope="col">Giá thuê/ngày</th><th scope="col">Tình trạng khi giao</th></tr>
      </thead>
      <tbody>
        <tr><td>DT001</td><td>Thám tử lừng danh Conan - Tập 1</td><td class="font-type">DT001-03</td><td>3.000đ</td><td><ui:condition-tag text="Không có lỗi"/></td></tr>
        <tr><td>DT002</td><td>Doraemon - Tập 5</td><td class="font-type">DT002-01</td><td>2.000đ</td><td><ui:condition-tag text="Rách bìa, Vết bẩn, viết vẽ"/></td></tr>
        <tr><td>DT003</td><td>Thần đồng đất Việt - Tập 12</td><td class="font-type">DT003-02</td><td>2.500đ</td><td><ui:condition-tag text=""/></td></tr>
      </tbody>
    </ui:ledger-table>

    <h3 class="mt-8"><code>&lt;ui:book-cover&gt;</code> bìa truyện</h3>
    <p class="text-ink-soft">Ảnh thật lấy từ <code>/covers/1/cover-{w}.webp</code>; thiếu ảnh thì nginx trả bìa giấy vẽ sẵn.</p>
    <div class="flex flex-wrap items-start gap-8">
      <figure class="m-0"><ui:book-cover bookId="1" name="Thám tử lừng danh Conan - Tập 1" size="sm" eager="true"/><figcaption class="tt-typed mt-2 text-sm">size="sm" · 160 · eager</figcaption></figure>
      <figure class="m-0"><ui:book-cover bookId="1" name="Thám tử lừng danh Conan - Tập 1" size="md"/><figcaption class="tt-typed mt-2 text-sm">size="md" · 320</figcaption></figure>
      <figure class="m-0 w-full"><ui:book-cover bookId="1" name="Thám tử lừng danh Conan - Tập 1" size="lg"/><figcaption class="tt-typed mt-2 text-sm">size="lg" · 640</figcaption></figure>
    </div>

    <h3 class="mt-8"><code>&lt;ui:message-box&gt;</code> hộp thông báo</h3>
    <div class="grid gap-4">
      <ui:message-box kind="success" text="${Messages.REGISTER_SUCCESS}"/>
      <ui:message-box kind="error" text="${Messages.LOGIN_FAILED}"/>
      <ui:message-box kind="info" text="${Messages.BOOK_NOT_FOUND}"/>
    </div>
  </section>

  <%-- ===================== Bản JSP cạnh bản React ===================== --%>
  <section id="hai-ban" class="mb-16" aria-labelledby="hai-ban-h">
    <h2 id="hai-ban-h">Bản JSP và bản React</h2>
    <p class="text-ink-soft">Cùng dữ liệu mẫu (hợp đồng giao diện §3a, SSOT <code>frontend/src/islands/_demo/sample.ts</code>), cùng cây thẻ và lớp <code>tt-*</code>. Hai cột phải trông giống hệt nhau; khối "Điều khiển (shadcn theo chủ đề)" chỉ có ở bản React.</p>
    <div class="grid gap-8 lg:grid-cols-2">
      <div>
        <h3 class="font-type text-base font-normal">Bản JSP</h3>
        <div class="grid gap-6">
          <ui:ticket title="Phiếu mượn" code="PM0125">
            <p>Khách: Nguyễn Thu Hà · Ngày mượn 25/09/2026 · Hẹn trả 02/10/2026</p>
          </ui:ticket>

          <ui:paper-card heading="Truyện đã chọn" taped="true">
            <p class="flex flex-wrap gap-4">
              <ui:stamp status="${RentalBill.STATUS_PENDING}"/>
              <ui:stamp status="${RentalBill.STATUS_RENTING}"/>
              <ui:stamp status="${RentalBill.STATUS_CANCELLED}"/>
            </p>
            <p class="flex flex-wrap gap-4">
              <ui:condition-tag/>
              <ui:condition-tag text="Không có lỗi"/>
              <ui:condition-tag text="Rách bìa, Vết bẩn, viết vẽ"/>
            </p>
          </ui:paper-card>

          <ui:paper-card>
            <ui:ledger-table caption="Danh sách truyện thuê">
              <thead>
                <tr><th scope="col">Mã</th><th scope="col">Tên đầu truyện</th><th scope="col">Giá thuê</th></tr>
              </thead>
              <tbody>
                <tr><td>DT001</td><td>Thám tử lừng danh Conan - Tập 1</td><td>3.000đ</td></tr>
              </tbody>
            </ui:ledger-table>
          </ui:paper-card>

          <div class="flex flex-wrap items-end gap-4">
            <ui:book-cover bookId="1" name="Thám tử lừng danh Conan - Tập 1" size="sm" eager="true"/>
            <ui:book-cover bookId="1" name="Thám tử lừng danh Conan - Tập 1" size="md"/>
            <ui:book-cover bookId="1" name="Thám tử lừng danh Conan - Tập 1" size="lg"/>
          </div>

          <div class="grid gap-2">
            <ui:message-box kind="success" text="${Messages.REGISTER_SUCCESS}"/>
            <ui:message-box kind="error" text="${Messages.LOGIN_FAILED}"/>
            <ui:message-box kind="info" text="${Messages.BOOK_NOT_FOUND}"/>
          </div>

          <ul class="grid gap-2">
            <li class="font-body">Be Vietnam Pro: Đã huỷ · Ố vàng · Nguyễn Thu Hà · Thám tử lừng danh Conan</li>
            <li class="font-type">Xanh Mono: Đã huỷ · Ố vàng · Nguyễn Thu Hà · Thám tử lừng danh Conan</li>
            <li class="font-pen">Patrick Hand: Đã huỷ · Ố vàng · Nguyễn Thu Hà · Thám tử lừng danh Conan</li>
            <li class="font-sign">Fraunces: Đã huỷ · Ố vàng · Nguyễn Thu Hà · Thám tử lừng danh Conan</li>
          </ul>
        </div>
      </div>
      <div>
        <h3 class="font-type text-base font-normal">Bản React</h3>
        <div data-island="_demo">
          <p class="text-ink-soft">Island <code>_demo</code> chưa chạy (cần JavaScript).</p>
        </div>
      </div>
    </div>
  </section>

  <%-- ===================== In ===================== --%>
  <section id="in" class="mb-16" aria-labelledby="in-h">
    <h2 id="in-h">In phiếu</h2>
    <p>Mở hộp thoại in (Ctrl+P) để xem bản in khổ A5: chỉ các tờ <code>.tt-ticket</code> được in, mỗi tờ một trang; mọi phần khác bị ẩn.</p>
  </section>
</t:layout>
