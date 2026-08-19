export interface PlatformMeta {
  key: string;
  name: string;
}

const PATTERNS: Array<{ key: string; name: string; re: RegExp }> = [
  {
    key: 'youtube',
    name: 'YouTube',
    re: /(?:youtube\.com\/(?:watch\?[^#\s]*v=|shorts\/|embed\/|live\/|v\/)|youtu\.be\/)([\w-]{6,})/i,
  },
  {
    key: 'bilibili',
    name: 'Bilibili',
    re: /(?:bilibili\.com\/video\/(BV[\w]+|av\d+)|b23\.tv\/[\w]+)/i,
  },
  { key: 'vimeo', name: 'Vimeo', re: /vimeo\.com\/\d+/i },
  {
    key: 'x',
    name: 'X (Twitter)',
    re: /(?:x\.com|twitter\.com)\/[\w-]+\/status\/\d+/i,
  },
  {
    key: 'tiktok',
    name: 'TikTok',
    re: /(?:tiktok\.com\/@?[\w.-]+\/video\/\d+|vm\.tiktok\.com\/[\w-]+)/i,
  },
  {
    key: 'instagram',
    name: 'Instagram',
    re: /instagram\.com\/(?:reel|reels|p|tv)\/[\w-]+/i,
  },
];

const SUPPORTED_PLATFORMS = ['youtube', 'bilibili', 'vimeo', 'x', 'tiktok', 'instagram'] as const;

export function isSupportedPlatform(key: string): boolean {
  return (SUPPORTED_PLATFORMS as readonly string[]).includes(key);
}

export function detectPlatform(url: string): PlatformMeta | null {
  const trimmed = (url || '').trim();
  if (!trimmed) return null;
  if (/^sim:\/\//i.test(trimmed)) return { key: 'simulated', name: '模拟源 (Simulated)' };
  for (const p of PATTERNS) {
    if (p.re.test(trimmed)) return { key: p.key, name: p.name };
  }
  return null;
}

export function isValidHttpUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}
