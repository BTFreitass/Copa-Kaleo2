import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';
import { doc, increment, updateDoc, writeBatch } from 'firebase/firestore';
import { ArrowLeft, Clock, Undo2, WifiOff } from 'lucide-react';
import { activeEvents, matchClock, matchTiming, type Match, type MatchEvent, type MatchEventType, type Player } from '@copa/shared';
import { useAuth } from '@/features/auth/AuthProvider';
import { useTournament } from '@/features/tournament/TournamentProvider';
import { cols, queries, refs } from '@/shared/lib/collections';
import { useCollection, useDocument, useNow } from '@/shared/lib/data';
import { db } from '@/shared/lib/firebase';
import { api, errorMessage } from '@/shared/lib/api';
import { Button, Card, EmptyState, Field, Input, Modal, PageLoader, TeamCrest, useToast } from '@/shared/ui';
import { cn } from '@/shared/utils/format';
import { Timeline, slotName } from '@/features/matches/components';
import { ClockPanel } from './ClockPanel';

type Pending = { type: MatchEventType; side: 'home' | 'away' } | null;

export function MesarioPage() {
  const { id = '' } = useParams();
  const { isMesario, user } = useAuth();
  const match = useDocument(refs.match(id));
  const events = useCollection(queries.events(id));
  const { players, tournament } = useTournament();
  const now = useNow(1000);
  const toast = useToast();
  const [pending, setPending] = useState<Pending>(null);
  const [penalties, setPenalties] = useState(false);
  const online = typeof navigator === 'undefined' ? true : navigator.onLine;

  const timing = matchTiming(tournament?.format);
  const half = timing.halfMin;
  const m = match.data;
  const clock = m ? matchClock(m, half, now) : null;
  const minute = m?.status === 'halftime' ? half : clock?.minute ?? 1;
  const list = useMemo(() => activeEvents(events.data), [events.data]);

  if (!isMesario) return <EmptyState title="Acesso restrito a mesários" />;
  if (match.loading) return <PageLoader />;
  if (!m) return <EmptyState title="Jogo não encontrado" />;
  if (!m.homeTeamId || !m.awayTeamId) return <EmptyState title="Confronto ainda não definido" description="Os times entram aqui assim que a fase anterior terminar." />;

  const matchRef = refs.match(m.id);
  const update = (patch: Partial<Match>) => updateDoc(matchRef, patch).catch((e) => toast(errorMessage(e), 'error'));

  const finish = () => {
    const isKnockout = m.stage !== 'group';
    if (isKnockout && m.score.home === m.score.away && !m.penalties) {
      setPenalties(true);
      return;
    }
    update({ status: 'finished', finishedAt: Date.now() });
    toast('Jogo encerrado! Pontuação do bolão sendo calculada.');
  };

  const register = async (type: MatchEventType, side: 'home' | 'away', player: Player | null, assist: Player | null) => {
    const teamId = side === 'home' ? m.homeTeamId! : m.awayTeamId!;
    const scoringSide = type === 'own_goal' ? (side === 'home' ? 'away' : 'home') : side;
    const event: MatchEvent = {
      id: '',
      type,
      minute,
      period: m.period,
      teamId,
      playerId: player?.id,
      playerName: player?.name,
      assistPlayerId: assist?.id,
      assistPlayerName: assist?.name,
      createdBy: user!.uid,
      createdAt: Date.now(),
      voided: false,
    };
    const batch = writeBatch(db);
    batch.set(doc(cols.events(m.id)), event);
    if (type === 'goal' || type === 'penalty_goal' || type === 'own_goal') batch.update(matchRef, { [`score.${scoringSide}`]: increment(1) });
    batch.commit().catch((e) => toast(errorMessage(e), 'error'));
    toast(`${type.includes('goal') ? '⚽ Gol' : type === 'yellow' ? '🟨 Amarelo' : type === 'red' ? '🟥 Vermelho' : 'Evento'} registrado ${minute}'`, 'info');
    setPending(null);
  };

  const undo = async () => {
    const last = list[list.length - 1];
    if (!last) return;
    const batch = writeBatch(db);
    batch.update(doc(cols.events(m.id), last.id), { voided: true });
    if (last.type === 'goal' || last.type === 'penalty_goal' || last.type === 'own_goal') {
      const side = last.teamId === m.homeTeamId ? 'home' : 'away';
      const scoringSide = last.type === 'own_goal' ? (side === 'home' ? 'away' : 'home') : side;
      batch.update(matchRef, { [`score.${scoringSide}`]: increment(-1) });
    }
    await batch.commit().catch((e) => toast(errorMessage(e), 'error'));
    toast('Último lance desfeito', 'info');
  };

  const shift = async (minutes: number) => {
    try {
      const r = await api.shiftSchedule({ tournamentId: m.tournamentId, minutes });
      toast(`${r.shifted} jogos reprogramados em ${minutes > 0 ? '+' : ''}${minutes} min`);
    } catch (error) {
      toast(errorMessage(error), 'error');
    }
  };

  const roster = (side: 'home' | 'away') => players.filter((p) => p.teamId === (side === 'home' ? m.homeTeamId : m.awayTeamId)).sort((a, b) => a.number - b.number);

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4 pb-10">
      <div className="flex items-center justify-between">
        <Link to="/admin/jogos" className="flex items-center gap-1 text-sm text-gray-400"><ArrowLeft className="size-4" /> Jogos</Link>
        <span className="text-xs font-bold text-gray-500">{m.code} · Modo mesário</span>
        {!online && <span className="flex items-center gap-1 text-xs font-bold text-yellow-300"><WifiOff className="size-4" /> Offline: salvando no aparelho</span>}
      </div>

      <Card className="p-4">
        <div className="flex items-center justify-between">
          {(['home', 'away'] as const).map((side) => (
            <div key={side} className={cn('flex flex-1 flex-col items-center gap-1', side === 'away' && 'order-3')}>
              <TeamCrest team={m[side]} size="lg" />
              <span className="text-sm font-bold">{m[side]?.shortName}</span>
            </div>
          ))}
          <div className="order-2 flex flex-col items-center">
            <span className="text-6xl font-black tabular-nums">{m.score.home}:{m.score.away}</span>
            <span className={cn('flex items-center gap-1 text-sm font-bold', clock?.running ? 'text-red-300' : 'text-gray-400')}>
              <Clock className="size-4" />
              {m.status === 'scheduled' ? 'Não iniciado' : m.status === 'halftime' ? 'Intervalo' : m.status === 'finished' ? 'Encerrado' : `${m.period}º tempo · ${clock?.label}${clock?.running ? '' : ' · pausado'}`}
            </span>
            {m.penalties && <span className="text-xs text-gray-400">Pên. {m.penalties.home}x{m.penalties.away}</span>}
          </div>
        </div>
      </Card>

      <ClockPanel match={m} half={half} halftimeMin={timing.halftimeMin} update={update} onFinish={finish} />

      {m.status !== 'scheduled' && (
        <div className="grid grid-cols-2 gap-3">
          {(['home', 'away'] as const).map((side) => (
            <div key={side} className="flex flex-col gap-2">
              <Button size="xl" variant="success" className="text-2xl" style={{ background: m[side]?.primaryColor }} onClick={() => setPending({ type: 'goal', side })}>⚽ GOL</Button>
              <div className="grid grid-cols-2 gap-2">
                <Button size="lg" variant="secondary" onClick={() => setPending({ type: 'yellow', side })}>🟨</Button>
                <Button size="lg" variant="secondary" onClick={() => setPending({ type: 'red', side })}>🟥</Button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button size="sm" variant="ghost" onClick={() => setPending({ type: 'penalty_goal', side })}>Pênalti</Button>
                <Button size="sm" variant="ghost" onClick={() => setPending({ type: 'own_goal', side })}>Contra</Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Button variant="secondary" icon={<Undo2 className="size-4" />} onClick={undo} disabled={list.length === 0}>Desfazer último lance</Button>

      <Card className="p-4">
        <p className="mb-2 text-xs font-bold uppercase text-gray-500">Atraso no cronograma</p>
        <div className="flex gap-2">
          {[5, 10, 15].map((n) => <Button key={n} size="sm" variant="secondary" onClick={() => shift(n)}>+{n} min</Button>)}
          <Button size="sm" variant="ghost" onClick={() => shift(-5)}>−5 min</Button>
        </div>
      </Card>

      <Card className="p-4">
        <Timeline match={m} events={events.data} />
      </Card>

      <PlayerPicker pending={pending} match={m} roster={pending ? roster(pending.type === 'own_goal' ? (pending.side === 'home' ? 'away' : 'home') : pending.side) : []} onClose={() => setPending(null)} onConfirm={(player, assist) => pending && register(pending.type, pending.type === 'own_goal' ? (pending.side === 'home' ? 'away' : 'home') : pending.side, player, assist)} />

      <PenaltiesModal open={penalties} match={m} onClose={() => setPenalties(false)} onSave={async (home, away) => {
        await update({ penalties: { home, away }, status: 'finished', finishedAt: Date.now() });
        setPenalties(false);
      }} />
    </div>
  );
}

function PlayerPicker({ pending, match, roster, onClose, onConfirm }: { pending: Pending; match: Match; roster: Player[]; onClose: () => void; onConfirm: (player: Player | null, assist: Player | null) => void }) {
  const [player, setPlayer] = useState<Player | null>(null);
  const isGoal = pending?.type === 'goal';
  const close = () => {
    setPlayer(null);
    onClose();
  };
  if (!pending) return null;
  const title = { goal: 'Quem fez o gol?', penalty_goal: 'Quem converteu?', own_goal: 'Quem fez contra?', yellow: 'Amarelo para', red: 'Vermelho para', sub: 'Substituição', note: 'Nota' }[pending.type];
  return (
    <Modal open onClose={close} title={player && isGoal ? 'Assistência de?' : title}>
      <p className="mb-3 text-sm text-gray-400">{slotName(match, pending.side)}</p>
      <div className="grid grid-cols-2 gap-2">
        {roster.filter((p) => p.id !== player?.id).map((p) => (
          <Button
            key={p.id}
            size="lg"
            variant="secondary"
            className="justify-start"
            onClick={() => {
              if (isGoal && !player) return setPlayer(p);
              onConfirm(player ?? p, player ? p : null);
              setPlayer(null);
            }}
          >
            <span className="w-6 font-mono text-gray-400">{p.number}</span> {p.name}
          </Button>
        ))}
      </div>
      <Button
        variant="ghost"
        className="mt-3 w-full"
        onClick={() => {
          onConfirm(player, null);
          setPlayer(null);
        }}
      >
        {player ? 'Sem assistência' : 'Não identificado'}
      </Button>
    </Modal>
  );
}

function PenaltiesModal({ open, match, onClose, onSave }: { open: boolean; match: Match; onClose: () => void; onSave: (home: number, away: number) => void }) {
  const [home, setHome] = useState('');
  const [away, setAway] = useState('');
  return (
    <Modal open={open} onClose={onClose} title="Empate no mata-mata: pênaltis">
      <div className="grid grid-cols-2 gap-3">
        <Field label={match.home?.shortName ?? 'Mandante'}><Input type="number" min={0} value={home} onChange={(e) => setHome(e.target.value)} /></Field>
        <Field label={match.away?.shortName ?? 'Visitante'}><Input type="number" min={0} value={away} onChange={(e) => setAway(e.target.value)} /></Field>
      </div>
      <Button className="mt-4 w-full" disabled={home === '' || away === '' || home === away} onClick={() => onSave(Number(home), Number(away))}>Encerrar com pênaltis</Button>
    </Modal>
  );
}
