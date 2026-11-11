import { useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import { addDoc, doc, setDoc, updateDoc } from 'firebase/firestore';
import { Copy, Crown, Swords, Target, Telescope, Trophy, Users } from 'lucide-react';
import { STAGE_LABEL, isPredictionOpen, type DuelScope, type Stage } from '@copa/shared';
import { useAuth } from '@/features/auth/AuthProvider';
import { useTournament } from '@/features/tournament/TournamentProvider';
import { cols, queries, refs } from '@/shared/lib/collections';
import { useCollection, useDocument, useNow } from '@/shared/lib/data';
import { api, errorMessage } from '@/shared/lib/api';
import { Avatar, Badge, Button, Card, EmptyState, Field, Input, Modal, PageHeader, PageLoader, Select, Tabs, useToast } from '@/shared/ui';
import { cn, formatCountdown } from '@/shared/utils/format';
import { PredictionWidget } from './PredictionWidget';

function useJokers() {
  const { user } = useAuth();
  const { tournamentId, tournament } = useTournament();
  const mine = useCollection(user && tournamentId ? queries.myPredictions(tournamentId, user.uid) : null);
  const used = (bucket: 'group' | 'knockout') => mine.data.filter((p) => p.isJoker && (p.stage === 'group' ? 'group' : 'knockout') === bucket).length;
  const limits = tournament?.jokerLimits ?? { group: 1, knockout: 1 };
  return {
    predictions: mine.data,
    available: (stage: Stage) => {
      const bucket = stage === 'group' ? 'group' : 'knockout';
      return used(bucket) < limits[bucket];
    },
    summary: `${limits.group - used('group')} coringa(s) nos grupos · ${limits.knockout - used('knockout')} no mata-mata`,
  };
}

export function PredictionsPage() {
  const { user, openLogin } = useAuth();
  const { matches, loading } = useTournament();
  const jokers = useJokers();
  const now = useNow(15000);

  if (loading) return <PageLoader />;
  const open = matches.filter((m) => isPredictionOpen(m, now));
  const waiting = matches.filter((m) => m.status === 'scheduled' && !isPredictionOpen(m, now));
  const closed = matches.filter((m) => m.status !== 'scheduled');
  const total = jokers.predictions.reduce((t, p) => t + (p.points ?? 0), 0);

  return (
    <div>
      <PageHeader
        title="Bolão"
        subtitle="Palpite no placar de cada jogo até o apito inicial"
        icon={<Target />}
        actions={<BolaoNav />}
      />
      {!user ? (
        <EmptyState icon={<Target />} title="Entre para palpitar" description="Pode ser com Google, e-mail, celular ou como convidado." action={<Button onClick={openLogin}>Entrar</Button>} />
      ) : (
        <div className="flex flex-col gap-8">
          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="p-4">
              <p className="text-xs uppercase text-gray-500">Seus pontos</p>
              <p className="text-3xl font-black">{total}</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs uppercase text-gray-500">Palpites feitos</p>
              <p className="text-3xl font-black">{jokers.predictions.length}</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs uppercase text-gray-500">✨ Coringas</p>
              <p className="text-sm font-semibold text-yellow-200">{jokers.summary}</p>
            </Card>
          </div>
          <LongTermForm />
          <Section title="Abertos agora" empty="Nenhum jogo aberto para palpite no momento.">
            {open.map((m) => (
              <div key={m.id}>
                <p className="mb-1 text-xs font-bold uppercase text-gray-500">{m.code} · {m.group ? `Grupo ${m.group}` : STAGE_LABEL[m.stage]}</p>
                <PredictionWidget match={m} jokerAvailable={jokers.available(m.stage)} />
              </div>
            ))}
          </Section>
          {waiting.length > 0 && (
            <Section title="Aguardando confronto" empty="">
              {waiting.map((m) => <PredictionWidget key={m.id} match={m} />)}
            </Section>
          )}
          <Section title="Encerrados" empty="Nenhum jogo encerrado ainda.">
            {closed.map((m) => <PredictionWidget key={m.id} match={m} />)}
          </Section>
          <p className="text-xs text-gray-500">Pontuação: placar exato 10 · vencedor + saldo 7 · só o vencedor ou empate 5. O coringa dobra.</p>
        </div>
      )}
    </div>
  );
}

function Section({ title, empty, children }: { title: string; empty: string; children: React.ReactNode[] | React.ReactNode }) {
  const list = Array.isArray(children) ? children : [children];
  return (
    <section>
      <h2 className="mb-3 text-lg font-black">{title}</h2>
      {list.length === 0 ? <p className="text-sm text-gray-500">{empty}</p> : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</div>}
    </section>
  );
}

function LongTermForm() {
  const { user } = useAuth();
  const { tournament, tournamentId, teams, players, matches } = useTournament();
  const existing = useDocument(user && tournamentId ? refs.longTerm(tournamentId, user.uid) : null);
  const [draft, setDraft] = useState<{ championTeamId: string; topScorerPlayerId: string; revelationTeamId: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const now = useNow(30000);
  const lockAt = tournament?.firstKickoffAt ?? matches[0]?.kickoffAt ?? null;
  const locked = lockAt !== null && now >= lockAt;
  const value = draft ?? {
    championTeamId: existing.data?.championTeamId ?? '',
    topScorerPlayerId: existing.data?.topScorerPlayerId ?? '',
    revelationTeamId: existing.data?.revelationTeamId ?? '',
  };
  if (!user || !tournament) return null;

  const save = async () => {
    if (!value.championTeamId || !value.topScorerPlayerId || !value.revelationTeamId) return toast('Preencha os três palpites.', 'info');
    setBusy(true);
    try {
      await setDoc(refs.longTerm(tournamentId, user.uid), {
        id: `${tournamentId}_${user.uid}`,
        tournamentId,
        uid: user.uid,
        ...value,
        points: existing.data?.points ?? null,
      });
      setDraft(null);
      toast('Palpites de longo prazo salvos!');
    } catch (error) {
      toast(errorMessage(error), 'error');
    } finally {
      setBusy(false);
    }
  };

  const sl = tournament.longTermScoring;
  return (
    <Card className="p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-black">
          <Telescope className="size-5 text-purple-300" /> Palpites de longo prazo
        </h2>
        <span className="text-xs text-gray-400">
          {locked ? 'Fechado' : lockAt ? `Fecha em ${formatCountdown(lockAt - now)}` : 'Fecha no primeiro jogo'} · {sl.champion}/{sl.topScorer}/{sl.revelation} pts
        </span>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="🏆 Campeão">
          <Select disabled={locked} value={value.championTeamId} onChange={(e) => setDraft({ ...value, championTeamId: e.target.value })}>
            <option value="">Escolha</option>
            {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </Select>
        </Field>
        <Field label="⚽ Artilheiro">
          <Select disabled={locked} value={value.topScorerPlayerId} onChange={(e) => setDraft({ ...value, topScorerPlayerId: e.target.value })}>
            <option value="">Escolha</option>
            {teams.map((t) => (
              <optgroup key={t.id} label={t.name}>
                {players.filter((p) => p.teamId === t.id).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </optgroup>
            ))}
          </Select>
        </Field>
        <Field label="🌟 Time-sensação">
          <Select disabled={locked} value={value.revelationTeamId} onChange={(e) => setDraft({ ...value, revelationTeamId: e.target.value })}>
            <option value="">Escolha</option>
            {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </Select>
        </Field>
      </div>
      {!locked && (
        <Button className="mt-4" onClick={save} loading={busy} disabled={!draft}>
          {existing.data ? 'Atualizar' : 'Salvar palpites'}
        </Button>
      )}
      {existing.data?.points != null && <Badge tone="green" className="mt-3">+{existing.data.points} pts</Badge>}
    </Card>
  );
}

export function BolaoNav() {
  const links = [
    { to: '/bolao', label: 'Palpites' },
    { to: '/bolao/ranking', label: 'Ranking' },
    { to: '/bolao/ligas', label: 'Ligas' },
    { to: '/bolao/duelos', label: 'Duelos' },
  ];
  return (
    <div className="flex gap-1 overflow-x-auto rounded-xl bg-gray-900 p-1 ring-1 ring-gray-800">
      {links.map((l) => (
        <Link key={l.to} to={l.to} className={cn('whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-semibold', location.pathname === l.to ? 'bg-gray-800 text-white' : 'text-gray-400')}>
          {l.label}
        </Link>
      ))}
    </div>
  );
}

export function LeaderboardPage() {
  const { tournamentId } = useTournament();
  const { user } = useAuth();
  const board = useCollection(tournamentId ? queries.leaderboard(tournamentId, 200) : null);
  return (
    <div>
      <PageHeader title="Ranking da torcida" subtitle="Classificação geral do bolão" icon={<Trophy />} actions={<BolaoNav />} />
      <BoardTable entries={board.data} highlightUid={user?.uid} loading={board.loading} />
    </div>
  );
}

function BoardTable({ entries, highlightUid, loading }: { entries: { id: string; uid: string; displayName: string; photoURL: string | null; totalPoints: number; exactScores: number; predictionsCount: number }[]; highlightUid?: string; loading?: boolean }) {
  if (loading) return <PageLoader />;
  if (entries.length === 0) return <EmptyState icon={<Trophy />} title="Ninguém pontuou ainda" description="O ranking aparece assim que o primeiro jogo terminar." />;
  let rank = 0;
  let prev: (typeof entries)[number] | null = null;
  return (
    <Card className="overflow-hidden">
      <div className="grid grid-cols-[3rem_1fr_4rem_4rem] gap-2 border-b border-gray-800 px-4 py-2 text-xs uppercase text-gray-500">
        <span>#</span>
        <span>Torcedor</span>
        <span className="text-center">Exatos</span>
        <span className="text-right">Pts</span>
      </div>
      {entries.map((e, i) => {
        if (!prev || prev.totalPoints !== e.totalPoints || prev.exactScores !== e.exactScores) rank = i + 1;
        prev = e;
        return (
          <div key={e.id} className={cn('grid grid-cols-[3rem_1fr_4rem_4rem] items-center gap-2 border-b border-gray-800/60 px-4 py-2.5', e.uid === highlightUid && 'bg-purple-500/10')}>
            <span className="text-lg font-black">{rank <= 3 ? ['🥇', '🥈', '🥉'][rank - 1] : `${rank}º`}</span>
            <Link to={`/perfil/${e.uid}`} className="flex min-w-0 items-center gap-2">
              <Avatar name={e.displayName} src={e.photoURL} size="sm" />
              <span className="truncate font-semibold">{e.displayName}</span>
            </Link>
            <span className="text-center text-sm text-gray-400">{e.exactScores}</span>
            <span className="text-right text-lg font-black">{e.totalPoints}</span>
          </div>
        );
      })}
    </Card>
  );
}

export function LeaguesPage() {
  const { user, openLogin } = useAuth();
  const { tournamentId } = useTournament();
  const mine = useCollection(user && tournamentId ? queries.myLeagues(tournamentId, user.uid) : null);
  const leagueIds = mine.data[0]?.leagueIds ?? [];
  const [name, setName] = useState('');
  const [params] = useSearchParams();
  const [code, setCode] = useState(params.get('codigo')?.toUpperCase() ?? '');
  const [busy, setBusy] = useState<string | null>(null);
  const toast = useToast();

  const act = async (key: string, fn: () => Promise<unknown>, message: string) => {
    if (!user) return openLogin();
    setBusy(key);
    try {
      await fn();
      toast(message);
      setName('');
      setCode('');
    } catch (error) {
      toast(errorMessage(error), 'error');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div>
      <PageHeader title="Ligas privadas" subtitle="Bolão da família, da turma, do trabalho..." icon={<Users />} actions={<BolaoNav />} />
      <div className="mb-8 grid gap-4 md:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-3 font-black">Criar liga</h2>
          <div className="flex gap-2">
            <Input placeholder="Nome da liga" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} />
            <Button loading={busy === 'create'} disabled={!name.trim()} onClick={() => act('create', () => api.createLeague({ name, tournamentId }), 'Liga criada! Compartilhe o código.')}>
              Criar
            </Button>
          </div>
        </Card>
        <Card className="p-5">
          <h2 className="mb-3 font-black">Entrar com código</h2>
          <div className="flex gap-2">
            <Input placeholder="EX: K4L3OX" value={code} maxLength={6} className="uppercase" onChange={(e) => setCode(e.target.value.toUpperCase())} />
            <Button loading={busy === 'join'} disabled={code.length !== 6} onClick={() => act('join', () => api.joinLeague({ code }), 'Você entrou na liga!')}>
              Entrar
            </Button>
          </div>
        </Card>
      </div>
      <h2 className="mb-3 text-lg font-black">Minhas ligas</h2>
      {leagueIds.length === 0 ? (
        <p className="text-sm text-gray-500">Você ainda não está em nenhuma liga.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {leagueIds.map((id) => <LeagueCard key={id} id={id} />)}
        </div>
      )}
    </div>
  );
}

function LeagueCard({ id }: { id: string }) {
  const league = useDocument(refs.league(id));
  if (!league.data) return null;
  return (
    <Link to={`/bolao/ligas/${id}`} className="rounded-2xl border border-gray-800 bg-gray-900/60 p-4 hover:border-purple-500/50">
      <p className="font-black text-white">{league.data.name}</p>
      <p className="text-xs text-gray-400">{league.data.memberCount} membros · código {league.data.inviteCode}</p>
    </Link>
  );
}

export function LeaguePage() {
  const { id = '' } = useParams();
  const league = useDocument(refs.league(id));
  const board = useCollection(queries.leagueBoard(id));
  const { user } = useAuth();
  const toast = useToast();
  if (league.loading) return <PageLoader />;
  if (!league.data) return <EmptyState title="Liga não encontrada" />;
  const invite = `${window.location.origin}/bolao/ligas?codigo=${league.data.inviteCode}`;

  return (
    <div>
      <PageHeader
        title={league.data.name}
        subtitle={`${league.data.memberCount} membros`}
        icon={<Crown />}
        actions={
          <Button
            variant="secondary"
            icon={<Copy className="size-4" />}
            onClick={async () => {
              await navigator.clipboard.writeText(`Entra na minha liga "${league.data!.name}" no bolão da Copa Kaleo! Código: ${league.data!.inviteCode} — ${invite}`);
              toast('Convite copiado!');
            }}
          >
            Código {league.data.inviteCode}
          </Button>
        }
      />
      <BoardTable entries={board.data} highlightUid={user?.uid} loading={board.loading} />
    </div>
  );
}

export function DuelsPage() {
  const { user, profile, openLogin } = useAuth();
  const { tournamentId } = useTournament();
  const sent = useCollection(user ? queries.duelsAsChallenger(user.uid) : null);
  const received = useCollection(user ? queries.duelsAsOpponent(user.uid) : null);
  const board = useCollection(tournamentId ? queries.leaderboard(tournamentId, 200) : null);
  const [open, setOpen] = useState(false);
  const [opponent, setOpponent] = useState('');
  const [scope, setScope] = useState<DuelScope>('day');
  const [tab, setTab] = useState<'active' | 'done'>('active');
  const toast = useToast();

  const duels = useMemo(() => [...sent.data, ...received.data].filter((d) => d.tournamentId === tournamentId).sort((a, b) => b.createdAt - a.createdAt), [sent.data, received.data, tournamentId]);
  if (!user) return <EmptyState icon={<Swords />} title="Entre para desafiar seus amigos" action={<Button onClick={openLogin}>Entrar</Button>} />;

  const challenge = async () => {
    const target = board.data.find((e) => e.uid === opponent);
    if (!target) return;
    try {
      await addDoc(cols.duels(), {
        id: '',
        tournamentId,
        scope,
        challengerUid: user.uid,
        challengerName: profile?.displayName ?? 'Torcedor',
        opponentUid: target.uid,
        opponentName: target.displayName,
        status: 'pending',
        createdAt: Date.now(),
      });
      toast('Desafio enviado!');
      setOpen(false);
    } catch (error) {
      toast(errorMessage(error), 'error');
    }
  };

  const respond = async (duelId: string, status: 'accepted' | 'declined') => {
    try {
      await updateDoc(doc(cols.duels(), duelId), { status });
      toast(status === 'accepted' ? 'Duelo aceito. Que vença o melhor!' : 'Duelo recusado.');
    } catch (error) {
      toast(errorMessage(error), 'error');
    }
  };

  const list = duels.filter((d) => (tab === 'done' ? d.status === 'finished' || d.status === 'declined' : d.status === 'pending' || d.status === 'accepted'));
  const scopeLabel: Record<DuelScope, string> = { day: 'Dia inteiro', group: 'Fase de grupos', knockout: 'Mata-mata' };

  return (
    <div>
      <PageHeader title="Duelos 1x1" subtitle="Desafie alguém: quem fizer mais pontos no período vence" icon={<Swords />} actions={<><BolaoNav /><Button onClick={() => setOpen(true)} icon={<Swords className="size-4" />}>Desafiar</Button></>} />
      <div className="mb-4 max-w-xs">
        <Tabs value={tab} onChange={setTab} tabs={[{ id: 'active', label: 'Em andamento' }, { id: 'done', label: 'Encerrados' }]} />
      </div>
      {list.length === 0 && <EmptyState icon={<Swords />} title="Nenhum duelo aqui" />}
      <div className="grid gap-3 sm:grid-cols-2">
        {list.map((d) => {
          const iAmChallenger = d.challengerUid === user.uid;
          const me = iAmChallenger ? d.result?.challengerPoints : d.result?.opponentPoints;
          const them = iAmChallenger ? d.result?.opponentPoints : d.result?.challengerPoints;
          return (
            <Card key={d.id} className="p-4">
              <div className="mb-2 flex items-center justify-between">
                <Badge tone="purple">{scopeLabel[d.scope]}</Badge>
                <Badge tone={d.status === 'accepted' ? 'green' : d.status === 'pending' ? 'yellow' : 'gray'}>
                  {{ pending: 'Pendente', accepted: 'Valendo', declined: 'Recusado', finished: 'Encerrado' }[d.status]}
                </Badge>
              </div>
              <div className="flex items-center justify-between gap-2 text-lg font-black">
                <span className="truncate">{d.challengerName}</span>
                <span className="tabular-nums text-gray-400">{d.result ? `${d.result.challengerPoints} x ${d.result.opponentPoints}` : 'vs'}</span>
                <span className="truncate text-right">{d.opponentName}</span>
              </div>
              {d.status === 'finished' && d.result && (
                <p className="mt-2 text-center text-sm">{d.result.winnerUid === null ? '🤝 Empate' : d.result.winnerUid === user.uid ? '🏆 Você venceu!' : `Você perdeu por ${(them ?? 0) - (me ?? 0)}`}</p>
              )}
              {d.status === 'pending' && !iAmChallenger && (
                <div className="mt-3 flex gap-2">
                  <Button size="sm" variant="success" className="flex-1" onClick={() => respond(d.id, 'accepted')}>Aceitar</Button>
                  <Button size="sm" variant="secondary" className="flex-1" onClick={() => respond(d.id, 'declined')}>Recusar</Button>
                </div>
              )}
            </Card>
          );
        })}
      </div>
      <Modal open={open} onClose={() => setOpen(false)} title="Novo duelo">
        <div className="flex flex-col gap-4">
          <Field label="Adversário" hint="Só aparecem torcedores que já fizeram palpite.">
            <Select value={opponent} onChange={(e) => setOpponent(e.target.value)}>
              <option value="">Escolha</option>
              {board.data.filter((e) => e.uid !== user.uid).map((e) => <option key={e.uid} value={e.uid}>{e.displayName}</option>)}
            </Select>
          </Field>
          <Field label="Valendo">
            <Select value={scope} onChange={(e) => setScope(e.target.value as DuelScope)}>
              {Object.entries(scopeLabel).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
            </Select>
          </Field>
          <Button onClick={challenge} disabled={!opponent}>Enviar desafio</Button>
        </div>
      </Modal>
    </div>
  );
}
