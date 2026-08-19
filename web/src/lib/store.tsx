import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { api } from './api';
import type { DownloadTask, Settings, SystemStatus, ThemePreference } from '../types';

export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
  id: number;
  type: ToastType;
  message: string;
}

interface StoreValue {
  tasks: DownloadTask[];
  settings: Settings | null;
  system: SystemStatus | null;
  toasts: Toast[];
  toast: (type: ToastType, message: string) => void;
  dismissToast: (id: number) => void;
  upsertTask: (task: DownloadTask) => void;
  refreshTasks: () => Promise<void>;
  refreshSettings: () => Promise<void>;
  refreshSystem: () => Promise<void>;
  updateSettings: (partial: Partial<Settings>) => Promise<boolean>;
  setTheme: (theme: ThemePreference) => Promise<void>;
  removeTask: (id: string, deleteFile: boolean) => Promise<void>;
}

const StoreContext = createContext<StoreValue | null>(null);

function errMessage(err: unknown): string {
  return err instanceof Error ? err.message : '操作失败';
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [tasks, setTasks] = useState<DownloadTask[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [system, setSystem] = useState<SystemStatus | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((type: ToastType, message: string) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, type, message }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4200);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const upsertTask = useCallback((task: DownloadTask) => {
    setTasks((prev) => {
      const idx = prev.findIndex((t) => t.id === task.id);
      if (idx === -1) return [task, ...prev];
      const next = [...prev];
      next[idx] = task;
      return next;
    });
  }, []);

  const refreshTasks = useCallback(async () => {
    try {
      setTasks(await api.listTasks());
    } catch (err) {
      toast('error', errMessage(err));
    }
  }, [toast]);

  const refreshSettings = useCallback(async () => {
    try {
      setSettings(await api.settings());
    } catch {
      /* ignore */
    }
  }, []);

  const refreshSystem = useCallback(async () => {
    try {
      setSystem(await api.system());
    } catch {
      /* ignore */
    }
  }, []);

  // 初始加载 + SSE 订阅
  useEffect(() => {
    let disposed = false;
    void (async () => {
      try {
        const [t, s] = await Promise.all([api.listTasks(), api.settings()]);
        if (!disposed) {
          setTasks(t);
          setSettings(s);
        }
      } catch {
        /* ignore */
      }
      if (!disposed) void refreshSystem();
    })();

    let es: EventSource | null = null;
    try {
      es = new EventSource('/api/events');
      es.addEventListener('task', (e) => {
        try {
          upsertTask(JSON.parse((e as MessageEvent).data) as DownloadTask);
        } catch {
          /* ignore */
        }
      });
      es.addEventListener('taskRemoved', (e) => {
        try {
          const { id } = JSON.parse((e as MessageEvent).data) as { id: string };
          setTasks((prev) => prev.filter((t) => t.id !== id));
        } catch {
          /* ignore */
        }
      });
      es.addEventListener('settings', (e) => {
        try {
          setSettings(JSON.parse((e as MessageEvent).data) as Settings);
        } catch {
          /* ignore */
        }
      });
    } catch {
      /* EventSource 不可用时回退到轮询 */
    }

    const poll = window.setInterval(() => {
      if (!es || es.readyState === EventSource.CLOSED) void refreshTasks();
    }, 5000);

    return () => {
      disposed = true;
      if (es) es.close();
      window.clearInterval(poll);
    };
  }, [upsertTask, refreshSystem, refreshTasks]);

  // 主题应用
  useEffect(() => {
    const theme = settings?.theme ?? 'system';
    const root = document.documentElement;
    const apply = () => {
      const dark =
        theme === 'dark' ||
        (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      root.classList.toggle('dark', dark);
    };
    apply();
    window.localStorage.setItem('vdm-theme', theme);
    if (theme === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      const onChange = () => apply();
      mq.addEventListener('change', onChange);
      return () => mq.removeEventListener('change', onChange);
    }
    return undefined;
  }, [settings?.theme]);

  const updateSettings = useCallback(
    async (partial: Partial<Settings>): Promise<boolean> => {
      try {
        const s = await api.updateSettings(partial);
        setSettings(s);
        toast('success', '设置已保存');
        return true;
      } catch (err) {
        toast('error', errMessage(err));
        return false;
      }
    },
    [toast],
  );

  const setTheme = useCallback(
    async (theme: ThemePreference) => {
      await updateSettings({ theme });
    },
    [updateSettings],
  );

  const removeTask = useCallback(
    async (id: string, deleteFile: boolean) => {
      try {
        await api.removeTask(id, deleteFile);
        setTasks((prev) => prev.filter((t) => t.id !== id));
        toast('success', deleteFile ? '任务与文件已删除' : '任务已删除');
      } catch (err) {
        toast('error', errMessage(err));
      }
    },
    [toast],
  );

  const value = useMemo<StoreValue>(
    () => ({
      tasks,
      settings,
      system,
      toasts,
      toast,
      dismissToast,
      upsertTask,
      refreshTasks,
      refreshSettings,
      refreshSystem,
      updateSettings,
      setTheme,
      removeTask,
    }),
    [
      tasks,
      settings,
      system,
      toasts,
      toast,
      dismissToast,
      upsertTask,
      refreshTasks,
      refreshSettings,
      refreshSystem,
      updateSettings,
      setTheme,
      removeTask,
    ],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore 必须在 StoreProvider 内使用');
  return ctx;
}
