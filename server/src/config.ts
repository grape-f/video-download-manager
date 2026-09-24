import path from 'node:path';
import dotenv from 'dotenv';

// 优先读取项目根目录的 .env，其次读取当前工作目录的 .env
dotenv.config({ path: path.resolve(__dirname, '..', '..', '.env') });
dotenv.config();

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');

function toNumber(value: string | undefined, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

function toBool(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  return value === '1' || value.toLowerCase() === 'true';
}

const ytdlpCookiesFile = process.env.YTDLP_COOKIES?.trim();
const ytdlpJsRuntimeEnv = process.env.YTDLP_JS_RUNTIME?.trim();
const ytdlpRemoteComponentsEnv = process.env.YTDLP_REMOTE_COMPONENTS?.trim();
const dataDir = path.resolve(PROJECT_ROOT, process.env.DATA_DIR || 'data');

export const config = {
  version: '1.2.0',
  port: toNumber(process.env.PORT, 8787),
  host: process.env.HOST || '0.0.0.0',
  projectRoot: PROJECT_ROOT,
  dataDir,
  downloadDir: path.resolve(PROJECT_ROOT, process.env.DOWNLOAD_DIR || 'downloads'),
  dbPath: process.env.DB_PATH
    ? path.resolve(PROJECT_ROOT, process.env.DB_PATH)
    : path.join(dataDir, 'app.db'),
  maxConcurrent: toNumber(process.env.MAX_CONCURRENT, 3),
  defaultQuality: process.env.DEFAULT_QUALITY || 'best',
  defaultFormat: process.env.DEFAULT_FORMAT || 'mp4',
  maxSpeed: process.env.MAX_SPEED ? process.env.MAX_SPEED.trim() : null,
  requestTimeoutMs: toNumber(process.env.REQUEST_TIMEOUT_MS, 120_000),
  autoRetries: toNumber(process.env.AUTO_RETRIES, 3),
  ytdlpPath: process.env.YTDLP_PATH || 'yt-dlp',
  ytdlpCookies: ytdlpCookiesFile ? path.resolve(PROJECT_ROOT, ytdlpCookiesFile) : null,
  ytdlpCookiesFromBrowser: process.env.YTDLP_COOKIES_FROM_BROWSER?.trim() || null,
  ytdlpCookiesAuto: toBool(process.env.YTDLP_COOKIES_AUTO, true),
  ytdlpJsRuntime:
    ytdlpJsRuntimeEnv === 'none' ? null : ytdlpJsRuntimeEnv || `node:${process.execPath}`,
  ytdlpRemoteComponents:
    ytdlpRemoteComponentsEnv === 'none' ? null : ytdlpRemoteComponentsEnv || 'ejs:github',
  extensionTokenPath: path.join(dataDir, 'extension-token.txt'),
  extensionCookiesPath: path.join(dataDir, 'extension-cookies.txt'),
  ffmpegPath: process.env.FFMPEG_PATH
    ? path.resolve(PROJECT_ROOT, process.env.FFMPEG_PATH)
    : null,
  enableSimulate: toBool(process.env.ENABLE_SIMULATE, true),
} as const;

export type AppConfig = typeof config;
