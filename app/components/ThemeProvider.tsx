'use client';

import { useEffect } from 'react';

export const themeScript = `
(function(){
  try {
    var t = localStorage.getItem('theme');
    var d = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.setAttribute('data-theme', t === 'dark' || (!t && d) ? 'dark' : 'light');
    var a = localStorage.getItem('accent-color');
    if (a) document.documentElement.style.setProperty('--color-accent', a);
  } catch(e) {}
})();
`;

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (!document.documentElement.hasAttribute('data-theme')) {
      const saved = localStorage.getItem('theme');
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const isDark = saved === 'dark' || (!saved && prefersDark);
      document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    }
    const accent = localStorage.getItem('accent-color');
    if (accent) document.documentElement.style.setProperty('--color-accent', accent);
  }, []);

  return <>{children}</>;
}
