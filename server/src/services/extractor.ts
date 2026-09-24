import { spawn } from 'node:child_process';
import { config } from '../config';
import type { ResolutionOption, VideoInfo } from '../types';
import { AppError, friendlyYtDlpError } from '../utils/errors';
import { detectPlatform, isImageUrl } from '../utils/platform';
import { ytdlpAuthArgs, ytdlpRuntimeArgs } from '../utils/ytdlpArgs';
import { resolveBilibiliMedia, resolveInstagramMedia, resolveTwitterMedia, type ResolvedMedia } from './native';

interface ProcessResult {
  stdout: string;
  stderr: string;
}

function collectOutput(args: string[], timeoutMs: number): Promise<ProcessResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(config.ytdlpPath, args, { windowsHide: true });
    let stdout = '';
    let stderr = '';
    let settled = false;

    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        try {
          child.kill();
        } catch {
          /* ignore */
        }
        reject(new AppError('TIMEOUT', '解析视频超时，请检查网络后重试', 408));
      }
    }, timeoutMs);

    child.stdout.on('data', (d) => (stdout += d.toString()));
    child.stderr.on('data', (d) => (stderr += d.toString()));
    child.on('error', (err) => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        reject(new AppError('SPAWN', `无法启动 yt-dlp：${err.message}`, 500));
      }
    });
    child.on('close', (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (code === 0) resolve({ stdout, stderr });
      else {
        console.error('[yt-dlp]', stderr.trim().slice(-2000));
        reject(new AppError('YTDLP', friendlyYtDlpError(stderr), 422));
      }
    });
  });
}

function deriveResolutions(formats: unknown[]): ResolutionOption[] {
  if (!Array.isArray(formats)) return [];
  const heights = new Map<number, number>();

  let bestAudioBytes = 0;
  for (const f of formats as Array<Record<string, unknown>>) {
    if (!f) continue;
    if (f.vcodec === 'none' && f.acodec !== 'none') {
      const size = (f.filesize as number) || (f.filesize_approx as number) || 0;
      if (size > bestAudioBytes) bestAudioBytes = size;
    }
  }

  for (const f of formats as Array<Record<string, unknown>>) {
    if (!f) continue;
    if (f.vcodec === 'none') continue;
    const h = f.height as number | undefined;
    if (!h || h < 144) continue;
    const size = ((f.filesize as number) || (f.filesize_approx as number) || 0) as number;
    const prev = heights.get(h);
    if (prev === undefined || size > prev) heights.set(h, size);
  }

  return [...heights.entries()]
    .sort((a, b) => b[0] - a[0])
    .slice(0, 10)
    .map(([height, videoBytes]) => ({
      height,
      label: `${height}p`,
      filesize: videoBytes ? videoBytes + bestAudioBytes : bestAudioBytes || null,
    }));
}

function mapInfo(raw: Record<string, unknown>, url: string): VideoInfo {
  const thumbs = (raw.thumbnails as Array<{ url?: string }>) || [];
  const platform = detectPlatform(url)?.key || String(raw.extractor_key || 'unknown').toLowerCase();
  return {
    title: (raw.title as string) || (raw.fulltitle as string) || '未命名视频',
    thumbnail: (raw.thumbnail as string) || thumbs[thumbs.length - 1]?.url || null,
    platform,
    duration: typeof raw.duration === 'number' ? raw.duration : null,
    uploader:
      (raw.uploader as string) ||
      (raw.channel as string) ||
      (raw.creator as string) ||
      (raw.uploader_id as string) ||
      null,
    webpageUrl: url,
    resolutions: deriveResolutions(raw.formats as unknown[]),
  };
}

function simulateInfo(url: string): VideoInfo {
  return {
    title: '模拟测试视频 · 用于离线功能验证',
    thumbnail: null,
    platform: 'simulated',
    duration: 90,
    uploader: 'Simulated Channel',
    webpageUrl: url,
    resolutions: [
      { height: 1080, label: '1080p', filesize: 24 * 1024 * 1024 },
      { height: 720, label: '720p', filesize: 14 * 1024 * 1024 },
      { height: 480, label: '480p', filesize: 8 * 1024 * 1024 },
    ],
  };
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return 'unknown';
  }
}

function filenameFromUrl(url: string): string {
  try {
    const u = new URL(url);
    const base = u.pathname.split('/').filter(Boolean).pop() || 'image';
    return decodeURIComponent(base) || 'image';
  } catch {
    return 'image';
  }
}

function imageInfo(url: string): VideoInfo {
  return {
    title: filenameFromUrl(url),
    thumbnail: url,
    platform: 'image',
    duration: null,
    uploader: hostOf(url),
    webpageUrl: url,
    resolutions: [],
    directUrl: url,
    isImage: true,
  };
}

export async function extractInfo(url: string): Promise<VideoInfo> {
  const trimmed = url.trim();
  if (config.enableSimulate && /^sim:\/\//i.test(trimmed)) {
    return simulateInfo(trimmed);
  }

  // 图片直链：直接作为下载地址
  if (isImageUrl(trimmed)) {
    return imageInfo(trimmed);
  }

  // X / Bilibili 优先走无需登录的原生解析
  const platformKey = detectPlatform(trimmed)?.key;
  if (platformKey === 'x') {
    const m = await resolveTwitterMedia(trimmed);
    if (m) return resolvedToInfo(m, 'x', trimmed);
    throw new AppError('YTDLP', '该推文中没有找到视频或图片（可能是纯文字推文，或 X 需要登录后才能查看媒体）', 422);
  }
  if (platformKey === 'bilibili') {
    const m = await resolveBilibiliMedia(trimmed);
    if (m) return resolvedToInfo(m, 'bilibili', trimmed);
    // 原生解析失败时回退 yt-dlp（会给出明确的 412 风控提示）
  }
  if (platformKey === 'instagram') {
    const m = await resolveInstagramMedia(trimmed);
    if (m) return resolvedToInfo(m, 'instagram', trimmed);
    // oEmbed 仅能解析图片；视频/多图或失败时回退 yt-dlp
  }

  const args = [
    '--dump-single-json',
    '--no-playlist',
    '--no-warnings',
    '--socket-timeout',
    '30',
    ...ytdlpRuntimeArgs(),
    ...ytdlpAuthArgs(),
    trimmed,
  ];
  const { stdout } = await collectOutput(args, config.requestTimeoutMs);
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(stdout) as Record<string, unknown>;
  } catch {
    throw new AppError('PARSE', '解析视频信息失败，平台返回数据无效', 422);
  }
  return mapInfo(parsed, trimmed);
}

function resolvedToInfo(m: ResolvedMedia, platform: string, url: string): VideoInfo {
  return {
    title: m.title,
    thumbnail: m.thumbnail,
    platform,
    duration: m.duration,
    uploader: m.author,
    webpageUrl: url,
    resolutions: m.resolutions,
    directUrl: m.directUrl,
    isImage: m.isImage,
  };
}
