import { Router } from 'express';
import { queue } from '../services/queue';
import { wrap } from '../utils/asyncHandler';
import type { DownloadTask } from '../types';

const FINISHED = ['completed', 'failed', 'cancelled'];

const router = Router();

router.get(
  '/history',
  wrap(async (req, res) => {
    const { search, platform, status, sort } = req.query;

    let list: DownloadTask[] = queue.list().filter((t) => FINISHED.includes(t.status));

    if (typeof platform === 'string' && platform) {
      list = list.filter((t) => t.platform === platform);
    }
    if (typeof status === 'string' && status) {
      list = list.filter((t) => t.status === status);
    }
    if (typeof search === 'string' && search) {
      const q = search.toLowerCase();
      list = list.filter((t) => t.title.toLowerCase().includes(q) || t.url.toLowerCase().includes(q));
    }

    const timeOf = (t: DownloadTask) => t.completedAt ?? t.createdAt;
    switch (sort) {
      case 'oldest':
        list.sort((a, b) => timeOf(a) - timeOf(b));
        break;
      case 'size':
        list.sort((a, b) => (b.filesize ?? 0) - (a.filesize ?? 0));
        break;
      case 'size_asc':
        list.sort((a, b) => (a.filesize ?? 0) - (b.filesize ?? 0));
        break;
      default:
        list.sort((a, b) => timeOf(b) - timeOf(a));
    }

    res.json(list);
  }),
);

router.delete(
  '/history/:id',
  wrap(async (req, res) => {
    // 仅删除历史记录，不删除实际视频文件
    queue.remove(req.params.id, false);
    res.json({ ok: true });
  }),
);

router.delete(
  '/history',
  wrap(async (req, res) => {
    const ids = Array.isArray(req.body?.ids) ? (req.body.ids as string[]) : [];
    for (const id of ids) {
      if (typeof id === 'string') queue.remove(id, false);
    }
    res.json({ ok: true, removed: ids.length });
  }),
);

export default router;
