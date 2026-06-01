import Link from 'next/link';
import { prisma } from '@/lib/shared/prisma';
import { auth } from '@/lib/auth/infrastructure/adapters/authjs.config';
import { redirect } from 'next/navigation';
import { DeleteMonitorButton } from '@/app/components/DeleteMonitorButton';

export default async function HomePage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/api/auth/signin');

  const userId = session.user.id!;

  const monitors = await prisma.monitor.findMany({
    where: { userId },
    include: { target: true },
    orderBy: { createdAt: 'desc' },
  });

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - 7);

  const changes = await prisma.change.findMany({
    where: { target: { monitors: { some: { userId } } } },
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
    <main className="max-w-6xl mx-auto w-full p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <Link
          href="/monitors/new"
          className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 transition-colors"
        >
          + Nuevo Monitor
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Monitores activos', value: monitors.filter(m => m.isActive).length },
          { label: 'Alertas hoy', value: alertsToday },
          { label: 'Cambios esta semana', value: changesThisWeek },
        ].map(stat => (
          <div key={stat.label} className="bg-white border rounded-xl p-5 shadow-sm">
            <p className="text-sm text-gray-500 mb-1">{stat.label}</p>
            <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              {['Nombre', 'URL', 'Estado', 'Última corrida', 'Acciones'].map(h => (
                <th key={h} className="text-left px-4 py-3 font-medium text-gray-600">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {monitors.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center py-12 text-gray-400">
                  Sin monitores aún.{' '}
                  <Link href="/monitors/new" className="text-blue-500 hover:underline">Crea uno</Link>
                </td>
              </tr>
            )}
            {monitors.map(m => (
              <tr key={m.id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">
                  {m.name ?? m.id.slice(0, 8)}
                </td>
                <td className="px-4 py-3 text-gray-500 max-w-[220px] truncate">
                  {m.target.url}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-block w-3 h-3 rounded-full ${statusColor(m)}`} />
                </td>
                <td className="px-4 py-3 text-gray-500">
                  {m.target.lastRunAt
                    ? new Date(m.target.lastRunAt).toLocaleString('es-MX')
                    : '—'}
                </td>
                <td className="px-4 py-3">
                  <DeleteMonitorButton id={m.id} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
