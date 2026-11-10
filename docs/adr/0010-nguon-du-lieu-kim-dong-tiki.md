# ADR-0010: Nguồn dữ liệu Kim Đồng + Tiki, nội dung crawl ngoài git (D11)

<!-- updated 261111 -->

- Trạng thái: Đã chấp nhận (11/11/2026, chủ dự án chấp nhận rủi ro bản quyền)
- Nguồn: brainstorm D11, §6; `plans/reports/researcher-261111-data-sources.md`

## Bối cảnh

Kho truyện phải là dữ liệu thật, 300–500 tập (D4) của các bộ quen thuộc (Doraemon, Conan, Dragon Ball, Shin, Thần đồng đất Việt, Nhóc Maruko…). Brief ưu tiên API trước HTML, đòi đọc `robots.txt` và điều khoản. Researcher thử khoảng 40 request mẫu ngày 11/11/2026: các danh mục mở quốc tế gần như không có bản ghi tiếng Việt cấp từng tập.

## Quyết định

| Nguồn | Vai trò |
|---|---|
| NXB Kim Đồng (cửa hàng Sapo): `sitemap.xml` + `/products/<alias>.json` | **Chính**: ISBN, tác giả, bộ, mô tả, ảnh lớn |
| Tiki `/api/v2/products` | **Dự phòng**: tập Kim Đồng không bán lẻ, và Thần đồng đất Việt (NXB Phan Thị) |
| Wikidata SPARQL | Bổ trợ cấp bộ (CC0) |

- Gộp trùng theo ISBN-13, rồi theo `bộ|tập|biến thể`; Kim Đồng thắng Tiki thắng Wikidata; bỏ combo, bộ, trọn bộ, set.
- Mô tả, ảnh và file SQL dữ liệu sinh ra nằm ở `data/` (bị ignore) và volume Docker. Repo chỉ giữ script và `pipeline/manifest.jsonl` (URL nguồn, ngày tải, nguồn thắng, mã băm ảnh).
- Chỉ dùng riêng trong dự án, không công khai nội dung. Luật lịch sự khi crawl: [`docs/data-pipeline.md`](../data-pipeline.md).

## Hệ quả

- CI không cần dữ liệu crawl: E2E dùng seed riêng `db/e2e` (D3).
- API của Tiki không có tài liệu, có thể đổi hoặc bị chặn: cache HTTP trên đĩa, pipeline báo lỗi rõ chứ không lặng lẽ bỏ qua.
- Bộ dài cũ nhiều khi chỉ bán dạng combo, có tập sẽ thiếu bìa: bước validate liệt kê, không ghép ảnh combo.

## Phương án đã loại

| Nguồn | Lí do loại |
|---|---|
| Fahasa | Điều khoản cấm bot nguyên văn; kết quả tìm render bằng JS, có reCAPTCHA |
| Open Library | Mọi truy vấn mẫu trượt; trang API yêu cầu không tải hàng loạt |
| Google Books | Không key thì quota bằng 0 (HTTP 429) |
