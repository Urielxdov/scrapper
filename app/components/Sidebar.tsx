'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Radio,
  Settings,
  User,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { SettingsModal } from './SettingsModal';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/monitors/new', label: 'Nuevo Monitor', icon: Radio, exact: false },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // Persist collapsed state
  useEffect(() => {
    const saved = localStorage.getItem('sidebar-collapsed');
    if (saved === 'true') setCollapsed(true);
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('sidebar-collapsed', String(next));
      return next;
    });
  };

  const isActive = (href: string, exact: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  const userEmail = 'Usuario';

  return (
    <>
      <aside
        className="flex flex-col h-screen sticky top-0 bg-surface border-r border-edge transition-all duration-200 shrink-0"
        style={{ width: collapsed ? '56px' : '240px' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-3 border-b border-edge min-h-[52px]">
          {!collapsed && (
            <span className="font-semibold text-sm text-ink truncate px-1">Scrapper</span>
          )}
          <button
            onClick={toggleCollapsed}
            title={collapsed ? 'Expandir' : 'Colapsar'}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-ink-muted hover:bg-surface-hover hover:text-ink transition-colors shrink-0 ml-auto"
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex-1 py-2 space-y-0.5 px-2 overflow-hidden">
          {NAV_ITEMS.map(({ href, label, icon: Icon, exact }) => {
            const active = isActive(href, exact);
            return (
              <Link
                key={href}
                href={href}
                title={collapsed ? label : undefined}
                className={`flex items-center gap-3 px-2 py-2 rounded-lg text-sm transition-colors ${
                  active
                    ? 'bg-surface-hover text-ink font-medium border-l-2 border-[--color-accent]'
                    : 'text-ink-muted hover:bg-surface-hover hover:text-ink border-l-2 border-transparent'
                }`}
              >
                <Icon size={18} className="shrink-0" />
                {!collapsed && <span className="truncate">{label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-edge py-2 px-2 space-y-0.5">
          {/* Settings */}
          <button
            onClick={() => setSettingsOpen(true)}
            title="Ajustes"
            className="w-full flex items-center gap-3 px-2 py-2 rounded-lg text-sm text-ink-muted hover:bg-surface-hover hover:text-ink transition-colors"
          >
            <Settings size={18} className="shrink-0" />
            {!collapsed && <span className="truncate">Ajustes</span>}
          </button>

          {/* User */}
          <button
            onClick={() => setUserMenuOpen((prev) => !prev)}
            title={collapsed ? userEmail : undefined}
            className="w-full flex items-center gap-3 px-2 py-2 rounded-lg text-sm text-ink-muted hover:bg-surface-hover hover:text-ink transition-colors"
          >
            <User size={18} className="shrink-0" />
            {!collapsed && (
              <span className="truncate flex-1 text-left">{userEmail}</span>
            )}
          </button>

        </div>
      </aside>

      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
    </>
  );
}
