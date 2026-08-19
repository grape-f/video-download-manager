import { Download, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useStore } from '../lib/store';
import { TaskItem } from '../components/TaskItem';
import { EmptyState } from '../components/ui/EmptyState';
import { Button } from '../components/ui/Button';

const ACTIVE = ['downloading', 'parsing', 'waiting', 'paused'];

export function Tasks() {
  const { tasks } = useStore();
  const active = tasks.filter((t) => ACTIVE.includes(t.status));
  const finished = tasks.filter((t) => !ACTIVE.includes(t.status));

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">下载任务</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {active.length} 个活动任务 · {finished.length} 个已完成
          </p>
        </div>
        <Link to="/">
          <Button size="sm" icon={<Plus className="h-4 w-4" />}>
            添加任务
          </Button>
        </Link>
      </div>

      <div className="mt-5">
        {tasks.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <EmptyState
              icon={<Download className="h-6 w-6" />}
              title="暂无下载任务"
              description="回到首页粘贴视频链接，创建你的第一个下载任务"
              action={
                <Link to="/">
                  <Button size="sm" icon={<Plus className="h-4 w-4" />}>
                    添加任务
                  </Button>
                </Link>
              }
            />
          </div>
        ) : (
          <div className="space-y-4">
            {active.length > 0 && (
              <div className="space-y-3">
                {active.map((t) => (
                  <TaskItem key={t.id} task={t} />
                ))}
              </div>
            )}
            {finished.length > 0 && (
              <div className="space-y-3">
                <h2 className="pt-2 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                  已完成 / 已结束
                </h2>
                {finished.map((t) => (
                  <TaskItem key={t.id} task={t} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
