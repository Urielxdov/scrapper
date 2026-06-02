# Sidebar Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the horizontal top nav with a collapsible left sidebar that includes nav links, a settings modal with theme/accent color controls, and a user section with logout.

**Architecture:** A single `Sidebar` client component owns all sidebar state (collapsed, settingsOpen, userMenuOpen). `SettingsModal` is a separate component rendered as a portal. `ThemeProvider` is extended to apply accent color on initial render without flash.

**Tech Stack:** Next.js 16 App Router, next-auth v5 beta, lucide-react, Tailwind CSS v4 with CSS custom properties.

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Modify | `app/globals.css` | Add `--color-accent` token |
| Modify | `app/components/ThemeProvider.tsx` | Apply saved accent color on init |
| Modify | `app/layout.tsx` | Add `SessionProvider` wrapper |
| Create | `app/components/SettingsModal.tsx` | Modal with theme + accent controls |
| Create | `app/components/Sidebar.tsx` | Collapsible sidebar, nav, user section |
| Modify | `app/(app)/layout.tsx` | Swap top nav for Sidebar |
| Delete | `app/components/ThemeToggle.tsx` | Replaced by SettingsModal |

---

### Task 1: Add `--color-accent` CSS token

**Files:**
- Modify: `app/globals.css`

- [ ] **Step 1: Add accent token to light theme, dark overrides, and default**

Open `app/globals.css` and replace the existing content with:

```css
@import "tailwindcss";

/* ── Semantic design tokens (light) ─────────────────────────── */
@theme {
  --color-surface:        #ffffff;
  --color-surface-muted:  #f8fafc;
  --color-surface-hover:  #f1f5f9;
  --color-ink:            #0f172a;
  --color-ink-muted:      #64748b;
  --color-ink-faint:      #94a3b8;
  --color-edge:           #e2e8f0;
  --color-edge-muted:     #f1f5f9;
  --color-accent:         #3b82f6;
}

/* ── Dark mode overrides ─────────────────────────────────────── */
[data-theme=dark] {
  --color-surface:        #0f172a;
  --color-surface-muted:  #1e293b;
  --color-surface-hover:  #1e293b;
  --color-ink:            #f1f5f9;
  --color-ink-muted:      #94a3b8;
  --color-ink-faint:      #475569;
  --color-edge:           #334155;
  --color-edge-muted:     #1e293b;
}

body {
  background-color: var(--color-surface);
  color: var(--color-ink);
  font-family: var(--font-geist-sans, Arial, sans-serif);
}
```

- [ ] **Step 2: Commit**

```bash
git add app/globals.css
git commit -m "feat: add --color-accent CSS token"
```

---

### Task 2: Extend ThemeProvider to apply accent color on init

**Files:**
- Modify: `app/components/ThemeProvider.tsx`

The `themeScript` runs synchronously in `<head>` before first paint — extend it to also apply the saved accent color so there's no flash when the accent changes.

- [ ] **Step 1: Rewrite ThemeProvider.tsx**

```tsx
'use client';

import { useEffect } from 'react';

export const themeScript = `
(function(){
  try {
    var t = localStorage.getItem('theme');
    var d = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.setAttribute('data-theme', t === 'dark' || (!t && d) ? 'dark' : 'light');
    var a = localStorage.getItem('accent-color');
    if (a) document.documentElement.style.setProperty('--color-accent', a);
  } catch(e) {}
})();
`;

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (!document.documentElement.hasAttribute('data-theme')) {
      const saved = localStorage.getItem('theme');
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const isDark = saved === 'dark' || (!saved && prefersDark);
      document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    }
    const accent = localStorage.getItem('accent-color');
    if (accent) document.documentElement.style.setProperty('--color-accent', accent);
  }, []);

  return <>{children}</>;
}
```

- [ ] **Step 2: Commit**

```bash
git add app/components/ThemeProvider.tsx
git commit -m "feat: apply saved accent color on init in ThemeProvider"
```

---

### Task 3: Add SessionProvider to root layout

**Files:**
- Modify: `app/layout.tsx`

