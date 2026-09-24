import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

interface BrowserCandidate {
  source: string;
  mtimeMs: number;
}

const HOME = os.homedir();

function safeStat(target: string): fs.Stats | null {
  try {
    return fs.statSync(target);
  } catch {
    return null;
  }
}

function chromiumUserDataDirs(): Array<{ browser: string; dir: string }> {
  const local = process.env.LOCALAPPDATA;
  const roaming = process.env.APPDATA;
  const dirs: Array<{ browser: string; dir: string }> = [];

  if (process.platform === 'win32') {
    if (local) {
      dirs.push({ browser: 'edge', dir: path.join(local, 'Microsoft', 'Edge', 'User Data') });
      dirs.push({ browser: 'chrome', dir: path.join(local, 'Google', 'Chrome', 'User Data') });
      dirs.push({ browser: 'brave', dir: path.join(local, 'BraveSoftware', 'Brave-Browser', 'User Data') });
      dirs.push({ browser: 'chromium', dir: path.join(local, 'Chromium', 'User Data') });
      dirs.push({ browser: 'vivaldi', dir: path.join(local, 'Vivaldi', 'User Data') });
    }
    if (roaming) {
      dirs.push({ browser: 'opera', dir: path.join(roaming, 'Opera Software', 'Opera Stable') });
    }
    return dirs;
  }

  if (process.platform === 'darwin') {
    dirs.push({ browser: 'edge', dir: path.join(HOME, 'Library', 'Application Support', 'Microsoft Edge') });
    dirs.push({ browser: 'chrome', dir: path.join(HOME, 'Library', 'Application Support', 'Google', 'Chrome') });
    dirs.push({ browser: 'brave', dir: path.join(HOME, 'Library', 'Application Support', 'BraveSoftware', 'Brave-Browser') });
    dirs.push({ browser: 'chromium', dir: path.join(HOME, 'Library', 'Application Support', 'Chromium') });
    dirs.push({ browser: 'vivaldi', dir: path.join(HOME, 'Library', 'Application Support', 'Vivaldi') });
    dirs.push({ browser: 'opera', dir: path.join(HOME, 'Library', 'Application Support', 'com.operasoftware.Opera') });
    return dirs;
  }

  dirs.push({ browser: 'chrome', dir: path.join(HOME, '.config', 'google-chrome') });
  dirs.push({ browser: 'edge', dir: path.join(HOME, '.config', 'microsoft-edge') });
  dirs.push({ browser: 'brave', dir: path.join(HOME, '.config', 'BraveSoftware', 'Brave-Browser') });
  dirs.push({ browser: 'chromium', dir: path.join(HOME, '.config', 'chromium') });
  dirs.push({ browser: 'vivaldi', dir: path.join(HOME, '.config', 'vivaldi') });
  dirs.push({ browser: 'opera', dir: path.join(HOME, '.config', 'opera') });
  return dirs;
}

function firefoxProfilesDirs(): string[] {
  if (process.platform === 'win32') {
    return process.env.APPDATA
      ? [path.join(process.env.APPDATA, 'Mozilla', 'Firefox', 'Profiles')]
      : [];
  }
  if (process.platform === 'darwin') {
    return [path.join(HOME, 'Library', 'Application Support', 'Firefox', 'Profiles')];
  }
  return [path.join(HOME, '.mozilla', 'firefox')];
}

function collectChromiumCandidates(): BrowserCandidate[] {
  const candidates: BrowserCandidate[] = [];

  for (const { browser, dir } of chromiumUserDataDirs()) {
    let profiles: string[];
    try {
      profiles = fs.readdirSync(dir);
    } catch {
      continue;
    }

    for (const profile of profiles) {
      if (profile === 'Guest Profile' || profile === 'System Profile') continue;
      const cookiePath = path.join(dir, profile, 'Network', 'Cookies');
      const stat = safeStat(cookiePath);
      if (stat?.isFile()) {
        candidates.push({ source: `${browser}:${profile}`, mtimeMs: stat.mtimeMs });
      }
    }

    // Opera / 部分 Chromium 变体的 Cookies 直接放在应用目录下。
    const direct = safeStat(path.join(dir, 'Network', 'Cookies'));
    if (direct?.isFile()) {
      candidates.push({ source: browser, mtimeMs: direct.mtimeMs });
    }
  }

  return candidates;
}

function collectFirefoxCandidates(): BrowserCandidate[] {
  const candidates: BrowserCandidate[] = [];

  for (const dir of firefoxProfilesDirs()) {
    let profiles: string[];
    try {
      profiles = fs.readdirSync(dir);
    } catch {
      continue;
    }

    for (const profile of profiles) {
      const stat = safeStat(path.join(dir, profile, 'cookies.sqlite'));
      if (stat?.isFile()) {
        candidates.push({ source: `firefox:${profile}`, mtimeMs: stat.mtimeMs });
      }
    }
  }

  return candidates;
}

/**
 * 按 cookies 数据库的修改时间倒序返回可用浏览器，最近的浏览器通常就是刚登录/刚用过的那一个。
 */
export function detectBrowserCookieSources(): string[] {
  const candidates = [...collectChromiumCandidates(), ...collectFirefoxCandidates()];
  candidates.sort((a, b) => b.mtimeMs - a.mtimeMs);
  return [...new Set(candidates.map((c) => c.source))];
}
