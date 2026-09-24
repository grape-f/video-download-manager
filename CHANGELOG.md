# Changelog

本项目遵循[语义化版本](https://semver.org/lang/zh-CN/)（Semantic Versioning）。

## [1.2.1] - 2026-09-24

修复下载进度显示。

### 修复

- 修复下载过程中进度一直为 0、直到完成才一次性跳到 100% 的问题：yt-dlp 的 `--progress-template download:...` 中 `download:` 是模板类型名，不会出现在输出里；现在模板里增加了 `VDMPROGRESS:` 输出标记，解析器按该标记实时读取下载字节、总大小、速度和剩余时间

### 发布

- Windows 便携包：内置 Node、yt-dlp、ffmpeg、前后端构建产物、Edge 扩展和 `start.bat`，可从 Releases 下载解压后直接运行

## [1.2.0] - 2026-09-24

功能扩展与登录态版本。

### 新增

- **2K / 1440p 目标清晰度**：视频与图片都可选择 1440p（2K）；源清晰度不足且检测到 ffmpeg 时，用 ffmpeg lanczos 放大到目标高度，缺少 ffmpeg 时保留源清晰度
- **yt-dlp 登录态支持**：支持 `YTDLP_COOKIES`（Netscape cookies.txt）、`YTDLP_COOKIES_FROM_BROWSER`（指定浏览器）和 `YTDLP_COOKIES_AUTO`（自动探测本机浏览器，默认开启）
- **Edge 扩展登录同步**：新增 `browser-extension/` MV3 扩展，通过本地配对 token 把 Edge 登录 cookies 同步到 `data/extension-cookies.txt`，避免 Chromium cookies 数据库文件锁；设置页新增「Cookie 同步」卡片
- **YouTube JavaScript 运行时与 EJS 支持**：解析/下载自动传 `--js-runtimes node:<当前 Node 路径>` 和 `--remote-components ejs:github`，新增 `YTDLP_JS_RUNTIME`、`YTDLP_REMOTE_COMPONENTS` 配置
- 设置页与任务列表统一显示 2K/4K 质量标签；新增登录凭据来源显示

### 修复

- YouTube「The page needs to be reloaded / Signature solving failed / n challenge solving failed」导致下载失败
- 读取 Edge/Chrome cookies 失败时的错误提示不明确；现在区分数据库被占用、解密失败、profile 不存在、权限不足
- 图片选择「原图」时被默认质量覆盖的问题
- Bilibili 2K 目标误拉 4K 源且不做下采样的问题
- e2e 测试选择器与 v1.1.0 文案不同步的问题，并新增 2K 用例

### 变更

- 版本号 1.1.0 → 1.2.0
- 下载产物仍保存在 `downloads/`，扩展同步的 cookies 与配对 token 保存在 `data/`，均不进入 git

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