`useSession()` (used in Sidebar) requires `SessionProvider` from `next-auth/react` to be an ancestor in the tree.

- [ ] **Step 1: Rewrite app/layout.tsx**

```tsx
import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import { SessionProvider } from 'next-auth/react';
import { ThemeProvider, themeScript } from '@/app/components/ThemeProvider';
import './globals.css';

const geist = Geist({ subsets: ['latin'], variable: '--font-geist' });

export const metadata: Metadata = {
  title: 'Scrapper',
  description: 'Monitor de cambios en páginas web',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${geist.variable} h-full`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full flex flex-col antialiased bg-surface text-ink">
        <SessionProvider>
          <ThemeProvider>{children}</ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/layout.tsx
git commit -m "feat: add SessionProvider to root layout"
```

---

### Task 4: Create SettingsModal component

**Files:**
- Create: `app/components/SettingsModal.tsx`

A portal-rendered modal with dark/light theme toggle and accent color picker. Closes on outside click or Escape. Designed so new `<section>` blocks can be appended without restructuring.

- [ ] **Step 1: Create app/components/SettingsModal.tsx**

```tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface SettingsModalProps {
  onClose: () => void;
}

const ACCENT_COLORS = [
  { name: 'Azul',      value: '#3b82f6' },
  { name: 'Violeta',   value: '#8b5cf6' },
  { name: 'Rosa',      value: '#f43f5e' },
  { name: 'Ámbar',     value: '#f59e0b' },
  { name: 'Esmeralda', value: '#10b981' },
  { name: 'Gris',      value: '#64748b' },
];

