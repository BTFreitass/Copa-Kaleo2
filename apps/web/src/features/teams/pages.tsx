import { Link, useParams } from 'react-router';
import { Shield } from 'lucide-react';
import { POSITION_LABEL, playerCard, type Player, type PlayerStats, type Team } from '@copa/shared';
import { useTournament } from '@/features/tournament/TournamentProvider';
import { refs } from '@/shared/lib/collections';
import { useDocument } from '@/shared/lib/data';
import { EmptyState, PageHeader, PageLoader, TeamCrest } from '@/shared/ui';
import { MatchCard } from '@/features/matches/components';
import { ShareableCard } from '@/shared/components/ShareCard';

export function TeamsPage() {
  const { teams, players, loading } = useTournament();
  if (loading) return <PageLoader />;
  return (
    <div>
      <PageHeader title="Times" subtitle={`${teams.length} equipes na disputa`} icon={<Shield />} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {teams.map((t) => (
          <Link key={t.id} to={`/times/${t.id}`} className="group flex flex-col items-center gap-3 rounded-2xl border border-gray-800 bg-gray-900/60 p-6 transition hover:border-gray-600" style={{ boxShadow: `inset 0 -60px 80px -60px ${t.primaryColor}` }}>
            <TeamCrest team={t} size="lg" />
            <span className="text-lg font-black text-white">{t.name}</span>
            <span className="text-xs text-gray-400">{t.group ? `Grupo ${t.group}` : ''} · {players.filter((p) => p.teamId === t.id).length} atletas</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

export function TeamPage() {
  const { id = '' } = useParams();
  const { teamsById, players, matches } = useTournament();
  const team = teamsById.get(id);
  if (!team) return <EmptyState title="Time não encontrado" />;
  const roster = players.filter((p) => p.teamId === id).sort((a, b) => a.number - b.number);
  const games = matches.filter((m) => m.homeTeamId === id || m.awayTeamId === id);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center gap-5 rounded-3xl border border-gray-800 p-6" style={{ background: `linear-gradient(120deg, ${team.primaryColor}55, transparent 60%)` }}>
        <TeamCrest team={team} size="xl" />
        <div>
          <h1 className="text-3xl font-black text-white sm:text-4xl">{team.name}</h1>
          <p className="text-gray-300">{team.group ? `Grupo ${team.group}` : 'Mata-mata'}</p>
        </div>
      </div>
      <section>
        <h2 className="mb-3 text-xl font-black">Elenco</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {roster.map((p) => (
            <Link key={p.id} to={`/jogadores/${p.id}`} className="rounded-xl border border-gray-800 bg-gray-900/60 p-3 hover:border-gray-600">
              <span className="text-2xl font-black text-gray-600">{p.number}</span>
              <p className="font-semibold text-white">{p.name}</p>
              <p className="text-xs text-gray-500">{POSITION_LABEL[p.position]}</p>
            </Link>
          ))}
        </div>
      </section>
      <section>
        <h2 className="mb-3 text-xl font-black">Jogos</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {games.map((m) => <MatchCard key={m.id} match={m} />)}
        </div>
      </section>
    </div>
  );
}

export function PlayerPage() {
  const { id = '' } = useParams();
  const { playersById, teamsById, tournamentId, loading } = useTournament();
  const player = playersById.get(id);
  const stats = useDocument(tournamentId ? refs.playerStats(`${tournamentId}_${id}`) : null);
  if (loading) return <PageLoader />;
  if (!player) return <EmptyState title="Atleta não encontrado" />;
  const team = teamsById.get(player.teamId) ?? null;

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-6">
      <PageHeader title={player.name} subtitle={`${POSITION_LABEL[player.position]} · ${team?.name ?? ''}`} />
      <ShareableCard fileName={`carta-${player.name}`} label="Compartilhar carta">
        <PlayerCardView player={player} team={team} stats={stats.data} />
      </ShareableCard>
      <p className="text-center text-xs text-gray-500">Os atributos evoluem com os gols, assistências, cartões e votos de Craque do Jogo.</p>
    </div>
  );
}

export function PlayerCardView({ player, team, stats }: { player: Player; team: Team | null; stats: PlayerStats | null }) {
  const card = playerCard(stats);
  const attrs = [
    ['FIN', card.finishing, 'Finalização'],
    ['CRI', card.creation, 'Criação'],
    ['DIS', card.discipline, 'Disciplina'],
    ['IMP', card.impact, 'Impacto'],
  ] as const;
  const color = team?.primaryColor ?? '#7c3aed';
  return (
    <div className="relative flex size-full flex-col overflow-hidden p-6 text-white" style={{ background: `linear-gradient(160deg, ${color} 0%, #111827 55%, #030712 100%)` }}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-6xl font-black leading-none">{card.overall}</p>
          <p className="text-sm font-bold uppercase tracking-widest text-white/70">{player.position}</p>
        </div>
        <TeamCrest team={team} size="lg" />
      </div>
      <div className="my-6 flex flex-1 items-center justify-center">
        {player.photoUrl ? (
          <img src={player.photoUrl} alt="" className="max-h-56 rounded-2xl object-cover" />
        ) : (
          <span className="text-[120px] font-black leading-none text-white/15">{player.number}</span>
        )}
      </div>
      <p className="text-center text-2xl font-black uppercase tracking-tight">{player.name}</p>
      <p className="mb-4 text-center text-xs text-white/60">{team?.name} · nº {player.number}</p>
      <div className="grid grid-cols-2 gap-2">
        {attrs.map(([abbr, value, label]) => (
          <div key={abbr} className="flex items-center justify-between rounded-lg bg-black/30 px-3 py-2" title={label}>
            <span className="text-xs font-bold text-white/60">{abbr}</span>
            <span className="text-lg font-black">{value}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 flex justify-around text-center text-xs text-white/70">
        <span>⚽ {stats?.goals ?? 0}</span>
        <span>🎯 {stats?.assists ?? 0}</span>
        <span>⭐ {stats?.mvpCount ?? 0}</span>
        <span>🟨 {stats?.yellow ?? 0}</span>
      </div>
    </div>
  );
}
