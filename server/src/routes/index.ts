import type { Express } from 'express';
import parseRouter from './parse';
import tasksRouter from './tasks';
import historyRouter from './history';
import dashboardRouter from './dashboard';
import settingsRouter from './settings';
import filesRouter from './files';
import eventsRouter from './events';

export function registerRoutes(app: Express): void {
  app.use('/api', parseRouter);
  app.use('/api', tasksRouter);
  app.use('/api', historyRouter);
  app.use('/api', dashboardRouter);
  app.use('/api', settingsRouter);
  app.use('/api', filesRouter);
  app.use('/api', eventsRouter);
}
