import { useMemo } from 'react';
import { Link } from 'react-router';
import { BarChart3, GitBranch, Goal } from 'lucide-react';
import { STAGE_LABEL, computeGroupStandings, qualificationOdds, type Match, type Stage } from '@copa/shared';
import { useTournament } from '@/features/tournament/TournamentProvider';
import { queries } from '@/shared/lib/collections';
import { useCollection } from '@/shared/lib/data';
import { Card, EmptyState, PageHeader, PageLoader, TeamCrest } from '@/shared/ui';
import { cn } from '@/shared/utils/format';
import { slotName } from '@/features/matches/components';

export function StandingsPage() {
  const { teams, matches, tournament, loading } = useTournament();
  const table = useMemo(() => computeGroupStandings(teams, matches), [teams, matches]);
  const advance = tournament?.format.advancePerGroup ?? 2;
  const odds = useMemo(() => (teams.length ? qualificationOdds(teams, matches, advance, 3000) : {}), [teams, matches, advance]);

  if (loading) return <PageLoader />;
  const groups = Object.entries(table);

  return (
    <div>
      <PageHeader title="Classificação" subtitle="Fase de grupos com chance de classificação simulada" icon={<BarChart3 />} actions={<StatsNav />} />
      {groups.length === 0 && <EmptyState title="Sem fase de grupos" description="Este formato vai direto para o mata-mata." />}
      <div className="grid gap-6 lg:grid-cols-2">
        {groups.map(([group, rows]) => (
          <Card key={group} className="overflow-hidden">
            <h2 className="border-b border-gray-800 px-4 py-3 font-black text-white">Grupo {group}</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-3 py-2 text-left">Time</th>
                    {['P', 'J', 'V', 'E', 'D', 'SG', 'GP'].map((h) => (
                      <th key={h} className="px-2 py-2 text-center">{h}</th>
                    ))}
                    <th className="px-3 py-2 text-right" title="Chance de classificação">%</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={r.team.id} className={cn('border-t border-gray-800/70', i < advance && 'bg-emerald-500/5')}>
                      <td className="px-3 py-2.5">
                        <Link to={`/times/${r.team.id}`} className="flex items-center gap-2 font-semibold">
                          <span className={cn('w-4 text-xs', i < advance ? 'text-emerald-400' : 'text-gray-500')}>{i + 1}</span>
                          <TeamCrest team={r.team} size="xs" />
                          <span className="truncate">{r.team.name}</span>
                        </Link>
                      </td>
                      <td className="px-2 text-center font-black text-white">{r.points}</td>
                      <td className="px-2 text-center text-gray-400">{r.played}</td>
                      <td className="px-2 text-center text-gray-400">{r.won}</td>
                      <td className="px-2 text-center text-gray-400">{r.drawn}</td>
                      <td className="px-2 text-center text-gray-400">{r.lost}</td>
                      <td className="px-2 text-center text-gray-400">{r.goalDiff}</td>
                      <td className="px-2 text-center text-gray-400">{r.goalsFor}</td>
                      <td className="px-3 text-right">
                        <span className={cn('font-bold', (odds[r.team.id] ?? 0) >= 50 ? 'text-emerald-300' : 'text-gray-400')}>{odds[r.team.id] ?? 0}%</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        ))}
      </div>
      <p className="mt-4 text-xs text-gray-500">P: pontos · J: jogos · V/E/D: vitórias, empates, derrotas · SG: saldo · GP: gols pró · %: chance de classificação em 3.000 simulações dos jogos restantes.</p>
    </div>
  );
}

export function BracketPage() {
  const { matches, loading } = useTournament();
  if (loading) return <PageLoader />;
  const knockout = matches.filter((m) => m.stage !== 'group');
  const order: Stage[] = ['round_of_16', 'quarter', 'semi', 'final'];
  const rounds = order.map((stage) => ({ stage, items: knockout.filter((m) => m.stage === stage) })).filter((r) => r.items.length);
  const third = knockout.find((m) => m.stage === 'third_place');

  return (
    <div>
      <PageHeader title="Chaveamento" subtitle="Os confrontos se preenchem sozinhos conforme os resultados" icon={<GitBranch />} actions={<StatsNav />} />
      {rounds.length === 0 && <EmptyState title="Mata-mata ainda não definido" />}
      <div className="flex gap-6 overflow-x-auto pb-4">
        {rounds.map((round) => (
          <div key={round.stage} className="flex min-w-60 flex-col">
            <h2 className="mb-3 text-center text-xs font-bold uppercase tracking-widest text-gray-400">{STAGE_LABEL[round.stage]}</h2>
            <div className="flex flex-1 flex-col justify-around gap-4">
              {round.items.map((m) => (
                <BracketMatch key={m.id} match={m} highlight={round.stage === 'final'} />
              ))}
            </div>
          </div>
        ))}
      </div>
      {third && (
        <div className="mt-6 max-w-xs">
          <h2 className="mb-2 text-xs font-bold uppercase tracking-widest text-gray-400">{STAGE_LABEL.third_place}</h2>
          <BracketMatch match={third} />
        </div>
      )}
    </div>
  );
}

