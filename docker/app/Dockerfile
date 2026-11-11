# syntax=docker/dockerfile:1
# Ảnh service app (contract.md §3, §10). Build từ gốc repo:
#   docker build -f docker/app/Dockerfile -t tiemtruyen-app:local .
# File loại trừ: docker/app/Dockerfile.dockerignore. Các tầng:
#   frontend     Node 24: npm ci && npm run build trong frontend/ → src/main/webapp/static (manifest Vite)
#   war          Maven 3.9.16 + Temurin 25: mvn package -DskipTests (Checkstyle vẫn chạy ở pha validate)
#   session-libs Maven: tải redisson-all + redisson-tomcat-11 (kiểm checksum Maven Central và SHA-256 ghim dưới đây)
#   runtime      Tomcat 11.0.27 / Java 25, chạy bằng user không phải root

ARG NODE_IMAGE=node:24.22.2-bookworm-slim
ARG MAVEN_IMAGE=maven:3.9.16-eclipse-temurin-25
ARG TOMCAT_IMAGE=tomcat:11.0.27-jre25-temurin-noble

FROM ${NODE_IMAGE} AS frontend
WORKDIR /src/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --no-audit --no-fund
COPY frontend/ ./
# vite.config.ts phát thể loại ra static/data/categories.json (SSOT ở pipeline/config, contract.md §6).
COPY pipeline/config/categories.json /src/pipeline/config/categories.json
RUN npm run build && test -f /src/src/main/webapp/static/.vite/manifest.json

FROM ${MAVEN_IMAGE} AS war
WORKDIR /src
COPY pom.xml ./
COPY config/ config/
COPY src/ src/
COPY --from=frontend /src/src/main/webapp/static/ src/main/webapp/static/
# -C: hỏng nếu checksum của artifact tải về không khớp checksum trên Maven Central.
RUN --mount=type=cache,target=/root/.m2 mvn -B -ntp -C package -DskipTests

FROM ${MAVEN_IMAGE} AS session-libs
ARG REDISSON_VERSION=4.8.0
ARG DEPENDENCY_PLUGIN=org.apache.maven.plugins:maven-dependency-plugin:3.11.0
# SHA-256 tính ngày 11/11/2026 từ jar trên Maven Central, sau khi khớp file .sha1 của Central.
# Đổi REDISSON_VERSION thì phải tính lại hai giá trị này.
ARG REDISSON_ALL_SHA256=dc747e5e0cd3df8193a179c3e1ed763286c17eb107139d3200ee8856849a8ca9
ARG REDISSON_TOMCAT_SHA256=859fb23262073a17e3c9ee0ef6fc64c750827e07bdca07e189cca7cb62391fa0
RUN --mount=type=cache,target=/root/.m2 \
    for a in redisson-all redisson-tomcat-11; do \
      mvn -B -ntp -C "${DEPENDENCY_PLUGIN}:copy" \
        -Dartifact="org.redisson:${a}:${REDISSON_VERSION}:jar" -DoutputDirectory=/out || exit 1; \
    done \
    && cd /out \
    && printf '%s  %s\n' \
      "${REDISSON_ALL_SHA256}" "redisson-all-${REDISSON_VERSION}.jar" \
      "${REDISSON_TOMCAT_SHA256}" "redisson-tomcat-11-${REDISSON_VERSION}.jar" \
      | sha256sum -c - \
    && ls -l /out

FROM ${TOMCAT_IMAGE} AS runtime
# curl cho healthcheck của compose (ảnh Tomcat gốc không có curl lẫn wget).
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /usr/local/tomcat
# Bỏ webapp mặc định của Tomcat (webapps.dist), chỉ còn ROOT.war của dự án.
RUN rm -rf webapps webapps.dist && mkdir webapps \
    && groupadd --system --gid 10001 tiemtruyen \
    && useradd --system --uid 10001 --gid tiemtruyen --no-create-home --shell /usr/sbin/nologin tiemtruyen
COPY --from=session-libs /out/*.jar lib/
COPY docker/app/context.xml docker/app/redisson.yaml conf/
COPY --from=war /src/target/ROOT.war webapps/ROOT.war
RUN mkdir -p conf/Catalina/localhost \
    && chown -R tiemtruyen:tiemtruyen logs temp work webapps conf/Catalina
USER tiemtruyen
EXPOSE 8080
CMD ["catalina.sh", "run"]
