import { createHash } from 'node:crypto';
import type { ResolutionOption } from '../types';
import { parseTargetHeight } from '../utils/resolution';

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
const BILI_REFERER = 'https://www.bilibili.com/';

export interface ResolvedMedia {
  directUrl: string;
  title: string;
  thumbnail: string | null;
  author: string | null;
  duration: number | null;
  resolutions: ResolutionOption[];
  isImage?: boolean;
}

async function fetchJson(
  url: string,
  headers?: Record<string, string>,
  timeoutMs = 15_000,
): Promise<Record<string, unknown>> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const resp = await fetch(url, {
      headers: { 'user-agent': UA, ...headers },
      signal: ctrl.signal,
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    return (await resp.json()) as Record<string, unknown>;
  } finally {
    clearTimeout(timer);
  }
}

// ============ X / Twitter：FixTweet 镜像解析（无需登录） ============

function extractTweetId(url: string): { user: string; id: string } | null {
  const m = /(?:x\.com|twitter\.com)\/([\w-]+)\/status\/(\d+)/i.exec(url);
  if (!m) return null;
  return { user: m[1], id: m[2] };
}

export async function resolveTwitterMedia(url: string): Promise<ResolvedMedia | null> {
  const t = extractTweetId(url);
  if (!t) return null;

  for (const base of ['https://api.fxtwitter.com', 'https://api.vxtwitter.com']) {
    try {
      const json = await fetchJson(`${base}/${t.user}/status/${t.id}`);

      if (base.includes('fxtwitter')) {
        const tweet = (json.tweet ?? {}) as Record<string, unknown>;
        const media = (tweet.media ?? {}) as Record<string, unknown>;
        const author = (tweet.author ?? {}) as Record<string, unknown>;
        const title = String(tweet.text || `${t.user} 的推文`).slice(0, 120);
        const authorName = author.name ? `${author.name} (@${author.screen_name})` : `@${t.user}`;

        const videos = (media.videos ?? []) as Array<Record<string, unknown>>;
        if (Array.isArray(videos) && videos.length > 0) {
          const video = videos[0];
          return {
            directUrl: String(video.url || ''),
            title,
            thumbnail: (video.thumbnail as string) || (author.avatar_url as string) || null,
            author: authorName,
            duration: typeof video.duration === 'number' ? video.duration : null,
            resolutions: [],
            isImage: false,
          };
        }

        const photos = (media.photos ?? []) as Array<Record<string, unknown>>;
        if (Array.isArray(photos) && photos.length > 0) {
          const photo = photos[0];
          return {
            directUrl: String(photo.url || ''),
            title,
            thumbnail: (photo.url as string) || null,
            author: authorName,
            duration: null,
            resolutions: [],
            isImage: true,
          };
        }
        continue;
      }

      // vxtwitter 格式
      const mediaList = (json.media_extended ?? []) as Array<Record<string, unknown>>;
      const video = mediaList.find((v) => v.type === 'video');
      if (video) {
        return {
          directUrl: String(video.url || ''),
          title: String(json.text || `${t.user} 的推文`).slice(0, 120),
          thumbnail: (video.thumbnail_url as string) || null,
          author: json.user_name ? `${json.user_name} (@${json.user_screen_name})` : `@${t.user}`,
          duration: typeof video.duration === 'number' ? video.duration : null,
          resolutions: [],
          isImage: false,
        };
      }
      const image = mediaList.find((v) => v.type === 'image' || v.type === 'photo');
      if (image) {
        return {
          directUrl: String(image.url || ''),
          title: String(json.text || `${t.user} 的推文`).slice(0, 120),
          thumbnail: (image.thumbnail_url as string) || null,
          author: json.user_name ? `${json.user_name} (@${json.user_screen_name})` : `@${t.user}`,
          duration: null,
          resolutions: [],
          isImage: true,
        };
      }
    } catch {
      continue;
    }
  }
  return null;
}

// ============ Instagram：公开帖子 oEmbed 解析（无需登录） ============

function extractInstagramShortcode(url: string): string | null {
  const m = /instagram\.com\/(?:p|reel|reels|tv)\/([\w-]+)/i.exec(url);
  return m ? m[1] : null;
}

export async function resolveInstagramMedia(url: string): Promise<ResolvedMedia | null> {
  const shortcode = extractInstagramShortcode(url);
  if (!shortcode) return null;
  try {
    const postUrl = `https://www.instagram.com/p/${shortcode}/`;
    const json = await fetchJson(
      `https://api.instagram.com/oembed/?url=${encodeURIComponent(postUrl)}`,
    );
    const thumb = json.thumbnail_url;
    if (!thumb) return null;
    return {
      directUrl: String(thumb),
      title: String(json.title || 'Instagram 图片').slice(0, 120),
      thumbnail: String(thumb),
      author: json.author_name ? String(json.author_name) : null,
      duration: null,
      resolutions: [],
      isImage: true,
    };
  } catch {
    return null;
  }
}

// ============ Bilibili：公开 API + WBI 签名（无需登录 Cookie） ============

function extractBvid(url: string): string | null {
  const m = /bilibili\.com\/video\/(BV[\w]+|av\d+)/i.exec(url);
  return m ? m[1] : null;
}

const MIXIN_KEY_ENC_TAB = [
  46, 47, 18, 2, 53, 8, 23, 32, 15, 50, 10, 31, 58, 3, 45, 35, 27, 43, 5, 49, 33, 9, 42, 19,
  29, 28, 14, 39, 12, 38, 41, 13, 37, 48, 7, 16, 24, 55, 40, 61, 26, 17, 0, 1, 60, 51, 30, 4,
  22, 25, 54, 21, 56, 59, 6, 63, 57, 62, 11, 36, 20, 34, 44, 52,
];

