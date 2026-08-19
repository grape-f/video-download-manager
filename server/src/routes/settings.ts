import { Router } from 'express';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { getSettings, updateSettings } from '../settings';
import { config } from '../config';
import { queue } from '../services/queue';
import { wrap } from '../utils/asyncHandler';
import type { SystemStatus } from '../types';

const router = Router();

router.get(
  '/settings',
  wrap(async (_req, res) => {
    res.json(getSettings());
  }),
);

router.put(
  '/settings',
  wrap(async (req, res) => {
    const body = req.body || {};
    const partial: Record<string, unknown> = {};
    for (const key of [
      'defaultQuality',
      'defaultFormat',
      'maxConcurrent',
      'downloadDir',
      'maxSpeed',
      'requestTimeoutMs',
      'autoRetries',
      'theme',
    ]) {
      if (body[key] !== undefined) partial[key] = body[key];
    }
    const settings = updateSettings(partial as never);
    queue.notifySettingsChanged();
    res.json(settings);
  }),
);

router.get(
  '/system',
  wrap(async (_req, res) => {
    const status: SystemStatus = {
      version: config.version,
      databaseStatus: fileWritable(config.dbPath) ? 'ok' : 'error',
      databasePath: config.dbPath,
      downloadDir: config.downloadDir,
      downloadDirStatus: fileWritable(config.downloadDir) ? 'ok' : 'error',
      diskFreeBytes: diskFree(config.downloadDir),
      diskTotalBytes: diskTotal(config.downloadDir),
      ytdlpAvailable: checkCommand(config.ytdlpPath),
      ffmpegAvailable: checkFfmpeg(),
    };
    res.json(status);
  }),
);

function fileWritable(target: string): boolean {
  try {
    const stat = fs.statSync(target);
    if (stat.isDirectory()) {
      fs.accessSync(target, fs.constants.W_OK);
      return true;
    }
    fs.accessSync(target, fs.constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

function diskFree(target: string): number | null {
  try {
    const s = fs.statfsSync(target);
    return s.bavail * s.bsize;
  } catch {
    return null;
  }
}

function diskTotal(target: string): number | null {
  try {
    const s = fs.statfsSync(target);
    return s.blocks * s.bsize;
  } catch {
    return null;
  }
}

function checkCommand(command: string): boolean {
  try {
    const r = spawnSync(command, ['--version'], { timeout: 8000, windowsHide: true });
    return r.status === 0;
  } catch {
    return false;
  }
}

function checkFfmpeg(): boolean {
  if (!config.ffmpegPath) return false;
  try {
    if (!fs.existsSync(config.ffmpegPath)) return false;
    const stat = fs.statSync(config.ffmpegPath);
    const dir = stat.isDirectory() ? config.ffmpegPath : null;
    if (dir) {
      const exe = process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg';
      return fs.existsSync(path.join(dir, exe));
    }
    return true;
  } catch {
    return false;
  }
}

export default router;
