export const VIDEO_QUALITIES = ['best', '2160p', '1440p', '1080p', '720p', '480p', '360p'];
export const IMAGE_QUALITIES = ['original', '2160p', '1440p', '1080p', '720p', '480p', '360p'];

const UPSCALABLE_IMAGE_EXTS = new Set(['jpg', 'jpeg', 'png', 'webp', 'bmp']);

const HEIGHT_ALIASES: Record<string, number> = {
  '4k': 2160,
  '2k': 1440,
};

export function parseTargetHeight(resolution: string | null | undefined): number {
  if (!resolution) return 0;
  const key = resolution.trim().toLowerCase();
  if (!key || key === 'best' || key === 'original') return 0;

  const alias = HEIGHT_ALIASES[key];
  if (alias !== undefined) return alias;

  const match = /^(\d{3,4})p?$/.exec(key);
  return match ? Number(match[1]) : 0;
}

export function qualityLabel(resolution: string | null | undefined): string {
  if (resolution === 'best') return '最佳可用';
  if (resolution === 'original') return '原图';
  const height = parseTargetHeight(resolution);
  if (height === 1440) return '1440p（2K）';
  if (height === 2160) return '2160p（4K）';
  return height > 0 ? `${height}p` : String(resolution ?? '');
}

export function canUpscaleImageExt(ext: string | null | undefined): boolean {
  return !!ext && UPSCALABLE_IMAGE_EXTS.has(ext.toLowerCase());
}
