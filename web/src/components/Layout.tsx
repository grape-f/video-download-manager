import {
  BarChart3,
  Download,
  History,
  Home,
  Menu,
  Settings,
  Sparkles,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useStore } from '../lib/store';

const NAV = [
  { to: '/', label: '首页', icon: Home, end: true },
  { to: '/tasks', label: '下载任务', icon: Download, end: false },
  { to: '/history', label: '下载历史', icon: History, end: false },
  { to: '/dashboard', label: '数据统计', icon: BarChart3, end: false },
  { to: '/settings', label: '设置', icon: Settings, end: false },
];

function Brand() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-500/30">
        <Download className="h-5 w-5" />
      </div>
      <div className="leading-tight">
        <p className="text-sm font-bold text-slate-900 dark:text-white">视频下载管理器</p>
        <p className="text-[11px] text-slate-400 dark:text-slate-500">Video Download Manager</p>
      </div>
    </div>
  );
}

function SidebarContent({ activeCount }: { activeCount: number }) {
  return (
    <div className="flex h-full flex-col">
      <div className="px-5 py-5">
        <Brand />
      </div>
      <nav className="flex-1 space-y-1 px-3">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'
              }`
            }
          >
            <item.icon className="h-[18px] w-[18px]" />
            <span className="flex-1">{item.label}</span>
            {item.to === '/tasks' && activeCount > 0 && (
              <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-[11px] font-semibold text-white">
                {activeCount}
              </span>
            )}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-slate-100 px-5 py-4 dark:border-slate-800">
        <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500">
          <Sparkles className="h-3.5 w-3.5" />
          <span>v1.0.0 · 仅下载你有权限的公开内容</span>
        </div>
      </div>
    </div>
  );
}

export function Layout() {
  const { tasks } = useStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  const activeCount = tasks.filter((t) =>
    ['downloading', 'parsing', 'waiting', 'paused'].includes(t.status),
  ).length;

  return (
    <div className="min-h-full">
      {/* 桌面端侧边栏 */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 lg:block">
        <SidebarContent activeCount={activeCount} />
      </aside>

      {/* 移动端抽屉 */}
      {menuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="animate-fade-in absolute inset-0 bg-slate-900/50" onClick={() => setMenuOpen(false)} />
          <aside className="animate-slide-in-right absolute inset-y-0 left-0 w-64 border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <SidebarContent activeCount={activeCount} />
          </aside>
        </div>
      )}

      {/* 移动端顶栏 */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white/85 px-4 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-900/85 lg:hidden">
        <Brand />
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          aria-label="菜单"
        >
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </header>

      <main className="lg:pl-64">
        <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
