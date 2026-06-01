'use client';

import { useEffect } from 'react';

// Script inyectado en <head> para evitar flash de tema incorrecto.
// Se ejecuta sincrónicamente antes del primer paint.
export const themeScript = `
(function(){
  try {
    var t = localStorage.getItem('theme');
    var d = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.setAttribute('data-theme', t === 'dark' || (!t && d) ? 'dark' : 'light');
  } catch(e) {}
})();
`;

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Sincroniza el atributo si no fue aplicado por el script inline
    if (!document.documentElement.hasAttribute('data-theme')) {
      const saved = localStorage.getItem('theme');
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const isDark = saved === 'dark' || (!saved && prefersDark);
      document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    }
  }, []);

  return <>{children}</>;
}