function BracketMatch({ match, highlight }: { match: Match; highlight?: boolean }) {
  const done = match.status === 'finished';
  const homeWins = done && (match.score.home > match.score.away || (match.penalties?.home ?? 0) > (match.penalties?.away ?? 0));
  return (
    <Link to={`/jogos/${match.id}`} className={cn('block rounded-xl border bg-gray-900 p-3 transition hover:border-gray-600', highlight ? 'border-yellow-500/60' : 'border-gray-800')}>
      <p className="mb-1 text-[10px] font-bold text-gray-500">{match.code}</p>
      {(['home', 'away'] as const).map((side) => {
        const winner = done && (side === 'home' ? homeWins : !homeWins);
        return (
          <div key={side} className={cn('flex items-center gap-2 py-1', done && !winner && 'opacity-50')}>
            <TeamCrest team={match[side]} size="xs" />
            <span className={cn('flex-1 truncate text-sm', match[side] ? 'font-semibold' : 'italic text-gray-500')}>{slotName(match, side)}</span>
            {match.status !== 'scheduled' && <span className="font-black tabular-nums">{match.score[side]}</span>}
          </div>
        );
      })}
    </Link>
  );
}

export function StatsPage() {
  const { tournamentId } = useTournament();
  const stats = useCollection(tournamentId ? queries.playerStats(tournamentId) : null);
  const { teamsById } = useTournament();
  const scorers = stats.data.filter((s) => s.goals > 0).sort((a, b) => b.goals - a.goals || b.assists - a.assists);
  const assists = stats.data.filter((s) => s.assists > 0).sort((a, b) => b.assists - a.assists);
  const cards = stats.data.filter((s) => s.yellow + s.red > 0).sort((a, b) => b.red * 3 + b.yellow - (a.red * 3 + a.yellow));

  const Row = ({ s, value }: { s: (typeof stats.data)[number]; value: React.ReactNode }) => {
    const team = teamsById.get(s.teamId) ?? null;
    return (
      <Link to={`/jogadores/${s.playerId}`} className="flex items-center gap-3 border-t border-gray-800/70 px-4 py-2.5 text-sm hover:bg-gray-800/40">
        <TeamCrest team={team} size="xs" />
        <span className="flex-1 truncate font-semibold">{s.name}</span>
        <span className="text-xs text-gray-500">{s.teamName}</span>
        <span className="w-10 text-right font-black text-white">{value}</span>
      </Link>
    );
  };

  return (
    <div>
      <PageHeader title="Estatísticas" subtitle="Artilharia, assistências e cartões" icon={<Goal />} actions={<StatsNav />} />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <h2 className="px-4 py-3 font-black">⚽ Artilharia</h2>
          {scorers.length === 0 && <p className="px-4 pb-4 text-sm text-gray-500">Nenhum gol ainda.</p>}
          {scorers.map((s) => <Row key={s.id} s={s} value={s.goals} />)}
        </Card>
        <Card>
          <h2 className="px-4 py-3 font-black">🎯 Assistências</h2>
          {assists.length === 0 && <p className="px-4 pb-4 text-sm text-gray-500">Nenhuma assistência ainda.</p>}
          {assists.map((s) => <Row key={s.id} s={s} value={s.assists} />)}
        </Card>
        <Card>
          <h2 className="px-4 py-3 font-black">🟨 Cartões</h2>
          {cards.length === 0 && <p className="px-4 pb-4 text-sm text-gray-500">Jogo limpo até agora.</p>}
          {cards.map((s) => <Row key={s.id} s={s} value={<span>{s.yellow > 0 && `🟨${s.yellow}`} {s.red > 0 && `🟥${s.red}`}</span>} />)}
        </Card>
      </div>
    </div>
  );
}

function StatsNav() {
  const links = [
    { to: '/classificacao', label: 'Grupos' },
    { to: '/chaveamento', label: 'Chaveamento' },
    { to: '/estatisticas', label: 'Artilharia' },
  ];
  return (
    <div className="flex gap-1 rounded-xl bg-gray-900 p-1 ring-1 ring-gray-800">
      {links.map((l) => (
        <Link key={l.to} to={l.to} className={cn('rounded-lg px-3 py-1.5 text-sm font-semibold', location.pathname === l.to ? 'bg-gray-800 text-white' : 'text-gray-400')}>
          {l.label}
        </Link>
      ))}
    </div>
  );
}
