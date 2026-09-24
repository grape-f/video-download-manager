import type {
  CookieAuthInfo,
  CookieAuthStatus,
  DashboardStats,
  DownloadTask,
  ParseResult,
  Settings,
  SystemStatus,
} from '../types';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  const res = await fetch(path, {
    ...init,
    headers,
  });
  if (!res.ok) {
    let message = `请求失败 (${res.status})`;
    try {
      const data = (await res.json()) as { error?: { message?: string } };
      if (data?.error?.message) message = data.error.message;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
  return (await res.json()) as T;
}

function buildQuery(params: Record<string, string | undefined>): string {
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) sp.set(key, value);
  }
  const s = sp.toString();
  return s ? `?${s}` : '';
}

export interface HistoryQuery {
  search?: string;
  platform?: string;
  status?: string;
  sort?: string;
}

export const api = {
  parse: (url: string) =>
    request<ParseResult>('/api/parse', { method: 'POST', body: JSON.stringify({ url }) }),

  createTask: (payload: {
    url: string;
    resolution?: string;
    format?: string;
    info?: Record<string, unknown> | null;
  }) => request<DownloadTask>('/api/tasks', { method: 'POST', body: JSON.stringify(payload) }),

  listTasks: () => request<DownloadTask[]>('/api/tasks'),
  getTask: (id: string) => request<DownloadTask>(`/api/tasks/${id}`),

  pause: (id: string) => request<DownloadTask>(`/api/tasks/${id}/pause`, { method: 'POST' }),
  resume: (id: string) => request<DownloadTask>(`/api/tasks/${id}/resume`, { method: 'POST' }),
  cancel: (id: string) => request<DownloadTask>(`/api/tasks/${id}/cancel`, { method: 'POST' }),
  retry: (id: string) => request<DownloadTask>(`/api/tasks/${id}/retry`, { method: 'POST' }),
  removeTask: (id: string, deleteFile: boolean) =>
    request<{ ok: boolean }>(`/api/tasks/${id}?deleteFile=${deleteFile}`, { method: 'DELETE' }),

  history: (query: HistoryQuery) =>
    request<DownloadTask[]>(
      `/api/history${buildQuery({
        search: query.search,
        platform: query.platform,
        status: query.status,
        sort: query.sort,
      })}`,
    ),
  deleteHistory: (id: string) => request<{ ok: boolean }>(`/api/history/${id}`, { method: 'DELETE' }),
  clearHistory: (ids: string[]) =>
    request<{ ok: boolean }>('/api/history', { method: 'DELETE', body: JSON.stringify({ ids }) }),

  dashboard: () => request<DashboardStats>('/api/dashboard'),
  settings: () => request<Settings>('/api/settings'),
  updateSettings: (partial: Partial<Settings>) =>
    request<Settings>('/api/settings', { method: 'PUT', body: JSON.stringify(partial) }),
  system: () => request<SystemStatus>('/api/system'),

  cookieAuthStatus: () => request<CookieAuthInfo>('/api/auth/status'),
  clearCookieAuth: (token: string) =>
    request<{ ok: boolean; status: CookieAuthStatus }>('/api/auth/cookies', {
      method: 'DELETE',
      headers: { 'X-Pairing-Token': token },
    }),

  openFile: (filePath: string) =>
    request<{ ok: boolean }>('/api/files/open', { method: 'POST', body: JSON.stringify({ path: filePath }) }),
};
