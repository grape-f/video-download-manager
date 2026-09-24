export class AppError extends Error {
  code: string;
  status: number;

  constructor(code: string, message: string, status = 400) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.status = status;
  }
}

/**
 * 将 yt-dlp 的原始错误信息翻译为用户可读的中文提示，
 * 避免只显示 "Download Error" 这类无意义信息。
 */
export function friendlyYtDlpError(stderr: string): string {
  const s = (stderr || '').toLowerCase();
  if (!s.trim()) return '下载失败';
  if (
    s.includes('signature solving failed') ||
    s.includes('n challenge solving failed') ||
    s.includes('the page needs to be reloaded') ||
    s.includes('ejs')
  ) {
    return 'YouTube 需要 JavaScript 运行时与 EJS 挑战求解组件：请确认 Node.js 可用，并允许 yt-dlp 获取 ejs:github；如果无法访问 GitHub，请运行 python -m pip install -U "yt-dlp[default]" 后重试';
  }
  if (s.includes('unsupported url')) return '当前平台不支持';
  if (s.includes('unable to extract') || s.includes('not a valid url') || s.includes('is not a valid')) {
    return 'URL 无效或无法解析';
  }
  if (s.includes('video unavailable') || s.includes('private video') || s.includes('this video is private')) {
    return '视频不可访问（可能为私密或已删除）';
  }
  if (
    s.includes('sign in to confirm') ||
    s.includes('please sign in') ||
    s.includes('not a bot') ||
    s.includes('login required') ||
    s.includes('confirm your age') ||
    s.includes('age-restricted')
  ) {
    return '平台要求登录验证：已尝试自动读取浏览器 cookies；请确认浏览器已登录，或配置 YTDLP_COOKIES_FROM_BROWSER / YTDLP_COOKIES 后重试';
  }
  if (
    s.includes('members-only') ||
    s.includes('members only') ||
    s.includes('join this channel') ||
    s.includes('only available for members')
  ) {
    return '该内容需要会员权限，无法访问';
  }
  if (
    s.includes('cookies') &&
    (s.includes('does not exist') || s.includes('unable to open') || s.includes('could not find'))
  ) {
    return 'cookies 文件不存在或无法读取，请检查 YTDLP_COOKIES 配置';
  }
  if (
    s.includes('could not copy chrome cookie database')
  ) {
    return 'Edge/Chrome 正在运行，cookies 数据库被占用：请完全退出浏览器（含后台进程）后重试，或改用 cookies.txt';
  }
  if (s.includes('failed to decrypt') || s.includes('dpapi') || s.includes('app-bound')) {
    return 'Edge/Chrome cookies 解密失败（Windows 加密或 App-Bound Encryption）：请改用 cookies.txt';
  }
  if (s.includes('profile') && (s.includes('not found') || s.includes('does not exist'))) {
    return '指定的浏览器 profile 不存在：请检查 YTDLP_COOKIES_FROM_BROWSER=edge:<profile>';
  }
  if (s.includes('permission denied') && s.includes('cookie')) {
    return '没有权限读取浏览器 cookies：请确认后端与浏览器使用同一个 Windows 用户运行';
  }
  if (s.includes('cookie database')) {
    return '读取浏览器 cookies 失败：请先关闭浏览器，或改用 cookies.txt（YTDLP_COOKIES）';
  }
  if (s.includes('timed out') || s.includes('timeout') || s.includes('etimedout') || s.includes('getaddrinfo') || s.includes('connection reset') || s.includes('connection refused')) {
    return '网络连接中断或请求超时';
  }
  if (s.includes('no space left') || s.includes('enospc') || s.includes('disk full') || s.includes('insufficient disk')) {
    return '磁盘空间不足';
  }
  if (s.includes('permission denied') || s.includes('eacces') || s.includes('cannot create')) {
    return '文件写入失败（权限不足或路径无效）';
  }
  if (s.includes('http error 403') || s.includes('http error 429')) {
    return '平台拒绝了访问请求（可能被限流或需要登录）';
  }
  if (s.includes('http error 401')) {
    return '资源需要登录：已尝试自动读取浏览器 cookies，仍失败时可配置 YTDLP_COOKIES_FROM_BROWSER / YTDLP_COOKIES';
  }
  if (s.includes('requested format is not available') || s.includes('no video formats')) {
    return '所选分辨率或格式不可用';
  }
  if (s.includes('ffmpeg') && s.includes('not found')) {
    return '缺少 ffmpeg，无法合并高清音视频';
  }
  return '下载失败';
}
