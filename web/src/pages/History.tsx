import { History as HistoryIcon, Search, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, type HistoryQuery } from '../lib/api';
import { useStore } from '../lib/store';
import { formatBytes, formatDate } from '../lib/format';
import { platformVisual } from '../lib/platform';
import { StatusBadge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { Input, Select } from '../components/ui/fields';
import type { DownloadTask } from '../types';

const PLATFORMS = ['', 'youtube', 'bilibili', 'vimeo', 'x', 'tiktok', 'instagram'];
const STATUSES = [
  { value: '', label: '全部状态' },
  { value: 'completed', label: '已完成' },
  { value: 'failed', label: '失败' },
  { value: 'cancelled', label: '已取消' },
];

export function History() {
  const { toast } = useStore();
  const [search, setSearch] = useState('');
  const [platform, setPlatform] = useState('');
  const [status, setStatus] = useState('');
  const [sort, setSort] = useState('newest');
  const [items, setItems] = useState<DownloadTask[]>([]);
  const [loading, setLoading] = useState(true);

  const query: HistoryQuery = useMemo(
    () => ({ search: search || undefined, platform: platform || undefined, status: status || undefined, sort }),
    [search, platform, status, sort],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await api.history(query));
    } catch (err) {
      toast('error', err instanceof Error ? err.message : '加载历史失败');
    } finally {
      setLoading(false);
    }
  }, [query, toast]);

  useEffect(() => {
    const t = window.setTimeout(() => void load(), 300);
    return () => window.clearTimeout(t);
  }, [load]);

  const deleteOne = async (id: string) => {
    try {
      await api.deleteHistory(id);
      setItems((prev) => prev.filter((t) => t.id !== id));
      toast('success', '历史记录已删除（文件保留）');
    } catch (err) {
      toast('error', err instanceof Error ? err.message : '删除失败');
    }
  };

  const clearAll = async () => {
    if (items.length === 0) return;
    try {
      await api.clearHistory(items.map((t) => t.id));
      setItems([]);
      toast('success', '已清空历史记录（文件保留）');
    } catch (err) {
      toast('error', err instanceof Error ? err.message : '清空失败');
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">下载历史</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            查看与管理已完成的下载记录
          </p>
        </div>
        <Button size="sm" variant="outline" icon={<Trash2 className="h-4 w-4" />} onClick={clearAll} disabled={items.length === 0}>
          清空历史
        </Button>
      </div>

      <Card className="mt-5">
        <div className="grid gap-3 border-b border-slate-100 p-4 dark:border-slate-800 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative sm:col-span-2 lg:col-span-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              className="pl-9"
              placeholder="搜索视频名称或链接"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={platform} onChange={(e) => setPlatform(e.target.value)}>
            <option value="">全部平台</option>
            {PLATFORMS.filter(Boolean).map((p) => (
              <option key={p} value={p}>
                {platformVisual(p).name}
              </option>
            ))}
          </Select>
          <Select value={status} onChange={(e) => setStatus(e.target.value)}>
            {STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </Select>
          <Select value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="newest">时间最新</option>
            <option value="oldest">时间最早</option>
            <option value="size">文件最大</option>
            <option value="size_asc">文件最小</option>
          </Select>
        </div>

        {loading ? (
          <div className="py-16 text-center text-sm text-slate-400">加载中…</div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={<HistoryIcon className="h-6 w-6" />}
            title="暂无下载历史"
            description="完成或失败的下载任务会显示在这里"
          />
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {items.map((t) => (
              <HistoryRow key={t.id} task={t} onDelete={() => deleteOne(t.id)} />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function HistoryRow({ task, onDelete }: { task: DownloadTask; onDelete: () => void }) {
  const visual = platformVisual(task.platform);
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100" title={task.title}>
            {task.title}
          </p>
          <span className={`hidden shrink-0 rounded-full px-2 py-0.5 text-xs font-medium sm:inline ${visual.badgeClass}`}>
            {visual.name}
          </span>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400 dark:text-slate-500">
          <span className="sm:hidden">{visual.name}</span>
          <span>{formatBytes(task.filesize)}</span>
          <span>{formatDate(task.completedAt ?? task.createdAt)}</span>
          {task.filePath && <span className="truncate max-w-[320px]">{task.filePath}</span>}
        </div>
      </div>
      <StatusBadge status={task.status} />
      <button
        onClick={onDelete}
        className="shrink-0 rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10"
        aria-label="删除记录"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}
