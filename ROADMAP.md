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

### v1.0.0（当前稳定版）

核心视频下载管理器，详见 [CHANGELOG.md](./CHANGELOG.md)。

## 规划中

### v1.1.0 —— 功能扩展

- 图片直链下载（jpg / png / webp / gif 等）
- 更多平台支持（如 Patreon 公开帖子）
- 更细粒度的错误提示与重试策略

### v1.2.0 —— 登录态支持

- 浏览器 Cookie 登录态 / cookies.txt 导入（仅用于用户本人已登录、有权访问的内容）
- 部分平台（Bilibili、TikTok 等）的风控适配

### v2.0.0 —— 架构升级

- 任务队列迁移到独立消息队列（如 BullMQ + Redis）
- 多用户与鉴权
- 前端框架与状态管理升级
- 插件化的平台扩展机制

## 维护原则

- 安全与合规优先：不破解 DRM、不绕过付费墙或访问控制
- 依赖（yt-dlp / ffmpeg / npm 包）定期更新
- 每个版本发布前执行类型检查、生产构建与端到端测试
