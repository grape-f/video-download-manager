import { spawn, type ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { config } from '../config';
import type { DownloadTask, MediaFile, Settings, TaskProgress } from '../types';
import { AppError, friendlyYtDlpError } from '../utils/errors';
import { parseTargetHeight } from '../utils/resolution';
import { ytdlpAuthArgs, ytdlpRuntimeArgs } from '../utils/ytdlpArgs';
import { resolveBilibiliMedia, resolveTwitterMedia } from './native';
import { ffmpegAvailable, upscaleMediaIfNeeded } from './upscale';

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

export type DownloadResult = MediaFile;

export interface DownloadHandlers {
  onProgress(p: TaskProgress): void;
  onLog(line: string): void;
  onChild(child: ChildProcess | null): void;
}

export function containerExt(format: string | null | undefined): string {
  if (format === 'webm' || format === 'mkv') return format;
  return 'mp4';
}

/**
 * merge=true 时可选择最高清的视频+音频并合并（需要 ffmpeg）。
 * merge=false 时降级为免合并的单文件格式，避免依赖 ffmpeg。
 */
export function buildFormatSelector(resolution: string | null | undefined, merge: boolean): string {
  const h = parseTargetHeight(resolution);
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

  let result: DownloadResult;
  if (task.platform === 'x' || task.platform === 'bilibili') {
    result = await runNativeDownload(task, settings, handlers, controller);
  } else if (task.platform === 'image' || (task.platform === 'instagram' && task.directUrl)) {
    // 图片直链 / Instagram 图片（已有直链）：直接下载
    result = await runDirectUrlDownload(
      task,
      task.directUrl || task.url,
      settings,
      handlers,
      controller,
      null,
    );
  } else {
    result = await runYtDlpDownload(task, settings, handlers, controller);
  }

  if (controller.aborted) {
    throw new DownloadAbortedError(controller.reason || 'cancelled');
  }

  const targetHeight = parseTargetHeight(task.resolution);
  if (targetHeight > 0) {
    result = await upscaleMediaIfNeeded(result, targetHeight, {
      onLog: handlers.onLog,
      onChild: handlers.onChild,
    });
    if (controller.aborted) {
      throw new DownloadAbortedError(controller.reason || 'cancelled');
    }
  }

  return result;
}

/** X / Bilibili：通过无需登录的原生 API 解析直链后下载 */
async function runNativeDownload(
  task: DownloadTask,
  settings: Settings,
  handlers: DownloadHandlers,
  controller: DownloadAbortController,
): Promise<DownloadResult> {
  let directUrl = task.directUrl;
  let referer: string | null = null;

  if (task.platform === 'x') {
    const m = await resolveTwitterMedia(task.url);
    directUrl = m?.directUrl ?? directUrl;
  } else if (task.platform === 'bilibili') {
    const m = await resolveBilibiliMedia(task.url, task.resolution);
    directUrl = m?.directUrl ?? directUrl;
    referer = 'https://www.bilibili.com/';
  }

  if (!directUrl) {
    throw new AppError(
      'DOWNLOAD',
      task.platform === 'x'
        ? '未能解析到推文视频直链（该推文可能没有视频，或需要登录查看）'
        : '未能解析到下载直链',
      422,
    );
  }

  return runDirectUrlDownload(task, directUrl, settings, handlers, controller, referer);
}

function runDirectUrlDownload(
  task: DownloadTask,
  directUrl: string,
  settings: Settings,
  handlers: DownloadHandlers,
  controller: DownloadAbortController,
  referer: string | null,
): Promise<DownloadResult> {
  return new Promise((resolve, reject) => {
    const outputDir = task.outputDir || settings.downloadDir;
    const outTemplate = path.join(outputDir, `${task.id}.%(ext)s`);
    const args = [
      '--newline',
      '--no-playlist',
      '--no-warnings',
      '--no-mtime',
      '--progress',
      '--progress-template',
      'download:%(progress.downloaded_bytes)s/%(progress.total_bytes)s/%(progress.total_bytes_estimate)s/%(progress.speed)s/%(progress.eta)s',
      '--socket-timeout',
      String(Math.max(10, Math.floor(settings.requestTimeoutMs / 1000))),
      '-o',
      outTemplate,
    ];
    if (referer) {
      args.push('--add-header', `Referer: ${referer}`);
    }
    args.push(directUrl);

    const child = spawn(config.ytdlpPath, args, { windowsHide: true });
    handlers.onChild(child);
    let stderr = '';

    child.stdout.on('data', (d: Buffer) => {
      for (const line of d.toString().split(/\r?\n/)) {
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
        const found = findOutputFile(outputDir, task.id);
        if (found) resolve(found);
        else reject(new AppError('OUTPUT', '下载完成但未找到输出文件', 500));
      } else {
        console.error('[yt-dlp]', stderr.trim().slice(-2000));
        reject(new AppError('DOWNLOAD', friendlyYtDlpError(stderr), 422));
      }
    });
  });
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
      ...ytdlpRuntimeArgs(),
      ...ytdlpAuthArgs(),
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
        console.error('[yt-dlp]', stderr.trim().slice(-2000));
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
          !f.includes('.upscale.') &&
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
