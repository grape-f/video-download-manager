const HEIGHT_ALIASES: Record<string, number> = {
  '4k': 2160,
  '2k': 1440,
};

/**
 * 把 "1440p" / "2k" / 1440 这类写法统一解析为目标高度。
 * best / original / 空值返回 0，表示不指定目标高度。
 */
export function parseTargetHeight(resolution: string | null | undefined): number {
  if (!resolution) return 0;
  const key = resolution.trim().toLowerCase();
  if (!key || key === 'best' || key === 'original') return 0;

  const alias = HEIGHT_ALIASES[key];
  if (alias !== undefined) return alias;

  const match = /^(\d{3,4})p?$/.exec(key);
  return match ? Number(match[1]) : 0;
}
