import { lazy, Suspense, type ComponentType } from 'react';
import { createBrowserRouter, Link, useRouteError } from 'react-router';
import { PublicLayout } from './layouts/PublicLayout';
import { EmptyState, PageLoader } from '@/shared/ui';
import { HomePage } from '@/features/home/HomePage';

function page<T>(loader: () => Promise<T>, name: keyof T) {
  const Component = lazy(async () => ({ default: (await loader())[name] as unknown as ComponentType }));
  return (
    <Suspense fallback={<PageLoader />}>
      <Component />
    </Suspense>
  );
}

const live = () => import('@/features/live/LivePage');
const news = () => import('@/features/news/pages');
const matches = () => import('@/features/matches/pages');
const stats = () => import('@/features/stats/pages');
const teams = () => import('@/features/teams/pages');
const bolao = () => import('@/features/predictions/pages');
const media = () => import('@/features/media/pages');
const stickers = () => import('@/features/stickers/StickersPage');
const profile = () => import('@/features/profile/pages');
const wrapped = () => import('@/features/wrapped/WrappedPage');
const hall = () => import('@/features/hall-of-fame/HallOfFamePage');
const checkin = () => import('@/features/fan/CheckinPage');
const registration = () => import('@/features/registrations/RegistrationPage');
const magic = () => import('@/features/auth/MagicLinkPage');
const telao = () => import('@/features/telao/TelaoPage');
const mesario = () => import('@/features/mesario/MesarioPage');
const adminLayout = () => import('@/features/admin/AdminLayout');
const adminTournament = () => import('@/features/admin/TournamentAdmin');
const adminTeams = () => import('@/features/admin/TeamsAdmin');
const adminMatches = () => import('@/features/admin/MatchesAdmin');
const adminPosts = () => import('@/features/admin/PostsAdmin');
const adminMisc = () => import('@/features/admin/MiscAdmin');

function RouteError() {
  const error = useRouteError() as { status?: number } | undefined;
  return (
    <div className="p-10">
      <EmptyState
        title={error?.status === 404 ? 'Página não encontrada' : 'Algo deu errado'}
        description={error?.status === 404 ? 'Esse endereço não existe.' : 'Recarregue a página. Se continuar, avise a organização.'}
        action={<Link to="/" className="font-semibold text-purple-300">Voltar ao início</Link>}
      />
    </div>
  );
}

export const router = createBrowserRouter([
  { path: '/telao', element: page(telao, 'TelaoPage'), errorElement: <RouteError /> },
  {
    path: '/',
    element: <PublicLayout />,
    errorElement: <RouteError />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'ao-vivo', element: page(live, 'LivePage') },
      { path: 'noticias', element: page(news, 'NewsListPage') },
      { path: 'noticias/:slug', element: page(news, 'PostPage') },
      { path: 'jogos', element: page(matches, 'SchedulePage') },
      { path: 'jogos/:id', element: page(matches, 'MatchPage') },
      { path: 'classificacao', element: page(stats, 'StandingsPage') },
      { path: 'chaveamento', element: page(stats, 'BracketPage') },
      { path: 'estatisticas', element: page(stats, 'StatsPage') },
      { path: 'times', element: page(teams, 'TeamsPage') },
      { path: 'times/:id', element: page(teams, 'TeamPage') },
      { path: 'jogadores/:id', element: page(teams, 'PlayerPage') },
      { path: 'bolao', element: page(bolao, 'PredictionsPage') },
      { path: 'bolao/ranking', element: page(bolao, 'LeaderboardPage') },
      { path: 'bolao/ligas', element: page(bolao, 'LeaguesPage') },
      { path: 'bolao/ligas/:id', element: page(bolao, 'LeaguePage') },
      { path: 'bolao/duelos', element: page(bolao, 'DuelsPage') },
      { path: 'midia', element: page(media, 'MediaPage') },
      { path: 'midia/albuns/:id', element: page(media, 'AlbumPage') },
      { path: 'figurinhas', element: page(stickers, 'StickersPage') },
      { path: 'perfil', element: page(profile, 'MyProfilePage') },
      { path: 'perfil/:uid', element: page(profile, 'PublicProfilePage') },
      { path: 'minha-copa/:tournamentId', element: page(wrapped, 'WrappedPage') },
      { path: 'hall-da-fama', element: page(hall, 'HallOfFamePage') },
      { path: 'checkin/:matchId', element: page(checkin, 'CheckinPage') },
      { path: 'inscricao', element: page(registration, 'RegistrationPage') },
      { path: 'entrar/link', element: page(magic, 'MagicLinkPage') },
      { path: 'mesario/:id', element: page(mesario, 'MesarioPage') },
      {
        path: 'admin',
        element: page(adminLayout, 'AdminLayout'),
        children: [
          { index: true, element: page(adminTournament, 'AdminDashboard') },
          { path: 'torneio', element: page(adminTournament, 'TournamentAdmin') },
          { path: 'times', element: page(adminTeams, 'TeamsAdmin') },
          { path: 'jogos', element: page(adminMatches, 'MatchesAdmin') },
          { path: 'noticias', element: page(adminPosts, 'PostsAdmin') },
          { path: 'noticias/:id', element: page(adminPosts, 'PostEditor') },
          { path: 'midia', element: page(adminMisc, 'MediaAdmin') },
          { path: 'inscricoes', element: page(adminMisc, 'RegistrationsAdmin') },
          { path: 'mural', element: page(adminMisc, 'WallAdmin') },
          { path: 'cupons', element: page(adminMisc, 'CouponsAdmin') },
          { path: 'config', element: page(adminMisc, 'SettingsAdmin') },
          { path: 'usuarios', element: page(adminMisc, 'UsersAdmin') },
        ],
      },
      { path: '*', element: <EmptyState title="Página não encontrada" action={<Link to="/" className="text-purple-300">Voltar ao início</Link>} /> },
    ],
  },
]);
