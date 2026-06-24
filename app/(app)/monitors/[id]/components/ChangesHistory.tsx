'use client';

import { useEffect, useState } from 'react';
import type { DiffEntry, ChangeType } from '@/lib/shared/types/monitor.types';

type ChangeRecord = {
  id: string;
  type: ChangeType;
  diff: unknown;
  detectedAt: string;
};

type ApiResponse = { data: ChangeRecord[]; total: number };

const PAGE_SIZE = 50;

export function ChangesHistory({ monitorId }: { monitorId: string }) {
  const [records, setRecords] = useState<ChangeRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    setLoading(true);
    setExpanded(new Set());
    fetch(`/api/monitors/${monitorId}/changes?limit=${PAGE_SIZE}&offset=${offset}`)
      .then(r => { if (!r.ok) throw new Error('fetch failed'); return r.json() as Promise<ApiResponse>; })
      .then(res => { setRecords(res.data); setTotal(res.total); })
      .catch(() => setError('Error al cargar historial'))
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

  if (error) return <p className="py-8 text-center text-sm text-red-500">{error}</p>;

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
              const diff = Array.isArray(r.diff) ? r.diff as DiffEntry[] : [];
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
