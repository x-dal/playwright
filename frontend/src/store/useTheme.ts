import { useEffect, useState } from 'react';

export type Theme = 'dark' | 'light' | 'auto';

function resolveIsDark(theme: Theme): boolean {
  if (theme === 'dark') return true;
  if (theme === 'light') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle('dark', resolveIsDark(theme));
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(
    () => (localStorage.getItem('pw-theme') as Theme) ?? 'dark',
  );

  // Apply on mount (in case IIFE in main.tsx missed a value)
  useEffect(() => { applyTheme(theme); }, []);

  // Re-apply when system preference changes (only relevant in 'auto' mode)
  useEffect(() => {
    if (theme !== 'auto') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => applyTheme('auto');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme]);

  function setTheme(t: Theme) {
    applyTheme(t);                      // immediate DOM update — no waiting for useEffect
    localStorage.setItem('pw-theme', t);
    setThemeState(t);
  }

  return { theme, setTheme };
}
