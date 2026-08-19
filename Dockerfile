# ============================================================
# 在线视频下载管理器 - Dockerfile
# 多阶段构建：构建前端/后端产物，运行时安装 ffmpeg + yt-dlp
# ============================================================

# ---- 构建阶段 ----
FROM node:24-slim AS build
WORKDIR /app

COPY package.json package-lock.json ./
COPY server/package.json server/
COPY web/package.json web/
RUN npm ci --no-audit --no-fund

COPY server/ server/
COPY web/ web/
RUN npm run build

# ---- 运行阶段 ----
FROM node:24-slim
RUN apt-get update \
  && apt-get install -y --no-install-recommends ffmpeg ca-certificates curl \
  && curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp \
  && chmod a+rx /usr/local/bin/yt-dlp \
  && apt-get purge -y curl \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
ENV NODE_ENV=production \
  DATA_DIR=/app/data \
  DOWNLOAD_DIR=/app/downloads \
  HOST=0.0.0.0 \
  PORT=8787

COPY package.json package-lock.json ./
COPY server/package.json server/
COPY web/package.json web/
RUN npm ci --omit=dev --no-audit --no-fund

COPY --from=build /app/server/dist ./server/dist
COPY --from=build /app/web/dist ./web/dist

EXPOSE 8787
VOLUME ["/app/data", "/app/downloads"]

CMD ["node", "server/dist/index.js"]
