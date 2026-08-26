export interface PlatformVisual {
  key: string;
  name: string;
  color: string;
  badgeClass: string;
}

const PLATFORM_MAP: Record<string, PlatformVisual> = {
  youtube: {
    key: 'youtube',
    name: 'YouTube',
    color: '#ff0033',
    badgeClass: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400',
  },
  bilibili: {
    key: 'bilibili',
    name: 'Bilibili',
    color: '#00a1d6',
    badgeClass: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-400',
  },
  vimeo: {
    key: 'vimeo',
    name: 'Vimeo',
    color: '#1ab7ea',
    badgeClass: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-400',
  },
  x: {
    key: 'x',
    name: 'X (Twitter)',
    color: '#0f1419',
    badgeClass: 'bg-slate-200 text-slate-800 dark:bg-slate-700/40 dark:text-slate-300',
  },
  twitter: {
    key: 'x',
    name: 'X (Twitter)',
    color: '#0f1419',
    badgeClass: 'bg-slate-200 text-slate-800 dark:bg-slate-700/40 dark:text-slate-300',
  },
  tiktok: {
    key: 'tiktok',
    name: 'TikTok',
    color: '#111111',
    badgeClass: 'bg-slate-200 text-slate-800 dark:bg-slate-700/40 dark:text-slate-300',
  },
  instagram: {
    key: 'instagram',
    name: 'Instagram',
    color: '#e1306c',
    badgeClass: 'bg-pink-100 text-pink-700 dark:bg-pink-500/15 dark:text-pink-400',
  },
  simulated: {
    key: 'simulated',
    name: '模拟源',
    color: '#6366f1',
    badgeClass: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-400',
  },
  image: {
    key: 'image',
    name: '图片',
    color: '#14b8a6',
    badgeClass: 'bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-400',
  },
  unknown: {
    key: 'unknown',
    name: '未知',
    color: '#94a3b8',
    badgeClass: 'bg-slate-100 text-slate-600 dark:bg-slate-700/40 dark:text-slate-400',
  },
};

export function platformVisual(key: string | null | undefined): PlatformVisual {
  if (!key) return PLATFORM_MAP.unknown;
  return PLATFORM_MAP[key.toLowerCase()] ?? PLATFORM_MAP.unknown;
}
