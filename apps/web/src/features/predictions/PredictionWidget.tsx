import { useEffect, useState } from 'react';
import { setDoc } from 'firebase/firestore';
import { Lock, Minus, Plus, Sparkles } from 'lucide-react';
import { isPredictionOpen, type Match, type Prediction } from '@copa/shared';
import { refs } from '@/shared/lib/collections';
import { useDocument, useNow } from '@/shared/lib/data';
import { useAuth } from '@/features/auth/AuthProvider';
import { Badge, Button, Card, TeamCrest, useToast } from '@/shared/ui';
import { errorMessage } from '@/shared/lib/api';
import { cn, formatCountdown } from '@/shared/utils/format';
import { slotName } from '@/features/matches/components';

export function PredictionWidget({ match, jokerAvailable = true }: { match: Match; jokerAvailable?: boolean }) {
  const { user, profile } = useAuth();
  const existing = useDocument(user ? refs.prediction(match.id, user.uid) : null);
  const now = useNow(1000);
  const toast = useToast();
  const [home, setHome] = useState(0);
  const [away, setAway] = useState(0);
  const [joker, setJoker] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (existing.data) {
      setHome(existing.data.home);
      setAway(existing.data.away);
      setJoker(existing.data.isJoker);
    }
  }, [existing.data]);

  if (!user) return null;
  const open = isPredictionOpen(match, now);
  const p = existing.data;
  const dirty = !p || p.home !== home || p.away !== away || p.isJoker !== joker;

  const save = async () => {
    setBusy(true);
    try {
      const data: Prediction = {
        id: `${match.id}_${user.uid}`,
        tournamentId: match.tournamentId,
        matchId: match.id,
        uid: user.uid,
        displayName: profile?.displayName ?? 'Torcedor',
        stage: match.stage,
        home,
        away,
        isJoker: joker,
        createdAt: p?.createdAt ?? Date.now(),
        updatedAt: Date.now(),
        points: p?.points ?? null,
      };
      await setDoc(refs.prediction(match.id, user.uid), data);
      toast(p ? 'Palpite atualizado!' : 'Palpite registrado! +Pontos Kaleo');
    } catch (error) {
      toast(errorMessage(error), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className={cn('p-4', joker && 'ring-2 ring-yellow-400/60')}>
      <div className="mb-3 flex items-center justify-between text-xs">
        <span className="font-bold uppercase tracking-wide text-gray-400">Seu palpite</span>
        {open ? (
          <span className={cn('font-semibold', match.kickoffAt - now < 10 * 60_000 ? 'text-red-300' : 'text-emerald-300')}>
            Fecha em {formatCountdown(match.kickoffAt - now)}
          </span>
        ) : p?.points != null ? (
          <Badge tone={p.points > 0 ? 'green' : 'gray'}>+{p.points} pts</Badge>
        ) : (
          <span className="flex items-center gap-1 text-gray-500">
            <Lock className="size-3" /> {match.homeTeamId && match.awayTeamId ? 'Fechado' : 'Aguardando confronto'}
          </span>
        )}
      </div>
      <div className="flex items-center justify-between gap-2">
        <ScoreInput team={match.home} label={slotName(match, 'home')} value={home} onChange={setHome} disabled={!open} />
        <span className="text-xl font-black text-gray-600">x</span>
        <ScoreInput team={match.away} label={slotName(match, 'away')} value={away} onChange={setAway} disabled={!open} />
      </div>
      {open && (
        <div className="mt-4 flex items-center gap-2">
          <button
            onClick={() => setJoker(!joker)}
            disabled={!jokerAvailable && !joker}
            className={cn(
              'flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition disabled:opacity-40',
              joker ? 'bg-yellow-400 text-gray-950' : 'bg-gray-800 text-yellow-300',
            )}
            title="O coringa dobra os pontos deste jogo. 1 na fase de grupos e 1 no mata-mata."
          >
            <Sparkles className="size-4" /> Coringa {joker ? 'ativo' : ''}
          </button>
          <Button className="flex-1" onClick={save} loading={busy} disabled={!dirty}>
            {p ? (dirty ? 'Atualizar' : 'Salvo ✓') : 'Confirmar palpite'}
          </Button>
        </div>
      )}
      {!open && p && (
        <p className="mt-3 text-center text-sm text-gray-400">
          Você apostou <strong className="text-white">{p.home} x {p.away}</strong>
          {p.isJoker && ' com coringa ✨'}
        </p>
      )}
    </Card>
  );
}

function ScoreInput({ team, label, value, onChange, disabled }: { team: Match['home']; label: string; value: number; onChange: (n: number) => void; disabled: boolean }) {
  return (
    <div className="flex flex-1 flex-col items-center gap-2">
      <TeamCrest team={team} size="sm" />
      <span className="max-w-full truncate text-xs font-semibold text-gray-300">{label}</span>
      <div className="flex items-center gap-1">
        <button disabled={disabled || value === 0} onClick={() => onChange(value - 1)} className="rounded-lg bg-gray-800 p-1.5 disabled:opacity-30" aria-label="Diminuir">
          <Minus className="size-4" />
        </button>
        <span className="w-9 text-center text-3xl font-black tabular-nums">{value}</span>
        <button disabled={disabled || value >= 20} onClick={() => onChange(value + 1)} className="rounded-lg bg-gray-800 p-1.5 disabled:opacity-30" aria-label="Aumentar">
          <Plus className="size-4" />
        </button>
      </div>
    </div>
  );
}
