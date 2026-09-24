import path from 'node:path';
import { config } from '../config';
import { getCookieAuthStatus, getSyncedCookiesPath } from '../services/cookieAuth';
import { detectBrowserCookieSources } from './browserCookies';

interface CookieSource {
  kind: 'browser' | 'file';
  value: string;
  auto: boolean;
  origin: 'env' | 'extension' | 'browser' | 'auto';
}

/**
 * 解析 yt-dlp 登录凭据来源：显式配置优先，其次自动探测本机浏览器的 cookies。
 * 自动探测不用于绕过付费墙、会员限制或其他访问控制。
 */
export function resolveYtdlpCookieSource(): CookieSource | null {
  if (config.ytdlpCookies) {
    return { kind: 'file', value: config.ytdlpCookies, auto: false, origin: 'env' };
  }
  const synced = getSyncedCookiesPath();
  if (synced) {
    return { kind: 'file', value: synced, auto: false, origin: 'extension' };
  }
  if (config.ytdlpCookiesFromBrowser) {
    return { kind: 'browser', value: config.ytdlpCookiesFromBrowser, auto: false, origin: 'browser' };
  }
  if (config.ytdlpCookiesAuto) {
    const detected = detectBrowserCookieSources()[0];
    if (detected) return { kind: 'browser', value: detected, auto: true, origin: 'auto' };
  }
  return null;
}

export function ytdlpAuthArgs(): string[] {
  const source = resolveYtdlpCookieSource();
  if (!source) return [];
  return source.kind === 'browser'
    ? ['--cookies-from-browser', source.value]
    : ['--cookies', source.value];
}

/**
 * YouTube 现在要求 yt-dlp 使用 JavaScript 运行时求解 signature/n challenge。
 * 默认使用当前运行后端的 Node 可执行文件，并允许 yt-dlp 获取 ejs:github 组件。
 */
export function ytdlpRuntimeArgs(): string[] {
  const args: string[] = [];
  if (config.ytdlpJsRuntime) args.push('--js-runtimes', config.ytdlpJsRuntime);
  if (config.ytdlpRemoteComponents) {
    args.push('--remote-components', config.ytdlpRemoteComponents);
  }
  return args;
}

export function cookieSourceLabel(): string {
  if (config.ytdlpCookies) return `${path.basename(config.ytdlpCookies)}（手动配置）`;
  const synced = getCookieAuthStatus();
  if (synced.available) return `Edge 扩展同步（${synced.cookieCount} 条 cookies）`;
  if (synced.cookieCount > 0) return 'Edge 扩展 cookies 已过期，请重新同步';
  if (config.ytdlpCookiesFromBrowser) return `${config.ytdlpCookiesFromBrowser}（手动配置）`;
  if (!config.ytdlpCookiesAuto) return '自动检测已关闭';
  const detected = detectBrowserCookieSources()[0];
  return detected ? `${detected}（自动检测）` : '未检测到浏览器登录状态';
}
