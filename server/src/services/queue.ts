import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { ChildProcess } from 'node:child_process';
import { config } from '../config';
import { getSettings } from '../settings';
import { listTasks, upsertTask, deleteTask as dbDeleteTask } from '../db';
import { bus } from '../bus';
import { detectPlatform, imageExtFromUrl, isValidHttpUrl } from '../utils/platform';
import { AppError } from '../utils/errors';
import {
  runDownload,
  DownloadAbortedError,
  type DownloadAbortController,
} from './downloader';
import type { CreateTaskInput, DownloadTask, TaskProgress, VideoInfo } from '../types';

interface RunningEntry {
  controller: DownloadAbortController;
  child: ChildProcess | null;
}

const PERSIST_THROTTLE_MS = 500;

function isTransientError(message: string): boolean {
  return /网络|超时|限流|连接/.test(message);
}

function pickFilesize(info: Partial<VideoInfo> | null | undefined, resolution?: string): number | null {
  if (!info || !Array.isArray(info.resolutions) || info.resolutions.length === 0) return null;
  const height = parseInt(resolution || '', 10);
  if (!Number.isFinite(height)) return null;
  const match = info.resolutions.find((r) => r.height === height);
  return match?.filesize ?? null;
}

class TaskQueue {
  private tasks = new Map<string, DownloadTask>();
  private running = new Map<string, RunningEntry>();
  private lastPersist = new Map<string, number>();

  init(): void {
    const stored = listTasks();
    for (const t of stored) {
      if (t.status === 'downloading' || t.status === 'parsing') {
        // 服务重启导致进程中断，恢复为等待状态，重新下载（yt-dlp --continue 自动断点续传）
        t.status = 'waiting';
        t.speedBytes = 0;
        t.etaSeconds = null;
        t.error = null;
        t.updatedAt = Date.now();
        upsertTask(t);
      }
      this.tasks.set(t.id, t);
    }
    this.pump();
  }

  list(): DownloadTask[] {
    return [...this.tasks.values()].sort((a, b) => b.createdAt - a.createdAt);
  }

  get(id: string): DownloadTask | null {
    return this.tasks.get(id) ?? null;
  }

  async addTask(input: CreateTaskInput): Promise<DownloadTask> {
    const url = (input.url || '').trim();
    if (!url) throw new AppError('INVALID_URL', '请输入视频或图片链接', 400);

    const platform = detectPlatform(url);
    if (!platform) {
      if (isValidHttpUrl(url)) throw new AppError('UNSUPPORTED', '当前平台不支持', 400);
      throw new AppError('INVALID_URL', 'URL 格式错误，请输入有效的视频或图片链接', 400);
    }
    if (platform.key === 'simulated' && !config.enableSimulate) {
      throw new AppError('UNSUPPORTED', '模拟源已禁用', 400);
    }
    if (platform.key !== 'simulated' && !isValidHttpUrl(url)) {
      throw new AppError('INVALID_URL', 'URL 格式错误，请输入有效的视频或图片链接', 400);
    }

    const settings = getSettings();
    const now = Date.now();
    const isImage = platform.key === 'image' || input.info?.isImage === true;
    const task: DownloadTask = {
      id: randomUUID(),
      url,
      platform: platform.key,
      title: input.info?.title || platform.name,
      thumbnail: input.info?.thumbnail ?? null,
      author: input.info?.uploader ?? null,
      duration: input.info?.duration ?? null,
      resolution: isImage ? null : input.resolution || settings.defaultQuality,
      format: isImage ? imageExtFromUrl(input.info?.directUrl || url) : input.format || settings.defaultFormat,
      filesize: isImage ? null : pickFilesize(input.info, input.resolution),
      status: 'waiting',
      progress: 0,
      downloadedBytes: 0,
      totalBytes: null,
      speedBytes: 0,
      etaSeconds: null,
      error: null,
      filePath: null,
      outputDir: settings.downloadDir,
      simulate: platform.key === 'simulated',
      directUrl: input.info?.directUrl ?? null,
      createdAt: now,
      updatedAt: now,
      startedAt: null,
      completedAt: null,
      retries: 0,
    };

    this.tasks.set(task.id, task);
    upsertTask(task);
    bus.emit('task', task);
    this.pump();
    return task;
  }

