import { Router } from 'express';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { AppError } from '../utils/errors';
import { wrap } from '../utils/asyncHandler';

const router = Router();

router.post(
  '/files/open',
  wrap(async (req, res) => {
    const target = typeof req.body?.path === 'string' ? req.body.path : '';
    if (!target) throw new AppError('INVALID_PATH', '文件路径无效', 400);

    const resolved = path.resolve(target);
    let dir = resolved;
    let file: string | null = null;
    try {
      if (fs.existsSync(resolved) && fs.statSync(resolved).isFile()) {
        dir = path.dirname(resolved);
        file = resolved;
      }
    } catch {
      throw new AppError('INVALID_PATH', '文件路径不存在', 404);
    }

    if (process.platform === 'win32') {
      if (file) {
        spawn('explorer.exe', ['/select,', file], { detached: true, stdio: 'ignore' }).unref();
      } else {
        spawn('explorer.exe', [dir], { detached: true, stdio: 'ignore' }).unref();
      }
    } else if (process.platform === 'darwin') {
      spawn('open', file ? ['-R', file] : [dir], { detached: true, stdio: 'ignore' }).unref();
    } else {
      spawn('xdg-open', [dir], { detached: true, stdio: 'ignore' }).unref();
    }

    res.json({ ok: true });
  }),
);

export default router;
