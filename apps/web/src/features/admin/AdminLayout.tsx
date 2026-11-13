import { NavLink, Outlet, useLocation } from 'react-router';
import { ClipboardCheck, Cog, Film, Gauge, MessagesSquare, Newspaper, Shield, Ticket, Trophy, Users, Wrench, CalendarRange } from 'lucide-react';
import { useAuth } from '@/features/auth/AuthProvider';
import { useTournament } from '@/features/tournament/TournamentProvider';
import { CreateEdition } from './CreateEdition';
import { EmptyState, PageLoader } from '@/shared/ui';
import { cn } from '@/shared/utils/format';

const WITHOUT_EDITION = ['/admin/usuarios', '/admin/config'];

const LINKS = [
  { to: '/admin', label: 'Visão geral', icon: Gauge, end: true, admin: true },
  { to: '/admin/torneio', label: 'Torneio', icon: Trophy, admin: true },
  { to: '/admin/times', label: 'Times e atletas', icon: Users, admin: true },
  { to: '/admin/jogos', label: 'Jogos', icon: CalendarRange, admin: false },
  { to: '/admin/noticias', label: 'Notícias', icon: Newspaper, admin: true },
  { to: '/admin/midia', label: 'Mídia', icon: Film, admin: true },
  { to: '/admin/inscricoes', label: 'Inscrições', icon: ClipboardCheck, admin: true },
  { to: '/admin/mural', label: 'Mural', icon: MessagesSquare, admin: true },
  { to: '/admin/cupons', label: 'Cupons', icon: Ticket, admin: true },
  { to: '/admin/config', label: 'Transmissão e patrocínio', icon: Cog, admin: true },
  { to: '/admin/usuarios', label: 'Usuários e papéis', icon: Wrench, admin: true },
];

export function AdminLayout() {
  const { isAdmin, isMesario, loading } = useAuth();
  const { tournament, loading: tournamentLoading } = useTournament();
  const { pathname } = useLocation();
  if (loading || tournamentLoading) return <PageLoader />;
  if (!isMesario) return <EmptyState icon={<Shield />} title="Área restrita" description="Entre com uma conta de administrador ou mesário." />;
  const links = LINKS.filter((l) => isAdmin || !l.admin);

  return (
    <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
      <aside className="flex gap-1 overflow-x-auto lg:sticky lg:top-24 lg:h-fit lg:flex-col">
        <p className="mb-2 hidden px-3 text-xs font-bold uppercase tracking-widest text-purple-300 lg:block">Painel</p>
        {links.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.end}
            className={({ isActive }) => cn('flex items-center gap-2 whitespace-nowrap rounded-xl px-3 py-2 text-sm font-semibold', isActive ? 'bg-gray-800 text-white' : 'text-gray-400 hover:text-white')}
          >
            <l.icon className="size-4" />
            {l.label}
          </NavLink>
        ))}
      </aside>
      <div className="min-w-0">
        {tournament || WITHOUT_EDITION.includes(pathname) ? (
          <Outlet />
        ) : isAdmin ? (
          <CreateEdition />
        ) : (
          <EmptyState title="Nenhuma edição ativa" description="Peça a um administrador para criar a edição do torneio." />
        )}
      </div>
    </div>
  );
}
