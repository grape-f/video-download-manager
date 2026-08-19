import { AlertCircle, FolderOpen, Pause, Play, RotateCcw, Trash2, XCircle } from 'lucide-react';
import { useState } from 'react';
import type { DownloadTask } from '../types';
import { useStore } from '../lib/store';
import { useTaskControls } from '../lib/taskControls';
import { api } from '../lib/api';
import {
  formatBytes,
  formatDuration,
  formatPercent,
  formatRelative,
  formatSpeed,
} from '../lib/format';
import { platformVisual } from '../lib/platform';
import { StatusBadge } from './ui/Badge';
import { ProgressBar } from './ui/ProgressBar';
import { Button } from './ui/Button';
import { Modal } from './ui/Modal';
import { Thumbnail } from './Thumbnail';

const SHOW_PROGRESS = ['waiting', 'parsing', 'downloading', 'paused', 'completed'];

export function TaskItem({ task }: { task: DownloadTask }) {
  const { removeTask, toast } = useStore();
  const controls = useTaskControls();
  const [confirm, setConfirm] = useState<null | 'delete' | 'delete-file'>(null);
  const visual = platformVisual(task.platform);
  const indeterminate = task.status === 'downloading' && task.totalBytes == null;
  const canDeleteFile = task.status === 'completed' && !!task.filePath;

  const openFolder = async () => {
    if (!task.filePath) return;
    try {
      await api.openFile(task.filePath);
    } catch (err) {
      toast('error', err instanceof Error ? err.message : '无法打开文件夹');
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex gap-3">
        <Thumbnail src={task.thumbnail} platform={task.platform} className="h-16 w-28" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <a
              href={task.url}
              target="_blank"
              rel="noreferrer"
              className="truncate text-sm font-semibold text-slate-900 hover:text-indigo-600 dark:text-slate-100 dark:hover:text-indigo-400"
              title={task.title}
            >
              {task.title}
            </a>
            <StatusBadge status={task.status} />
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
            <span className={`rounded-full px-2 py-0.5 font-medium ${visual.badgeClass}`}>{visual.name}</span>
            {task.resolution && <span>{task.resolution}</span>}
            {task.format && <span>{task.format.toUpperCase()}</span>}
            {task.filesize != null && <span>{formatBytes(task.filesize)}</span>}
            {task.author && <span>· {task.author}</span>}
            <span>· {formatRelative(task.createdAt)}</span>
          </div>
        </div>
      </div>

      <div className="mt-3">
        {SHOW_PROGRESS.includes(task.status) && (
          <div className="flex items-center gap-3">
            <ProgressBar value={task.progress} indeterminate={indeterminate} className="flex-1" />
            <span className="w-10 text-right text-xs font-medium tabular-nums text-slate-600 dark:text-slate-300">
              {task.status === 'completed' ? '100%' : task.totalBytes != null ? formatPercent(task.progress) : '—'}
            </span>
          </div>
        )}
        {task.status === 'downloading' && (
          <div className="mt-1.5 flex flex-wrap items-center justify-between gap-x-4 gap-y-0.5 text-xs text-slate-500 dark:text-slate-400">
            <span className="tabular-nums">
              {formatBytes(task.downloadedBytes)} / {task.totalBytes != null ? formatBytes(task.totalBytes) : '—'}
            </span>
            <span className="flex gap-4">
              <span>速度 {formatSpeed(task.speedBytes)}</span>
              <span>剩余 {task.etaSeconds != null ? formatDuration(task.etaSeconds) : '—'}</span>
            </span>
          </div>
        )}
        {task.status === 'failed' && (
          <div className="mt-2 flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-500/10 dark:text-red-400">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span className="break-words">{task.error || '下载失败'}</span>
          </div>
        )}
        {task.status === 'completed' && task.filePath && (
          <div className="mt-1.5 truncate text-xs text-slate-400 dark:text-slate-500">{task.filePath}</div>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
        {task.status === 'downloading' && (
          <>
            <Button size="sm" variant="secondary" icon={<Pause className="h-3.5 w-3.5" />} onClick={() => controls.pause(task.id)}>
              暂停
            </Button>
            <Button size="sm" variant="ghost" icon={<XCircle className="h-3.5 w-3.5" />} onClick={() => controls.cancel(task.id)}>
              取消
            </Button>
          </>
        )}
        {task.status === 'waiting' && (
          <Button size="sm" variant="ghost" icon={<XCircle className="h-3.5 w-3.5" />} onClick={() => controls.cancel(task.id)}>
            取消
          </Button>
        )}
        {task.status === 'paused' && (
          <>
            <Button size="sm" variant="primary" icon={<Play className="h-3.5 w-3.5" />} onClick={() => controls.resume(task.id)}>
              继续
            </Button>
            <Button size="sm" variant="ghost" icon={<XCircle className="h-3.5 w-3.5" />} onClick={() => controls.cancel(task.id)}>
              取消
            </Button>
          </>
        )}
        {(task.status === 'failed' || task.status === 'cancelled') && (
          <Button size="sm" variant="secondary" icon={<RotateCcw className="h-3.5 w-3.5" />} onClick={() => controls.retry(task.id)}>
            重试
          </Button>
        )}
        {task.status === 'completed' && task.filePath && (
          <Button size="sm" variant="outline" icon={<FolderOpen className="h-3.5 w-3.5" />} onClick={openFolder}>
            打开文件夹
          </Button>
        )}
        <Button
          size="sm"
          variant="ghost"
          className="ml-auto text-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
          icon={<Trash2 className="h-3.5 w-3.5" />}
          onClick={() => setConfirm('delete')}
        >
          删除
        </Button>
      </div>

      <Modal
        open={confirm !== null}
        onClose={() => setConfirm(null)}
        title="删除任务"
        footer={
          <>
            <Button size="sm" variant="secondary" onClick={() => setConfirm(null)}>
              取消
            </Button>
            {canDeleteFile && (
              <Button
                size="sm"
                variant="danger"
                onClick={() => {
                  void removeTask(task.id, true);
                  setConfirm(null);
                }}
              >
                删除任务与文件
              </Button>
            )}
            <Button
              size="sm"
              variant="danger"
              onClick={() => {
                void removeTask(task.id, false);
                setConfirm(null);
              }}
            >
              仅删除任务
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-600 dark:text-slate-300">
          确定要删除「{task.title}」吗？
        </p>
        <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
          {canDeleteFile
            ? '「仅删除任务」不会删除已下载的视频文件；「删除任务与文件」会同时删除磁盘上的文件。'
            : '删除任务记录不会影响磁盘上的文件。'}
        </p>
      </Modal>
    </div>
  );
}