function md5(s: string): string {
  return createHash('md5').update(s).digest('hex');
}

function getMixinKey(orig: string): string {
  return MIXIN_KEY_ENC_TAB.slice(0, 32)
    .map((i) => orig[i])
    .join('');
}

function signWbi(
  params: Record<string, string | number>,
  mixinKey: string,
): Record<string, string> {
  const wts = Math.round(Date.now() / 1000).toString();
  const all: Record<string, string> = {};
  for (const [k, v] of Object.entries(params)) all[k] = String(v);
  all.wts = wts;

  const query = Object.keys(all)
    .sort()
    .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(all[k].replace(/[!'()*]/g, ''))}`)
    .join('&');

  return { ...all, w_rid: md5(query + mixinKey) };
}

function toQuery(params: Record<string, string>): string {
  return Object.entries(params)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');
}

// B 站清晰度编号：120=4K，116=1080P60，112=1080P+，80=1080P，74=720P60，64=720P，32=480P，16=360P
const BEST_QNS = [120, 116, 112, 80, 64, 32, 16];
const UP_TO_1080_QNS = [116, 112, 80, 64, 32, 16];
const QNS_BY_TARGET: Array<{ height: number; qns: number[] }> = [
  { height: 2160, qns: BEST_QNS },
  // B 站没有原生 1440p，2K 目标优先取 <=1080p 的源，再由 ffmpeg 放大到 1440p
  { height: 1440, qns: UP_TO_1080_QNS },
  { height: 1080, qns: UP_TO_1080_QNS },
  { height: 720, qns: [74, 64, 32, 16] },
  { height: 480, qns: [32, 16] },
  { height: 360, qns: [16] },
];

async function getWbiKeys(): Promise<{ imgKey: string; subKey: string } | null> {
  const json = await fetchJson('https://api.bilibili.com/x/web-interface/nav', {
    referer: BILI_REFERER,
  });
  const data = (json.data ?? {}) as Record<string, unknown>;
  const wbi = (data.wbi_img ?? {}) as Record<string, unknown>;
  const img = String(wbi.img_url || '');
  const sub = String(wbi.sub_url || '');
  if (!img || !sub) return null;
  const imgKey = img.split('/').pop()?.split('.')[0] || '';
  const subKey = sub.split('/').pop()?.split('.')[0] || '';
  if (!imgKey || !subKey) return null;
  return { imgKey, subKey };
}

interface BiliInfo {
  cid: number;
  title: string;
  thumbnail: string | null;
  author: string | null;
  duration: number | null;
}

async function getBiliInfo(bvid: string, mixinKey: string): Promise<BiliInfo | null> {
  const viewParams = signWbi({ bvid }, mixinKey);
  const view = await fetchJson(
    `https://api.bilibili.com/x/web-interface/view?${toQuery(viewParams)}`,
    { referer: BILI_REFERER },
  );
  const data = (view.data ?? {}) as Record<string, unknown>;
  if (view.code !== 0 || data.cid == null) return null;
  const owner = (data.owner ?? {}) as Record<string, unknown>;
  return {
    cid: Number(data.cid),
    title: String(data.title || ''),
    thumbnail: (data.pic as string) || null,
    author: (owner.name as string) || null,
    duration: typeof data.duration === 'number' ? data.duration : null,
  };
}

async function getBiliStreamUrl(
  bvid: string,
  cid: number,
  qn: number,
  mixinKey: string,
): Promise<string | null> {
  const playParams = signWbi({ bvid, cid, fnval: 1, fnver: 0, fourk: 1, qn }, mixinKey);
  const play = await fetchJson(
    `https://api.bilibili.com/x/player/playurl?${toQuery(playParams)}`,
    { referer: BILI_REFERER },
  );
  const data = (play.data ?? {}) as Record<string, unknown>;
  if (play.code !== 0) return null;
  const durl = data.durl as Array<Record<string, unknown>> | undefined;
  if (!Array.isArray(durl) || durl.length === 0 || !durl[0].url) return null;
  return String(durl[0].url);
}

export async function resolveBilibiliMedia(
  url: string,
  height?: string | null,
): Promise<ResolvedMedia | null> {
  const bvid = extractBvid(url);
  if (!bvid) return null;

  try {
    const keys = await getWbiKeys();
    if (!keys) return null;
    const mixinKey = getMixinKey(keys.imgKey + keys.subKey);

    const info = await getBiliInfo(bvid, mixinKey);
    if (!info) return null;

    // 目标清晰度 → qn 尝试链；best 从高到低尝试，具体目标不会拉超过目标高度的源
    const targetHeight = parseTargetHeight(height);
    const qns =
      targetHeight > 0
        ? QNS_BY_TARGET.find((c) => c.height === targetHeight)?.qns ?? UP_TO_1080_QNS
        : BEST_QNS;

    let directUrl: string | null = null;
    for (const qn of qns) {
      const u = await getBiliStreamUrl(bvid, info.cid, qn, mixinKey);
      if (u) {
        directUrl = u;
        break;
      }
    }
    if (!directUrl) return null;

    return {
      directUrl,
      title: info.title || bvid,
      thumbnail: info.thumbnail,
      author: info.author,
      duration: info.duration,
      resolutions: [1080, 720, 480, 360].map((h) => ({
        height: h,
        label: `${h}p`,
        filesize: null,
      })),
    };
  } catch {
    return null;
  }
}
