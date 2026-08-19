import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import { config } from './config';
import type { DownloadTask } from './types';

let db: DatabaseSync | null = null;

const TASK_COLUMNS = [
  'id',
  'url',
  'platform',
  'title',
  'thumbnail',
  'author',
  'duration',
  'resolution',
  'format',
  'filesize',
  'status',
  'progress',
  'downloaded_bytes',
  'total_bytes',
  'speed_bytes',
  'eta_seconds',
  'error',
  'file_path',
  'output_dir',
  'simulate',
  'created_at',
  'updated_at',
  'started_at',
  'completed_at',
  'retries',
] as const;

export function initDb(): DatabaseSync {
  fs.mkdirSync(config.dataDir, { recursive: true });
  fs.mkdirSync(config.downloadDir, { recursive: true });

  db = new DatabaseSync(config.dbPath);
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      url TEXT NOT NULL,
      platform TEXT NOT NULL,
      title TEXT,
      thumbnail TEXT,
      author TEXT,
      duration INTEGER,
      resolution TEXT,
      format TEXT,
      filesize INTEGER,
      status TEXT NOT NULL,
      progress REAL DEFAULT 0,
      downloaded_bytes INTEGER DEFAULT 0,
      total_bytes INTEGER,
      speed_bytes INTEGER DEFAULT 0,
      eta_seconds INTEGER,
      error TEXT,
      file_path TEXT,
      output_dir TEXT,
      simulate INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      started_at INTEGER,
      completed_at INTEGER,
      retries INTEGER DEFAULT 0
    );
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
  return db;
}

function getDb(): DatabaseSync {
  if (!db) throw new Error('数据库尚未初始化');
  return db;
}

type TaskRow = Record<string, unknown>;

function rowToTask(row: TaskRow): DownloadTask {
  return {
    id: String(row.id),
    url: String(row.url),
    platform: String(row.platform),
    title: row.title != null ? String(row.title) : '',
    thumbnail: row.thumbnail != null ? String(row.thumbnail) : null,
    author: row.author != null ? String(row.author) : null,
    duration: row.duration != null ? Number(row.duration) : null,
    resolution: row.resolution != null ? String(row.resolution) : null,
    format: row.format != null ? String(row.format) : null,
    filesize: row.filesize != null ? Number(row.filesize) : null,
    status: String(row.status) as DownloadTask['status'],
    progress: Number(row.progress) || 0,
    downloadedBytes: Number(row.downloaded_bytes) || 0,
    totalBytes: row.total_bytes != null ? Number(row.total_bytes) : null,
    speedBytes: Number(row.speed_bytes) || 0,
    etaSeconds: row.eta_seconds != null ? Number(row.eta_seconds) : null,
    error: row.error != null ? String(row.error) : null,
    filePath: row.file_path != null ? String(row.file_path) : null,
    outputDir: row.output_dir != null ? String(row.output_dir) : null,
    simulate: Boolean(row.simulate),
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
    startedAt: row.started_at != null ? Number(row.started_at) : null,
    completedAt: row.completed_at != null ? Number(row.completed_at) : null,
    retries: Number(row.retries) || 0,
  };
}

export function upsertTask(task: DownloadTask): void {
  const d = getDb();
  const placeholders = TASK_COLUMNS.map(() => '?').join(', ');
  const sql = `INSERT INTO tasks (${TASK_COLUMNS.join(', ')}) VALUES (${placeholders})
    ON CONFLICT(id) DO UPDATE SET
      url=excluded.url, platform=excluded.platform, title=excluded.title,
      thumbnail=excluded.thumbnail, author=excluded.author, duration=excluded.duration,
      resolution=excluded.resolution, format=excluded.format, filesize=excluded.filesize,
      status=excluded.status, progress=excluded.progress, downloaded_bytes=excluded.downloaded_bytes,
      total_bytes=excluded.total_bytes, speed_bytes=excluded.speed_bytes, eta_seconds=excluded.eta_seconds,
      error=excluded.error, file_path=excluded.file_path, output_dir=excluded.output_dir,
      simulate=excluded.simulate, created_at=excluded.created_at, updated_at=excluded.updated_at,
      started_at=excluded.started_at, completed_at=excluded.completed_at, retries=excluded.retries`;
  d.prepare(sql).run(
    task.id,
    task.url,
    task.platform,
    task.title || null,
    task.thumbnail,
    task.author,
    task.duration,
    task.resolution,
    task.format,
    task.filesize,
    task.status,
    task.progress,
    task.downloadedBytes,
    task.totalBytes,
    task.speedBytes,
    task.etaSeconds,
    task.error,
    task.filePath,
    task.outputDir,
    task.simulate ? 1 : 0,
    task.createdAt,
    task.updatedAt,
    task.startedAt,
    task.completedAt,
    task.retries,
  );
}

export function getTask(id: string): DownloadTask | null {
  const row = getDb().prepare('SELECT * FROM tasks WHERE id = ?').get(id) as TaskRow | undefined;
  return row ? rowToTask(row) : null;
}

export function listTasks(): DownloadTask[] {
  const rows = getDb().prepare('SELECT * FROM tasks ORDER BY created_at DESC').all() as TaskRow[];
  return rows.map(rowToTask);
}

export function deleteTask(id: string): void {
  getDb().prepare('DELETE FROM tasks WHERE id = ?').run(id);
}

export function getSettingRaw(key: string): string | null {
  const row = getDb().prepare('SELECT value FROM settings WHERE key = ?').get(key) as
    | { value: string }
    | undefined;
  return row ? row.value : null;
}

export function setSettingRaw(key: string, value: string): void {
  getDb()
    .prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value')
    .run(key, value);
}

export function closeDb(): void {
  if (db) {
    try {
      db.close();
    } catch {
      // ignore close errors during shutdown
    }
    db = null;
  }
}
