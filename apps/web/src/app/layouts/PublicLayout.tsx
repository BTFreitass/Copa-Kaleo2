import { useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router';
import {
  BarChart3,
  Camera,
  Home,
  LogIn,
  LogOut,
  Menu,
  Newspaper,
  Radio,
  Shield,
  Sticker,
  Target,
  Trophy,
  X,
  ClipboardList,
  ExternalLink,
  UserPlus,
} from 'lucide-react';
import { useAuth } from '@/features/auth/AuthProvider';
import { authService } from '@/features/auth/authService';
import { useTournament } from '@/features/tournament/TournamentProvider';
import { LiveDot } from '@/shared/ui';
import { cn } from '@/shared/utils/format';
import { SponsorsStrip } from '@/features/sponsors/Sponsors';
import { useFavoriteTheme } from '@/features/gamification/useFavoriteTheme';
import { UserMenu } from './UserMenu';

const NAV = [
  { to: '/', label: 'Início', icon: Home, end: true },
  { to: '/ao-vivo', label: 'Ao vivo', icon: Radio },
  { to: '/noticias', label: 'Notícias', icon: Newspaper },
  { to: '/jogos', label: 'Jogos', icon: ClipboardList },
  { to: '/classificacao', label: 'Tabela', icon: BarChart3 },
  { to: '/bolao', label: 'Bolão', icon: Target },
  { to: '/figurinhas', label: 'Figurinhas', icon: Sticker },
  { to: '/midia', label: 'Mídia', icon: Camera },
  { to: '/hall-da-fama', label: 'Hall da Fama', icon: Trophy },
  { to: '/inscricao', label: 'Inscrições', icon: UserPlus },
];

const COPA_FACIL = 'https://copafacil.com/4copakaleo';

const MOBILE_NAV = [NAV[0]!, NAV[1]!, NAV[5]!, NAV[4]!, NAV[6]!];

export function PublicLayout() {
  const { user, isAdmin, isMesario, openLogin } = useAuth();
  const { liveMatch } = useTournament();
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  useFavoriteTheme();

  return (
    <div className="flex min-h-screen flex-col pb-16 md:pb-0">
      <header className="sticky top-0 z-40 border-b border-gray-800/80 bg-gray-950/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4">
          <Link to="/" className="flex shrink-0 items-center gap-2.5">
            <span className="rounded-xl bg-gradient-brand p-0.5 shadow-lg shadow-blue-500/20">
              <img src="/img/Kaleo.jpg" alt="" className="size-9 rounded-[10px] object-cover" />
            </span>
            <span className="text-xl font-black uppercase tracking-tighter text-gradient">Copa Kaleo</span>
          </Link>

          <nav className="hidden flex-1 items-center gap-0.5 overflow-x-auto xl:flex">
            {NAV.slice(1).map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-2 text-sm font-semibold transition',
                    isActive ? 'bg-gray-800 text-white' : 'text-gray-400 hover:text-white',
                  )
                }
              >
                {item.to === '/ao-vivo' && liveMatch ? <LiveDot /> : null}
                {item.label}
              </NavLink>
            ))}
            <a href={COPA_FACIL} target="_blank" rel="noreferrer" className="flex items-center gap-1 whitespace-nowrap rounded-lg px-2.5 py-2 text-sm font-semibold text-gray-400 transition hover:text-white">
              Copa Fácil
              <ExternalLink className="size-3.5" />
            </a>
          </nav>

          <div className="ml-auto flex items-center gap-2">
            {(isAdmin || isMesario) && (
              <Link to={isAdmin ? '/admin' : '/admin/jogos'} className="hidden items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-purple-300 hover:bg-gray-800 sm:flex">
                <Shield className="size-4" />
                Painel
              </Link>
            )}
            {user ? (
              <UserMenu />
            ) : (
              <button onClick={openLogin} className="flex items-center gap-1.5 rounded-xl bg-gradient-brand px-4 py-2 text-sm font-bold text-white">
                <LogIn className="size-4" />
                Entrar
              </button>
            )}
            <button className="rounded-lg p-2 text-gray-400 hover:bg-gray-800 xl:hidden" onClick={() => setMenuOpen(true)} aria-label="Menu">
              <Menu className="size-5" />
            </button>
          </div>
        </div>
        {liveMatch && location.pathname !== '/ao-vivo' && (
          <Link to="/ao-vivo" className="flex items-center justify-center gap-3 bg-red-600/90 px-4 py-1.5 text-sm font-bold text-white">
            <LiveDot />
            AO VIVO · {liveMatch.home?.shortName} {liveMatch.score.home} x {liveMatch.score.away} {liveMatch.away?.shortName}
          </Link>
        )}
      </header>

      {menuOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm xl:hidden" onClick={() => setMenuOpen(false)}>
          <aside className="ml-auto flex h-full w-72 flex-col gap-1 bg-gray-950 p-4 animate-pop" onClick={(e) => e.stopPropagation()}>
            <button className="mb-2 ml-auto rounded-lg p-2 text-gray-400" onClick={() => setMenuOpen(false)} aria-label="Fechar menu">
              <X className="size-5" />
            </button>
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) => cn('flex items-center gap-3 rounded-xl px-3 py-3 font-semibold', isActive ? 'bg-gray-800 text-white' : 'text-gray-400')}
              >
                <item.icon className="size-5" />
                {item.label}
              </NavLink>
            ))}
            <a href={COPA_FACIL} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-xl px-3 py-3 font-semibold text-gray-400">
              <ExternalLink className="size-5" />
              Copa Fácil
            </a>
            {(isAdmin || isMesario) && (
              <NavLink to="/admin" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-3 font-semibold text-purple-300">
                <Shield className="size-5" />
                Painel
              </NavLink>
            )}
            {user && (
              <button onClick={() => authService.signOut()} className="mt-auto flex items-center gap-3 rounded-xl px-3 py-3 font-semibold text-gray-500">
                <LogOut className="size-5" />
                Sair
              </button>
            )}
          </aside>
        </div>
      )}

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 md:py-8">
        <Outlet />
      </main>

      <footer className="mt-10 border-t border-gray-800 bg-gray-950">
        <SponsorsStrip />
        <div className="mx-auto max-w-7xl px-4 py-6 text-center text-sm text-gray-500">© {new Date().getFullYear()} Copa Kaleo</div>
      </footer>

      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-gray-800 bg-gray-950/95 backdrop-blur md:hidden">
        {MOBILE_NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => cn('flex flex-col items-center gap-0.5 py-2 text-[10px] font-semibold', isActive ? 'text-white' : 'text-gray-500')}
          >
            <span className="relative">
              <item.icon className="size-5" />
              {item.to === '/ao-vivo' && liveMatch && <span className="absolute -right-1 -top-1 size-2 rounded-full bg-red-500" />}
            </span>
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
