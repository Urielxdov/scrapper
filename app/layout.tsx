import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import Link from 'next/link';
import './globals.css';

const geist = Geist({ subsets: ['latin'], variable: '--font-geist' });

export const metadata: Metadata = {
  title: 'Scrapper',
  description: 'Monitor de cambios en páginas web',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${geist.variable} h-full`}>
      <body className="min-h-full flex flex-col antialiased bg-gray-50">
        <nav className="bg-white border-b px-6 py-3 flex items-center gap-6">
          <Link href="/" className="font-semibold text-gray-900">Scrapper</Link>
          <Link href="/" className="text-sm text-gray-600 hover:text-gray-900">Dashboard</Link>
          <Link href="/monitors/new" className="text-sm text-gray-600 hover:text-gray-900">Nuevo Monitor</Link>
        </nav>
        <div className="flex-1 flex flex-col">{children}</div>
      </body>
    </html>
  );
}
