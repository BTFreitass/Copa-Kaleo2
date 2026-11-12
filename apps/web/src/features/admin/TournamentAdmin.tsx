import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { doc, updateDoc, writeBatch } from 'firebase/firestore';
import { AlertTriangle, Flag, Hammer, Medal, Sticker, Timer, Trophy } from 'lucide-react';
import {
  FUTSAL_TIMING,
  matchTiming,
  STAGE_LABEL,
  buildTournament,
  describeSlot,
  validateFormat,
  type Match,
  type TournamentFormat,
  type TournamentPhase,
} from '@copa/shared';
import { useTournament } from '@/features/tournament/TournamentProvider';
import { cols, queries, refs } from '@/shared/lib/collections';
import { useCollection } from '@/shared/lib/data';
import { db } from '@/shared/lib/firebase';
import { api, errorMessage } from '@/shared/lib/api';
import { Badge, Button, Card, Field, Input, PageHeader, Select, Stat, useToast } from '@/shared/ui';
import { formatTime } from '@/shared/utils/format';

export function AdminDashboard() {
  const { tournament, tournamentId, teams, players, matches } = useTournament();
  const board = useCollection(tournamentId ? queries.leaderboard(tournamentId, 500) : null);
  const pendingWall = useCollection(tournamentId ? queries.pendingWall(tournamentId) : null);
  const registrations = useCollection(tournamentId ? queries.registrations(tournamentId) : null);
  const pendingRegs = registrations.data.filter((r) => r.status === 'pending').length;
  const finished = matches.filter((m) => m.status === 'finished').length;

  return (
    <div>
      <PageHeader title="Visão geral" subtitle={tournament?.name} />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Times" value={teams.length} />
        <Stat label="Atletas" value={players.length} />
        <Stat label="Jogos" value={`${finished}/${matches.length}`} />
        <Stat label="Torcedores" value={tournament?.participantCount ?? 0} />
        <Stat label="No bolão" value={board.data.length} />
        <Stat label="Mural pendente" value={pendingWall.data.length} />
        <Stat label="Inscrições pendentes" value={pendingRegs} />
        <Stat label="Fase" value={{ pre: 'Pré-Copa', matchday: 'Dia da Copa', post: 'Pós-Copa' }[tournament?.phase ?? 'pre']} />
      </div>
      <Card className="flex flex-wrap gap-2 p-4">
        <Link to="/admin/torneio"><Button variant="secondary">Montar torneio</Button></Link>
        <Link to="/admin/jogos"><Button variant="secondary">Controlar jogos</Button></Link>
        <Link to="/telao" target="_blank"><Button variant="secondary">Abrir telão</Button></Link>
        <Link to="/admin/noticias/nova"><Button variant="secondary">Nova matéria</Button></Link>
      </Card>
    </div>
  );
}

