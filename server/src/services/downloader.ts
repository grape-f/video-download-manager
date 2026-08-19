import { spawn, type ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { config } from '../config';
import type { DownloadTask, Settings, TaskProgress } from '../types';
import { AppError, friendlyYtDlpError } from '../utils/errors';

export type AbortReason = 'paused' | 'cancelled' | 'removed';

export interface DownloadAbortController {
  aborted: boolean;
  reason: AbortReason | null;
}

export class DownloadAbortedError extends Error {
  reason: AbortReason;

  constructor(reason: AbortReason) {
    super(`download aborted: ${reason}`);
    this.name = 'DownloadAbortedError';
    this.reason = reason;
  }
}

export interface DownloadResult {
  filePath: string;
  filesize: number;
}

export interface DownloadHandlers {
  onProgress(p: TaskProgress): void;
  onLog(line: string): void;
  onChild(child: ChildProcess | null): void;
}

export function containerExt(format: string | null | undefined): string {
  if (format === 'webm' || format === 'mkv') return format;
  return 'mp4';
}

function ffmpegAvailable(): boolean {
  if (!config.ffmpegPath) return false;
  try {
    if (!fs.existsSync(config.ffmpegPath)) return false;
    const stat = fs.statSync(config.ffmpegPath);
    if (stat.isDirectory()) {
      const exe = process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg';
      return fs.existsSync(path.join(config.ffmpegPath, exe));
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * merge=true 时可选择最高清的视频+音频并合并（需要 ffmpeg）。
 * merge=false 时降级为免合并的单文件格式，避免依赖 ffmpeg。
 */
export function buildFormatSelector(resolution: string | null | undefined, merge: boolean): string {
  const height = resolution && resolution !== 'best' ? parseInt(resolution, 10) : 0;
  const h = Number.isFinite(height) && height > 0 ? height : 0;
  if (merge) {
    if (h === 0) return 'bv*+ba/b';
    return `bv*[height<=${h}]+ba/b[height<=${h}]/b[height<=${h}]`;
  }
  if (h === 0) return 'b[ext=mp4]/b';
  return `b[height<=${h}][ext=mp4]/b[ext=mp4]/b`;
}

export async function runDownload(
  task: DownloadTask,
  settings: Settings,
  handlers: DownloadHandlers,
  controller: DownloadAbortController,
): Promise<DownloadResult> {
  if (task.simulate) {
    return runSimulatedDownload(task, handlers, controller);
  }
  return runYtDlpDownload(task, settings, handlers, controller);
}

function runYtDlpDownload(
  task: DownloadTask,
  settings: Settings,
  handlers: DownloadHandlers,
  controller: DownloadAbortController,
): Promise<DownloadResult> {
  return new Promise((resolve, reject) => {
    const merge = ffmpegAvailable();
    const ext = merge ? containerExt(task.format) : 'mp4';
    const outputDir = task.outputDir || settings.downloadDir;
    const outTemplate = path.join(outputDir, `${task.id}.%(ext)s`);

    const args = [
      '--newline',
      '--no-playlist',
      '--no-warnings',
      '--no-mtime',
      '--continue',
      '--progress',
      '--progress-template',
      'download:%(progress.downloaded_bytes)s/%(progress.total_bytes)s/%(progress.total_bytes_estimate)s/%(progress.speed)s/%(progress.eta)s',
      '-f',
      buildFormatSelector(task.resolution, merge),
      '--socket-timeout',
      String(Math.max(10, Math.floor(settings.requestTimeoutMs / 1000))),
      '-o',
      outTemplate,
    ];

    if (merge && config.ffmpegPath) {
      args.push('--merge-output-format', ext);
      const stat = fs.statSync(config.ffmpegPath);
      const ffdir = stat.isDirectory() ? config.ffmpegPath : path.dirname(config.ffmpegPath);
      args.push('--ffmpeg-location', ffdir);
    }
    if (settings.maxSpeed) {
      args.push('--limit-rate', settings.maxSpeed);
    }
    args.push(task.url);

    const child = spawn(config.ytdlpPath, args, { windowsHide: true });
    handlers.onChild(child);

    let stderr = '';

    child.stdout.on('data', (d: Buffer) => {
      const text = d.toString();
      for (const line of text.split(/\r?\n/)) {
        if (!line) continue;
        if (line.startsWith('download:')) {
          const p = parseProgressLine(line);
          if (p) handlers.onProgress(p);
        } else {
          handlers.onLog(line);
        }
      }
    });

    child.stderr.on('data', (d: Buffer) => {
      stderr = (stderr + d.toString()).slice(-16384);
    });

    child.on('error', (err) => {
      handlers.onChild(null);
      reject(new AppError('SPAWN', `无法启动 yt-dlp：${err.message}`, 500));
    });

    child.on('close', (code) => {
      handlers.onChild(null);
      if (controller.aborted) {
        reject(new DownloadAbortedError(controller.reason || 'cancelled'));
        return;
      }
      if (code === 0) {
        const filePath = path.join(outputDir, `${task.id}.${ext}`);
        try {
          const stat = fs.statSync(filePath);
          resolve({ filePath, filesize: stat.size });
        } catch {
          const found = findOutputFile(outputDir, task.id);
          if (found) resolve(found);
          else reject(new AppError('OUTPUT', '下载完成但未找到输出文件', 500));
        }
      } else {
        reject(new AppError('DOWNLOAD', friendlyYtDlpError(stderr), 422));
      }
    });
  });
}

function parseProgressLine(line: string): TaskProgress | null {
  const body = line.slice('download:'.length);
  const parts = body.split('/');
  const num = (s: string | undefined): number | null => {
    if (!s || s === 'NA' || s === 'Unknown') return null;
    const v = parseFloat(s);
    return Number.isFinite(v) ? v : null;
  };
  const downloaded = num(parts[0]) ?? 0;
  const total = num(parts[1]) ?? num(parts[2]);
  const speed = num(parts[3]) ?? 0;
  const eta = num(parts[4]);
  return { downloaded, total, speed, eta };
}

function findOutputFile(dir: string, id: string): DownloadResult | null {
  try {
    const files = fs
      .readdirSync(dir)
      .filter(
        (f) =>
          f.startsWith(`${id}.`) &&
          !f.endsWith('.part') &&
          !f.endsWith('.ytdl') &&
          !f.includes('.temp') &&
          !/\.f\d+\./.test(f),
      );
    if (files.length > 0) {
      const filePath = path.join(dir, files[0]);
      return { filePath, filesize: fs.statSync(filePath).size };
    }
  } catch {
    /* ignore */
  }
  return null;
}

function parseSimSpec(url: string): { mb: number; seconds: number } {
  const m = /^sim:\/\/(?:(\d+)(?:@(\d+))?)?/i.exec(url);
  const mb = m && m[1] ? Math.max(1, Math.min(100, Number(m[1]))) : 5;
  const seconds = m && m[2] ? Math.max(1, Math.min(300, Number(m[2]))) : 8;
  return { mb, seconds };
}

function runSimulatedDownload(
  task: DownloadTask,
  handlers: DownloadHandlers,
  controller: DownloadAbortController,
): Promise<DownloadResult> {
  return new Promise((resolve, reject) => {
    const spec = parseSimSpec(task.url);
    const total = spec.mb * 1024 * 1024;
    const durationMs = spec.seconds * 1000;
    const tick = 200;
    const ext = containerExt(task.format);
    const dir = task.outputDir || config.downloadDir;
    const filePath = path.join(dir, `${task.id}.${ext}`);

    fs.mkdirSync(dir, { recursive: true });
    try {
      fs.rmSync(filePath, { force: true });
    } catch {
      /* ignore */
    }

    let fd: number;
    try {
      fd = fs.openSync(filePath, 'w');
    } catch {
      reject(new AppError('WRITE', '文件写入失败（权限不足或路径无效）', 500));
      return;
    }

    handlers.onChild(null);
    let elapsed = 0;
    const chunkSize = Math.max(1, Math.floor((total * tick) / durationMs));

    const timer = setInterval(() => {
      if (controller.aborted) {
        clearInterval(timer);
        try {
          fs.closeSync(fd);
        } catch {
          /* ignore */
        }
        reject(new DownloadAbortedError(controller.reason || 'cancelled'));
        return;
      }

      elapsed += tick;
      const progress = Math.min(1, elapsed / durationMs);
      try {
        fs.writeSync(fd, Buffer.alloc(chunkSize, 0xab));
      } catch {
        clearInterval(timer);
        try {
          fs.closeSync(fd);
        } catch {
          /* ignore */
        }
        reject(new AppError('WRITE', '磁盘空间不足或文件写入失败', 500));
        return;
      }

      handlers.onProgress({
        downloaded: Math.floor(total * progress),
        total,
        speed: total / (durationMs / 1000),
        eta: Math.max(0, (durationMs - elapsed) / 1000),
      });

      if (elapsed >= durationMs) {
        clearInterval(timer);
        try {
          fs.closeSync(fd);
        } catch {
          /* ignore */
        }
        const stat = fs.statSync(filePath);
        resolve({ filePath, filesize: stat.size });
      }
    }, tick);
  });
}
