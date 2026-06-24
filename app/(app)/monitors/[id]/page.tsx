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