  pause(id: string): DownloadTask {
    const task = this.require(id);
    if (task.status === 'downloading' || task.status === 'parsing') {
      const entry = this.running.get(id);
      if (entry) {
        entry.controller.aborted = true;
        entry.controller.reason = 'paused';
        if (entry.child) {
          try {
            entry.child.kill();
          } catch {
            /* ignore */
          }
        }
      }
      this.update(task, { status: 'paused', speedBytes: 0, etaSeconds: null });
    } else if (task.status === 'waiting') {
      this.update(task, { status: 'paused' });
    } else {
      throw new AppError('STATE', '当前状态无法暂停', 400);
    }
    return task;
  }

  resume(id: string): DownloadTask {
    const task = this.require(id);
    if (task.status === 'paused') {
      this.update(task, {
        status: 'waiting',
        error: null,
        speedBytes: 0,
        etaSeconds: null,
        completedAt: null,
      });
      this.pump();
    } else {
      throw new AppError('STATE', '当前状态无法继续', 400);
    }
    return task;
  }

  cancel(id: string): DownloadTask {
    const task = this.require(id);
    if (task.status === 'completed' || task.status === 'failed' || task.status === 'cancelled') {
      throw new AppError('STATE', '当前状态无法取消', 400);
    }
    const entry = this.running.get(id);
    if (entry) {
      entry.controller.aborted = true;
      entry.controller.reason = 'cancelled';
      if (entry.child) {
        try {
          entry.child.kill();
        } catch {
          /* ignore */
        }
      }
    }
    this.cleanupPartial(task);
    this.update(task, { status: 'cancelled', speedBytes: 0, etaSeconds: null, completedAt: Date.now() });
    return task;
  }

  retry(id: string): DownloadTask {
    const task = this.require(id);
    if (task.status === 'failed' || task.status === 'cancelled') {
      this.cleanupPartial(task);
      this.update(task, {
        status: 'waiting',
        error: null,
        retries: 0,
        progress: 0,
        downloadedBytes: 0,
        totalBytes: null,
        speedBytes: 0,
        etaSeconds: null,
        filePath: null,
        filesize: null,
        completedAt: null,
        startedAt: null,
      });
      this.pump();
    } else {
      throw new AppError('STATE', '当前状态无法重试', 400);
    }
    return task;
  }

  remove(id: string, deleteFile = false): void {
    const task = this.require(id);
    if (task.status === 'downloading' || task.status === 'parsing') {
      const entry = this.running.get(id);
      if (entry) {
        entry.controller.aborted = true;
        entry.controller.reason = 'removed';
        if (entry.child) {
          try {
            entry.child.kill();
          } catch {
            /* ignore */
          }
        }
      }
    }
    this.cleanupPartial(task);
    if (deleteFile && task.filePath) {
      try {
        fs.rmSync(task.filePath, { force: true });
      } catch {
        /* ignore */
      }
    }
    this.tasks.delete(id);
    dbDeleteTask(id);
    bus.emit('task:removed', id);
  }

  notifySettingsChanged(): void {
    this.pump();
  }

  onShutdown(): void {
    for (const entry of this.running.values()) {
      entry.controller.aborted = true;
      entry.controller.reason = 'paused';
      if (entry.child) {
        try {
          entry.child.kill();
        } catch {
          /* ignore */
        }
      }
    }
    for (const t of this.tasks.values()) {
      if (t.status === 'downloading' || t.status === 'parsing') {
        this.mutate(t, { status: 'paused', speedBytes: 0, etaSeconds: null });
        upsertTask(t);
      }
    }
  }

  private require(id: string): DownloadTask {
    const task = this.tasks.get(id);
    if (!task) throw new AppError('NOT_FOUND', '任务不存在', 404);
    return task;
  }

  private pump(): void {
    const settings = getSettings();
    const activeCount = [...this.tasks.values()].filter(
      (t) => t.status === 'downloading' || t.status === 'parsing',
    ).length;
    if (activeCount >= settings.maxConcurrent) return;

    const waiting = [...this.tasks.values()]
      .filter((t) => t.status === 'waiting')
      .sort((a, b) => a.createdAt - b.createdAt);

    let slots = settings.maxConcurrent - activeCount;
    for (const task of waiting) {
      if (slots <= 0) break;
      slots -= 1;
      void this.start(task);
    }
  }

