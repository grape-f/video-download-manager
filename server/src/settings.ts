import path from 'node:path';
import { config } from './config';
import { getSettingRaw, setSettingRaw } from './db';
import { emitSettingsUpdated } from './bus';
import type { Settings } from './types';

const ALLOWED_CONCURRENCY = [1, 2, 3, 5, 10];

let current: Settings | null = null;

function defaults(): Settings {
  return {
    defaultQuality: config.defaultQuality,
    defaultFormat: config.defaultFormat,
    maxConcurrent: config.maxConcurrent,
    downloadDir: config.downloadDir,
    maxSpeed: config.maxSpeed,
    requestTimeoutMs: config.requestTimeoutMs,
    autoRetries: config.autoRetries,
    theme: 'system' as const,
  };
}

function resolveDir(dir: string): string {
  return path.isAbsolute(dir) ? dir : path.resolve(config.projectRoot, dir);
}

function sanitize(s: Settings): Settings {
  const concurrency = ALLOWED_CONCURRENCY.includes(s.maxConcurrent) ? s.maxConcurrent : 3;
  return {
    defaultQuality: s.defaultQuality || 'best',
    defaultFormat: s.defaultFormat || 'mp4',
    maxConcurrent: concurrency,
    downloadDir: resolveDir(s.downloadDir || config.downloadDir),
    maxSpeed: s.maxSpeed || null,
    requestTimeoutMs: Math.max(10_000, Math.min(600_000, Math.round(s.requestTimeoutMs || 120_000))),
    autoRetries: Math.max(0, Math.min(10, Math.round(s.autoRetries || 3))),
    theme: s.theme === 'light' || s.theme === 'dark' ? s.theme : 'system',
  };
}

export function loadSettings(): Settings {
  const raw = getSettingRaw('settings');
  if (raw) {
    try {
      current = sanitize({ ...defaults(), ...(JSON.parse(raw) as Partial<Settings>) });
    } catch {
      current = sanitize(defaults());
    }
  } else {
    current = sanitize(defaults());
  }
  persist();
  return current!;
}

export function getSettings(): Settings {
  if (!current) return loadSettings();
  return current!;
}

export function updateSettings(partial: Partial<Settings>): Settings {
  current = sanitize({ ...getSettings(), ...partial });
  persist();
  emitSettingsUpdated(current);
  return current!;
}

function persist(): void {
  setSettingRaw('settings', JSON.stringify(current));
}
