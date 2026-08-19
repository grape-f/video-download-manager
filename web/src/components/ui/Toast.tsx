import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { useStore } from '../../lib/store';
import type { Toast as ToastItem } from '../../lib/store';

const ICONS = {
  success: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
  error: <AlertCircle className="h-4 w-4 text-red-500" />,
  info: <Info className="h-4 w-4 text-blue-500" />,
};

function ToastCard({ toast }: { toast: ToastItem }) {
  const { dismissToast } = useStore();
  return (
    <div className="animate-slide-in-right pointer-events-auto flex w-72 items-start gap-2.5 rounded-lg border border-slate-200 bg-white px-3 py-2.5 shadow-lg dark:border-slate-700 dark:bg-slate-800">
      <span className="mt-0.5 shrink-0">{ICONS[toast.type]}</span>
      <p className="min-w-0 flex-1 break-words text-sm text-slate-700 dark:text-slate-200">{toast.message}</p>
      <button
        onClick={() => dismissToast(toast.id)}
        className="shrink-0 rounded p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
        aria-label="关闭提示"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export function ToastContainer() {
  const { toasts } = useStore();
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
      {toasts.map((t) => (
        <ToastCard key={t.id} toast={t} />
      ))}
    </div>
  );
}
