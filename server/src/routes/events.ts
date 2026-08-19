import { Router } from 'express';
import { bus } from '../bus';
import type { DownloadTask, Settings } from '../types';

const router = Router();

router.get('/events', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.write(': connected\n\n');

  const onTask = (task: DownloadTask) => {
    res.write(`event: task\ndata: ${JSON.stringify(task)}\n\n`);
  };
  const onRemoved = (id: string) => {
    res.write(`event: taskRemoved\ndata: ${JSON.stringify({ id })}\n\n`);
  };
  const onSettings = (settings: Settings) => {
    res.write(`event: settings\ndata: ${JSON.stringify(settings)}\n\n`);
  };

  bus.on('task', onTask);
  bus.on('task:removed', onRemoved);
  bus.on('settings', onSettings);

  const heartbeat = setInterval(() => {
    res.write(': ping\n\n');
  }, 15000);

  req.on('close', () => {
    clearInterval(heartbeat);
    bus.off('task', onTask);
    bus.off('task:removed', onRemoved);
    bus.off('settings', onSettings);
  });
});

export default router;