  private async start(task: DownloadTask): Promise<void> {
    const settings = getSettings();
    const controller: DownloadAbortController = { aborted: false, reason: null };
    const entry: RunningEntry = { controller, child: null };
    this.running.set(task.id, entry);

    this.update(task, {
      status: 'downloading',
      error: null,
      startedAt: task.startedAt ?? Date.now(),
    });

    try {
      const result = await runDownload(
        task,
        settings,
        {
          onProgress: (p) => this.onProgress(task.id, p),
          onLog: () => {
            /* 下载日志暂时不逐行推送 */
          },
          onChild: (child) => {
            entry.child = child;
          },
        },
        controller,
      );
      if (this.running.get(task.id) !== entry) return; // 该运行已被新运行取代，忽略过期结果
      this.update(task, {
        status: 'completed',
        progress: 100,
        downloadedBytes: result.filesize,
        totalBytes: result.filesize,
        filesize: result.filesize,
        filePath: result.filePath,
        speedBytes: 0,
        etaSeconds: null,
        completedAt: Date.now(),
      });
    } catch (err) {
      if (this.running.get(task.id) !== entry) return; // 过期运行的错误，忽略
      this.handleError(task, err);
    } finally {
      if (this.running.get(task.id) === entry) this.running.delete(task.id);
      this.pump();
    }
  }

  private handleError(task: DownloadTask, err: unknown): void {
    if (err instanceof DownloadAbortedError) {
      if (err.reason === 'cancelled') {
        this.cleanupPartial(task);
        this.update(task, { status: 'cancelled', speedBytes: 0, etaSeconds: null, completedAt: Date.now() });
      } else if (err.reason === 'removed') {
        this.cleanupPartial(task);
        // 任务已在 remove 中删除，不再写回
      } else {
        this.update(task, { status: 'paused', speedBytes: 0, etaSeconds: null });
      }
      return;
    }

    const message = err instanceof AppError ? err.message : err instanceof Error ? err.message : '下载失败';
    const retries = task.retries || 0;
    const maxRetries = getSettings().autoRetries;

    if (retries < maxRetries && isTransientError(message)) {
      this.update(task, {
        status: 'waiting',
        retries: retries + 1,
        error: `${message}（正在自动重试 ${retries + 1}/${maxRetries}）`,
        speedBytes: 0,
        etaSeconds: null,
      });
    } else {
      this.cleanupPartial(task);
      this.update(task, {
        status: 'failed',
        error: message,
        speedBytes: 0,
        etaSeconds: null,
        completedAt: Date.now(),
      });
    }
  }

  private onProgress(id: string, p: TaskProgress): void {
    const task = this.tasks.get(id);
    if (!task || task.status !== 'downloading') return;
    const total = p.total;
    const progress = total && total > 0 ? Math.min(100, (p.downloaded / total) * 100) : task.progress;
    this.mutate(task, {
      downloadedBytes: p.downloaded,
      totalBytes: total,
      speedBytes: p.speed,
      etaSeconds: p.eta,
      progress,
    });
    bus.emit('task', task);

    const last = this.lastPersist.get(id) || 0;
    if (Date.now() - last > PERSIST_THROTTLE_MS) {
      this.lastPersist.set(id, Date.now());
      upsertTask(task);
    }
  }

  private mutate(task: DownloadTask, patch: Partial<DownloadTask>): void {
    Object.assign(task, patch);
    task.updatedAt = Date.now();
  }

  private update(task: DownloadTask, patch: Partial<DownloadTask>): void {
    this.mutate(task, patch);
    upsertTask(task);
    bus.emit('task', task);
  }

  private cleanupPartial(task: DownloadTask): void {
    const dir = task.outputDir || config.downloadDir;
    try {
      const files = fs.readdirSync(dir);
      // 最终文件（已下载完成的视频）必须保留，除非显式传入 deleteFile
      const finalPath = task.filePath ? path.resolve(task.filePath) : null;
      for (const f of files) {
        if (!f.startsWith(`${task.id}.`)) continue;
        const full = path.join(dir, f);
        if (finalPath && path.resolve(full) === finalPath) continue;
        try {
          fs.rmSync(full, { force: true });
        } catch {
          /* ignore */
        }
      }
    } catch {
      /* ignore */
    }
  }
}

export const queue = new TaskQueue();
