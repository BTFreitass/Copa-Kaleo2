import { useState } from 'react';
import { Coffee, Flag, Pause, PencilLine, Play, RotateCcw } from 'lucide-react';
import { clockPause, clockResume, clockSet, formatClock, matchClock, parseClock, type Match } from '@copa/shared';
import { useNow } from '@/shared/lib/data';
import { Button, Card, Field, Input, Modal } from '@/shared/ui';
import { cn } from '@/shared/utils/format';

type Phase = 'first' | 'halftime' | 'second';
type Confirm = { title: string; text: string; run: () => void } | null;

const PHASES: { id: Phase; label: string }[] = [
  { id: 'first', label: '1º tempo' },
  { id: 'halftime', label: 'Intervalo' },
  { id: 'second', label: '2º tempo' },
];

function phaseOf(match: Match): Phase | null {
  if (match.status === 'halftime') return 'halftime';
  if (match.status === 'live') return match.period === 2 ? 'second' : 'first';
  return null;
}

export function ClockPanel({ match, half, halftimeMin, update, onFinish, onReopen }: { match: Match; half: number; halftimeMin: number; update: (patch: Partial<Match>) => void; onFinish: () => void; onReopen: () => void }) {
  const now = useNow(500);
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [editing, setEditing] = useState(false);
  const clock = matchClock(match, half, now);
  const phase = phaseOf(match);
  const offsetMs = match.period === 2 ? half * 60_000 : 0;

  const startFirst = () => update({ status: 'live', period: 1, ...clockSet(0, true, Date.now()), kickoffAt: Math.min(match.kickoffAt, Date.now()) });
  const pause = () => update(clockPause(match, Date.now()));
  const resume = () => update(clockResume(match, Date.now()));
  const toHalftime = () => update({ status: 'halftime', halftimeStartedAt: Date.now(), ...clockPause(match, Date.now()) });
  const startSecond = () => update({ status: 'live', period: 2, halftimeStartedAt: null, ...clockSet(0, true, Date.now()) });
  const halftimeLeftMs = match.halftimeStartedAt ? match.halftimeStartedAt + halftimeMin * 60_000 - now : halftimeMin * 60_000;
  const restart = () => update(clockSet(0, clock.running, Date.now()));

  const goTo = (target: Phase) => {
    if (target === phase) return;
    if (target === 'halftime') return setConfirm({ title: 'Ir para o intervalo?', text: 'O cronômetro para e guarda o tempo do 1º tempo.', run: toHalftime });
    const period = target === 'first' ? 1 : 2;
    setConfirm({
      title: `Voltar para o ${period}º tempo?`,
      text: 'Use para corrigir um toque errado. O cronômetro fica parado no início do período; ajuste o tempo e aperte Retomar.',
      run: () => update({ status: 'live', period, ...clockSet(0, false, Date.now()) }),
    });
  };

  if (match.status === 'scheduled')
    return (
      <Button size="xl" variant="success" icon={<Play className="size-6" />} onClick={startFirst}>
        Iniciar 1º tempo
      </Button>
    );

  if (match.status === 'finished')
    return (
      <Button size="lg" variant="secondary" onClick={onReopen}>
        Reabrir jogo (correção)
      </Button>
    );

  return (
    <Card className="flex flex-col gap-4 p-4">
      <div className="grid grid-cols-3 gap-1 rounded-xl bg-gray-900 p-1">
        {PHASES.map((p) => (
          <button
            key={p.id}
            onClick={() => goTo(p.id)}
            className={cn('rounded-lg py-2 text-sm font-bold transition', phase === p.id ? 'bg-gray-800 text-white shadow' : 'text-gray-500 hover:text-gray-300')}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col items-center">
        {match.status === 'halftime' ? (
          <>
            <span className={cn('font-black tabular-nums tracking-tight text-6xl', halftimeLeftMs > 0 ? 'text-yellow-300' : 'text-red-400')}>
              {halftimeLeftMs > 0 ? formatClock(halftimeLeftMs) : `+${formatClock(-halftimeLeftMs)}`}
            </span>
            <span className="text-xs font-bold uppercase tracking-widest text-yellow-300">
              {halftimeLeftMs > 0 ? `Intervalo de ${halftimeMin} min · falta para o 2º tempo` : 'Intervalo estourado'}
            </span>
          </>
        ) : (
          <>
            <span className={cn('font-black tabular-nums tracking-tight text-6xl', clock.running ? 'text-white' : 'text-gray-500')}>{clock.label}</span>
            <span className={cn('text-xs font-bold uppercase tracking-widest', clock.running ? 'text-red-300' : 'text-yellow-300')}>
              {clock.running ? `Rodando · ${clock.minute}'` : 'Pausado'} · {half} min cada tempo
            </span>
          </>
        )}
      </div>

      {match.status === 'live' && (
        <div className="grid grid-cols-3 gap-2">
          {clock.running ? (
            <Button size="lg" variant="secondary" icon={<Pause className="size-5" />} onClick={pause}>Pausar</Button>
          ) : (
            <Button size="lg" variant="success" icon={<Play className="size-5" />} onClick={resume}>Retomar</Button>
          )}
          <Button size="lg" variant="secondary" icon={<RotateCcw className="size-5" />} onClick={() => setConfirm({ title: 'Reiniciar o cronômetro?', text: `O ${match.period}º tempo volta para ${formatClock(offsetMs)}.`, run: restart })}>
            Reiniciar
          </Button>
          <Button size="lg" variant="secondary" icon={<PencilLine className="size-5" />} onClick={() => setEditing(true)}>Ajustar</Button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        {match.status === 'live' && match.period === 1 && <Button size="lg" variant="secondary" icon={<Coffee className="size-5" />} onClick={toHalftime}>Intervalo</Button>}
        {match.status === 'halftime' && <Button size="lg" variant="success" icon={<Play className="size-5" />} onClick={startSecond}>Iniciar 2º tempo</Button>}
        <Button size="lg" variant="danger" icon={<Flag className="size-5" />} onClick={onFinish} className={cn(match.status === 'live' && match.period === 2 && 'col-span-2')}>Encerrar jogo</Button>
      </div>

      <AdjustModal
        open={editing}
        onClose={() => setEditing(false)}
        current={clock.gameMs}
        minMs={offsetMs}
        period={match.period}
        onSave={(gameMs) => {
          update(clockSet(gameMs - offsetMs, clock.running, Date.now()));
          setEditing(false);
        }}
      />

      <Modal open={Boolean(confirm)} onClose={() => setConfirm(null)} title={confirm?.title}>
        <p className="text-sm text-gray-300">{confirm?.text}</p>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <Button variant="secondary" onClick={() => setConfirm(null)}>Cancelar</Button>
          <Button
            onClick={() => {
              confirm?.run();
              setConfirm(null);
            }}
          >
            Confirmar
          </Button>
        </div>
      </Modal>
    </Card>
  );
}

function AdjustModal({ open, onClose, current, minMs, period, onSave }: { open: boolean; onClose: () => void; current: number; minMs: number; period: number; onSave: (gameMs: number) => void }) {
  const [text, setText] = useState('');
  const value = parseClock(text);
  const error = text && value === null ? 'Use minutos:segundos, por exemplo 12:30' : value !== null && value < minMs ? `No ${period}º tempo o relógio começa em ${formatClock(minMs)}` : null;
  const nudge = (deltaMs: number) => setText(formatClock(Math.max(minMs, (value ?? current) + deltaMs)));

  return (
    <Modal open={open} onClose={onClose} title="Ajustar o tempo de jogo">
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (value !== null && !error) onSave(value);
        }}
      >
        <Field label="Tempo no relógio (min:seg)" hint={`Agora: ${formatClock(current)}`}>
          <Input autoFocus inputMode="numeric" placeholder={formatClock(current)} value={text} onChange={(e) => setText(e.target.value)} className="text-center text-2xl font-black tabular-nums" />
        </Field>
        <div className="grid grid-cols-4 gap-2">
          {[-60_000, -10_000, 10_000, 60_000].map((d) => (
            <Button key={d} type="button" size="sm" variant="secondary" onClick={() => nudge(d)}>
              {d > 0 ? '+' : '−'}
              {Math.abs(d) >= 60_000 ? `${Math.abs(d) / 60_000} min` : `${Math.abs(d) / 1000} s`}
            </Button>
          ))}
        </div>
        {error && <p className="text-sm font-semibold text-red-300">{error}</p>}
        <div className="grid grid-cols-2 gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={value === null || Boolean(error)}>Salvar</Button>
        </div>
      </form>
    </Modal>
  );
}
