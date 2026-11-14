import type { SitePalette } from './types';

export const DEFAULT_PALETTE: SitePalette = 'quadra';

export const SITE_PALETTES: { id: SitePalette; name: string; description: string; swatches: string[] }[] = [
  {
    id: 'quadra',
    name: 'Quadra noturna',
    description: 'Grafite neutro, azul de destaque e o título em azul, branco e vermelho, com linhas de quadra no destaque da home.',
    swatches: ['#0E1013', '#171A1F', '#2563EB', '#FFFFFF', '#E11D2E'],
  },
  {
    id: 'classico',
    name: 'Clássico',
    description: 'Marinho com degradê azul e vermelho no título, o visual usado até novembro de 2026.',
    swatches: ['#070D1C', '#0F182C', '#1D4ED8', '#7C3AED', '#DC2626'],
  },
];

export function isSitePalette(value: unknown): value is SitePalette {
  return SITE_PALETTES.some((p) => p.id === value);
}
