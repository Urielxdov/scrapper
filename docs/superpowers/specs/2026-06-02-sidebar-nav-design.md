# Sidebar Navigation Design

**Date:** 2026-06-02
**Status:** Approved

## Overview

Replace the horizontal top nav in `app/(app)/layout.tsx` with a collapsible left sidebar. The sidebar contains nav links, a settings button (opens a modal), and a user section with logout at the bottom.

---

## Layout

`app/(app)/layout.tsx` changes from `flex-col` to `flex-row`:

```
┌──────────┬───────────────────────────────┐
│ Sidebar  │  <main> (flex-1, overflow)    │
│ sticky   │                               │
│ h-screen │                               │
└──────────┴───────────────────────────────┘
```

The sidebar is `position: sticky; top: 0; height: 100vh` so it stays fixed while main content scrolls.

---

## Sidebar Component

**File:** `app/components/Sidebar.tsx`
**Type:** `'use client'`

### Collapse behavior

| State     | Width  | Content             |
|-----------|--------|---------------------|
| Expanded  | 240px  | Icon + text label   |
| Collapsed | 56px   | Icon only + tooltip |

`collapsed` state persisted in `localStorage` key `sidebar-collapsed`.

### Structure (top → bottom)

1. **Header** — Logo mark + `ChevronLeft`/`ChevronRight` toggle button
2. **Nav links** (`flex-1`)
   - Dashboard → `LayoutDashboard` icon → `/dashboard`
   - Nuevo Monitor → `Radio` icon → `/monitors/new`
   - Active link highlighted with `bg-surface-hover` + `text-ink`
3. **Footer** (`mt-auto`)
   - Settings button → `Settings` icon → triggers `SettingsModal`
   - User button → `User` icon + truncated email/name (from `useSession`)

### Active link detection

Use `usePathname()` from `next/navigation`. Exact match for `/dashboard`, `startsWith` for `/monitors`.

### Tooltips (collapsed mode)

When collapsed, each nav item wraps in a `title` attribute tooltip. No external tooltip library needed.

### Lucide icons used

`LayoutDashboard`, `Radio`, `Settings`, `User`, `ChevronLeft`, `ChevronRight`, `LogOut`

---

## Settings Modal

**File:** `app/components/SettingsModal.tsx`
**Type:** `'use client'`

### Trigger

Settings button in sidebar footer opens the modal. State lives in `Sidebar` — `settingsOpen: boolean`.

### Structure

```
┌─ Ajustes ──────────────────────────────┐
│                                  [X]   │
│  Apariencia                            │
│  ┌─ Tema ────────────────────────┐     │
│  │  [Claro]  [Oscuro]            │     │
│  └───────────────────────────────┘     │
│  ┌─ Color de acento ─────────────┐     │
│  │  ● ● ● ● ● ●  (6 swatches)   │     │
│  └───────────────────────────────┘     │
│                                        │
│  {sección futura}                      │
└────────────────────────────────────────┘
```

### Sections design

Each section is a labeled card (`<section>` with `<h3>` heading). New options are added by appending a new `<section>` — no restructuring needed.

### Tema (dark/light)

Replaces existing `ThemeToggle` component. Writes `data-theme` attribute on `document.documentElement` and persists to `localStorage` key `theme`.

### Color de acento

6 preset swatches:

| Name    | Value     |
|---------|-----------|
| Blue    | `#3b82f6` |
| Violet  | `#8b5cf6` |
| Rose    | `#f43f5e` |
| Amber   | `#f59e0b` |
| Emerald | `#10b981` |
| Slate   | `#64748b` |

Selected color sets `--color-accent` on `:root`. Persisted in `localStorage` key `accent-color`. Applied on mount via a `useEffect` that reads `localStorage`.

`--color-accent` is used in `globals.css` as:
- Active nav link left border indicator and text color
- Primary button background (`bg-[--color-accent]`) — replaces hardcoded `bg-blue-500` in dashboard and monitors pages
- Focus ring color

Default value: `#3b82f6` (Blue), matching the current hardcoded blue.

The `ThemeProvider` component (already exists) will be extended to also apply the saved accent color on initial render, preventing flash.

### Overlay behavior

- Clicking outside the modal closes it
- `Escape` key closes it
- Rendered via React portal (`document.body`) so it sits above everything

---

## User Section

Located at the bottom of the sidebar footer, below the Settings button.

### Expanded state

```
┌────────────────────────┐
│ [👤] user@email.com  ▼ │
└────────────────────────┘
       ↓ click
┌────────────────────────┐
│ [LogOut] Cerrar sesión  │
└────────────────────────┘
```

Inline expand (no floating popover). `userMenuOpen: boolean` state in `Sidebar`. Clicking "Cerrar sesión" calls `signOut()` from `next-auth/react`.

### Collapsed state

`User` icon only. `title` tooltip shows email.

### Session data

`useSession()` from `next-auth/react`. Shows `session.user.email` truncated to fit. Falls back to "Usuario" if name/email not available.

---

## Files Changed / Created

| Action  | File                                    |
|---------|-----------------------------------------|
| Modify  | `app/(app)/layout.tsx`                  |
| Create  | `app/components/Sidebar.tsx`            |
| Create  | `app/components/SettingsModal.tsx`      |
| Modify  | `app/components/ThemeProvider.tsx`      |
| Modify  | `app/globals.css` (add `--color-accent`) |

The existing `ThemeToggle.tsx` component becomes unused and can be removed once the modal is in place.

---

## Constraints

- `lucide-react ^1.17.0` already installed — no new dependencies needed
- Uses existing design tokens (`surface`, `ink`, `edge` CSS vars) for full dark mode support
- No external modal/tooltip libraries
- Session from `next-auth/react` `useSession` (client-side only)
