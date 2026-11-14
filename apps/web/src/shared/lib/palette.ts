import { useSyncExternalStore } from 'react';
import { DEFAULT_PALETTE, isSitePalette, type SitePalette } from '@copa/shared';

const KEY = 'copa:palette';
const BACKGROUND: Record<SitePalette, { light: string; dark: string }> = {
  quadra: { light: '#f6f7f9', dark: '#0e1013' },
  classico: { light: '#f3f6fb', dark: '#070d1c' },
};
const listeners = new Set<() => void>();
let site: SitePalette = savedPalette() ?? DEFAULT_PALETTE;
let preview: SitePalette | null = null;

function savedPalette(): SitePalette | null {
  try {
    const value = localStorage.getItem(KEY);
    return isSitePalette(value) ? value : null;
  } catch {
    return null;
  }
}

function currentPalette(): SitePalette {
  const value = document.documentElement.dataset.palette;
  return isSitePalette(value) ? value : DEFAULT_PALETTE;
}

export function themeColor(theme: 'light' | 'dark') {
  return BACKGROUND[currentPalette()][theme];
}

function apply() {
  const root = document.documentElement;
  root.dataset.palette = preview ?? site;
  const theme = root.classList.contains('light') ? 'light' : 'dark';
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', themeColor(theme));
  listeners.forEach((listener) => listener());
}

export function setSitePalette(palette: SitePalette) {
  site = palette;
  try {
    localStorage.setItem(KEY, palette);
  } catch {
    return apply();
  }
  apply();
}

export function previewPalette(palette: SitePalette | null) {
  preview = palette;
  apply();
}

export function usePalette() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    currentPalette,
    () => DEFAULT_PALETTE,
  );
}
