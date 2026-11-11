import { Link } from 'react-router';
import { STAGE_LABEL, describeSlot, isPredictionOpen, matchMinute, type Match, type MatchEvent } from '@copa/shared';
import { useNow } from '@/shared/lib/data';
import { Badge, LiveDot, TeamCrest } from '@/shared/ui';
import { cn, formatCountdown, formatTime } from '@/shared/utils/format';
import { useTournament } from '@/features/tournament/TournamentProvider';

export function useMatchClock(match: Match | null) {
  const { tournament } = useTournament();
  const now = useNow(5000);
  if (!match) return null;
  const half = Math.round((tournament?.format.matchDurationMin ?? 30) / 2);
  return matchMinute(match, half, now);
}

export function StatusBadge({ match }: { match: Match }) {
  const minute = useMatchClock(match);
  const now = useNow(30000);
  if (match.status === 'live')
    return (
      <Badge tone="red">
        <LiveDot />
        {minute ? `${minute}'` : 'Ao vivo'}
      </Badge>
    );
  if (match.status === 'halftime') return <Badge tone="yellow">Intervalo</Badge>;
  if (match.status === 'finished') return <Badge>Encerrado</Badge>;
  if (match.status === 'postponed') return <Badge tone="yellow">Adiado</Badge>;
  if (isPredictionOpen(match, now)) return <Badge tone="green">Palpites abertos</Badge>;
  return <Badge tone="blue">{formatTime(match.kickoffAt)}</Badge>;
}

export function slotName(match: Match, side: 'home' | 'away') {
  const team = match[side];
  if (team) return team.name;
  return match.feedsFrom ? describeSlot(match.feedsFrom[side]) : 'A definir';
}

export function MatchCard({ match, compact }: { match: Match; compact?: boolean }) {
  const showScore = match.status !== 'scheduled';
  return (
    <Link
      to={`/jogos/${match.id}`}
      className={cn(
        'group block rounded-2xl border bg-gray-900/70 p-4 transition hover:-translate-y-0.5 hover:border-gray-700',
        match.status === 'live' ? 'border-red-500/50 shadow-lg shadow-red-900/20' : 'border-gray-800',
      )}
    >
      <div className="mb-3 flex items-center justify-between text-xs text-gray-500">
        <span className="font-semibold uppercase tracking-wide">
          {match.code} · {match.group ? `Grupo ${match.group}` : STAGE_LABEL[match.stage]}
        </span>
        <StatusBadge match={match} />
      </div>
      <div className="flex flex-col gap-2">
        {(['home', 'away'] as const).map((side) => (
          <div key={side} className="flex items-center gap-3">
            <TeamCrest team={match[side]} size={compact ? 'sm' : 'md'} />
            <span className={cn('flex-1 truncate font-semibold', !match[side] && 'text-sm italic text-gray-500')}>{slotName(match, side)}</span>
            {showScore && <span className="text-2xl font-black tabular-nums text-white">{match.score[side]}</span>}
          </div>
        ))}
      </div>
      {match.penalties && (
        <p className="mt-2 text-right text-xs text-gray-400">
          Pênaltis: {match.penalties.home} x {match.penalties.away}
        </p>
      )}
    </Link>
  );
}

export function Scoreboard({ match, big }: { match: Match; big?: boolean }) {
  const now = useNow(1000);
  return (
    <div className="flex items-center justify-between gap-2 sm:gap-6">
      <TeamSide match={match} side="home" big={big} />
      <div className="flex flex-col items-center gap-2">
        {match.status === 'scheduled' ? (
          <>
            <span className={cn('font-black text-gray-500', big ? 'text-5xl' : 'text-3xl')}>VS</span>
            <span className="text-xs text-gray-400">{match.kickoffAt > now ? `em ${formatCountdown(match.kickoffAt - now)}` : formatTime(match.kickoffAt)}</span>
          </>
        ) : (
          <span className={cn('font-black tabular-nums text-white', big ? 'text-7xl sm:text-8xl' : 'text-5xl')}>
            {match.score.home}
            <span className="mx-2 text-gray-600">:</span>
            {match.score.away}
          </span>
        )}
        <StatusBadge match={match} />
        {match.penalties && <span className="text-xs text-gray-400">Pênaltis {match.penalties.home} x {match.penalties.away}</span>}
      </div>
      <TeamSide match={match} side="away" big={big} />
    </div>
  );
}

function TeamSide({ match, side, big }: { match: Match; side: 'home' | 'away'; big?: boolean }) {
  return (
    <div className="flex w-24 flex-col items-center gap-2 text-center sm:w-40">
      <TeamCrest team={match[side]} size={big ? 'xl' : 'lg'} />
      <span className={cn('font-bold leading-tight', big ? 'text-lg sm:text-2xl' : 'text-sm sm:text-base')}>{slotName(match, side)}</span>
    </div>
  );
}

const EVENT_ICON: Record<MatchEvent['type'], string> = {
  goal: '⚽',
  penalty_goal: '⚽',
  own_goal: '⚽',
  yellow: '🟨',
  red: '🟥',
  sub: '🔁',
  note: '📝',
};

export function eventLabel(e: MatchEvent) {
  switch (e.type) {
    case 'goal':
      return `GOL! ${e.playerName ?? ''}${e.assistPlayerName ? ` (assist. ${e.assistPlayerName})` : ''}`;
    case 'penalty_goal':
      return `GOL de pênalti! ${e.playerName ?? ''}`;
    case 'own_goal':
      return `Gol contra de ${e.playerName ?? ''}`;
    case 'yellow':
      return `Cartão amarelo para ${e.playerName ?? ''}`;
    case 'red':
      return `Cartão vermelho para ${e.playerName ?? ''}`;
    case 'sub':
      return `Substituição: ${e.playerName ?? ''}`;
    default:
      return e.text ?? '';
  }
}

export function Timeline({ match, events }: { match: Match; events: MatchEvent[] }) {
  const list = events.filter((e) => !e.voided).slice().reverse();
  if (list.length === 0) return <p className="py-6 text-center text-sm text-gray-500">Nenhum lance registrado ainda.</p>;
  return (
    <ol className="flex flex-col gap-2">
      {list.map((e) => {
        const home = e.teamId === match.homeTeamId;
        const team = home ? match.home : e.teamId === match.awayTeamId ? match.away : null;
        return (
          <li key={e.id} className={cn('flex items-start gap-3 rounded-xl p-3', e.type.includes('goal') ? 'bg-emerald-500/10' : 'bg-gray-900')}>
            <span className="w-10 shrink-0 text-right font-mono text-sm font-bold text-gray-400">{e.minute}'</span>
            <span className="text-lg leading-none">{EVENT_ICON[e.type]}</span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-white">{eventLabel(e)}</p>
              {e.text && e.type !== 'note' && <p className="text-xs text-gray-400">{e.text}</p>}
            </div>
            {team && <TeamCrest team={team} size="xs" />}
          </li>
        );
      })}
    </ol>
  );
}