export function TournamentAdmin() {
  const { tournament, tournamentId, teams, matches } = useTournament();
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const [format, setFormat] = useState<TournamentFormat | null>(null);
  const [info, setInfo] = useState<{ name: string; eventDate: string } | null>(null);
  const [revelation, setRevelation] = useState('');

  const f = format ?? tournament?.format ?? null;
  const preview = useMemo(() => {
    if (!f || !tournament) return null;
    const error = validateFormat(f, teams.length);
    if (error) return { error };
    const start = new Date(`${tournament.eventDate}T${f.dayStartsAt}:00`).getTime();
    return { result: buildTournament({ ...f, teamCount: teams.length }, teams, start) };
  }, [f, teams, tournament]);

  if (!tournament || !f) return null;
  const i = info ?? { name: tournament.name, eventDate: tournament.eventDate };
  const started = matches.some((m) => m.status !== 'scheduled');

  const run = async (key: string, action: () => Promise<unknown>, message: string) => {
    setBusy(key);
    try {
      await action();
      toast(message);
    } catch (error) {
      toast(errorMessage(error), 'error');
    } finally {
      setBusy(null);
    }
  };

  const timing = matchTiming(f);
  const setTiming = (patch: { halfDurationMin?: number; halftimeMin?: number }) => {
    const next = { ...f, halfDurationMin: timing.halfMin, halftimeMin: timing.halftimeMin, ...patch };
    setFormat({ ...next, matchDurationMin: next.halfDurationMin * 2 });
  };
  const saveTiming = () =>
    run('timing', () => updateDoc(refs.tournament(tournamentId), { format: { ...f, halfDurationMin: timing.halfMin, halftimeMin: timing.halftimeMin, matchDurationMin: timing.playMin, teamCount: teams.length } }), 'Tempo de jogo salvo.');

  const saveInfo = () => run('info', () => updateDoc(refs.tournament(tournamentId), { name: i.name, eventDate: i.eventDate, format: { ...f, teamCount: teams.length } }), 'Torneio atualizado.');

  const generate = () =>
    run(
      'build',
      async () => {
        if (!preview?.result) throw new Error(preview?.error ?? 'Formato inválido');
        if (started) throw new Error('Já existem jogos iniciados. Não é possível regerar a tabela.');
        if (!window.confirm(`Isso apaga os ${matches.length} jogos atuais e cria ${preview.result.matches.length} novos. Continuar?`)) return;
        const batch = writeBatch(db);
        matches.forEach((m) => batch.delete(doc(cols.matches(), m.id)));
        const byId = new Map(teams.map((t) => [t.id, t]));
        const snap = (id: string | null) => {
          const t = id ? byId.get(id) : undefined;
          return t ? { id: t.id, name: t.name, shortName: t.shortName, logoUrl: t.logoUrl, primaryColor: t.primaryColor } : null;
        };
        teams.forEach((t) => batch.update(doc(cols.teams(), t.id), { group: preview.result.groups[t.id] ?? null }));
        preview.result.matches.forEach((m) => {
          const data: Omit<Match, 'id'> = {
            tournamentId,
            code: m.code,
            stage: m.stage,
            group: m.group,
            order: m.order,
            homeTeamId: m.homeTeamId,
            awayTeamId: m.awayTeamId,
            home: snap(m.homeTeamId),
            away: snap(m.awayTeamId),
            ...(m.feedsFrom ? { feedsFrom: m.feedsFrom } : {}),
            kickoffAt: m.kickoffAt,
            status: 'scheduled',
            period: 1,
            clockStartedAt: null,
            clockElapsedMs: 0,
            clockRunning: false,
            score: { home: 0, away: 0 },
            penalties: null,
            finishedAt: null,
          };
          batch.set(doc(cols.matches()), { id: '', ...data });
        });
        batch.update(refs.tournament(tournamentId), {
          format: { ...f, teamCount: teams.length },
          firstKickoffAt: preview.result.matches[0]?.kickoffAt ?? null,
          status: 'upcoming',
        });
        await batch.commit();
      },
      'Tabela gerada!',
    );

  const setPhase = (phase: TournamentPhase) =>
    run('phase', () => updateDoc(refs.tournament(tournamentId), { phase, ...(phase === 'matchday' ? { status: 'group_stage' } : {}) }), 'Fase atualizada.');

  const num = (k: keyof TournamentFormat) => (e: { target: { value: string } }) => setFormat({ ...f, [k]: Number(e.target.value) });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Torneio" subtitle="Dados da edição, formato e encerramento" icon={<Trophy />} />

      <Card className="grid gap-4 p-5 sm:grid-cols-2">
        <Field label="Nome da edição"><Input value={i.name} onChange={(e) => setInfo({ ...i, name: e.target.value })} /></Field>
        <Field label="Data do evento"><Input type="date" value={i.eventDate} onChange={(e) => setInfo({ ...i, eventDate: e.target.value })} /></Field>
        <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
          <Button onClick={saveInfo} loading={busy === 'info'}>Salvar</Button>
          <span className="ml-auto text-xs text-gray-500">Fase atual:</span>
          {(['pre', 'matchday', 'post'] as const).map((p) => (
            <Button key={p} size="sm" variant={tournament.phase === p ? 'primary' : 'secondary'} onClick={() => setPhase(p)}>
              {{ pre: '🔥 Pré-Copa', matchday: '⚽ Dia da Copa', post: '🏅 Pós-Copa' }[p]}
            </Button>
          ))}
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="mb-1 flex items-center gap-2 text-lg font-black"><Timer className="size-5" /> Tempo de jogo</h2>
        <p className="mb-4 text-sm text-gray-400">
          Vale para o cronômetro do mesário e para o cronograma do dia. Padrão oficial do futsal: 2 × {FUTSAL_TIMING.halfDurationMin} min.
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Cada tempo (min)" hint={`Jogo de ${timing.playMin} min`}>
            <div className="flex gap-2">
              <Input type="number" min={5} max={45} value={timing.halfMin} onChange={(e) => setTiming({ halfDurationMin: Number(e.target.value) })} />
              <Button type="button" size="sm" variant="secondary" className="h-10 shrink-0" onClick={() => setTiming({ halfDurationMin: FUTSAL_TIMING.halfDurationMin })}>2×{FUTSAL_TIMING.halfDurationMin}</Button>
            </div>
          </Field>
          <Field label="Intervalo da partida (min)" hint="Entre o 1º e o 2º tempo">
            <div className="flex gap-2">
              <Input type="number" min={0} max={30} value={timing.halftimeMin} onChange={(e) => setTiming({ halftimeMin: Number(e.target.value) })} />
              {FUTSAL_TIMING.halftimePresets.map((n) => (
                <Button key={n} type="button" size="sm" variant={timing.halftimeMin === n ? 'primary' : 'secondary'} className="h-10 shrink-0" onClick={() => setTiming({ halftimeMin: n })}>{n}</Button>
              ))}
            </div>
          </Field>
          <Field label="Entre um jogo e outro (min)" hint={`Cada jogo ocupa ${timing.matchSlotMin + f.breakBetweenMatchesMin} min no cronograma`}>
            <Input type="number" min={0} max={60} value={f.breakBetweenMatchesMin} onChange={num('breakBetweenMatchesMin')} />
          </Field>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button onClick={saveTiming} loading={busy === 'timing'}>Salvar tempo de jogo</Button>
          <span className="text-xs text-gray-500">Os horários dos jogos já gerados não mudam; para refazê-los, use o montador abaixo ou o atraso no cronograma do mesário.</span>
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="mb-1 flex items-center gap-2 text-lg font-black"><Hammer className="size-5" /> Montador de torneio</h2>
        <p className="mb-4 text-sm text-gray-400">{teams.length} times cadastrados. Defina o formato e veja o cronograma antes de gerar.</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Grupos" hint="0 = só mata-mata"><Input type="number" min={0} max={8} value={f.groupCount} onChange={num('groupCount')} /></Field>
          <Field label="Avançam/grupo"><Input type="number" min={1} max={8} value={f.advancePerGroup} onChange={num('advancePerGroup')} /></Field>
          <Field label="Início do dia"><Input type="time" value={f.dayStartsAt} onChange={(e) => setFormat({ ...f, dayStartsAt: e.target.value })} /></Field>
          <Field label="3º lugar">
            <Select value={f.thirdPlaceMatch ? 'sim' : 'nao'} onChange={(e) => setFormat({ ...f, thirdPlaceMatch: e.target.value === 'sim' })}>
              <option value="sim">Sim</option>
              <option value="nao">Não</option>
            </Select>
          </Field>
        </div>
        {preview?.error && <p className="mt-4 flex items-center gap-2 rounded-xl bg-red-500/10 p-3 text-sm text-red-300"><AlertTriangle className="size-4" /> {preview.error}</p>}
        {preview?.result && (
          <div className="mt-4">
            <div className="mb-3 flex flex-wrap gap-2 text-sm">
              <Badge tone="blue">{preview.result.matches.length} jogos</Badge>
              <Badge tone="purple">Início {formatTime(preview.result.matches[0]?.kickoffAt ?? 0)}</Badge>
              <Badge tone={(preview.result.endsAt - (preview.result.matches[0]?.kickoffAt ?? 0)) / 3_600_000 > 11 ? 'red' : 'green'}>
                Término previsto {formatTime(preview.result.endsAt)}
              </Badge>
            </div>
            <div className="grid max-h-72 gap-1 overflow-y-auto rounded-xl bg-gray-950 p-3 text-xs sm:grid-cols-2">
              {preview.result.matches.map((m) => {
                const name = (id: string | null, label?: string) => (id ? teams.find((t) => t.id === id)?.shortName : label ? describeSlot(label) : '?');
                return (
                  <div key={m.code} className="flex gap-2">
                    <span className="w-10 font-mono text-gray-500">{formatTime(m.kickoffAt)}</span>
                    <span className="w-10 font-bold text-gray-400">{m.code}</span>
                    <span>{name(m.homeTeamId, m.feedsFrom?.home)} x {name(m.awayTeamId, m.feedsFrom?.away)}</span>
                    <span className="ml-auto text-gray-600">{m.group ? `Gr. ${m.group}` : STAGE_LABEL[m.stage]}</span>
                  </div>
                );
              })}
            </div>
            <Button className="mt-4" onClick={generate} loading={busy === 'build'} disabled={started}>
              {started ? 'Torneio já começou' : 'Gerar tabela de jogos'}
            </Button>
          </div>
        )}
      </Card>

      <Card className="flex flex-wrap items-center gap-3 p-5">
        <Sticker className="size-6 text-pink-300" />
        <div className="flex-1">
          <p className="font-black">Álbum de figurinhas</p>
          <p className="text-sm text-gray-400">Gera (ou atualiza) uma figurinha por atleta e por escudo.</p>
        </div>
        <Button variant="secondary" loading={busy === 'stickers'} onClick={() => run('stickers', async () => toast(`${(await api.syncStickers({ tournamentId })).total} figurinhas no álbum`), 'Álbum sincronizado.')}>
          Sincronizar álbum
        </Button>
      </Card>

      <Card className="border-yellow-500/30 p-5">
        <h2 className="mb-1 flex items-center gap-2 text-lg font-black"><Medal className="size-5 text-yellow-300" /> Encerrar a Copa e entregar medalhas</h2>
        <p className="mb-4 text-sm text-gray-400">Resolve os palpites de longo prazo, calcula o ranking final, entrega uma medalha para cada participante e grava o Hall da Fama.</p>
        <div className="flex flex-wrap items-end gap-3">
          <Field label="Time-sensação (para o bolão de longo prazo)">
            <Select value={revelation} onChange={(e) => setRevelation(e.target.value)}>
              <option value="">Escolha</option>
              {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </Select>
          </Field>
          <Button
            variant="danger"
            icon={<Flag className="size-4" />}
            loading={busy === 'finish'}
            onClick={() => {
              if (!window.confirm('Encerrar a Copa e entregar as medalhas? Pode ser executado novamente se precisar corrigir.')) return;
              run('finish', async () => {
                const r = await api.finishTournament({ tournamentId, revelationTeamId: revelation || null });
                toast(`${r.medals} medalhas entregues!`);
              }, 'Copa encerrada!');
            }}
          >
            Encerrar e entregar medalhas
          </Button>
        </div>
      </Card>
    </div>
  );
}
