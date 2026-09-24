import {
  CheckCircle2,
  Copy,
  Database,
  Folder,
  HardDrive,
  Info,
  KeyRound,
  Monitor,
  Moon,
  Puzzle,
  RefreshCw,
  Save,
  Sun,
  Trash2,
  XCircle,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { api } from '../lib/api';
import { useStore } from '../lib/store';
import { formatBytes, formatDate } from '../lib/format';
import { VIDEO_QUALITIES, qualityLabel } from '../lib/quality';
import { Button } from '../components/ui/Button';
import { Card, CardBody, CardHeader } from '../components/ui/Card';
import { Field, Input, Select } from '../components/ui/fields';
import type { CookieAuthInfo, ThemePreference } from '../types';

const FORMATS = ['mp4', 'webm', 'mkv'];
const CONCURRENCY = [1, 2, 3, 5, 10];

const THEME_OPTIONS: Array<{ value: ThemePreference; label: string; icon: typeof Sun }> = [
  { value: 'light', label: '浅色', icon: Sun },
  { value: 'dark', label: '深色', icon: Moon },
  { value: 'system', label: '跟随系统', icon: Monitor },
];

export function Settings() {
  const { settings, updateSettings, setTheme, system, refreshSystem, toast } = useStore();
  const [saving, setSaving] = useState(false);
  const [cookieAuth, setCookieAuth] = useState<CookieAuthInfo | null>(null);
  const [cookieAuthError, setCookieAuthError] = useState<string | null>(null);
  const [clearingCookies, setClearingCookies] = useState(false);
  const [form, setForm] = useState({
    defaultQuality: 'best',
    defaultFormat: 'mp4',
    maxConcurrent: 3,
    downloadDir: '',
    maxSpeed: '',
    requestTimeoutSec: 120,
    autoRetries: 3,
  });
  const initialized = useRef(false);

  const loadCookieAuth = useCallback(async () => {
    try {
      setCookieAuth(await api.cookieAuthStatus());
      setCookieAuthError(null);
    } catch (err) {
      setCookieAuthError(err instanceof Error ? err.message : '无法读取 Cookie 同步状态');
    }
  }, []);

  useEffect(() => {
    if (settings && !initialized.current) {
      setForm({
        defaultQuality: settings.defaultQuality,
        defaultFormat: settings.defaultFormat,
        maxConcurrent: settings.maxConcurrent,
        downloadDir: settings.downloadDir,
        maxSpeed: settings.maxSpeed ?? '',
        requestTimeoutSec: Math.round(settings.requestTimeoutMs / 1000),
        autoRetries: settings.autoRetries,
      });
      initialized.current = true;
    }
  }, [settings]);

  useEffect(() => {
    if (!system) void refreshSystem();
  }, [system, refreshSystem]);

  useEffect(() => {
    void loadCookieAuth();
  }, [loadCookieAuth]);

  const save = async () => {
    setSaving(true);
    await updateSettings({
      defaultQuality: form.defaultQuality,
      defaultFormat: form.defaultFormat,
      maxConcurrent: Number(form.maxConcurrent),
      downloadDir: form.downloadDir.trim(),
      maxSpeed: form.maxSpeed.trim() || null,
      requestTimeoutMs: Math.max(10, Number(form.requestTimeoutSec) * 1000),
      autoRetries: Math.max(0, Math.min(10, Number(form.autoRetries))),
    });
    setSaving(false);
  };

  const setField = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const copyPairingToken = async () => {
    if (!cookieAuth?.token) return;
    try {
      await navigator.clipboard.writeText(cookieAuth.token);
      toast('success', '配对 token 已复制');
    } catch {
      toast('error', '复制失败，请手动选择复制');
    }
  };

  const clearSyncedCookies = async () => {
    if (!cookieAuth?.token) return;
    setClearingCookies(true);
    try {
      const result = await api.clearCookieAuth(cookieAuth.token);
      setCookieAuth((prev) => (prev ? { ...prev, status: result.status } : prev));
      toast('success', '已清除同步的 cookies');
      void refreshSystem();
    } catch (err) {
      toast('error', err instanceof Error ? err.message : '清除失败');
    } finally {
      setClearingCookies(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">设置</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">配置下载、网络与外观偏好</p>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        {/* 下载设置 */}
        <Card>
          <CardHeader title="下载设置" subtitle="默认质量、格式与并发" />
          <CardBody className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="默认下载质量">
                <Select value={form.defaultQuality} onChange={(e) => setField('defaultQuality', e.target.value)}>
                  {VIDEO_QUALITIES.map((q) => (
                    <option key={q} value={q}>
                      {qualityLabel(q)}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="默认文件格式">
                <Select value={form.defaultFormat} onChange={(e) => setField('defaultFormat', e.target.value)}>
                  {FORMATS.map((f) => (
                    <option key={f} value={f}>
                      {f.toUpperCase()}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <Field label="最大并发任务" hint="超过并发限制的任务将进入等待队列">
              <Select value={form.maxConcurrent} onChange={(e) => setField('maxConcurrent', Number(e.target.value))}>
                {CONCURRENCY.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="默认保存目录" hint="视频文件将保存到此目录">
              <Input value={form.downloadDir} onChange={(e) => setField('downloadDir', e.target.value)} />
            </Field>
          </CardBody>
        </Card>

        {/* 网络设置 */}
        <Card>
          <CardHeader title="网络设置" subtitle="限速、超时与重试" />
          <CardBody className="space-y-4">
            <Field label="最大下载速度" hint="例如 8M / 2M，留空表示不限速">
              <Input
                placeholder="不限速"
                value={form.maxSpeed}
                onChange={(e) => setField('maxSpeed', e.target.value)}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="请求超时（秒）">
                <Input
                  type="number"
                  min={10}
                  max={600}
                  value={form.requestTimeoutSec}
                  onChange={(e) => setField('requestTimeoutSec', Number(e.target.value))}
                />
              </Field>
              <Field label="自动重试次数">
                <Input
                  type="number"
                  min={0}
                  max={10}
                  value={form.autoRetries}
                  onChange={(e) => setField('autoRetries', Number(e.target.value))}
                />
              </Field>
            </div>
          </CardBody>
        </Card>

        {/* 外观 */}
        <Card>
          <CardHeader title="外观" subtitle="切换明暗主题" />
          <CardBody>
            <div className="grid grid-cols-3 gap-2">
              {THEME_OPTIONS.map((opt) => {
                const active = (settings?.theme ?? 'system') === opt.value;
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setTheme(opt.value)}
                    className={`flex flex-col items-center gap-2 rounded-xl border px-3 py-4 text-sm font-medium transition-colors ${
                      active
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </CardBody>
        </Card>

        {/* 系统 */}
        <Card>
          <CardHeader title="系统" subtitle="运行状态与存储信息" />
          <CardBody className="space-y-3">
            <StatusRow icon={<Info className="h-4 w-4" />} label="当前版本" value={system?.version ?? '—'} ok />
            <StatusRow
              icon={<Database className="h-4 w-4" />}
              label="数据库状态"
              value={system ? (system.databaseStatus === 'ok' ? '正常' : '异常') : '检测中…'}
              ok={system?.databaseStatus === 'ok'}
            />
            <StatusRow
              icon={<Folder className="h-4 w-4" />}
              label="下载目录状态"
              value={system ? (system.downloadDirStatus === 'ok' ? '可写' : '不可写') : '检测中…'}
              ok={system?.downloadDirStatus === 'ok'}
            />
            <StatusRow
              icon={<HardDrive className="h-4 w-4" />}
              label="磁盘剩余空间"
              value={system?.diskFreeBytes != null ? formatBytes(system.diskFreeBytes) : '—'}
              ok
            />
            <StatusRow
              icon={<KeyRound className="h-4 w-4" />}
              label="登录凭据"
              value={system?.cookieSource ?? '检测中…'}
              ok={!!system && !system.cookieSource.startsWith('未检测到') && system.cookieSource !== '自动检测已关闭'}
            />
            {system?.databasePath && (
              <p className="truncate text-xs text-slate-400 dark:text-slate-500">数据库：{system.databasePath}</p>
            )}
            {system?.downloadDir && (
              <p className="truncate text-xs text-slate-400 dark:text-slate-500">下载目录：{system.downloadDir}</p>
            )}
          </CardBody>
        </Card>

        {/* Cookie 同步 */}
        <Card className="lg:col-span-2">
          <CardHeader
            title="Cookie 同步"
            subtitle="用 Edge 扩展同步登录状态，避免手动导出 cookies.txt 和文件锁"
          />
          <CardBody className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <StatusRow
                icon={<KeyRound className="h-4 w-4" />}
                label="当前凭据"
                value={system?.cookieSource ?? '检测中…'}
                ok={
                  !!system &&
                  !system.cookieSource.startsWith('未检测到') &&
                  system.cookieSource !== '自动检测已关闭'
                }
              />
              <StatusRow
                icon={<Puzzle className="h-4 w-4" />}
                label="扩展同步"
                value={
                  cookieAuth?.status.available
                    ? `已同步 ${cookieAuth.status.cookieCount} 条`
                    : cookieAuth?.status.expired
                      ? '已过期，请重新同步'
                      : '未同步'
                }
                ok={!!cookieAuth?.status.available}
              />
              <StatusRow
                icon={<Info className="h-4 w-4" />}
                label="最近同步"
                value={cookieAuth?.status.syncedAt ? formatDate(cookieAuth.status.syncedAt) : '—'}
                ok={!!cookieAuth?.status.syncedAt}
              />
            </div>

            {cookieAuth?.status.domains.length ? (
              <p className="text-xs text-slate-400 dark:text-slate-500">
                域名：{cookieAuth.status.domains.join('、')}
              </p>
            ) : null}

            <div className="rounded-lg border border-dashed border-slate-300 p-3 dark:border-slate-700">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-xs text-slate-400 dark:text-slate-500">配对 token</div>
                  <code className="mt-1 block truncate text-xs text-slate-600 dark:text-slate-300">
                    {cookieAuth?.token ?? '加载中…'}
                  </code>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  icon={<Copy className="h-3.5 w-3.5" />}
                  onClick={copyPairingToken}
                  disabled={!cookieAuth?.token}
                >
                  复制
                </Button>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-slate-400 dark:text-slate-500">
                在 Edge 打开 <code>edge://extensions</code> → 开发者模式 → 加载解压缩的扩展 → 选择项目里的{' '}
                <code>browser-extension</code> 目录；打开扩展后粘贴这个 token，点击“同步登录状态”。
              </p>
            </div>

            {cookieAuthError && <p className="text-xs text-red-500">{cookieAuthError}</p>}

            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant="secondary"
                icon={<RefreshCw className="h-3.5 w-3.5" />}
                onClick={() => void loadCookieAuth()}
              >
                刷新状态
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
                icon={<Trash2 className="h-3.5 w-3.5" />}
                loading={clearingCookies}
                onClick={clearSyncedCookies}
                disabled={!cookieAuth?.status.available}
              >
                清除已同步的 cookies
              </Button>
            </div>

            <p className="text-xs text-slate-400 dark:text-slate-500">
              cookies 只保存在本机 <code>data/</code> 目录；同步接口只接受来自 127.0.0.1 的请求。建议把{' '}
              <code>.env</code> 里的 <code>HOST</code> 设为 <code>127.0.0.1</code>。
            </p>
          </CardBody>
        </Card>
      </div>

      <div className="mt-4 flex justify-end">
        <Button size="md" loading={saving} onClick={save} icon={<Save className="h-4 w-4" />}>
          保存设置
        </Button>
      </div>
    </div>
  );
}

function StatusRow({
  icon,
  label,
  value,
  ok,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  ok: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
        {icon}
      </span>
      <span className="flex-1 text-sm text-slate-600 dark:text-slate-300">{label}</span>
      <span className="flex items-center gap-1.5 text-sm font-medium text-slate-900 dark:text-slate-100">
        {ok ? (
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
        ) : (
          <XCircle className="h-4 w-4 text-red-500" />
        )}
        {value}
      </span>
    </div>
  );
}
