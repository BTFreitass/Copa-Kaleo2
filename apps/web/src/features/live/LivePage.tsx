import { Radio } from 'lucide-react';
import { useTournament } from '@/features/tournament/TournamentProvider';
import { queries } from '@/shared/lib/collections';
import { useCollection } from '@/shared/lib/data';
import { Card, PageHeader } from '@/shared/ui';
import { MatchCard, Scoreboard, Timeline } from '@/features/matches/components';
import { SponsorsColumn } from '@/features/sponsors/Sponsors';
import { StreamPlayer } from './StreamPlayer';
import { Reactions } from './Reactions';
import { WallForm } from '@/features/fan/WallForm';
import { MvpVote } from '@/features/fan/MvpVote';

export function LivePage() {
  const { liveMatch, matches } = useTournament();
  const lastFinished = [...matches].reverse().find((m) => m.status === 'finished') ?? null;
  const focus = liveMatch ?? lastFinished;
  const events = useCollection(focus ? queries.events(focus.id) : null);
  const upcoming = matches.filter((m) => m.status === 'scheduled').slice(0, 6);

  return (
    <div>
      <PageHeader title="Ao vivo" subtitle="Transmissão, placar e lance a lance em tempo real" icon={<Radio />} />
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="flex flex-col gap-6">
          <StreamPlayer />
          {focus && (
            <Card className="p-5">
              <Scoreboard match={focus} />
            </Card>
          )}
          {liveMatch && <Reactions match={liveMatch} />}
          {!liveMatch && lastFinished && <MvpVote match={lastFinished} />}
          {focus && (
            <Card className="p-5">
              <h2 className="mb-4 font-bold text-white">Lance a lance</h2>
              <Timeline match={focus} events={events.data} />
            </Card>
          )}
        </div>
        <aside className="flex flex-col gap-6">
          <WallForm />
          <Card className="p-4">
            <h2 className="mb-3 font-bold text-white">Próximas partidas</h2>
            <div className="flex flex-col gap-3">
              {upcoming.length === 0 && <p className="text-sm text-gray-500">Sem jogos programados.</p>}
              {upcoming.map((m) => (
                <MatchCard key={m.id} match={m} compact />
              ))}
            </div>
          </Card>
          <Card className="hidden h-[480px] overflow-hidden py-4 lg:block">
            <p className="mb-3 text-center text-xs font-bold uppercase tracking-[0.25em] text-gray-400">★ Patrocinadores</p>
            <SponsorsColumn />
          </Card>
        </aside>
      </div>
    </div>
  );
}
