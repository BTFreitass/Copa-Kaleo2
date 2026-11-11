import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { ClipboardList, Users } from 'lucide-react';
import { STAGE_LABEL, activeEvents, type Match, type Stage } from '@copa/shared';
import { useTournament } from '@/features/tournament/TournamentProvider';
import { refs, queries } from '@/shared/lib/collections';
import { useCollection, useDocument } from '@/shared/lib/data';
import { Badge, Card, EmptyState, PageHeader, PageLoader, Tabs, TeamCrest } from '@/shared/ui';
import { formatTime } from '@/shared/utils/format';
import { MatchCard, Scoreboard, Timeline, slotName } from './components';
import { MvpVote } from '@/features/fan/MvpVote';
import { PredictionWidget } from '@/features/predictions/PredictionWidget';
import { ShareableCard, StoryFrame } from '@/shared/components/ShareCard';
import { useAuth } from '@/features/auth/AuthProvider';

export function SchedulePage() {
  const { matches, loading } = useTournament();
  const [filter, setFilter] = useState<'all' | 'group' | 'knockout'>('all');
  if (loading) return <PageLoader />;
  const list = matches.filter((m) => (filter === 'all' ? true : filter === 'group' ? m.stage === 'group' : m.stage !== 'group'));
  const byStage = list.reduce<Record<string, Match[]>>((acc, m) => {
    (acc[m.stage] ??= []).push(m);
    return acc;
  }, {});

  return (
    <div>
      <PageHeader title="Jogos" subtitle="Cronograma do dia da Copa, em ordem" icon={<ClipboardList />} />
      <div className="mb-6 max-w-md">
        <Tabs
          value={filter}
          onChange={setFilter}
          tabs={[
            { id: 'all', label: 'Todos' },
            { id: 'group', label: 'Grupos' },
            { id: 'knockout', label: 'Mata-mata' },
          ]}
        />
      </div>
      {matches.length === 0 && <EmptyState title="A tabela ainda não foi gerada" description="Assim que o formato for definido, os jogos aparecem aqui." />}
      <div className="flex flex-col gap-8">
        {Object.entries(byStage).map(([stage, items]) => (
          <section key={stage}>
            <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-gray-400">{STAGE_LABEL[stage as Stage]}</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((m) => (
                <div key={m.id} className="relative">
                  <span className="absolute -left-1 -top-2 z-10 rounded-md bg-gray-800 px-1.5 py-0.5 text-[10px] font-bold text-gray-300">{formatTime(m.kickoffAt)}</span>
                  <MatchCard match={m} />
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

export function MatchPage() {
  const { id = '' } = useParams();
  const match = useDocument(refs.match(id));
  const events = useCollection(queries.events(id));
  const { players } = useTournament();
  const { user } = useAuth();
  const [tab, setTab] = useState<'timeline' | 'escalacao' | 'card'>('timeline');

  if (match.loading) return <PageLoader />;
  if (!match.data) return <EmptyState title="Jogo não encontrado" action={<Link to="/jogos" className="text-purple-300">Voltar aos jogos</Link>} />;
  const m = match.data;
  const list = activeEvents(events.data);
  const goals = list.filter((e) => e.type.includes('goal'));

  return (
    <div className="flex flex-col gap-6">
      <Card className="relative overflow-hidden p-6 sm:p-10">
        <div className="absolute inset-0 opacity-20" style={{ background: `linear-gradient(90deg, ${m.home?.primaryColor ?? '#1e3a8a'}, transparent 40%, transparent 60%, ${m.away?.primaryColor ?? '#831843'})` }} />
        <div className="relative">
          <p className="mb-6 text-center text-xs font-bold uppercase tracking-widest text-gray-400">
            {m.code} · {STAGE_LABEL[m.stage]} {m.group && `· Grupo ${m.group}`} · {formatTime(m.kickoffAt)}
          </p>
          <Scoreboard match={m} big />
          {goals.length > 0 && (
            <div className="mt-6 grid grid-cols-2 gap-4 text-sm text-gray-300">
              <ul className="text-right">{goals.filter((g) => g.teamId === m.homeTeamId).map((g) => <li key={g.id}>⚽ {g.playerName} {g.minute}'</li>)}</ul>
              <ul>{goals.filter((g) => g.teamId === m.awayTeamId).map((g) => <li key={g.id}>⚽ {g.playerName} {g.minute}'</li>)}</ul>
            </div>
          )}
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="flex flex-col gap-6">
          <MvpVote match={m} />
          <Tabs
            value={tab}
            onChange={setTab}
            tabs={[
              { id: 'timeline', label: 'Lance a lance' },
              { id: 'escalacao', label: 'Elencos' },
              { id: 'card', label: 'Card para stories' },
            ]}
          />
          {tab === 'timeline' && (
            <Card className="p-5">
              <Timeline match={m} events={events.data} />
            </Card>
          )}
          {tab === 'escalacao' && (
            <div className="grid gap-4 sm:grid-cols-2">
              {(['home', 'away'] as const).map((side) => {
                const teamId = side === 'home' ? m.homeTeamId : m.awayTeamId;
                return (
                  <Card key={side} className="p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <TeamCrest team={m[side]} size="sm" />
                      <h3 className="font-bold">{slotName(m, side)}</h3>
                    </div>
                    <ul className="flex flex-col gap-1 text-sm">
                      {players
                        .filter((p) => p.teamId === teamId)
                        .sort((a, b) => a.number - b.number)
                        .map((p) => (
                          <li key={p.id}>
                            <Link to={`/jogadores/${p.id}`} className="flex gap-2 text-gray-300 hover:text-white">
                              <span className="w-6 text-right font-mono text-gray-500">{p.number}</span>
                              {p.name}
                            </Link>
                          </li>
                        ))}
                    </ul>
                  </Card>
                );
              })}
            </div>
          )}
          {tab === 'card' && (
            <Card className="p-6">
              <ShareableCard fileName={`copa-kaleo-${m.code}`}>
                <MatchStory match={m} goals={goals.map((g) => ({ id: g.id, text: `${g.playerName ?? ''} ${g.minute}'`, home: g.teamId === m.homeTeamId }))} />
              </ShareableCard>
            </Card>
          )}
        </div>
        <aside className="flex flex-col gap-6">
          {user && <PredictionWidget match={m} />}
          {m.crowdStats && (
            <Card className="p-5">
              <h2 className="mb-3 flex items-center gap-2 font-bold text-white">
                <Users className="size-5 text-blue-300" /> O que a torcida achou
              </h2>
              <CrowdBar match={m} />
              <p className="mt-3 text-sm text-gray-400">
                Placar mais apostado: <strong className="text-white">{m.crowdStats.topScore.replace('x', ' x ')}</strong> · {m.crowdStats.total} palpites
              </p>
            </Card>
          )}
        </aside>
      </div>
    </div>
  );
}

export function CrowdBar({ match }: { match: Match }) {
  const s = match.crowdStats;
  if (!s) return null;
  return (
    <div>
      <div className="flex h-8 overflow-hidden rounded-lg text-xs font-bold">
        <div className="flex items-center justify-center" style={{ width: `${s.homePct}%`, background: match.home?.primaryColor }}>{s.homePct > 10 && `${s.homePct}%`}</div>
        <div className="flex items-center justify-center bg-gray-600" style={{ width: `${s.drawPct}%` }}>{s.drawPct > 10 && `${s.drawPct}%`}</div>
        <div className="flex items-center justify-center" style={{ width: `${s.awayPct}%`, background: match.away?.primaryColor }}>{s.awayPct > 10 && `${s.awayPct}%`}</div>
      </div>
      <div className="mt-1 flex justify-between text-[10px] uppercase text-gray-500">
        <span>{match.home?.shortName}</span>
        <span>Empate</span>
        <span>{match.away?.shortName}</span>
      </div>
    </div>
  );
}

function MatchStory({ match, goals }: { match: Match; goals: { id: string; text: string; home: boolean }[] }) {
  return (
    <StoryFrame accent={match.home?.primaryColor}>
      <Badge tone="purple">{match.group ? `Grupo ${match.group}` : STAGE_LABEL[match.stage]}</Badge>
      <p className="text-sm font-bold uppercase tracking-widest text-white/70">{match.status === 'finished' ? 'Fim de jogo' : match.status === 'scheduled' ? 'Hoje tem' : 'Ao vivo'}</p>
      <div className="flex w-full items-center justify-around">
        <div className="flex flex-col items-center gap-2">
          <TeamCrest team={match.home} size="lg" />
          <span className="text-sm font-bold">{match.home?.shortName}</span>
        </div>
        <span className="text-6xl font-black tabular-nums">
          {match.status === 'scheduled' ? 'x' : `${match.score.home}-${match.score.away}`}
        </span>
        <div className="flex flex-col items-center gap-2">
          <TeamCrest team={match.away} size="lg" />
          <span className="text-sm font-bold">{match.away?.shortName}</span>
        </div>
      </div>
      <div className="grid w-full grid-cols-2 gap-2 text-[11px] text-white/80">
        <ul className="text-right">{goals.filter((g) => g.home).map((g) => <li key={g.id}>⚽ {g.text}</li>)}</ul>
        <ul className="text-left">{goals.filter((g) => !g.home).map((g) => <li key={g.id}>⚽ {g.text}</li>)}</ul>
      </div>
      {match.mvp && (
        <div className="rounded-xl bg-white/10 px-4 py-2">
          <p className="text-[10px] uppercase tracking-widest text-yellow-300">⭐ Craque do Jogo</p>
          <p className="font-bold">{match.mvp.playerName}</p>
        </div>
      )}
    </StoryFrame>
  );
}
