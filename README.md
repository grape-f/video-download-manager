# 在线视频下载管理器

一个功能完整、界面现代的「在线视频下载管理器」Web 应用。粘贴公开视频链接，系统自动识别平台并创建下载任务，支持多任务并发、断点续传、任务持久化与崩溃恢复，并提供 Dashboard、下载历史与设置页面。

> ⚠️ **合规声明**：本项目仅用于下载你有权访问、拥有下载权或已获得授权的公开视频资源。不破解 DRM、不绕过付费墙、登录限制或访问控制。当平台因官方限制无法直接下载时，系统会给出清晰的错误提示，而非尝试绕过限制。

---

## 功能特性

- **多平台支持**：YouTube、Bilibili、Vimeo、X (Twitter)、TikTok、Instagram
- **智能解析**：自动识别平台、校验 URL、获取标题/缩略图/时长/作者/可用分辨率/文件大小
- **任务队列**：Waiting / Parsing / Downloading / Paused / Completed / Failed / Cancelled 七种状态
- **并发控制**：默认 3 个并发，可配置 1/2/3/5/10，超出自动进入等待队列
- **实时进度**：进度条、下载速度、剩余时间，基于 SSE 实时推送
- **任务控制**：暂停 / 继续 / 取消 / 重试 / 删除，失败时显示明确的中文原因
- **断点续传与恢复**：服务重启后自动恢复未完成任务（yt-dlp `--continue`）
- **文件管理**：自动保存到指定目录、显示文件路径、打开文件夹、删除文件（与删除任务明确区分）
- **下载历史**：搜索、按平台/状态筛选、按时间/大小排序、删除记录（不影响磁盘文件）
- **数据统计 Dashboard**：今日任务、完成/失败数、累计下载量、成功率、平台分布、每日下载趋势
- **设置**：默认质量/格式、并发数、保存目录、限速、超时、重试次数、明暗主题
- **响应式设计**：桌面 / 平板 / 手机自适应，无横向滚动
- **Docker 部署**：一条命令启动

---

## 技术栈

