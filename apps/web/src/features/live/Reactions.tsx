import { useEffect, useState } from 'react';
import { increment, limitToLast, onChildAdded, onValue, push, query, ref, update } from 'firebase/database';
import type { Match } from '@copa/shared';
import { rtdb } from '@/shared/lib/firebase';
import { useAuth } from '@/features/auth/AuthProvider';
import { TeamCrest } from '@/shared/ui';
import { cn } from '@/shared/utils/format';

const EMOJIS = ['🔥', '⚽', '😱', '👏', '🟥'];

interface Floating {
  key: string;
  emoji: string;
  left: number;
}

export function Reactions({ match }: { match: Match }) {
  const { user, openLogin } = useAuth();
  const [floating, setFloating] = useState<Floating[]>([]);
  const [counters, setCounters] = useState<Record<string, Record<string, number>>>({});
  const [side, setSide] = useState<'home' | 'away'>('home');
  const teamId = (side === 'home' ? match.homeTeamId : match.awayTeamId) ?? 'neutral';

  useEffect(() => {
    const startedAt = Date.now();
    const stream = query(ref(rtdb, `reactions/${match.id}/stream`), limitToLast(15));
    const offStream = onChildAdded(stream, (snap) => {
      const value = snap.val() as { e: string; ts: number };
      if (value.ts < startedAt - 2000) return;
      const item = { key: snap.key ?? String(Math.random()), emoji: value.e, left: 5 + Math.random() * 90 };
      setFloating((f) => [...f.slice(-30), item]);
      window.setTimeout(() => setFloating((f) => f.filter((x) => x.key !== item.key)), 2500);
    });
    const offCounters = onValue(ref(rtdb, `reactions/${match.id}/counters`), (snap) => setCounters(snap.val() ?? {}));
    return () => {
      offStream();
      offCounters();
    };
  }, [match.id]);

  const send = async (emoji: string) => {
    if (!user) return openLogin();
    await Promise.all([
      push(ref(rtdb, `reactions/${match.id}/stream`), { e: emoji, t: teamId, u: user.uid, ts: Date.now() }),
      update(ref(rtdb, `reactions/${match.id}/counters/${teamId}`), { [emojiKey(emoji)]: increment(1) }),
    ]);
  };

  const total = (id: string | null) => Object.values(counters[id ?? ''] ?? {}).reduce((a, b) => a + b, 0);
  const homeTotal = total(match.homeTeamId);
  const awayTotal = total(match.awayTeamId);
  const homePct = homeTotal + awayTotal === 0 ? 50 : Math.round((homeTotal / (homeTotal + awayTotal)) * 100);

  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-x-0 bottom-full h-80 overflow-hidden">
        {floating.map((f) => (
          <span key={f.key} className="absolute bottom-0 text-3xl animate-rise" style={{ left: `${f.left}%` }}>
            {f.emoji}
          </span>
        ))}
      </div>
      <div className="rounded-2xl border border-gray-800 bg-gray-900/70 p-4">
        <p className="mb-2 text-xs font-bold uppercase tracking-widest text-gray-400">Termômetro da torcida</p>
        <div className="mb-3 flex items-center gap-2">
          <TeamCrest team={match.home} size="xs" />
          <div className="flex h-3 flex-1 overflow-hidden rounded-full bg-gray-800">
            <div className="transition-all duration-700" style={{ width: `${homePct}%`, background: match.home?.primaryColor ?? '#3b82f6' }} />
            <div className="flex-1 transition-all duration-700" style={{ background: match.away?.primaryColor ?? '#dc2626' }} />
          </div>
          <TeamCrest team={match.away} size="xs" />
        </div>
        <div className="mb-3 flex gap-2">
          {(['home', 'away'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSide(s)}
              className={cn('flex-1 rounded-lg py-1.5 text-xs font-bold', side === s ? 'bg-gray-700 text-white' : 'bg-gray-800/50 text-gray-500')}
            >
              Torço pelo {match[s]?.shortName ?? '...'}
            </button>
          ))}
        </div>
        <div className="flex justify-between gap-2">
          {EMOJIS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => send(emoji)}
              className="flex-1 rounded-xl bg-gray-800 py-3 text-2xl transition hover:scale-110 hover:bg-gray-700 active:scale-95"
              aria-label={`Reagir com ${emoji}`}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function emojiKey(emoji: string) {
  return [...emoji].map((c) => c.codePointAt(0)?.toString(16)).join('_');
}
