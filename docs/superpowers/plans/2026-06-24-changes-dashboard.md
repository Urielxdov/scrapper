# Changes Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a global changes feed to the dashboard and a per-monitor detail page showing full change history.

**Architecture:** Two new API routes serve change data from Prisma. A new client component `ChangesFeed` fetches and renders the feed on the dashboard. A new page `/monitors/[id]` uses a Server Component for monitor metadata + a client component `ChangesHistory` for paginated change history.

**Tech Stack:** Next.js 16 App Router, Prisma (PostgreSQL), TypeScript, Tailwind CSS, React 19

## Global Constraints

- All new files in TypeScript with strict types — no `any`
- API routes follow pattern: `import { NextRequest, NextResponse } from 'next/server'`, return `NextResponse.json(...)`
- Prisma client imported from `@/lib/shared/prisma`
- Tailwind classes only — no inline style objects except where existing code uses them
- Spanish UI copy (matches existing app)
- No new dependencies

---

### Task 1: GET /api/changes route

**Files:**
- Create: `app/api/changes/route.ts`

**Interfaces:**
- Produces: `GET /api/changes` → `ChangeWithTarget[]`

```ts
type ChangeWithTarget = {
  id: string
  type: 'CONTENT_DIFF' | 'SELECTOR_MISSING'
  diff: { field: string; oldValue: string; newValue: string }[]
  detectedAt: string
  target: {
    url: string
    monitors: { id: string; name: string | null }[]
  }
}
```

- [ ] **Step 1: Create the route file**

```ts
// app/api/changes/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/shared/prisma';

export async function GET() {
  const changes = await prisma.change.findMany({
    take: 20,
    orderBy: { detectedAt: 'desc' },
    include: {
      target: {
        include: {
          monitors: { select: { id: true, name: true } },
        },
      },
    },
  });

  return NextResponse.json(
    changes.map(c => ({
      id: c.id,
      type: c.type,
      diff: c.diff,
      detectedAt: c.detectedAt.toISOString(),
      target: {
        url: c.target.url,
        monitors: c.target.monitors,
      },
    }))
  );
}
```

- [ ] **Step 2: Verify route loads without TypeScript errors**

```bash
cd /home/uhernand/scrapper && npx tsc --noEmit 2>&1 | grep "api/changes"
```

Expected: no output (no errors in that file).

- [ ] **Step 3: Commit**

```bash
git add app/api/changes/route.ts
git commit -m "feat: add GET /api/changes route"
```

---

### Task 2: GET /api/monitors/[id]/changes route

**Files:**
- Create: `app/api/monitors/[id]/changes/route.ts`

**Interfaces:**
- Produces: `GET /api/monitors/[id]/changes?limit=50&offset=0` →
```ts
{
  data: {
    id: string
    type: 'CONTENT_DIFF' | 'SELECTOR_MISSING'
    diff: { field: string; oldValue: string; newValue: string }[]
    detectedAt: string
  }[]
  total: number
}
```

- [ ] **Step 1: Create the route file**

```ts
// app/api/monitors/[id]/changes/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/shared/prisma';

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const url = new URL(req.url);
  const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '50'), 100);
  const offset = parseInt(url.searchParams.get('offset') ?? '0');

  const monitor = await prisma.monitor.findUnique({ where: { id }, select: { targetId: true } });
  if (!monitor) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const [data, total] = await Promise.all([
    prisma.change.findMany({
      where: { targetId: monitor.targetId },
      orderBy: { detectedAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.change.count({ where: { targetId: monitor.targetId } }),
  ]);

  return NextResponse.json({
    data: data.map(c => ({
      id: c.id,
      type: c.type,
      diff: c.diff,
      detectedAt: c.detectedAt.toISOString(),
    })),
    total,
  });
}
```

- [ ] **Step 2: Verify no TypeScript errors**

```bash
cd /home/uhernand/scrapper && npx tsc --noEmit 2>&1 | grep "monitors/\[id\]/changes"
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add "app/api/monitors/[id]/changes/route.ts"
git commit -m "feat: add GET /api/monitors/[id]/changes route"
```

---

### Task 3: ChangesFeed client component + dashboard integration

**Files:**
- Create: `app/(app)/dashboard/components/ChangesFeed.tsx`
- Modify: `app/(app)/dashboard/page.tsx`

**Interfaces:**
- Consumes: `GET /api/changes` → `ChangeWithTarget[]` (shape from Task 1)
- `ChangesFeed` takes no props — fetches independently