| 层 | 技术 |
| --- | --- |
| 前端 | React 18 · TypeScript · Vite 5 · Tailwind CSS 4 · React Router · lucide-react |
| 后端 | Node.js (≥ 22.5) · TypeScript · Express 4 |
| 数据 | SQLite（Node 内置 `node:sqlite`，零原生依赖） |
| 下载引擎 | [yt-dlp](https://github.com/yt-dlp/yt-dlp) + ffmpeg（高清音视频合并） |
| 实时通信 | Server-Sent Events (SSE) |
| 部署 | Docker / docker-compose |

---

## 前置要求

- Node.js **22.5+**（推荐 24.x，使用内置 `node:sqlite`）
- [yt-dlp](https://github.com/yt-dlp/yt-dlp)（需在 `PATH` 中，或通过 `YTDLP_PATH` 指定）
- [ffmpeg](https://ffmpeg.org/)（可选，但下载 1080P 及以上需要合并音视频；缺失时自动降级为免合并格式）

> Windows 快速安装：`winget install Gyan.FFmpeg`；macOS：`brew install ffmpeg yt-dlp`；Linux：`apt install ffmpeg` + `pip install yt-dlp`。

---

## 安装方法

```bash
git clone <your-repo-url>
cd shipin_xiazai
npm install
cp .env.example .env   # 按需修改环境变量
```

---

## 开发环境启动

```bash
# 同时启动前后端（推荐）
npm run dev

# 或分别启动
npm run dev:server   # 后端 http://localhost:8787
npm run dev:web      # 前端 http://localhost:5173
```

- 前端开发服务器：http://localhost:5173（已配置 `/api` 代理到后端 8787）
- 后端 API：http://localhost:8787/api
- 后端使用 `tsx watch`，代码改动后自动重启

---

## 生产环境启动

```bash
npm run build   # 构建前端（web/dist）与后端（server/dist）
npm start       # 启动后端，由后端托管前端静态文件
```

生产环境访问 **http://localhost:8787**（单端口，前后端同源）。

---

## 环境变量配置

复制 `.env.example` 为 `.env`，支持的变量如下：

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `PORT` | `8787` | 后端服务端口 |
| `HOST` | `0.0.0.0` | 监听地址 |
| `DATA_DIR` | `./data` | SQLite 数据库目录（相对项目根） |
| `DOWNLOAD_DIR` | `./downloads` | 视频下载目录 |
| `MAX_CONCURRENT` | `3` | 最大并发下载数 |
| `DEFAULT_QUALITY` | `best` | 默认质量（best/2160p/1440p/1080p/720p/480p/360p） |
| `DEFAULT_FORMAT` | `mp4` | 默认格式（mp4/webm/mkv） |
| `MAX_SPEED` | 空 | 最大下载速度（如 `8M`，空为不限速） |
| `REQUEST_TIMEOUT_MS` | `120000` | 请求超时（毫秒） |
| `AUTO_RETRIES` | `3` | 自动重试次数 |
| `YTDLP_PATH` | `yt-dlp` | yt-dlp 可执行文件路径 |
| `YTDLP_COOKIES_FROM_BROWSER` | 空 | 可选：从本地浏览器读取 cookies（如 `chrome` / `edge` / `firefox`） |
| `YTDLP_COOKIES` | 空 | 可选：Netscape 格式 cookies.txt 文件路径（相对项目根目录） |
| `FFMPEG_PATH` | `./bin/ffmpeg` | ffmpeg 所在目录（含 ffmpeg.exe） |
| `ENABLE_SIMULATE` | `true` | 是否启用模拟源（`sim://` 协议，用于离线测试） |

---

## Docker 部署

```bash
docker compose up -d
```

访问 **http://localhost:8787**。

镜像在构建阶段安装 ffmpeg（apt）并下载 yt-dlp 独立二进制；`data` 与 `downloads` 通过命名卷持久化。

---

## 项目目录结构

```
shipin_xiazai/
├── server/                 # 后端
│   └── src/
│       ├── index.ts        # 入口（Express 启动、错误兜底、优雅关闭）
│       ├── config.ts       # 环境变量与路径配置
│       ├── db.ts           # SQLite 初始化与仓储
│       ├── settings.ts     # 设置读写与持久化
│       ├── bus.ts          # 事件总线（SSE 广播）
│       ├── types.ts        # 共享类型
│       ├── services/
│       │   ├── extractor.ts   # yt-dlp 视频信息解析（含模拟源）
│       │   ├── downloader.ts  # yt-dlp 下载 + 进度解析（含模拟下载）
│       │   └── queue.ts       # 并发任务队列、恢复、持久化
│       ├── routes/         # parse/tasks/history/dashboard/settings/files/events
│       └── utils/          # platform/format/errors/asyncHandler
├── web/                    # 前端（React + Vite + Tailwind）
│   └── src/
│       ├── App.tsx / main.tsx
│       ├── lib/            # api/store/stats/format/platform
│       ├── components/     # ui 组件、charts、TaskItem、Layout
│       └── pages/          # Home/Tasks/History/Dashboard/Settings
├── e2e/                    # Playwright 端到端测试（使用系统 Edge）
├── Dockerfile
├── docker-compose.yml
└── .env.example
```

---

## API 文档

所有接口前缀 `/api`，返回 JSON；错误统一格式 `{ "error": { "code", "message" } }`。

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| POST | `/api/parse` | 解析视频 URL，返回平台与视频信息 |
| GET | `/api/tasks` | 任务列表 |
| GET | `/api/tasks/:id` | 任务详情 |
| POST | `/api/tasks` | 创建下载任务 |
| POST | `/api/tasks/:id/pause` | 暂停 |
| POST | `/api/tasks/:id/resume` | 继续 |
| POST | `/api/tasks/:id/cancel` | 取消 |
| POST | `/api/tasks/:id/retry` | 重试 |
| DELETE | `/api/tasks/:id?deleteFile=true` | 删除任务（可选删除文件） |
| GET | `/api/history?search=&platform=&status=&sort=` | 下载历史（筛选/排序） |
| DELETE | `/api/history/:id` | 删除历史记录（不删文件） |
| DELETE | `/api/history` | 批量删除历史记录（body: `{ ids }`） |
| GET | `/api/dashboard` | 统计概览 |
| GET | `/api/settings` | 获取设置 |
| PUT | `/api/settings` | 更新设置 |
| GET | `/api/system` | 系统状态（版本/数据库/磁盘/ffmpeg/yt-dlp） |
| POST | `/api/files/open` | 打开文件所在文件夹（body: `{ path }`） |
| GET | `/api/events` | SSE 实时事件流（task / taskRemoved / settings） |

### 创建任务示例

```bash
curl -X POST http://localhost:8787/api/tasks \
  -H 'Content-Type: application/json' \
  -d '{"url":"https://www.youtube.com/watch?v=xxxx","resolution":"1080p","format":"mp4"}'
```

---

## 离线测试（模拟源）

当 `ENABLE_SIMULATE=true` 时，可使用 `sim://` 协议创建模拟下载任务，无需网络即可验证完整流程（解析、进度、并发、暂停/继续/取消/重试、恢复、Dashboard 统计等）：

- `sim://` —— 默认 5MB / 8 秒
- `sim://20@30` —— 20MB / 30 秒（`sim://<MB>@<秒>`）

在首页底部点击「使用模拟源快速体验」即可一键体验。

---

## 常见问题

**Q：提示「缺少 ffmpeg，无法合并高清音视频」？**
安装 ffmpeg 并配置 `FFMPEG_PATH`，或保持默认（系统会自动降级为免合并格式，最高 720P）。

**Q：提示「该视频需要登录或受年龄限制，无法访问」？**
这是平台官方限制，本工具不绕过登录/年龄限制。请使用你有权访问的公开视频。

**Q：提示「当前平台不支持」？**
当前支持 YouTube、Bilibili、Vimeo、X、TikTok、Instagram。其余平台不在第一阶段支持范围。

**Q：服务重启后任务会怎样？**
`downloading`/`parsing` 任务自动恢复为 `waiting` 并重新进入队列（yt-dlp `--continue` 断点续传）；`paused` 保持暂停；`completed` 不重复下载。

**Q：删除历史记录会删除视频文件吗？**
不会。「删除任务」与「删除任务和文件」是两个明确区分的操作，历史记录删除只移除记录。

**Q：如何跑端到端测试？**
```bash
cd e2e && npm install && npm test
```
测试使用系统 Edge（`channel: msedge`），无需下载 Chromium。

---

## 许可证

本项目仅供学习与个人合法用途，请遵守你所在地区及目标平台的服务条款与版权法规。
