#!/bin/sh
# Sinh header CSP của nginx mỗi lần container khởi động (entrypoint của ảnh nginx gốc chạy mọi file *.sh có
# quyền thực thi trong /docker-entrypoint.d/ trước khi chạy nginx; file này lỗi thì container dừng, không chạy
# nginx với CSP sai). Đầu ra: một dòng add_header vào $1 (mặc định /etc/nginx/snippets/csp.conf), được
# snippets/security-headers.conf include ở mọi location.
#
# Công tắc là đúng hai biến của service app (compose truyền cho cả nginx, không thêm biến mới):
#   APP_VITE_DEV=false (hoặc không đặt) → CSP phase 1, từng kí tự như contract.md §10.
#   APP_VITE_DEV=true                   → CSP dev: thêm đúng origin APP_VITE_DEV_ORIGIN của Vite dev server.
# Giá trị khác của APP_VITE_DEV, hay origin sai dạng khi bật dev, làm script dừng với lỗi (không lặng lẽ lùi về
# CSP nào). Kiểm trang thật: node scripts/check/csp-page-check.mjs --mode dev|build.
set -eu

ME=$(basename "$0")
OUT=${1:-/etc/nginx/snippets/csp.conf}

# CSP phase 1 (contract.md §10). Test scripts/check/csp-page-check.test.mjs so dòng này với hợp đồng.
CSP_BUILD="default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'"

fail() {
    echo "$ME: $1" >&2
    exit 1
}

# Origin http(s)://host[:port], không path, như AppConfig.viteDevOrigin(): bỏ một dấu / ở cuối.
dev_origin() {
    origin=${APP_VITE_DEV_ORIGIN:-}
    origin=${origin%/}
    case "$origin" in
        http://* | https://*) ;;
        *) fail "APP_VITE_DEV_ORIGIN phải có dạng http://host:port, đang là \"${APP_VITE_DEV_ORIGIN:-}\"" ;;
    esac
    hostport=${origin#*://}
    host=${hostport%%:*}
    case "$hostport" in
        *:*) port=${hostport#*:} ;;
        *) port=80 ;;
    esac
    case "$host" in
        '' | *[!A-Za-z0-9.-]*) fail "APP_VITE_DEV_ORIGIN có host sai: \"${APP_VITE_DEV_ORIGIN:-}\"" ;;
    esac
    case "$port" in
        '' | *[!0-9]* | ??????*) fail "APP_VITE_DEV_ORIGIN có cổng sai: \"${APP_VITE_DEV_ORIGIN:-}\"" ;;
    esac
    printf '%s' "$origin"
}

case "${APP_VITE_DEV:-false}" in
    false)
        mode=build
        csp=$CSP_BUILD
        ;;
    true)
        mode=dev
        origin=$(dev_origin)
        case "$origin" in
            https://*) socket="wss://${origin#https://}" ;;
            *) socket="ws://${origin#http://}" ;;
        esac
        # Vite dev cần, và chỉ cần (đối chiếu frontend/node_modules/vite/dist/client/client.mjs, plugin-react):
        #   script-src  origin: preamble React Refresh (module ngoài, AssetTags không in script inline),
        #               @vite/client, entry, module con.
        #   style-src   origin cho <link> CSS; 'unsafe-inline' vì Vite chèn CSS mà module import bằng thẻ <style>
        #               tạo từ JS (và lớp báo lỗi của Vite); nonce cần sửa vite.config.ts và JSP, ngoài phạm vi dev.
        #   img-src, font-src  origin: url() trong CSS trỏ về server.origin của Vite.
        #   connect-src origin + ws(s): HMR WebSocket của @vite/client.
        #   worker-src  blob: Vite dò server bằng SharedWorker tạo từ blob: khi mất kết nối HMR.
        csp="default-src 'self'; script-src 'self' $origin; style-src 'self' $origin 'unsafe-inline'; img-src 'self' data: $origin; font-src 'self' $origin; connect-src 'self' $origin $socket; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'"
        ;;
    *)
        fail "APP_VITE_DEV chỉ nhận true hoặc false, đang là \"$APP_VITE_DEV\""
        ;;
esac

printf 'add_header Content-Security-Policy "%s" always;\n' "$csp" > "$OUT"
echo "$ME: CSP chế độ $mode → $OUT"