export function SettingsModal({ onClose }: SettingsModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [theme, setThemeState] = useState<'light' | 'dark'>('light');
  const [accent, setAccentState] = useState('#3b82f6');

  // Read current values from DOM on mount
  useEffect(() => {
    setThemeState(
      document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'
    );
    const saved = localStorage.getItem('accent-color');
    if (saved) setAccentState(saved);
    else {
      const computed = getComputedStyle(document.documentElement)
        .getPropertyValue('--color-accent').trim();
      if (computed) setAccentState(computed);
    }
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose();
  };

  const applyTheme = (t: 'light' | 'dark') => {
    document.documentElement.setAttribute('data-theme', t);
    localStorage.setItem('theme', t);
    setThemeState(t);
  };

  const applyAccent = (color: string) => {
    document.documentElement.style.setProperty('--color-accent', color);
    localStorage.setItem('accent-color', color);
    setAccentState(color);
  };

  return createPortal(
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
    >
      <div className="bg-surface border border-edge rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-edge">
          <h2 className="text-base font-semibold text-ink">Ajustes</h2>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-ink-muted hover:bg-surface-hover hover:text-ink transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-6">

          {/* Apariencia */}
          <section className="space-y-4">
            <h3 className="text-xs font-semibold text-ink-muted uppercase tracking-wider">
              Apariencia
            </h3>

            {/* Tema */}
            <div className="space-y-2">
              <p className="text-sm text-ink">Tema</p>
              <div className="flex gap-2">
                {(['light', 'dark'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => applyTheme(t)}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                      theme === t
                        ? 'border-[--color-accent] bg-[--color-accent] text-white'
                        : 'border-edge text-ink-muted hover:bg-surface-hover'
                    }`}
                  >
                    {t === 'light' ? 'Claro' : 'Oscuro'}
                  </button>
                ))}
              </div>
            </div>

            {/* Color de acento */}
            <div className="space-y-2">
              <p className="text-sm text-ink">Color de acento</p>
              <div className="flex gap-2">
                {ACCENT_COLORS.map((c) => {
                  const isActive =
                    accent.replace(/\s/g, '').toLowerCase() === c.value.toLowerCase();
                  return (
                    <button
                      key={c.value}
                      title={c.name}
                      onClick={() => applyAccent(c.value)}
                      style={{ backgroundColor: c.value }}
                      className={`w-8 h-8 rounded-full transition-transform hover:scale-110 ${
                        isActive ? 'ring-2 ring-offset-2 ring-[--color-accent]' : ''
                      }`}
                    />
                  );
                })}
              </div>
            </div>
          </section>

          {/* Secciones futuras se agregan aquí como nuevos <section> */}

        </div>
      </div>
    </div>,
    document.body
  );
}
```

- [ ] **Step 2: Verify file was created**

```bash
ls app/components/SettingsModal.tsx
```

Expected: file listed.

- [ ] **Step 3: Commit**

```bash
git add app/components/SettingsModal.tsx
git commit -m "feat: add SettingsModal with theme and accent color controls"
```

---

### Task 5: Create Sidebar component

**Files:**
- Create: `app/components/Sidebar.tsx`

The main sidebar: collapsible rail, nav links with active state, settings button, user section with inline logout.

- [ ] **Step 1: Create app/components/Sidebar.tsx**

```tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import {
  LayoutDashboard,
  Radio,
  Settings,
  User,
  ChevronLeft,
  ChevronRight,
  LogOut,
} from 'lucide-react';
import { SettingsModal } from './SettingsModal';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/monitors/new', label: 'Nuevo Monitor', icon: Radio, exact: false },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
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

  const userEmail = session?.user?.email ?? 'Usuario';

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

          {/* Inline user menu */}
          {userMenuOpen && (
            <button
              onClick={() => signOut({ callbackUrl: '/auth' })}
              className="w-full flex items-center gap-3 px-2 py-2 rounded-lg text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
            >
              <LogOut size={18} className="shrink-0" />
              {!collapsed && <span className="truncate">Cerrar sesión</span>}
            </button>
          )}
        </div>
      </aside>

      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/components/Sidebar.tsx
git commit -m "feat: add collapsible Sidebar with nav, settings, and user section"
```

---

### Task 6: Update app layout to use Sidebar

**Files:**
- Modify: `app/(app)/layout.tsx`

Replace the horizontal `<nav>` with the `Sidebar` component in a flex-row layout.

- [ ] **Step 1: Rewrite app/(app)/layout.tsx**

```tsx
import { Sidebar } from '@/app/components/Sidebar';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 bg-surface-muted overflow-auto">
        {children}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add "app/(app)/layout.tsx"
git commit -m "feat: replace top nav with Sidebar in app layout"
```

---

### Task 7: Remove unused ThemeToggle component

**Files:**
- Delete: `app/components/ThemeToggle.tsx`

Theme controls moved into `SettingsModal`. Verify no other file imports it first.

- [ ] **Step 1: Check for remaining imports**

```bash
grep -r "ThemeToggle" /home/uhernand/scrapper/app --include="*.tsx" --include="*.ts"
```

Expected output: empty (no results). If any file still imports it, update that file to remove the import first.

- [ ] **Step 2: Delete the file**

```bash
rm app/components/ThemeToggle.tsx
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore: remove ThemeToggle replaced by SettingsModal"
```

---

### Task 8: Verify the full feature

- [ ] **Step 1: Start the dev server and open the app**

```bash
npm run dev
```

Open `http://localhost:3000/dashboard` in the browser.

- [ ] **Step 2: Verify sidebar renders**

- Sidebar visible on the left, 240px wide
- "Dashboard" and "Nuevo Monitor" links visible with icons
- Active link (`/dashboard`) has left blue border and darker background
- "Ajustes" and user email visible at the bottom

- [ ] **Step 3: Verify collapse toggle**

Click the `ChevronLeft` button. Sidebar should shrink to 56px showing only icons. Click again — expands back. Reload page — state is preserved (localStorage).

- [ ] **Step 4: Verify settings modal**

Click "Ajustes". Modal appears centered with overlay. Click "Oscuro" — page switches to dark mode. Click a different accent swatch — active nav border and button colors change. Click outside the modal or press Escape — modal closes.

- [ ] **Step 5: Verify user section**

Click the user email button at the bottom. "Cerrar sesión" button appears. Click it — app signs out and redirects to `/auth`.

- [ ] **Step 6: Verify collapsed tooltips**

Collapse sidebar. Hover over nav icons — browser native tooltips show link labels. Hover over user icon — tooltip shows email.
