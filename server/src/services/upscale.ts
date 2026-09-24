import { spawn, type ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { config } from '../config';
import type { MediaFile } from '../types';

export interface MediaTools {
  ffmpeg: string | null;
  ffprobe: string | null;
}

export interface UpscaleHandlers {
  onLog: (line: string) => void;
  onChild: (child: ChildProcess | null) => void;
}

const IMAGE_EXTS = new Set(['jpg', 'jpeg', 'png', 'webp', 'bmp']);
const VIDEO_EXTS = new Set(['mp4', 'webm', 'mkv']);

function extensionOf(filePath: string): string {
  return path.extname(filePath).slice(1).toLowerCase();
}

/**
 * 解析 ffmpeg / ffprobe 可执行文件。FFMPEG_PATH 既支持目录，也支持直接指向 ffmpeg 可执行文件。
 */
export function resolveMediaTools(): MediaTools {
  if (!config.ffmpegPath) return { ffmpeg: null, ffprobe: null };
  try {
    if (!fs.existsSync(config.ffmpegPath)) return { ffmpeg: null, ffprobe: null };
    const stat = fs.statSync(config.ffmpegPath);
    const ffmpegExe = process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg';
    const ffprobeExe = process.platform === 'win32' ? 'ffprobe.exe' : 'ffprobe';

    if (stat.isDirectory()) {
      const ffmpeg = path.join(config.ffmpegPath, ffmpegExe);
      const ffprobe = path.join(config.ffmpegPath, ffprobeExe);
      return {
        ffmpeg: fs.existsSync(ffmpeg) ? ffmpeg : null,
        ffprobe: fs.existsSync(ffprobe) ? ffprobe : null,
      };
    }

    const siblingProbe = path.join(path.dirname(config.ffmpegPath), ffprobeExe);
    return {
      ffmpeg: config.ffmpegPath,
      ffprobe: fs.existsSync(siblingProbe) ? siblingProbe : null,
    };
  } catch {
    return { ffmpeg: null, ffprobe: null };
  }
}

export function ffmpegAvailable(): boolean {
  return resolveMediaTools().ffmpeg !== null;
}

interface ProcessResult {
  code: number;
  stdout: string;
  stderr: string;
}

function runProcess(
  command: string,
  args: string[],
  handlers?: UpscaleHandlers,
): Promise<ProcessResult> {
  return new Promise((resolve) => {
    const child = spawn(command, args, { windowsHide: true });
    handlers?.onChild(child);
    let stdout = '';
    let stderr = '';
    let settled = false;
    const finish = (code: number) => {
      if (settled) return;
      settled = true;
      handlers?.onChild(null);
      resolve({ code, stdout, stderr });
    };
    child.stdout?.on('data', (d: Buffer) => (stdout += d.toString()));
    child.stderr?.on('data', (d: Buffer) => (stderr += d.toString()));
    child.on('error', (err) => {
      stderr += err.message;
      finish(-1);
    });
    child.on('close', (code) => finish(code ?? -1));
  });
}

async function probeHeight(ffprobe: string, filePath: string): Promise<number | null> {
  const { code, stdout } = await runProcess(ffprobe, [
    '-v',
    'error',
    '-select_streams',
    'v:0',
    '-show_entries',
    'stream=height',
    '-of',
    'csv=p=0',
    filePath,
  ]);
  if (code !== 0) return null;
  const height = parseInt(stdout.trim(), 10);
  return Number.isFinite(height) ? height : null;
}

function videoCodecArgs(ext: string): string[] {
  if (ext === 'webm') {
    return ['-c:v', 'libvpx-vp9', '-crf', '32', '-b:v', '0', '-c:a', 'libopus'];
  }
  return ['-c:v', 'libx264', '-preset', 'veryfast', '-crf', '18', '-c:a', 'aac', '-b:a', '192k'];
}

function imageCodecArgs(ext: string): string[] {
  if (ext === 'png') return ['-compression_level', '6'];
  if (ext === 'webp') return ['-quality', '90'];
  if (ext === 'bmp') return [];
  return ['-q:v', '2'];
}

/**
 * 源分辨率低于目标时，用 ffmpeg 放大到目标高度。
 * 缺少 ffmpeg/ffprobe、格式不支持、放大失败时，原样返回已下载文件。
 */
export async function upscaleMediaIfNeeded(
  result: MediaFile,
  targetHeight: number,
  handlers: UpscaleHandlers,
): Promise<MediaFile> {
  if (targetHeight <= 0) return result;

  const ext = extensionOf(result.filePath);
  const isImage = IMAGE_EXTS.has(ext);
  const isVideo = VIDEO_EXTS.has(ext);
  if (!isImage && !isVideo) return result;

  const { ffmpeg, ffprobe } = resolveMediaTools();
  if (!ffmpeg || !ffprobe) return result;

  const currentHeight = await probeHeight(ffprobe, result.filePath);
  if (currentHeight == null || currentHeight >= targetHeight) return result;

  const dir = path.dirname(result.filePath);
  const base = path.basename(result.filePath, path.extname(result.filePath));
  const tempPath = path.join(dir, `${base}.upscale.${ext}`);
  const filter = `scale=-2:${targetHeight}:flags=lanczos`;
  const args = isImage
    ? ['-y', '-i', result.filePath, '-vf', filter, ...imageCodecArgs(ext), tempPath]
    : [
        '-y',
        '-i',
        result.filePath,
        '-map',
        '0:v:0',
        '-map',
        '0:a?',
        '-vf',
        filter,
        ...videoCodecArgs(ext),
        tempPath,
      ];

  handlers.onLog(`[enhance] 源分辨率 ${currentHeight}p 低于目标 ${targetHeight}p，使用 ffmpeg 放大`);

  try {
    const { code, stderr } = await runProcess(ffmpeg, args, handlers);
    if (code !== 0) {
      fs.rmSync(tempPath, { force: true });
      handlers.onLog(`[enhance] 放大失败，保留原始文件：${stderr.trim().slice(0, 200)}`);
      return result;
    }
    const stat = fs.statSync(tempPath);
    fs.rmSync(result.filePath, { force: true });
    fs.renameSync(tempPath, result.filePath);
    return { filePath: result.filePath, filesize: stat.size };
  } catch {
    fs.rmSync(tempPath, { force: true });
    return result;
  }
}
