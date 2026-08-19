import express from 'express';
import cors from 'cors';
import fs from 'node:fs';
import path from 'node:path';
import { config } from './config';
import { initDb, closeDb } from './db';
import { loadSettings } from './settings';
import { queue } from './services/queue';
import { registerRoutes } from './routes';
import { AppError } from './utils/errors';

async function main(): Promise<void> {
  initDb();
  loadSettings();
  queue.init();

  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '1mb' }));

  registerRoutes(app);

  // 生产环境：由后端托管前端构建产物
  const webDist = path.join(config.projectRoot, 'web', 'dist');
  if (fs.existsSync(path.join(webDist, 'index.html'))) {
    app.use(express.static(webDist));
    app.get(/^\/(?!api).*/, (_req, res) => {
      res.sendFile(path.join(webDist, 'index.html'));
    });
  }

  // 未匹配的 API 路由
  app.use('/api', (_req, res) => {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: '接口不存在' } });
  });

  // 统一错误处理
  app.use(
    (err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      if (err instanceof AppError) {
        res.status(err.status).json({ error: { code: err.code, message: err.message } });
        return;
      }
      console.error('[server] 未处理错误:', err);
      res.status(500).json({ error: { code: 'INTERNAL', message: '服务器内部错误' } });
    },
  );

  const server = app.listen(config.port, config.host, () => {
    // eslint-disable-next-line no-console
    console.log(`✅ 在线视频下载管理器后端已启动: http://${config.host}:${config.port}`);
    // eslint-disable-next-line no-console
    console.log(`   数据目录: ${config.dataDir}`);
    // eslint-disable-next-line no-console
    console.log(`   下载目录: ${config.downloadDir}`);
  });

  let shuttingDown = false;
  const shutdown = (): void => {
    if (shuttingDown) return;
    shuttingDown = true;
    // eslint-disable-next-line no-console
    console.log('\n正在关闭服务，保存任务状态...');
    queue.onShutdown();
    server.close(() => {
      closeDb();
      process.exit(0);
    });
    setTimeout(() => {
      closeDb();
      process.exit(0);
    }, 3000).unref();
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

// 全局兜底：单个任务异常不应导致整个服务崩溃
process.on('uncaughtException', (err) => {
  console.error('[server] 未捕获异常（已忽略，服务继续运行）:', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('[server] 未处理的 Promise 拒绝（已忽略）:', reason);
});

main().catch((err) => {
  console.error('[server] 启动失败:', err);
  process.exit(1);
});
