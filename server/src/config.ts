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

export const config = {
  version: '1.1.0',
  port: toNumber(process.env.PORT, 8787),
  host: process.env.HOST || '0.0.0.0',
  projectRoot: PROJECT_ROOT,
  dataDir: path.resolve(PROJECT_ROOT, process.env.DATA_DIR || 'data'),
  downloadDir: path.resolve(PROJECT_ROOT, process.env.DOWNLOAD_DIR || 'downloads'),
  dbPath: process.env.DB_PATH
    ? path.resolve(PROJECT_ROOT, process.env.DB_PATH)
    : path.join(path.resolve(PROJECT_ROOT, process.env.DATA_DIR || 'data'), 'app.db'),
  maxConcurrent: toNumber(process.env.MAX_CONCURRENT, 3),
  defaultQuality: process.env.DEFAULT_QUALITY || 'best',
  defaultFormat: process.env.DEFAULT_FORMAT || 'mp4',
  maxSpeed: process.env.MAX_SPEED ? process.env.MAX_SPEED.trim() : null,
  requestTimeoutMs: toNumber(process.env.REQUEST_TIMEOUT_MS, 120_000),
  autoRetries: toNumber(process.env.AUTO_RETRIES, 3),
  ytdlpPath: process.env.YTDLP_PATH || 'yt-dlp',
  ffmpegPath: process.env.FFMPEG_PATH
    ? path.resolve(PROJECT_ROOT, process.env.FFMPEG_PATH)
    : null,
  enableSimulate: toBool(process.env.ENABLE_SIMULATE, true),
} as const;

export type AppConfig = typeof config;
