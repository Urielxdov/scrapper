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
