'use client';

import { useEffect, useState } from 'react';

export type Pin = { label: string; css: string };

type ProxyFrameProps = {
  onPinAdded: (pin: Pin) => void;
  onUrlChange: (url: string) => void;
};

export function ProxyFrame({ onPinAdded, onUrlChange }: ProxyFrameProps) {
  const [inputUrl, setInputUrl] = useState('');
  const [iframeSrc, setIframeSrc] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    function handler(e: MessageEvent) {
      if (e.data?.type === 'PIN_ADDED' && e.data.label && e.data.css) {
        onPinAdded({ label: e.data.label, css: e.data.css });
      }
    }
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [onPinAdded]);

  function handleLoad() {
    if (!inputUrl.trim()) return;
    let url = inputUrl.trim();
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
    onUrlChange(url);
    setLoading(true);
    setIframeSrc('/api/proxy?url=' + encodeURIComponent(url));
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex gap-2 p-3 border-b border-edge bg-surface">
        <input
          type="text"
          value={inputUrl}
          onChange={e => setInputUrl(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleLoad()}
          placeholder="https://ejemplo.com/producto"
          className="flex-1 border border-edge rounded-lg px-3 py-2 text-sm bg-surface text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        <button
          onClick={handleLoad}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 transition-colors"
        >
          Cargar
        </button>
      </div>

      <div className="flex-1 relative bg-surface-muted">
        {!iframeSrc && (
          <div className="absolute inset-0 flex items-center justify-center text-ink-faint text-sm">
            Ingresa una URL y haz clic en <strong className="mx-1 text-ink-muted">Cargar</strong> para comenzar
          </div>
        )}
        {iframeSrc && (
          <iframe
            src={iframeSrc}
            className="w-full h-full border-0"
            sandbox="allow-same-origin allow-scripts allow-forms"
            onLoad={() => setLoading(false)}
          />
        )}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-surface/80 text-sm text-ink-muted">
            Cargando página...
          </div>
        )}
      </div>
    </div>
  );
}
