import { Activity, CheckCircle2, Download, HardDrive, Layers, TrendingUp, XCircle } from 'lucide-react';
import { useMemo, type ReactNode } from 'react';
import { useStore } from '../lib/store';
import { computeDashboardStats } from '../lib/stats';
import { formatBytes, formatRelative } from '../lib/format';
import { platformVisual } from '../lib/platform';
import { Card, CardBody, CardHeader } from '../components/ui/Card';
import { StatusBadge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { BarChart, DonutChart, LineChart } from '../components/charts';

const PALETTE = ['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#06b6d4', '#ef4444', '#8b5cf6', '#84cc16'];

function StatCard({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: ReactNode;
  icon: ReactNode;
  accent: string;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-slate-400 dark:text-slate-500">{label}</p>
        <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${accent}`}>{icon}</span>
      </div>
      <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900 dark:text-white">{value}</p>
    </Card>
  );
}

export function Dashboard() {
  const { tasks } = useStore();
  const stats = useMemo(() => computeDashboardStats(tasks), [tasks]);

  const donutData = useMemo(
    () =>
      stats.platformDistribution.map((p, i) => ({
        label: platformVisual(p.platform).name,
        value: p.count,
        color: PALETTE[i % PALETTE.length],
      })),
    [stats.platformDistribution],
  );

  const dailyCount = stats.dailyDownloads.map((d) => ({ label: d.date, value: d.count }));
  const dailyBytes = stats.dailyDownloads.map((d) => ({ label: d.date, value: d.bytes }));

  return (
    <div className="animate-fade-in">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">数据统计</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">下载任务概览与趋势分析</p>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard
          label="今日任务"
          value={stats.todayTotal}
          icon={<Activity className="h-4 w-4 text-indigo-600" />}
          accent="bg-indigo-50 dark:bg-indigo-500/10"
        />
        <StatCard
          label="已完成"
          value={stats.completedCount}
          icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />}
          accent="bg-emerald-50 dark:bg-emerald-500/10"
        />
        <StatCard
          label="下载中"
          value={stats.activeCount}
          icon={<Download className="h-4 w-4 text-blue-600" />}
          accent="bg-blue-50 dark:bg-blue-500/10"
        />
        <StatCard
          label="失败"
          value={stats.failedCount}
          icon={<XCircle className="h-4 w-4 text-red-600" />}
          accent="bg-red-50 dark:bg-red-500/10"
        />
        <StatCard
          label="累计下载"
          value={formatBytes(stats.totalBytes)}
          icon={<HardDrive className="h-4 w-4 text-violet-600" />}
          accent="bg-violet-50 dark:bg-violet-500/10"
        />
        <StatCard
          label="累计任务"
          value={stats.totalTasks}
          icon={<Layers className="h-4 w-4 text-amber-600" />}
          accent="bg-amber-50 dark:bg-amber-500/10"
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader title="各平台下载数量" subtitle="按平台统计累计任务" />
          <CardBody>
            {donutData.length === 0 ? (
              <EmptyState title="暂无数据" description="添加任务后此处将显示平台分布" />
            ) : (
              <DonutChart data={donutData} />
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="每日下载量" subtitle="近 14 天完成任务数" />
          <CardBody>
            {stats.totalTasks === 0 ? (
              <EmptyState title="暂无数据" description="完成任务后此处将显示趋势" />
            ) : (
              <BarChart data={dailyCount} />
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="成功率" subtitle="已完成任务占已结束任务比例" />
          <CardBody className="flex flex-col justify-center">
            <div className="flex items-center gap-6">
              <div className="text-center">
                <p className="text-4xl font-bold text-slate-900 dark:text-white">{stats.successRate}%</p>
                <p className="mt-1 text-xs text-slate-400">成功率</p>
              </div>
              <div className="flex-1 space-y-2 text-xs text-slate-500 dark:text-slate-400">
                <div className="flex justify-between">
                  <span>已完成</span>
                  <span className="font-medium text-emerald-600">{stats.completedCount}</span>
                </div>
                <div className="flex justify-between">
                  <span>失败</span>
                  <span className="font-medium text-red-500">{stats.failedCount}</span>
                </div>
                <div className="flex justify-between">
                  <span>总下载数据量</span>
                  <span className="font-medium">{formatBytes(stats.totalBytes)}</span>
                </div>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="下载数据量趋势" subtitle="近 14 天（字节）" />
          <CardBody>
            {stats.totalBytes === 0 ? (
              <EmptyState title="暂无数据" description="完成下载后此处将显示数据量趋势" />
            ) : (
              <LineChart data={dailyBytes} />
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="最近下载任务" subtitle="最近 8 条" />
          <CardBody className="p-0">
            {stats.recentTasks.length === 0 ? (
              <EmptyState icon={<TrendingUp className="h-6 w-6" />} title="暂无任务" />
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {stats.recentTasks.map((t) => (
                  <div key={t.id} className="flex items-center gap-3 px-5 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">{t.title}</p>
                      <p className="mt-0.5 text-xs text-slate-400">
                        {platformVisual(t.platform).name} · {formatBytes(t.filesize)} · {formatRelative(t.createdAt)}
                      </p>
                    </div>
                    <StatusBadge status={t.status} />
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
