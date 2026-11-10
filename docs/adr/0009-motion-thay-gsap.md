# ADR-0009: Motion cho chuyển động 2D, không dùng GSAP

<!-- updated 261111 -->

- Trạng thái: Đã chấp nhận (11/11/2026)
- Nguồn: brainstorm §5; `plans/reports/researcher-261111-stack-versions.md` §3

## Bối cảnh

Brief để ngỏ "GSAP hoặc Motion" cho chuyển động. Giao diện cần chuyển động nhỏ (chồng truyện, ngăn kéo đồ cọc, tem tình trạng) và bắt buộc tôn trọng `prefers-reduced-motion`.

## Quyết định

- Chuyển động 2D trong island: **Motion** 14.12.0 (MIT), dùng `useReducedMotion`.
- Chuyển động 3D (kệ, quạt trần, rút quyển): `useFrame` của `@react-three/fiber` và hàm easing của drei; không thêm thư viện.

## Hệ quả

- Bớt một phụ thuộc; phiên bản ghim ở phase 5 ([ADR-0003](0003-jakarta-ee-11-tomcat-java-25.md), mục "chưa ghim").
- Ngân sách JS của phase 5 tính cả chunk Motion; Motion chỉ nạp trong chunk của island dùng nó.

## Phương án đã loại

| Phương án | Lí do loại |
|---|---|
| GSAP 3.15.1 | Miễn phí kể cả thương mại nhưng không phải giấy phép OSI, và thừa khi đã có Motion |
