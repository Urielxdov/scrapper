'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface SettingsModalProps {
  onClose: () => void;
}

const ACCENT_COLORS = [
  { name: 'Azul',      value: '#3b82f6' },
  { name: 'Violeta',   value: '#8b5cf6' },
  { name: 'Rosa',      value: '#f43f5e' },
  { name: 'Ámbar',     value: '#f59e0b' },
  { name: 'Esmeralda', value: '#10b981' },
  { name: 'Gris',      value: '#64748b' },
];

export function SettingsModal({ onClose }: SettingsModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [theme, setThemeState] = useState<'light' | 'dark'>('light');
  const [accent, setAccentState] = useState('#3b82f6');

  // Read current values from DOM on mount
  useEffect(() => {
    setThemeState(
      document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'
    );
    const saved = localStorage.getItem('accent-color');
    if (saved) setAccentState(saved);
    else {
      const computed = getComputedStyle(document.documentElement)
        .getPropertyValue('--color-accent').trim();
      if (computed) setAccentState(computed);
    }
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose();
  };

  const applyTheme = (t: 'light' | 'dark') => {
    document.documentElement.setAttribute('data-theme', t);
    localStorage.setItem('theme', t);
    setThemeState(t);
  };

  const applyAccent = (color: string) => {
    document.documentElement.style.setProperty('--color-accent', color);
    localStorage.setItem('accent-color', color);
    setAccentState(color);
  };

  return createPortal(
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
    >
      <div className="bg-surface border border-edge rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-edge">
          <h2 className="text-base font-semibold text-ink">Ajustes</h2>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-ink-muted hover:bg-surface-hover hover:text-ink transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-6">

          {/* Apariencia */}
          <section className="space-y-4">
            <h3 className="text-xs font-semibold text-ink-muted uppercase tracking-wider">
              Apariencia
            </h3>

            {/* Tema */}
            <div className="space-y-2">
              <p className="text-sm text-ink">Tema</p>
              <div className="flex gap-2">
                {(['light', 'dark'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => applyTheme(t)}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                      theme === t
                        ? 'border-[--color-accent] bg-[--color-accent] text-white'
                        : 'border-edge text-ink-muted hover:bg-surface-hover'
                    }`}
                  >
                    {t === 'light' ? 'Claro' : 'Oscuro'}
                  </button>
                ))}
              </div>
            </div>

            {/* Color de acento */}
            <div className="space-y-2">
              <p className="text-sm text-ink">Color de acento</p>
              <div className="flex gap-2">
                {ACCENT_COLORS.map((c) => {
                  const isActive =
                    accent.replace(/\s/g, '').toLowerCase() === c.value.toLowerCase();
                  return (
                    <button
                      key={c.value}
                      title={c.name}
                      onClick={() => applyAccent(c.value)}
                      style={{ backgroundColor: c.value }}
                      className={`w-8 h-8 rounded-full transition-transform hover:scale-110 ${
                        isActive ? 'ring-2 ring-offset-2 ring-[--color-accent]' : ''
                      }`}
                    />
                  );
                })}
              </div>
            </div>
          </section>

          {/* Secciones futuras se agregan aquí como nuevos <section> */}

        </div>
      </div>
    </div>,
    document.body
  );
}
