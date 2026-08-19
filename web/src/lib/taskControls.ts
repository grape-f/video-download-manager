import { useCallback } from 'react';
import { api } from './api';
import { useStore } from './store';
import type { DownloadTask } from '../types';

export function useTaskControls() {
  const { upsertTask, toast } = useStore();

  const run = useCallback(
    async (id: string, fn: (id: string) => Promise<DownloadTask>): Promise<boolean> => {
      try {
        const task = await fn(id);
        upsertTask(task);
        return true;
      } catch (err) {
        toast('error', err instanceof Error ? err.message : '操作失败');
        return false;
      }
    },
    [upsertTask, toast],
  );

  return {
    pause: (id: string) => run(id, api.pause),
    resume: (id: string) => run(id, api.resume),
    cancel: (id: string) => run(id, api.cancel),
    retry: (id: string) => run(id, api.retry),
  };
}
