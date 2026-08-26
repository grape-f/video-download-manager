import { Download, Link2, Loader2, Sparkles, Wand2 } from 'lucide-react';
import { useMemo, useState, type DragEvent, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useStore } from '../lib/store';
import { formatBytes, formatDuration } from '../lib/format';
import { platformVisual } from '../lib/platform';
import { Button } from '../components/ui/Button';
import { Field, Select } from '../components/ui/fields';
import { Thumbnail } from '../components/Thumbnail';
import type { ParseResult } from '../types';

const PLATFORMS = ['youtube', 'bilibili', 'vimeo', 'x', 'tiktok', 'instagram', 'image'];
const FORMATS = ['mp4', 'webm', 'mkv'];

export function Home() {
  const navigate = useNavigate();
  const { settings, toast, upsertTask } = useStore();
  const [url, setUrl] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ParseResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resolution, setResolution] = useState('best');
  const [format, setFormat] = useState('mp4');

  const visual = result ? platformVisual(result.platform.key) : null;
  const isImage = !!result?.info.isImage;

  const imageExt = useMemo(() => {
    if (!result?.info.isImage) return null;
    const m = /\.(jpe?g|png|webp|gif|bmp|avif|svg|ico)(?:[?#]|$)/i.exec(result.info.webpageUrl);
    return m ? (m[1].toLowerCase() === 'jpeg' ? 'jpg' : m[1].toLowerCase()) : 'jpg';
  }, [result]);

  const resolutionOptions = useMemo(() => {
    const detected = (result?.info.resolutions ?? []).map((r) => r.label);
    return [...new Set(['best', ...detected])];
  }, [result]);

  const selectedFilesize = useMemo(() => {
    if (!result || resolution === 'best') return null;
    const height = parseInt(resolution, 10);
    return result.info.resolutions.find((r) => r.height === height)?.filesize ?? null;
  }, [result, resolution]);

  const parse = async (value?: string) => {
    const target = (value ?? url).trim();
    if (!target) {
      setError('请输入视频或图片链接');
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const r = await api.parse(target);
      setResult(r);
      setResolution(settings?.defaultQuality ?? 'best');
      setFormat(settings?.defaultFormat ?? 'mp4');
    } catch (err) {
      setError(err instanceof Error ? err.message : '解析失败');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void parse();
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const text =
      e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text/plain') || '';
    const first = text.split('\n').map((s) => s.trim()).find(Boolean);
    if (first) {
      setUrl(first);
      void parse(first);
    }
  };

  const addToQueue = async () => {
    if (!result) return;
    setSubmitting(true);
    try {
      const task = await api.createTask({
        url: result.info.webpageUrl,
        resolution: isImage ? undefined : resolution,
        format: isImage ? undefined : format,
        info: { ...result.info, platform: result.platform.key },
      });
      upsertTask(task);
      toast('success', '已加入下载队列');
      navigate('/tasks');
    } catch (err) {
      toast('error', err instanceof Error ? err.message : '加入队列失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="animate-fade-in">
      {/* Hero */}
      <div className="mx-auto max-w-2xl pt-4 text-center sm:pt-10">
        <div className="mx-auto mb-4 inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-600 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-400">
          <Sparkles className="h-3.5 w-3.5" />
          支持 YouTube · Bilibili · Vimeo · X · TikTok · Instagram · 图片直链
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
          在线视频下载管理器
        </h1>
        <p className="mt-3 text-base text-slate-500 dark:text-slate-400">
          统一管理你的在线视频与图片下载任务
        </p>
      </div>

      {/* URL 输入 */}
      <div className="mx-auto mt-8 max-w-2xl">
        <form
          onSubmit={onSubmit}
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={onDrop}
          className={`rounded-2xl border-2 border-dashed bg-white p-2 shadow-sm transition-colors dark:bg-slate-900 ${
            dragActive
              ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-500/5'
              : 'border-slate-200 dark:border-slate-800'
          }`}
        >
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Link2 className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="粘贴视频或图片链接，或将链接拖拽到此处"
                className="h-12 w-full rounded-xl border-0 bg-transparent pl-10 pr-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none dark:text-slate-100 dark:placeholder-slate-500"
              />
            </div>
            <Button type="submit" size="lg" loading={loading} className="h-12 w-full sm:w-auto">
              {!loading && <Wand2 className="h-4 w-4" />}
              解析链接
            </Button>
          </div>
        </form>

        {error && (
          <div className="mt-3 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-500/10 dark:text-red-400">
            {error}
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <span className="text-xs text-slate-400 dark:text-slate-500">支持平台：</span>
          {PLATFORMS.map((p) => (
            <span
              key={p}
              className={`rounded-full px-2.5 py-1 text-xs font-medium ${platformVisual(p).badgeClass}`}
            >
              {platformVisual(p).name}
            </span>
          ))}
        </div>

        <p className="mt-3 text-center text-[11px] text-slate-400 dark:text-slate-600">
          仅用于下载你有权访问的公开视频与图片 · 不破解 DRM、不绕过付费墙或登录限制 ·{' '}
          <button
            className="text-indigo-500 hover:underline"
            onClick={() => {
              setUrl('sim://5@8');
              void parse('sim://5@8');
            }}
          >
            使用模拟源快速体验
          </button>
        </p>
      </div>

      {/* 预览卡片 */}
      {result && (
        <div className="mx-auto mt-8 max-w-2xl animate-slide-up">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            {isImage ? (
              <div className="p-5">
                <img
                  src={result.info.thumbnail ?? result.info.webpageUrl}
                  alt={result.info.title}
                  className="mx-auto max-h-72 w-auto max-w-full rounded-lg object-contain"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
                <div className="mt-4">
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${visual?.badgeClass}`}>
                      {visual?.name}
                    </span>
                    {result.info.uploader && (
                      <span className="truncate text-xs text-slate-400">{result.info.uploader}</span>
                    )}
                  </div>
                  <h2
                    className="mt-2 truncate text-base font-semibold text-slate-900 dark:text-slate-100"
                    title={result.info.title}
                  >
                    {result.info.title}
                  </h2>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-4 p-5 sm:flex-row">
                <Thumbnail
                  src={result.info.thumbnail}
                  platform={result.platform.key}
                  className="h-40 w-full sm:h-32 sm:w-56"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${visual?.badgeClass}`}>
                      {visual?.name}
                    </span>
                    {result.info.duration != null && (
                      <span className="text-xs text-slate-400">{formatDuration(result.info.duration)}</span>
                    )}
                  </div>
                  <h2 className="mt-2 line-clamp-2 text-base font-semibold text-slate-900 dark:text-slate-100">
                    {result.info.title}
                  </h2>
                  {result.info.uploader && (
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{result.info.uploader}</p>
                  )}
                </div>
              </div>
            )}

            <div className="border-t border-slate-100 p-5 dark:border-slate-800">
              {isImage ? (
                <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
                  <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                    <span>原图</span>
                    {imageExt && (
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        {imageExt.toUpperCase()}
                      </span>
                    )}
                    <span className="hidden text-xs text-slate-400 sm:inline">→ {settings?.downloadDir}</span>
                  </div>
                  <Button size="lg" loading={submitting} onClick={addToQueue} className="w-full sm:w-auto">
                    {!submitting && <Download className="h-4 w-4" />}
                    加入下载队列
                  </Button>
                </div>
              ) : (
                <>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <Field label="视频质量">
                      <Select value={resolution} onChange={(e) => setResolution(e.target.value)}>
                        {resolutionOptions.map((r) => (
                          <option key={r} value={r}>
                            {r === 'best' ? '最佳可用' : r}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    <Field label="文件格式">
                      <Select value={format} onChange={(e) => setFormat(e.target.value)}>
                        {FORMATS.map((f) => (
                          <option key={f} value={f}>
                            {f.toUpperCase()}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    <Field label="保存位置" hint={settings?.downloadDir}>
                      <div className="h-10 truncate rounded-lg border border-dashed border-slate-300 px-3 py-2 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
                        {settings?.downloadDir ?? '默认下载目录'}
                      </div>
                    </Field>
                  </div>

                  <div className="mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row">
                    <div className="text-sm text-slate-500 dark:text-slate-400">
                      {resolution !== 'best' && <span className="mr-2">预计大小 {formatBytes(selectedFilesize)}</span>}
                      {format && <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">{format.toUpperCase()}</span>}
                    </div>
                    <Button size="lg" loading={submitting} onClick={addToQueue} className="w-full sm:w-auto">
                      {!submitting && <Download className="h-4 w-4" />}
                      加入下载队列
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {loading && (
        <div className="mx-auto mt-8 flex max-w-2xl items-center justify-center gap-2 text-sm text-slate-500 dark:text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          正在解析…
        </div>
      )}
    </div>
  );
}
