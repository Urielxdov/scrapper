import { Sidebar } from '@/app/components/Sidebar';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 bg-surface-muted overflow-auto">
        {children}
      </div>
    </div>
  );
}
