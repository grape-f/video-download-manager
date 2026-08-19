# Changelog

本项目遵循[语义化版本](https://semver.org/lang/zh-CN/)（Semantic Versioning）。

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
