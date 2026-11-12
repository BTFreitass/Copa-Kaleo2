import { useSyncExternalStore } from 'react';

export type Theme = 'light' | 'dark';

const KEY = 'copa:theme';
const BACKGROUND: Record<Theme, string> = { light: '#f3f6fb', dark: '#070d1c' };
const listeners = new Set<() => void>();

function systemTheme(): Theme {
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

function savedTheme(): Theme | null {
  try {
    const value = localStorage.getItem(KEY);
    return value === 'light' || value === 'dark' ? value : null;
  } catch {
    return null;
  }
}

function currentTheme(): Theme {
  return document.documentElement.classList.contains('light') ? 'light' : 'dark';
}

function apply(theme: Theme) {
  const root = document.documentElement;
  root.classList.remove('light', 'dark');
  root.classList.add(theme);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', BACKGROUND[theme]);
  listeners.forEach((listener) => listener());
}

export function setTheme(theme: Theme) {
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    return apply(theme);
  }
  apply(theme);
}

export function initTheme() {
  apply(savedTheme() ?? systemTheme());
  window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => {
    if (!savedTheme()) apply(systemTheme());
  });
}

export function useTheme() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    currentTheme,
    () => 'dark' as Theme,
  );
}
