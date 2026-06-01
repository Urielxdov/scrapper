'use client';

export type PreviewResult = {
  label: string;
  css: string;
  regex: string;
  values: string[];
  count: number;
};

type PreviewModalProps = {
  results: PreviewResult[];
  loading: boolean;
  error: string | null;
  onClose: () => void;
  onConfirm: () => void;
};

export function PreviewModal({ results, loading, error, onClose, onConfirm }: PreviewModalProps) {
  const canCreate = !loading && !error && results.length > 0 && results.every(r => r.count > 0);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Resultados encontrados</h2>
        </div>

        <div className="p-6">
          {loading && (
            <p className="text-center text-gray-400 py-8 text-sm">Buscando elementos en la página...</p>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {!loading && !error && (
            <ul className="divide-y">
              {results.map((r, i) => (
                <li key={i} className="flex items-center justify-between py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-800">{r.label}</p>
                    <p className="text-xs text-gray-500 truncate">{r.values[0] ?? '—'}</p>
                  </div>
                  <span className={`ml-4 flex-shrink-0 text-xs px-2 py-1 rounded-full font-medium ${
                    r.count === 0
                      ? 'bg-red-100 text-red-700'
                      : r.count === 1
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-green-100 text-green-700'
                  }`}>
                    {r.count === 0
                      ? '❌ Sin coincidencias'
                      : r.count === 1
                      ? '⚠️ 1 coincidencia'
                      : `${r.count} coincidencias`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="p-6 border-t flex justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50"
          >
            ← Editar
          </button>
          <button
            onClick={onConfirm}
            disabled={!canCreate}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            ✓ Crear Monitor
          </button>
        </div>
      </div>
    </div>
  );
}
