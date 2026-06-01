import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import { ThemeProvider, themeScript } from '@/app/components/ThemeProvider';
import './globals.css';

const geist = Geist({ subsets: ['latin'], variable: '--font-geist' });

export const metadata: Metadata = {
  title: 'Scrapper',
  description: 'Monitor de cambios en páginas web',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${geist.variable} h-full`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full flex flex-col antialiased bg-surface text-ink">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
