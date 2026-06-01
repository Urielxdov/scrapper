import Link from 'next/link';
import { ThemeToggle } from '@/app/components/ThemeToggle';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-full flex flex-col">
      <nav className="bg-surface border-b border-edge px-6 py-3 flex items-center gap-6">
        <Link href="/dashboard" className="font-semibold text-ink">Scrapper</Link>
        <Link href="/dashboard" className="text-sm text-ink-muted hover:text-ink transition-colors">Dashboard</Link>
        <Link href="/monitors/new" className="text-sm text-ink-muted hover:text-ink transition-colors">Nuevo Monitor</Link>
        <div className="ml-auto">
          <ThemeToggle />
        </div>
      </nav>
      <div className="flex-1 flex flex-col bg-surface-muted">{children}</div>
    </div>
  );
}
