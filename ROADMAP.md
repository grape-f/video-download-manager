# 版本规划（Roadmap）

## 版本策略

- 采用语义化版本（SemVer）：`主版本.次版本.修订号`
  - 主版本（major）：不兼容的重大变更
  - 次版本（minor）：向后兼容的新功能
  - 修订号（patch）：向后兼容的缺陷修复
- 分支策略：`main` 为稳定分支；功能开发使用 `feature/*` 分支，缺陷修复使用 `fix/*` 分支
- 每次发布打 tag（如 `v1.0.0`），并同步更新 `CHANGELOG.md`
- 提交信息采用 Conventional Commits：`feat:` / `fix:` / `docs:` / `chore:` / `refactor:` 等

## 已发布

### v1.2.1（当前稳定版）

修复下载进度不更新的问题，详见 [CHANGELOG.md](./CHANGELOG.md)。

### v1.2.0

2K 目标清晰度与放大、yt-dlp 登录态支持（cookies.txt / 浏览器自动探测 / Edge 扩展同步）、YouTube JavaScript 运行时与 EJS 修复，详见 [CHANGELOG.md](./CHANGELOG.md)。

### v1.1.0

功能扩展：图片直链下载、X（Twitter）与 Bilibili 原生解析（无需登录），详见 [CHANGELOG.md](./CHANGELOG.md)。

### v1.0.0

核心视频下载管理器，详见 [CHANGELOG.md](./CHANGELOG.md)。

## 规划中

### v1.3.0 —— 更多平台与登录态支持

- 更多平台支持（如 Patreon 公开帖子、Instagram 登录态）
- 任务级 cookies 管理与多账号切换
- 更细粒度的错误提示与重试策略
- 可选的 GitHub Actions 远程下载通道

### v2.0.0 —— 架构升级

- 任务队列迁移到独立消息队列（如 BullMQ + Redis）
- 多用户与鉴权
- 前端框架与状态管理升级
- 插件化的平台扩展机制

## 维护原则

- 安全与合规优先：不破解 DRM、不绕过付费墙或访问控制
- 依赖（yt-dlp / ffmpeg / npm 包）定期更新
- 每个版本发布前执行类型检查、生产构建与端到端测试
