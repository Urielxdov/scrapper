'use client';

import { useEffect, useState } from 'react';

type Monitor = {
  id: string;
  name: string | null;
  targetId: string;
  isActive: boolean;
  createdAt: string;
};

export default function DashboardPage() {
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/monitors')
      .then(r => r.json())
      .then(data => { setMonitors(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <main className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Monitors</h1>
      {loading && <p>Loading...</p>}
      {!loading && monitors.length === 0 && <p className="text-gray-500">No monitors yet.</p>}
      <ul className="space-y-3">
        {monitors.map(m => (
          <li key={m.id} className="border rounded p-4 flex justify-between items-center">
            <div>
              <p className="font-medium">{m.name ?? m.id}</p>
              <p className="text-sm text-gray-500">Target: {m.targetId}</p>
            </div>
            <span className={`text-xs px-2 py-1 rounded ${m.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100'}`}>
              {m.isActive ? 'Active' : 'Paused'}
            </span>
          </li>
        ))}
      </ul>
    </main>
  );
}
