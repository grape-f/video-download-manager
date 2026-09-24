import { randomBytes, timingSafeEqual } from 'node:crypto';
import fs from 'node:fs';
import { config } from '../config';
import type { CookieAuthStatus } from '../types';
import { AppError } from '../utils/errors';

interface ParsedCookie {
  domain: string;
  name: string;
  expiration: number;
}

const MAX_COOKIE_FILE_BYTES = 2 * 1024 * 1024;

function ensureDataDir(): void {
  fs.mkdirSync(config.dataDir, { recursive: true });
}

/**
 * 读取或生成 Edge 扩展的配对 token。token 只保存在本机 data 目录，不会下发到前端之外。
 */
export function getPairingToken(): string {
  ensureDataDir();
  try {
    const existing = fs.readFileSync(config.extensionTokenPath, 'utf8').trim();
    if (existing) return existing;
  } catch {
    /* create below */
  }

  const token = randomBytes(24).toString('hex');
  fs.writeFileSync(config.extensionTokenPath, `${token}\n`, { mode: 0o600 });
  return token;
}

export function validatePairingToken(token: string | undefined): boolean {
  if (!token) return false;
  const expected = getPairingToken();
  const provided = Buffer.from(token);
  const wanted = Buffer.from(expected);
  return provided.length === wanted.length && timingSafeEqual(provided, wanted);
}

function parseNetscapeCookies(content: string): ParsedCookie[] {
  const cookies: ParsedCookie[] = [];

  for (const rawLine of content.split(/\r?\n/)) {
    if (!rawLine) continue;
    const httpOnly = rawLine.startsWith('#HttpOnly_');
    const line = httpOnly ? rawLine.slice('#HttpOnly_'.length) : rawLine;
    if (!httpOnly && line.startsWith('#')) continue;

    const parts = line.split('\t');
    if (parts.length < 7) continue;
    const domain = parts[0].replace(/^\./, '').trim();
    const name = parts[5].trim();
    if (!domain || !name) continue;

    const expiration = Number(parts[4]) || 0;
    cookies.push({ domain, name, expiration });
  }

  return cookies;
}

export function getCookieAuthStatus(): CookieAuthStatus {
  let stat: fs.Stats;
  let content: string;
  try {
    stat = fs.statSync(config.extensionCookiesPath);
    content = fs.readFileSync(config.extensionCookiesPath, 'utf8');
  } catch {
    return {
      available: false,
      expired: false,
      cookieCount: 0,
      domains: [],
      syncedAt: null,
      expiresAt: null,
    };
  }

  const cookies = parseNetscapeCookies(content);
  const domains = [...new Set(cookies.map((c) => c.domain))].sort();
  const expirations = cookies.map((c) => c.expiration).filter((value) => value > 0);
  const expiresAt = expirations.length > 0 ? Math.min(...expirations) * 1000 : null;
  const hasSessionCookie = cookies.some((c) => c.expiration === 0);
  const expired =
    cookies.length > 0 && !hasSessionCookie && expiresAt != null && expiresAt <= Date.now();

  return {
    available: cookies.length > 0 && !expired,
    expired,
    cookieCount: cookies.length,
    domains,
    syncedAt: stat.mtimeMs,
    expiresAt,
  };
}

export function saveSyncedCookies(content: string): CookieAuthStatus {
  if (Buffer.byteLength(content, 'utf8') > MAX_COOKIE_FILE_BYTES) {
    throw new AppError('COOKIES_TOO_LARGE', 'cookies 内容过大', 413);
  }
  if (parseNetscapeCookies(content).length === 0) {
    throw new AppError('COOKIES_EMPTY', '没有解析到有效的 cookies', 400);
  }

  ensureDataDir();
  const tempPath = `${config.extensionCookiesPath}.tmp`;
  try {
    fs.writeFileSync(tempPath, content, { mode: 0o600 });
    fs.rmSync(config.extensionCookiesPath, { force: true });
    fs.renameSync(tempPath, config.extensionCookiesPath);
  } catch (err) {
    fs.rmSync(tempPath, { force: true });
    throw err;
  }

  return getCookieAuthStatus();
}

export function clearSyncedCookies(): void {
  fs.rmSync(config.extensionCookiesPath, { force: true });
}

export function getSyncedCookiesPath(): string | null {
  return getCookieAuthStatus().available ? config.extensionCookiesPath : null;
}
