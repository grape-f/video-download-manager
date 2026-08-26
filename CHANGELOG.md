# Changelog

本项目遵循[语义化版本](https://semver.org/lang/zh-CN/)（Semantic Versioning）。

## [1.1.0] - 2026-08-16

功能扩展版本。

### 新增

- **图片下载**：支持图片直链（jpg / png / webp / gif / bmp / avif / svg / ico）解析、预览与下载
- **X (Twitter) 原生解析（无需登录）**：通过 FixTweet / vxTwitter 镜像解析视频与图片推文
- **Bilibili 原生解析（无需登录）**：通过公开 API + WBI 签名直接取流，解决此前 412 风控导致的解析失败
- 下载任务支持直接 URL（`directUrl`）下载路径，数据库结构同步迁移

### 修复

- Bilibili 解析失败（HTTP 412 风控）——改为原生 API + WBI 签名
- X 视频推文「No video could be found」——改用镜像 API 解析
- X 图片推文无法解析——补充 FixTweet photos / vxTwitter 图片处理

## [1.0.0] - 2026-08-16

首个稳定版本：功能完整的「在线视频下载管理器」。

### 新增

- 支持平台：YouTube、Bilibili、Vimeo、X (Twitter)、TikTok、Instagram
- URL 解析与平台自动识别，视频预览卡片（标题 / 缩略图 / 时长 / 作者 / 分辨率 / 大小）
- 下载任务系统：Waiting / Parsing / Downloading / Paused / Completed / Failed / Cancelled 七种状态
- 多任务并发队列（默认 3，可配置 1/2/3/5/10），断点续传与服务重启恢复
- 任务控制：暂停 / 继续 / 取消 / 重试 / 删除，失败时返回明确中文原因
- 下载历史（搜索 / 平台筛选 / 状态筛选 / 时间与大小排序 / 删除）
- 数据统计 Dashboard（今日任务 / 完成 / 失败 / 累计数据量 / 平台分布 / 每日趋势 / 成功率）
- 设置页（默认质量 / 格式 / 并发 / 保存目录 / 限速 / 超时 / 重试 / 明暗主题）
- 文件管理（打开文件夹 / 删除文件与删除任务明确区分）
- 响应式布局（桌面 / 平板 / 手机）
- 离线模拟源（`sim://`）用于无网络测试
- Docker 部署（Dockerfile + docker-compose）

### 技术栈

- 前端：React 18 · TypeScript · Vite 5 · Tailwind CSS 4
- 后端：Node.js · TypeScript · Express 4 · SQLite（内置 `node:sqlite`）
- 下载引擎：yt-dlp + ffmpeg
- 实时通信：SSE
