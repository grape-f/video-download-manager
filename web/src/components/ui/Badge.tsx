import type { ReactNode } from 'react';
import type { TaskStatus } from '../../types';

export function Badge({ className = '', children }: { className?: string; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${className}`}
    >
      {children}
    </span>
  );
}

const STATUS_META: Record<TaskStatus, { label: string; className: string; dot: string }> = {
  waiting: {
    label: '等待中',
    className: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
    dot: 'bg-slate-400',
  },
  parsing: {
    label: '解析中',
    className: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400',
    dot: 'bg-amber-500',
  },
  downloading: {
    label: '下载中',
    className: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400',
    dot: 'bg-blue-500',
  },
  paused: {
    label: '已暂停',
    className: 'bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-400',
    dot: 'bg-orange-500',
  },
  completed: {
    label: '已完成',
    className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400',
    dot: 'bg-emerald-500',
  },
  failed: {
    label: '失败',
    className: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400',
    dot: 'bg-red-500',
  },
  cancelled: {
    label: '已取消',
    className: 'bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400',
    dot: 'bg-slate-400',
  },
};

export function StatusBadge({ status }: { status: TaskStatus }) {
  const meta = STATUS_META[status] ?? STATUS_META.waiting;
  return (
    <Badge className={meta.className}>
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot} ${status === 'downloading' ? 'animate-pulse' : ''}`} />
      {meta.label}
    </Badge>
  );
}
