# Video Download Manager 登录同步扩展

这是一个本地 Edge 扩展（Manifest V3），用于把 Edge 的登录 cookies 同步给同机的视频下载管理器。

## 安装

1. 打开 `edge://extensions`。
2. 打开左下角「开发者模式」。
3. 点击「加载解压缩的扩展」，选择项目里的 `browser-extension` 目录。

## 使用

1. 启动视频下载管理器后端。
2. 打开设置页的「Cookie 同步」卡片，复制配对 token。
3. 点击扩展图标，填入本地服务地址（默认 `http://127.0.0.1:8787`）和配对 token，点击「保存」。
4. 在 Edge 登录 YouTube / Instagram / TikTok 后，点击「同步登录状态」。

同步成功后，下载管理器设置页会显示「Edge 扩展同步（N 条 cookies）」。之后解析和下载会优先使用这份 cookies。

## 隐私与安全

- 扩展只会读取以下域名的 cookies：`youtube.com`、`google.com`（仅登录相关 cookie）、`instagram.com`、`facebook.com`、`tiktok.com`。
- cookies 只会发送到 `127.0.0.1` / `localhost` 的本地服务，不会上传到第三方。
- 服务端接口只接受来自本机回环地址的请求，并要求配对 token。
- 配对 token 保存在本机 `data/extension-token.txt`，同步的 cookies 保存在 `data/extension-cookies.txt`，两者都不会提交到 git。
- 敏感内容：同步的 cookies 等价于登录凭据，请勿分享；可以在设置页一键清除同步的 cookies。
