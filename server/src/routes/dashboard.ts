import { Router } from 'express';
import { queue } from '../services/queue';
import { wrap } from '../utils/asyncHandler';
import type { DashboardStats, DownloadTask } from '../types';

const ACTIVE = ['downloading', 'parsing', 'waiting', 'paused'];

const router = Router();

router.get(
  '/dashboard',
  wrap(async (_req, res) => {
    const tasks = queue.list();
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    const today = tasks.filter((t) => t.createdAt >= startOfToday);
    const completed = tasks.filter((t) => t.status === 'completed');
    const failed = tasks.filter((t) => t.status === 'failed');
    const active = tasks.filter((t) => ACTIVE.includes(t.status));

    const totalBytes = completed.reduce((sum, t) => sum + (t.filesize || 0), 0);
    const finished = tasks.length - active.length;
    const successRate = finished > 0 ? Math.round((completed.length / finished) * 100) : 100;

    const platformMap = new Map<string, number>();
    for (const t of tasks) platformMap.set(t.platform, (platformMap.get(t.platform) || 0) + 1);
    const platformDistribution = [...platformMap.entries()]
      .map(([platform, count]) => ({ platform, count }))
      .sort((a, b) => b.count - a.count);

    const dailyDownloads = buildDailySeries(tasks, 14);

    const stats: DashboardStats = {
      todayTotal: today.length,
      todayCompleted: today.filter((t) => t.status === 'completed').length,
      todayFailed: today.filter((t) => t.status === 'failed').length,
      activeCount: active.length,
      totalTasks: tasks.length,
      completedCount: completed.length,
      failedCount: failed.length,
      totalBytes,
      successRate,
      platformDistribution,
      dailyDownloads,
      recentTasks: tasks.slice(0, 8),
    };

    res.json(stats);
  }),
);

function buildDailySeries(
  tasks: DownloadTask[],
  days: number,
): Array<{ date: string; count: number; bytes: number }> {
  const now = new Date();
  const series: Array<{ date: string; count: number; bytes: number }> = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const start = d.getTime();
    const end = start + 86_400_000;
    const inDay = tasks.filter((t) => (t.completedAt ?? t.createdAt) >= start && (t.completedAt ?? t.createdAt) < end && t.status === 'completed');
    series.push({
      date: `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
      count: inDay.length,
      bytes: inDay.reduce((s, t) => s + (t.filesize || 0), 0),
    });
  }
  return series;
}

export default router;
