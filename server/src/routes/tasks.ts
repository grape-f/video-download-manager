import { Router } from 'express';
import { queue } from '../services/queue';
import { AppError } from '../utils/errors';
import { wrap } from '../utils/asyncHandler';

const router = Router();

router.get(
  '/tasks',
  wrap(async (_req, res) => {
    res.json(queue.list());
  }),
);

router.get(
  '/tasks/:id',
  wrap(async (req, res) => {
    const task = queue.get(req.params.id);
    if (!task) throw new AppError('NOT_FOUND', '任务不存在', 404);
    res.json(task);
  }),
);

router.post(
  '/tasks',
  wrap(async (req, res) => {
    const body = req.body || {};
    const task = await queue.addTask({
      url: typeof body.url === 'string' ? body.url : '',
      resolution: typeof body.resolution === 'string' ? body.resolution : undefined,
      format: typeof body.format === 'string' ? body.format : undefined,
      simulate: typeof body.simulate === 'boolean' ? body.simulate : undefined,
      info: body.info && typeof body.info === 'object' ? body.info : null,
    });
    res.status(201).json(task);
  }),
);

router.post(
  '/tasks/:id/pause',
  wrap(async (req, res) => {
    res.json(queue.pause(req.params.id));
  }),
);

router.post(
  '/tasks/:id/resume',
  wrap(async (req, res) => {
    res.json(queue.resume(req.params.id));
  }),
);

router.post(
  '/tasks/:id/cancel',
  wrap(async (req, res) => {
    res.json(queue.cancel(req.params.id));
  }),
);

router.post(
  '/tasks/:id/retry',
  wrap(async (req, res) => {
    res.json(queue.retry(req.params.id));
  }),
);

router.delete(
  '/tasks/:id',
  wrap(async (req, res) => {
    const deleteFile = req.query.deleteFile === 'true' || req.query.deleteFile === '1';
    queue.remove(req.params.id, deleteFile);
    res.json({ ok: true });
  }),
);

export default router;
