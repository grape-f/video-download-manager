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
  if (s.includes('unsupported url')) return '当前平台不支持';
  if (s.includes('unable to extract') || s.includes('not a valid url') || s.includes('is not a valid')) {
    return 'URL 无效或无法解析';
  }
  if (s.includes('video unavailable') || s.includes('private video') || s.includes('this video is private')) {
    return '视频不可访问（可能为私密或已删除）';
  }
  if (s.includes('sign in to confirm') || s.includes('age-restricted') || s.includes('login required') || s.includes('members-only') || s.includes('confirm your age')) {
    return '该视频需要登录或受年龄限制，无法访问';
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
  if (s.includes('requested format is not available') || s.includes('no video formats')) {
    return '所选分辨率或格式不可用';
  }
  if (s.includes('ffmpeg') && s.includes('not found')) {
    return '缺少 ffmpeg，无法合并高清音视频';
  }
  return '下载失败';
}
