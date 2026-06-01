import Link from 'next/link';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-full flex flex-col">
      <nav className="bg-white border-b px-6 py-3 flex items-center gap-6">
        <Link href="/dashboard" className="font-semibold text-gray-900">Scrapper</Link>
        <Link href="/dashboard" className="text-sm text-gray-600 hover:text-gray-900">Dashboard</Link>
        <Link href="/monitors/new" className="text-sm text-gray-600 hover:text-gray-900">Nuevo Monitor</Link>
      </nav>
      <div className="flex-1 flex flex-col bg-gray-50">{children}</div>
    </div>
  );
}
