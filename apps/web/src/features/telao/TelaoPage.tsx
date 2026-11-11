import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useTournament } from '@/features/tournament/TournamentProvider';
import { useAuth } from '@/features/auth/AuthProvider';
import { queries } from '@/shared/lib/collections';
import { useCollection } from '@/shared/lib/data';
import { api } from '@/shared/lib/api';
import { Avatar, Button } from '@/shared/ui';
import { Scoreboard, Timeline } from '@/features/matches/components';
import { CrowdBar } from '@/features/matches/pages';
import { useSponsors } from '@/features/sponsors/Sponsors';

export function TelaoPage() {
  const { liveMatch, nextMatch, matches, tournamentId } = useTournament();
  const { isMesario, openLogin, user } = useAuth();
  const lastFinished = [...matches].reverse().find((m) => m.status === 'finished') ?? null;
  const focus = liveMatch ?? nextMatch ?? lastFinished;
  const events = useCollection(focus ? queries.events(focus.id) : null);
  const board = useCollection(tournamentId ? queries.leaderboard(tournamentId, 10) : null);
  const wall = useCollection(tournamentId ? queries.approvedWall(tournamentId, 8) : null);
  const sponsors = useSponsors();
  const [token, setToken] = useState<string | null>(null);
  const [wallIndex, setWallIndex] = useState(0);
  const [sponsorIndex, setSponsorIndex] = useState(0);

  useEffect(() => {
    if (!focus || !isMesario) return;
    let cancelled = false;
    const rotate = () => api.rotateCheckinToken({ matchId: focus.id }).then((r) => !cancelled && setToken(r.token)).catch(() => undefined);
    rotate();
    const id = window.setInterval(rotate, 30 * 60 * 1000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [focus?.id, isMesario]);

  useEffect(() => {
    const id = window.setInterval(() => {
      setWallIndex((i) => i + 1);
      setSponsorIndex((i) => i + 1);
    }, 8000);
    return () => window.clearInterval(id);
  }, []);

  if (!user || !isMesario) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-950">
        <p className="text-gray-400">O telão precisa de uma conta de mesário ou admin (para gerar o QR de check-in).</p>
        <Button onClick={openLogin}>Entrar</Button>
      </div>
    );
  }

  const checkinUrl = focus && token ? `${window.location.origin}/checkin/${focus.id}?t=${token}` : `${window.location.origin}/bolao`;
  const message = wall.data.length ? wall.data[wallIndex % wall.data.length] : null;
  const sponsor = sponsors.length ? sponsors[sponsorIndex % sponsors.length] : null;

  return (
    <div className="grid h-screen grid-cols-[1fr_420px] gap-6 overflow-hidden bg-[radial-gradient(circle_at_20%_0%,#1e3a8a_0%,#030712_50%)] p-8 text-white">
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-4">
          <img src="/img/Kaleo.jpg" alt="" className="size-16 rounded-2xl" />
          <span className="text-5xl font-black uppercase tracking-tighter text-gradient">Copa Kaleo</span>
        </div>
        {focus && (
          <div className="rounded-[2rem] border border-white/10 bg-black/30 p-10 backdrop-blur">
            <Scoreboard match={focus} big />
            {focus.crowdStats && (
              <div className="mx-auto mt-8 max-w-xl">
                <p className="mb-2 text-center text-sm uppercase tracking-widest text-white/60">Palpites da torcida</p>
                <CrowdBar match={focus} />
              </div>
            )}
          </div>
        )}
        <div className="grid flex-1 grid-cols-2 gap-6 overflow-hidden">
          <div className="overflow-hidden rounded-3xl border border-white/10 bg-black/30 p-6">
            <p className="mb-4 text-sm font-bold uppercase tracking-widest text-white/60">Lance a lance</p>
            {focus && <Timeline match={focus} events={events.data.slice(-6)} />}
          </div>
          <div className="flex flex-col justify-center rounded-3xl border border-white/10 bg-gradient-to-br from-purple-900/60 to-pink-900/40 p-8">
            <p className="mb-3 text-sm font-bold uppercase tracking-widest text-white/60">📣 Mural da torcida</p>
            {message ? (
              <div key={message.id} className="animate-pop">
                <p className="text-3xl font-black leading-snug">“{message.text}”</p>
                <p className="mt-3 text-lg text-white/70">— {message.displayName}</p>
              </div>
            ) : (
              <p className="text-2xl text-white/60">Mande seu recado pelo site!</p>
            )}
          </div>
        </div>
      </div>
      <aside className="flex flex-col gap-6">
        <div className="flex flex-col items-center gap-3 rounded-3xl bg-white p-6 text-gray-950">
          <QRCodeSVG value={checkinUrl} size={220} level="M" />
          <p className="text-center text-lg font-black">{token ? 'Faça check-in e ganhe figurinhas!' : 'Palpite no bolão!'}</p>
        </div>
        <div className="flex-1 overflow-hidden rounded-3xl border border-white/10 bg-black/30 p-5">
          <p className="mb-3 text-sm font-bold uppercase tracking-widest text-white/60">🏆 Top 10 do bolão</p>
          <ol className="flex flex-col gap-2">
            {board.data.map((e, i) => (
              <li key={e.id} className="flex items-center gap-3 text-lg">
                <span className="w-8 font-black text-white/60">{i + 1}º</span>
                <Avatar name={e.displayName} src={e.photoURL} size="sm" />
                <span className="flex-1 truncate font-semibold">{e.displayName}</span>
                <span className="font-black">{e.totalPoints}</span>
              </li>
            ))}
          </ol>
        </div>
        {sponsor && (
          <div key={sponsor.name} className="flex h-32 animate-pop items-center justify-center rounded-3xl bg-white/5 p-4">
            <img src={sponsor.logoUrl} alt={sponsor.name} className="max-h-full rounded-xl" />
          </div>
        )}
      </aside>
    </div>
  );
}
