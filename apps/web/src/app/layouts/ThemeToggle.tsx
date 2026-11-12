import { Moon, Sun } from 'lucide-react';
import { setTheme, useTheme } from '@/shared/lib/theme';

export function ThemeToggle() {
  const theme = useTheme();
  const next = theme === 'dark' ? 'light' : 'dark';
  return (
    <button
      onClick={() => setTheme(next)}
      className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-800 hover:text-white"
      aria-label={next === 'light' ? 'Ativar modo claro' : 'Ativar modo escuro'}
      title={next === 'light' ? 'Modo claro' : 'Modo escuro'}
    >
      {theme === 'dark' ? <Sun className="size-5" /> : <Moon className="size-5" />}
    </button>
  );
}
