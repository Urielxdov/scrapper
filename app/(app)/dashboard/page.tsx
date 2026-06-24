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

  const [alertsToday, changesThisWeek, recentChanges] = await Promise.all([
    prisma.change.count({ where: { detectedAt: { gte: todayStart } } }),
    prisma.change.count({ where: { detectedAt: { gte: weekStart } } }),
    prisma.change.findMany({ select: { targetId: true }, orderBy: { detectedAt: 'desc' }, take: 50 }),
  ]);
  const recentTargetIds = new Set(recentChanges.map(c => c.targetId));

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