- [ ] **Step 1: Create ChangesFeed component**

```tsx
// app/(app)/dashboard/components/ChangesFeed.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type DiffEntry = { field: string; oldValue: string; newValue: string };

type ChangeItem = {
  id: string;
  type: 'CONTENT_DIFF' | 'SELECTOR_MISSING';
  diff: DiffEntry[];
  detectedAt: string;
  target: {
    url: string;
    monitors: { id: string; name: string | null }[];
  };
};

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'ahora';
  if (mins < 60) return `hace ${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `hace ${hrs}h`;
  return `hace ${Math.floor(hrs / 24)}d`;
}

export function ChangesFeed() {
  const [changes, setChanges] = useState<ChangeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/changes')
      .then(r => r.json())
      .then(setChanges)
      .catch(() => setError('Error al cargar cambios'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-ink-muted text-sm">
        <span className="animate-pulse">Cargando cambios...</span>
      </div>
    );
  }

  if (error) {
    return <p className="py-8 text-center text-sm text-red-500">{error}</p>;
  }

  if (changes.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-ink-faint">
        Sin cambios detectados aún.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-edge">
      {changes.map(c => {
        const monitor = c.target.monitors[0];
        return (
          <li key={c.id} className="py-4 flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 min-w-0">
                {monitor ? (
                  <Link
                    href={`/monitors/${monitor.id}`}
                    className="font-medium text-sm text-ink hover:text-blue-500 truncate"
                  >
                    {monitor.name ?? monitor.id.slice(0, 8)}
                  </Link>
                ) : (
                  <span className="font-medium text-sm text-ink truncate">Sin monitor</span>
                )}
                <span className="text-xs text-ink-muted truncate hidden sm:block">{c.target.url}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    c.type === 'CONTENT_DIFF'
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                      : 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300'
                  }`}
                >
                  {c.type === 'CONTENT_DIFF' ? 'Cambio' : 'Selector roto'}
                </span>
                <span className="text-xs text-ink-faint">{relativeTime(c.detectedAt)}</span>
              </div>
            </div>
            <ul className="flex flex-col gap-0.5 pl-1">
              {(c.diff as DiffEntry[]).map((d, i) => (
                <li key={i} className="text-xs text-ink-muted font-mono">
                  <span className="text-ink-faint">{d.field}:</span>{' '}
                  <span className="line-through text-red-400">{d.oldValue || '—'}</span>
                  {' → '}
                  <span className="text-green-500">{d.newValue || '—'}</span>
                </li>
              ))}
            </ul>
          </li>
        );
      })}
    </ul>
  );
}
```

- [ ] **Step 2: Add ChangesFeed + clickable monitor names to dashboard**

Replace `app/(app)/dashboard/page.tsx` with:

```tsx
// app/(app)/dashboard/page.tsx
import Link from 'next/link';
import { prisma } from '@/lib/shared/prisma';
import { DeleteMonitorButton } from '@/app/components/DeleteMonitorButton';
import { ChangesFeed } from './components/ChangesFeed';

export default async function DashboardPage() {
  const monitors = await prisma.monitor.findMany({
    include: { target: true },
    orderBy: { createdAt: 'desc' },
  });

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - 7);

  const changes = await prisma.change.findMany({
    select: { targetId: true, detectedAt: true },
    orderBy: { detectedAt: 'desc' },
  });

  const alertsToday = changes.filter(c => c.detectedAt >= todayStart).length;
  const changesThisWeek = changes.filter(c => c.detectedAt >= weekStart).length;
  const recentTargetIds = new Set(changes.slice(0, 50).map(c => c.targetId));

  function statusColor(monitor: typeof monitors[0]): string {
    if (!monitor.isActive) return 'bg-red-500';
    if (recentTargetIds.has(monitor.targetId)) return 'bg-yellow-400';
    return 'bg-green-500';
  }

  return (
    <main className="max-w-6xl mx-auto w-full p-8 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-ink">Dashboard</h1>
        <Link
          href="/monitors/new"
          className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 transition-colors"
        >
          + Nuevo Monitor
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Monitores activos', value: monitors.filter(m => m.isActive).length },
          { label: 'Alertas hoy', value: alertsToday },
          { label: 'Cambios esta semana', value: changesThisWeek },
        ].map(stat => (
          <div key={stat.label} className="bg-surface border border-edge rounded-xl p-5 shadow-sm">
            <p className="text-sm text-ink-muted mb-1">{stat.label}</p>
            <p className="text-3xl font-bold text-ink">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Monitors table */}
      <div className="bg-surface border border-edge rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface-muted border-b border-edge">
            <tr>
              {['Nombre', 'URL', 'Estado', 'Última corrida', 'Acciones'].map(h => (
                <th key={h} className="text-left px-4 py-3 font-medium text-ink-muted">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {monitors.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center py-12 text-ink-faint">
                  Sin monitores aún.{' '}
                  <Link href="/monitors/new" className="text-blue-500 hover:underline">Crea uno</Link>
                </td>
              </tr>
            )}
            {monitors.map(m => (
              <tr key={m.id} className="border-b border-edge last:border-0 hover:bg-surface-muted transition-colors">
                <td className="px-4 py-3 font-medium text-ink">
                  <Link href={`/monitors/${m.id}`} className="hover:text-blue-500 transition-colors">
                    {m.name ?? m.id.slice(0, 8)}
                  </Link>
                </td>
                <td className="px-4 py-3 text-ink-muted max-w-[220px] truncate">{m.target.url}</td>
                <td className="px-4 py-3">
                  <span className={`inline-block w-3 h-3 rounded-full ${statusColor(m)}`} />
                </td>
                <td className="px-4 py-3 text-ink-muted">
                  {m.target.lastRunAt ? new Date(m.target.lastRunAt).toLocaleString('es-MX') : '—'}
                </td>
                <td className="px-4 py-3"><DeleteMonitorButton id={m.id} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Changes feed */}
      <div className="bg-surface border border-edge rounded-xl shadow-sm">
        <div className="px-5 py-4 border-b border-edge">
          <h2 className="text-sm font-semibold text-ink">Últimos cambios</h2>
        </div>
        <div className="px-5">
          <ChangesFeed />
        </div>
      </div>
    </main>
  );
}
```

- [ ] **Step 3: Verify TypeScript**

```bash
cd /home/uhernand/scrapper && npx tsc --noEmit 2>&1 | grep -E "dashboard|ChangesFeed"
```

Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add "app/(app)/dashboard/components/ChangesFeed.tsx" "app/(app)/dashboard/page.tsx"
git commit -m "feat: add ChangesFeed to dashboard with clickable monitor names"
```

---

### Task 4: Monitor detail page

**Files:**
- Create: `app/(app)/monitors/[id]/components/ChangesHistory.tsx`
- Create: `app/(app)/monitors/[id]/page.tsx`

**Interfaces:**
- Consumes: `GET /api/monitors/[id]/changes?limit=50&offset=N` (shape from Task 2)
- `ChangesHistory` props: `{ monitorId: string }`

- [ ] **Step 1: Create ChangesHistory client component**

```tsx
// app/(app)/monitors/[id]/components/ChangesHistory.tsx
'use client';

import { useEffect, useState } from 'react';

type DiffEntry = { field: string; oldValue: string; newValue: string };

type ChangeRecord = {
  id: string;
  type: 'CONTENT_DIFF' | 'SELECTOR_MISSING';
  diff: DiffEntry[];
  detectedAt: string;
};

type ApiResponse = { data: ChangeRecord[]; total: number };

const PAGE_SIZE = 50;

export function ChangesHistory({ monitorId }: { monitorId: string }) {
  const [records, setRecords] = useState<ChangeRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    setLoading(true);
    fetch(`/api/monitors/${monitorId}/changes?limit=${PAGE_SIZE}&offset=${offset}`)
      .then(r => r.json() as Promise<ApiResponse>)
      .then(res => { setRecords(res.data); setTotal(res.total); })
      .finally(() => setLoading(false));
  }, [monitorId, offset]);

  const toggleExpand = (id: string) =>
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;

  if (loading) {
    return <p className="py-8 text-center text-sm text-ink-muted animate-pulse">Cargando historial...</p>;
  }

  if (records.length === 0) {
    return <p className="py-8 text-center text-sm text-ink-faint">Sin cambios registrados.</p>;
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-surface-muted border-b border-edge">
            <tr>
              {['Fecha', 'Tipo', 'Campos cambiados'].map(h => (
                <th key={h} className="text-left px-4 py-3 font-medium text-ink-muted">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {records.map(r => {
              const diff = r.diff as DiffEntry[];
              const isExpanded = expanded.has(r.id);
              const visible = isExpanded ? diff : diff.slice(0, 3);
              return (
                <tr key={r.id} className="border-b border-edge last:border-0 hover:bg-surface-muted transition-colors align-top">
                  <td className="px-4 py-3 text-ink-muted whitespace-nowrap">
                    {new Date(r.detectedAt).toLocaleString('es-MX')}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      r.type === 'CONTENT_DIFF'
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                        : 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300'
                    }`}>
                      {r.type === 'CONTENT_DIFF' ? 'Cambio' : 'Selector roto'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <ul className="flex flex-col gap-0.5">
                      {visible.map((d, i) => (
                        <li key={i} className="text-xs font-mono text-ink-muted">
                          <span className="text-ink-faint">{d.field}:</span>{' '}
                          <span className="line-through text-red-400">{d.oldValue || '—'}</span>
                          {' → '}
                          <span className="text-green-500">{d.newValue || '—'}</span>
                        </li>
                      ))}
                    </ul>
                    {diff.length > 3 && (
                      <button
                        onClick={() => toggleExpand(r.id)}
                        className="mt-1 text-xs text-blue-500 hover:underline"
                      >
                        {isExpanded ? 'ver menos' : `+${diff.length - 3} más`}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-edge">
          <span className="text-xs text-ink-muted">
            Página {currentPage} de {totalPages} · {total} cambios
          </span>
          <div className="flex gap-2">
            <button
              disabled={offset === 0}
              onClick={() => setOffset(o => Math.max(0, o - PAGE_SIZE))}
              className="px-3 py-1.5 text-xs rounded-lg border border-edge text-ink-muted hover:bg-surface-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              ← Anterior
            </button>
            <button
              disabled={offset + PAGE_SIZE >= total}
              onClick={() => setOffset(o => o + PAGE_SIZE)}
              className="px-3 py-1.5 text-xs rounded-lg border border-edge text-ink-muted hover:bg-surface-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Siguiente →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create monitor detail page**

```tsx
// app/(app)/monitors/[id]/page.tsx
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/shared/prisma';
import { ChangesHistory } from './components/ChangesHistory';

type Props = { params: Promise<{ id: string }> };

export default async function MonitorDetailPage({ params }: Props) {
  const { id } = await params;

  const monitor = await prisma.monitor.findUnique({
    where: { id },
    include: { target: true },
  });

  if (!monitor) notFound();

  return (
    <main className="max-w-5xl mx-auto w-full p-8 space-y-8">
      {/* Back */}
      <Link href="/dashboard" className="text-sm text-ink-muted hover:text-ink transition-colors">
        ← Dashboard
      </Link>

      {/* Header */}
      <div className="bg-surface border border-edge rounded-xl p-6 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-ink">
              {monitor.name ?? monitor.id.slice(0, 8)}
            </h1>
            <a
              href={monitor.target.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-500 hover:underline break-all"
            >
              {monitor.target.url}
            </a>
          </div>
          <span className={`shrink-0 text-xs font-medium px-2.5 py-1 rounded-full ${
            monitor.isActive
              ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
              : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
          }`}>
            {monitor.isActive ? 'Activo' : 'Inactivo'}
          </span>
        </div>
        <div className="flex gap-6 text-sm text-ink-muted">
          <span>Frecuencia: <strong className="text-ink">{monitor.target.frequency} min</strong></span>
          <span>
            Última corrida:{' '}
            <strong className="text-ink">
              {monitor.target.lastRunAt
                ? new Date(monitor.target.lastRunAt).toLocaleString('es-MX')
                : '—'}
            </strong>
          </span>
        </div>
      </div>

      {/* Changes history */}
      <div className="bg-surface border border-edge rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-edge">
          <h2 className="text-sm font-semibold text-ink">Historial de cambios</h2>
        </div>
        <ChangesHistory monitorId={id} />
      </div>
    </main>
  );
}
```

- [ ] **Step 3: Verify TypeScript**

```bash
cd /home/uhernand/scrapper && npx tsc --noEmit 2>&1 | grep -E "monitors/\[id\]"
```

Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add "app/(app)/monitors/[id]/components/ChangesHistory.tsx" "app/(app)/monitors/[id]/page.tsx"
git commit -m "feat: add monitor detail page with paginated changes history"
```

---

### Task 5: Push

- [ ] **Step 1: Push to remote**

```bash
git push origin main
```
