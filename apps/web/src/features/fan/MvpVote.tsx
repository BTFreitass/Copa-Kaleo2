import { setDoc } from 'firebase/firestore';
import { Star } from 'lucide-react';
import { MVP_VOTING_WINDOW_MS, type Match } from '@copa/shared';
import { refs } from '@/shared/lib/collections';
import { useDocument, useNow } from '@/shared/lib/data';
import { useAuth } from '@/features/auth/AuthProvider';
import { useTournament } from '@/features/tournament/TournamentProvider';
import { Card, TeamCrest, useToast } from '@/shared/ui';
import { errorMessage } from '@/shared/lib/api';
import { cn, formatCountdown } from '@/shared/utils/format';

export function MvpVote({ match }: { match: Match }) {
  const { user, openLogin } = useAuth();
  const { players } = useTournament();
  const now = useNow(1000);
  const vote = useDocument(user ? refs.mvpVote(match.id, user.uid) : null);
  const toast = useToast();

  if (match.status !== 'finished' || !match.finishedAt) return null;
  const closesAt = match.finishedAt + MVP_VOTING_WINDOW_MS;
  const open = now < closesAt;
  const candidates = players.filter((p) => p.teamId === match.homeTeamId || p.teamId === match.awayTeamId);
  const tally = match.mvpTally ?? {};
  const totalVotes = Object.values(tally).reduce((a, b) => a + b, 0);

  const cast = async (playerId: string) => {
    if (!user) return openLogin();
    try {
      await setDoc(refs.mvpVote(match.id, user.uid), { id: user.uid, playerId, createdAt: Date.now() });
      toast('Voto registrado! +Pontos Kaleo');
    } catch (error) {
      toast(errorMessage(error), 'error');
    }
  };

  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-bold text-white">
          <Star className="size-5 text-yellow-400" /> Craque do Jogo
        </h2>
        <span className="text-xs text-gray-400">{open ? `Votação fecha em ${formatCountdown(closesAt - now)}` : 'Votação encerrada'}</span>
      </div>
      {match.mvp && (
        <p className="mb-4 rounded-xl bg-yellow-500/10 p-3 text-center text-sm text-yellow-200">
          {open ? 'Liderando' : 'Eleito'}: <strong>{match.mvp.playerName}</strong> ({tally[match.mvp.playerId] ?? 0} votos)
        </p>
      )}
      {open && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {candidates.map((p) => {
            const team = p.teamId === match.homeTeamId ? match.home : match.away;
            const mine = vote.data?.playerId === p.id;
            const pct = totalVotes ? Math.round(((tally[p.id] ?? 0) / totalVotes) * 100) : 0;
            return (
              <button
                key={p.id}
                disabled={Boolean(vote.data)}
                onClick={() => cast(p.id)}
                className={cn(
                  'relative flex items-center gap-2 overflow-hidden rounded-xl border p-2 text-left text-sm transition',
                  mine ? 'border-yellow-400 bg-yellow-500/10' : 'border-gray-800 bg-gray-900 hover:border-gray-600',
                  vote.data && !mine && 'opacity-60',
                )}
              >
                {vote.data && <span className="absolute inset-y-0 left-0 bg-white/5" style={{ width: `${pct}%` }} />}
                <TeamCrest team={team} size="xs" />
                <span className="relative flex-1 truncate font-semibold">
                  {p.number}. {p.name}
                </span>
                {vote.data && <span className="relative text-xs text-gray-400">{pct}%</span>}
              </button>
            );
          })}
        </div>
      )}
    </Card>
  );
}
