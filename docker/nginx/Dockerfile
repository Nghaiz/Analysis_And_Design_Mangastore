# syntax=docker/dockerfile:1
# Ảnh nginx có brotli (contract.md §3, §10). Build module động theo cách của nginx/docker-nginx/modules
# (https://github.com/nginx/docker-nginx/tree/d99174e2cecfc7e5db51c05aff54c2c9dee45803/modules), rút gọn cho
# đúng một module brotli lấy từ pkg-oss. Mọi nguồn đều ghim: ảnh gốc theo digest, pkg-oss theo commit của
# tag 1.30.6-1 (tag này ghim ngx_brotli 1.0.0 kèm SHA512), xslscript theo commit + SHA512.
# Build: docker build docker/nginx   (BuildKit bắt buộc vì dùng RUN --mount)
# Ảnh gốc Debian trixie đã có curl (healthcheck compose dùng curl), không cần cài thêm.

ARG NGINX_IMAGE=nginx:1.30.6@sha256:42c68eab6f7e22611786a9fe1d1c019e275c50185bd54b8f75dc2b9184322703

FROM ${NGINX_IMAGE} AS builder

# Commit của tag pkg-oss 1.30.6-1 (git ls-remote --tags https://github.com/nginx/pkg-oss.git, 11/11/2026).
ARG PKG_OSS_COMMIT=3e9e3b9f85308c0bb7b1cf849c87d1f7df98dfc3
ARG XSLSCRIPT_COMMIT=9204424259c343ca08a18a78915f40f28025e093
ARG XSLSCRIPT_SHA512=f7194c5198daeab9b3b0c3aebf006922c7df1d345d454bd8474489ff2eb6b4bf8e2ffe442489a45d1aab80da6ecebe0097759a1e12cc26b5f0613d05b7c09ffa

SHELL ["/bin/bash", "-exo", "pipefail", "-c"]

RUN apt-get update \
    && apt-get install -y --no-install-suggests --no-install-recommends \
        patch make wget git devscripts debhelper dpkg-dev quilt lsb-release build-essential \
        libxml2-utils xsltproc equivs g++ libparse-recdescent-perl ca-certificates \
    && wget -qO /tmp/xslscript.pl \
        "https://raw.githubusercontent.com/nginx/xslscript/${XSLSCRIPT_COMMIT}/xslscript.pl" \
    && [ "$(openssl sha512 -r < /tmp/xslscript.pl)" = "${XSLSCRIPT_SHA512} *stdin" ] \
    && install -m 0755 /tmp/xslscript.pl /usr/local/bin/xslscript.pl \
    && git clone https://github.com/nginx/pkg-oss/ /pkg-oss \
    && git -C /pkg-oss checkout --detach "${PKG_OSS_COMMIT}" \
    && [ "$(git -C /pkg-oss rev-parse HEAD)" = "${PKG_OSS_COMMIT}" ] \
    && mkdir -p /tmp/packages \
    && cd /pkg-oss/debian \
    && make rules-module-brotli BASE_VERSION="${NGINX_VERSION}" NGINX_VERSION="${NGINX_VERSION}" \
    && mk-build-deps --install \
        --tool="apt-get -o Debug::pkgProblemResolver=yes --no-install-recommends --yes" \
        "debuild-module-brotli/nginx-${NGINX_VERSION}/debian/control" \
    && make module-brotli BASE_VERSION="${NGINX_VERSION}" NGINX_VERSION="${NGINX_VERSION}" \
    && find ../../ -maxdepth 1 -mindepth 1 -type f -name "nginx-module-brotli_*.deb" -exec mv -v {} /tmp/packages/ \; \
    && ls /tmp/packages/nginx-module-brotli_"${NGINX_VERSION}"*.deb

FROM ${NGINX_IMAGE}

SHELL ["/bin/bash", "-exo", "pipefail", "-c"]

RUN --mount=type=bind,from=builder,source=/tmp/packages,target=/tmp/packages \
    apt-get update \
    && apt-get install -y --no-install-suggests --no-install-recommends \
        /tmp/packages/nginx-module-brotli_"${NGINX_VERSION}"*.deb \
    && rm -rf /var/lib/apt/lists/* \
    && rm -f /etc/nginx/conf.d/default.conf \
    && test -f /usr/lib/nginx/modules/ngx_http_brotli_filter_module.so \
    && test -f /usr/lib/nginx/modules/ngx_http_brotli_static_module.so \
    && command -v curl

COPY nginx.conf /etc/nginx/nginx.conf
COPY conf.d/ /etc/nginx/conf.d/
COPY snippets/ /etc/nginx/snippets/
# Trang lỗi tĩnh tiếng Việt cho 400/413/414 do nginx tự trả (conf.d/app.conf, error_page).
COPY errors/ /usr/share/nginx/tiem-loi/
# Sinh snippets/csp.conf theo APP_VITE_DEV mỗi lần khởi động. --chmod vì checkout trên Windows không giữ bit thực
# thi, mà entrypoint gốc bỏ qua script không thực thi được.
COPY --chmod=0755 docker-entrypoint.d/30-tiem-csp.sh /docker-entrypoint.d/30-tiem-csp.sh
