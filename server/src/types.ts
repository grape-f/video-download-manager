export type TaskStatus =
  | 'waiting'
  | 'parsing'
  | 'downloading'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface ResolutionOption {
  height: number;
  label: string;
  filesize: number | null;
}

export interface VideoInfo {
  title: string;
  thumbnail: string | null;
  platform: string;
  duration: number | null;
  uploader: string | null;
  webpageUrl: string;
  resolutions: ResolutionOption[];
}

export interface DownloadTask {
  id: string;
  url: string;
  platform: string;
  title: string;
  thumbnail: string | null;
  author: string | null;
  duration: number | null;
  resolution: string | null;
  format: string | null;
  filesize: number | null;
  status: TaskStatus;
  progress: number;
  downloadedBytes: number;
  totalBytes: number | null;
  speedBytes: number;
  etaSeconds: number | null;
  error: string | null;
  filePath: string | null;
  outputDir: string | null;
  simulate: boolean;
  createdAt: number;
  updatedAt: number;
  startedAt: number | null;
  completedAt: number | null;
  retries: number;
}

export type ThemePreference = 'light' | 'dark' | 'system';

export interface Settings {
  defaultQuality: string;
  defaultFormat: string;
  maxConcurrent: number;
  downloadDir: string;
  maxSpeed: string | null;
  requestTimeoutMs: number;
  autoRetries: number;
  theme: ThemePreference;
}

export interface CreateTaskInput {
  url: string;
  resolution?: string;
  format?: string;
  outputDir?: string;
  simulate?: boolean;
  info?: Partial<VideoInfo> | null;
}

export interface TaskProgress {
  downloaded: number;
  total: number | null;
  speed: number;
  eta: number | null;
}

export interface DashboardStats {
  todayTotal: number;
  todayCompleted: number;
  todayFailed: number;
  activeCount: number;
  totalTasks: number;
  completedCount: number;
  failedCount: number;
  totalBytes: number;
  successRate: number;
  platformDistribution: Array<{ platform: string; count: number }>;
  dailyDownloads: Array<{ date: string; count: number; bytes: number }>;
  recentTasks: DownloadTask[];
}

export interface SystemStatus {
  version: string;
  databaseStatus: 'ok' | 'error';
  databasePath: string;
  downloadDir: string;
  downloadDirStatus: 'ok' | 'error';
  diskFreeBytes: number | null;
  diskTotalBytes: number | null;
  ytdlpAvailable: boolean;
  ffmpegAvailable: boolean;
}
