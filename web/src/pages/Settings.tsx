import {
  CheckCircle2,
  Database,
  Folder,
  HardDrive,
  Info,
  Monitor,
  Moon,
  Save,
  Sun,
  XCircle,
} from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useStore } from '../lib/store';
import { formatBytes } from '../lib/format';
import { Button } from '../components/ui/Button';
import { Card, CardBody, CardHeader } from '../components/ui/Card';
import { Field, Input, Select } from '../components/ui/fields';
import type { ThemePreference } from '../types';

const QUALITIES = ['best', '2160p', '1440p', '1080p', '720p', '480p', '360p'];
const FORMATS = ['mp4', 'webm', 'mkv'];
const CONCURRENCY = [1, 2, 3, 5, 10];

const THEME_OPTIONS: Array<{ value: ThemePreference; label: string; icon: typeof Sun }> = [
  { value: 'light', label: '浅色', icon: Sun },
  { value: 'dark', label: '深色', icon: Moon },
  { value: 'system', label: '跟随系统', icon: Monitor },
];

export function Settings() {
  const { settings, updateSettings, setTheme, system, refreshSystem } = useStore();
  const [saving, setSaving] = useState(false);
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
                  {QUALITIES.map((q) => (
                    <option key={q} value={q}>
                      {q === 'best' ? '最佳可用' : q}
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
            {system?.databasePath && (
              <p className="truncate text-xs text-slate-400 dark:text-slate-500">数据库：{system.databasePath}</p>
            )}
            {system?.downloadDir && (
              <p className="truncate text-xs text-slate-400 dark:text-slate-500">下载目录：{system.downloadDir}</p>
            )}
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
