# 在线视频下载管理器

一个功能完整、界面现代的「在线视频下载管理器」Web 应用。粘贴公开视频链接，系统自动识别平台并创建下载任务，支持多任务并发、断点续传、任务持久化与崩溃恢复，并提供 Dashboard、下载历史与设置页面。

> 当前版本：**v1.2.1**（2026-09-24） · 历史版本见 [版本历史](#版本历史) 和 [CHANGELOG.md](./CHANGELOG.md)

> ⚠️ **合规声明**：本项目仅用于下载你有权访问、拥有下载权或已获得授权的公开视频资源。不破解 DRM、不绕过付费墙、登录限制或访问控制。当平台因官方限制无法直接下载时，系统会给出清晰的错误提示，而非尝试绕过限制。

---

## 功能特性

- **多平台支持**：YouTube、Bilibili、Vimeo、X (Twitter)、TikTok、Instagram
- **智能解析**：自动识别平台、校验 URL、获取标题/缩略图/时长/作者/可用分辨率/文件大小
- **2K 输出**：视频与图片都可选择 1440p（2K）目标；源清晰度不足且系统有 ffmpeg 时自动放大到目标高度
- **登录态支持**：支持 yt-dlp cookies（cookies.txt / 指定浏览器 / 自动探测本机浏览器），并提供 Edge 扩展登录同步，避免 Chromium cookies 数据库文件锁
- **YouTube 兼容性**：自动传入 JavaScript 运行时与 EJS 挑战求解组件，修复 `The page needs to be reloaded` / `Signature solving failed`
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

## 版本历史

| 版本 | 发布日期 | 重点 |
| --- | --- | --- |
| v1.2.1 | 2026-09-24 | 修复下载进度一直为 0 的问题 |
| v1.2.0 | 2026-09-24 | 2K 目标清晰度、cookies 登录态、Edge 扩展同步、YouTube JS/EJS 修复 |

README 只保留最近三个版本；更早版本的完整记录见 [CHANGELOG.md](./CHANGELOG.md)。

### v1.2.1（2026-09-24）

**修复**

- 修复下载过程中进度一直为 0、直到完成才一次性跳到 100% 的问题（yt-dlp 进度模板输出标记解析错误）

**发布**

- Windows 便携包：内置 Node、yt-dlp、ffmpeg、前后端构建产物、Edge 扩展和 `start.bat`，可从 Releases 下载解压后直接运行

### v1.2.0（2026-09-24）

**新增**

- **2K / 1440p 目标清晰度**：视频与图片都可选择 1440p（2K）；源清晰度不足且检测到 ffmpeg 时，用 ffmpeg lanczos 放大到目标高度，缺少 ffmpeg 时保留源清晰度
- **yt-dlp 登录态支持**：支持 `YTDLP_COOKIES`（Netscape cookies.txt）、`YTDLP_COOKIES_FROM_BROWSER`（指定浏览器）和 `YTDLP_COOKIES_AUTO`（自动探测本机浏览器，默认开启）
- **Edge 扩展登录同步**：新增 `browser-extension/` MV3 扩展，通过本地配对 token 把 Edge 登录 cookies 同步到 `data/extension-cookies.txt`，避免 Chromium cookies 数据库文件锁；设置页新增「Cookie 同步」卡片
- **YouTube JavaScript 运行时与 EJS 支持**：解析/下载自动传 `--js-runtimes node:<当前 Node 路径>` 和 `--remote-components ejs:github`，新增 `YTDLP_JS_RUNTIME`、`YTDLP_REMOTE_COMPONENTS` 配置
- 设置页与任务列表统一显示 2K/4K 质量标签；新增登录凭据来源显示

**修复**

- YouTube「The page needs to be reloaded / Signature solving failed / n challenge solving failed」导致下载失败
- 读取 Edge/Chrome cookies 失败时的错误提示不明确；现在区分数据库被占用、解密失败、profile 不存在、权限不足
- 图片选择「原图」时被默认质量覆盖的问题
- Bilibili 2K 目标误拉 4K 源且不做下采样的问题
- e2e 测试选择器与 v1.1.0 文案不同步的问题，并新增 2K 用例

**变更**

- 版本号 1.1.0 → 1.2.0
- 下载产物仍保存在 `downloads/`，扩展同步的 cookies 与配对 token 保存在 `data/`，均不进入 git

### v1.1.0（2026-08-16）

**新增**

- **图片直链下载**：支持 jpg / png / webp / gif / bmp / avif / svg / ico 解析、预览与下载
- **X (Twitter) 原生解析（无需登录）**：通过 FixTweet / vxTwitter 镜像解析视频与图片推文
- **Bilibili 原生解析（无需登录）**：通过公开 API + WBI 签名直接取流
- 下载任务支持直接 URL（`directUrl`），数据库结构同步迁移

**修复**

- Bilibili 解析失败（HTTP 412 风控）——改为原生 API + WBI 签名
- X 视频推文「No video could be found」——改用镜像 API 解析
- X 图片推文无法解析——补充 FixTweet photos / vxTwitter 图片处理

> 旧版本使用提示：不同版本请使用独立的 `DATA_DIR`、`DOWNLOAD_DIR` 和端口；旧版本不含 cookies、2K 和 YouTube JS/EJS 支持，可在新版 yt-dlp 的 `yt-dlp.conf` 中补 `--cookies`、`--js-runtimes`、`--remote-components`。

---

## 技术栈

| 层 | 技术 |
| --- | --- |
| 前端 | React 18 · TypeScript · Vite 5 · Tailwind CSS 4 · React Router · lucide-react |
| 后端 | Node.js (≥ 22.5) · TypeScript · Express 4 |
| 数据 | SQLite（Node 内置 `node:sqlite`，零原生依赖） |
| 下载引擎 | [yt-dlp](https://github.com/yt-dlp/yt-dlp) + ffmpeg（高清音视频合并） |
| 浏览器扩展 | Edge Manifest V3（登录 cookies 同步） |
| 实时通信 | Server-Sent Events (SSE) |
| 部署 | Docker / docker-compose |

---

## 前置要求

- Node.js **22.5+**（推荐 24.x，使用内置 `node:sqlite`）
- [yt-dlp](https://github.com/yt-dlp/yt-dlp)（需在 `PATH` 中，或通过 `YTDLP_PATH` 指定）
- [ffmpeg](https://ffmpeg.org/)（可选，但下载 1080P 及以上需要合并音视频；缺失时自动降级为免合并格式）

> Windows 快速安装：`winget install Gyan.FFmpeg`；macOS：`brew install ffmpeg yt-dlp`；Linux：`apt install ffmpeg` + `pip install yt-dlp`。

> YouTube 现在还需要 JavaScript 运行时和 EJS 挑战求解组件。项目会默认使用当前运行后端的 Node 可执行文件，并通过 `--remote-components ejs:github` 获取组件；无法访问 GitHub 时执行 `python -m pip install -U "yt-dlp[default]"`。

---

## 安装方法

```bash
git clone https://github.com/grape-f/video-download-manager.git
cd video-download-manager
npm ci
cp .env.example .env   # 按需修改环境变量
```

> 需要旧版本：`git checkout v1.1.0`（或 `v1.0.0`），然后重新执行 `npm ci`。不同版本请使用独立的 `PORT`、`DATA_DIR` 和 `DOWNLOAD_DIR`，避免任务数据互相覆盖。

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

## Windows 便携版（Releases 下载）

GitHub Releases 会提供 `video-download-manager-vX.Y.Z-win-x64.zip`，包内已经包含 Node、yt-dlp 和 ffmpeg，不需要自己安装运行环境：

1. 打开 [Releases](https://github.com/grape-f/video-download-manager/releases)，下载最新的 `*-win-x64.zip`。
2. 解压到任意目录（建议路径不要有中文或特殊符号；如果 Windows 提示 SmartScreen，选择“更多信息 → 仍要运行”）。
3. 双击 `start.bat`。
4. 浏览器会自动打开 http://127.0.0.1:8787；关闭黑色窗口即可停止服务。
5. 需要登录态时，按包内 `README-Windows.txt` 的说明加载 `browser-extension`，在设置页复制配对 token 后同步 Edge 登录状态。

便携包不包含任何 cookies 或 token；任务数据保存在解压目录的 `data/`，下载文件保存在 `downloads/`。

> 维护者：`.github/workflows/release.yml` 在推送 `v*` tag 时自动构建并上传 Windows 便携包；也可以在 Actions 页面手动触发 `workflow_dispatch` 只生成测试 artifact。

---

## Docker 部署

```bash
docker compose up -d
```

访问 **http://localhost:8787**。

镜像在构建阶段安装 ffmpeg（apt）并下载 yt-dlp 独立二进制；`data` 与 `downloads` 通过命名卷持久化。

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

**Q：选了 1440p（2K），但源视频/图片只有 1080p 或更低怎么办？**
系统会先下载平台能提供的最高可用源，再用 ffmpeg 放大到 1440p。缺少 ffmpeg 时保留源清晰度并正常完成任务。放大属于像素插值，尺寸会达到 2K，但不会凭空增加真实细节。

**Q：所有图片格式都能放大到 2K 吗？**
静态图片（jpg / png / webp / bmp）可以；gif 动图、svg 矢量图和 ico 会保留原图，前端只会提供「原图」选项。

**Q：解析 YouTube 视频时提示需要登录 / 确认不是机器人怎么办？**
这是 YouTube 的风控校验，不是本项目能绕过的限制。默认情况下后端会自动探测本机浏览器（Edge / Chrome / Firefox / Brave 等）并读取你已登录的 cookies，通常不需要任何配置，重启一次后端即可。

- 设置页“系统 → 登录凭据”会显示实际使用的来源，例如 `edge:Default（自动检测）`；
- 如果探测到的浏览器不是登录 YouTube 的那个，可以在 `.env` 设置 `YTDLP_COOKIES_FROM_BROWSER=firefox`（或 chrome / edge）手动指定；
- 也可以导出 Netscape 格式的 `cookies.txt`，设置 `YTDLP_COOKIES=./cookies.txt`；
- 建议同时升级 yt-dlp：`yt-dlp -U`，旧版本经常跟不上 YouTube 的改动；
- 不想让程序自动读取浏览器 cookies，可设置 `YTDLP_COOKIES_AUTO=false`。

cookies 只适用于你本人有权访问的内容，不能绕过会员、付费、私密或年龄限制；cookies 文件包含登录凭据，不要提交到 git。Windows 上读取浏览器 cookies 失败时，先关闭浏览器再重试，或改用 cookies.txt。当前 cookies 会传给 yt-dlp 解析/下载路径（YouTube、Vimeo、TikTok、Instagram 视频回退等）；X / Bilibili 的原生公开 API 解析不走 cookies。

**Q：YouTube 提示 The page needs to be reloaded / Signature solving failed 怎么办？**
这是 yt-dlp 缺少 YouTube 现在要求的 JavaScript 运行时或 EJS 挑战求解组件。项目默认会传 `--js-runtimes node:<当前 Node 路径>` 和 `--remote-components ejs:github`，只要本机 Node.js 可用（本项目本身就要求 Node 22.5+）即可。如果网络无法访问 GitHub，执行 `python -m pip install -U "yt-dlp[default]"`（或 `pip install yt-dlp-ejs`）后重启后端。

Docker 部署时容器里没有浏览器，请把 `cookies.txt` 挂载进容器并设置 `YTDLP_COOKIES=/app/cookies.txt`（`docker-compose.yml` 里留了注释示例）。

**Q：提示「读取浏览器 cookies 失败：请先关闭浏览器，或改用 cookies.txt」怎么办？**
这个错误说明后端读不到或解不开 Edge/Chrome 的 cookies 数据库，和“有没有登录 YouTube”是两回事。按顺序排查：

1. 完全退出浏览器：Edge 设置 → 系统和性能 → 关闭“启动增强”和“关闭 Microsoft Edge 后继续运行后台扩展”，然后在任务管理器结束所有 `msedge.exe`，再重启后端。
2. 确认后端和浏览器是同一个 Windows 用户：Docker、Windows 服务或受限沙箱里运行的后端读不到 `%LOCALAPPDATA%\Microsoft\Edge\User Data`。请在普通 PowerShell / CMD 里启动后端。
3. 如果登录在非默认 Edge 配置文件，设置 `YTDLP_COOKIES_FROM_BROWSER=edge:Profile 1`；配置文件名可在 `edge://version` 的“配置文件路径”或 `%LOCALAPPDATA%\Microsoft\Edge\User Data` 下查看。
4. 最稳的方案：导出 Netscape 格式的 `cookies.txt` 放到项目根目录，设置 `YTDLP_COOKIES=./cookies.txt`。现在 `YTDLP_COOKIES` 优先于 `YTDLP_COOKIES_FROM_BROWSER`，所以不用删除 `edge` 那行。
5. 升级 yt-dlp：`yt-dlp -U`。
6. 仍然失败时看后端控制台以 `[yt-dlp]` 开头的原始错误，它会区分“数据库被占用”“解密失败”还是“profile 不存在”。

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
