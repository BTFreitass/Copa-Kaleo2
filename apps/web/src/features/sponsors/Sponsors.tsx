import { useTournament } from '@/features/tournament/TournamentProvider';

export function useSponsors() {
  const { settings } = useTournament();
  return [...(settings?.sponsors ?? [])].sort((a, b) => a.order - b.order);
}

export function SponsorsStrip() {
  const sponsors = useSponsors();
  if (sponsors.length === 0) return null;
  const loop = [...sponsors, ...sponsors, ...sponsors];
  return (
    <div className="border-b border-gray-800 py-5">
      <p className="mb-3 text-center text-xs font-bold uppercase tracking-[0.25em] text-gray-500">★ Patrocinadores ★</p>
      <div className="relative overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
        <div className="flex w-max animate-[marquee_60s_linear_infinite] gap-6 hover:[animation-play-state:paused]">
          {loop.map((s, i) => (
            <a key={`${s.name}-${i}`} href={s.link || undefined} target="_blank" rel="noreferrer" className="shrink-0">
              <img src={s.logoUrl} alt={s.name} className="h-16 w-auto rounded-xl border border-gray-800 bg-gray-900 p-1.5 transition hover:scale-105" />
            </a>
          ))}
        </div>
      </div>
      <style>{'@keyframes marquee { from { transform: translateX(0) } to { transform: translateX(-33.333%) } }'}</style>
    </div>
  );
}

export function SponsorsColumn() {
  const sponsors = useSponsors();
  if (sponsors.length === 0) return null;
  const loop = [...sponsors, ...sponsors];
  return (
    <div className="relative h-full min-h-80 overflow-hidden fade-y">
      <div className="absolute inset-x-0 top-0 flex animate-[vertical_90s_linear_infinite] flex-col gap-6 px-6 hover:[animation-play-state:paused]">
        {loop.map((s, i) => (
          <img key={`${s.name}-${i}`} src={s.logoUrl} alt={s.name} className="w-full rounded-xl border border-gray-700 bg-gray-800 p-2" />
        ))}
      </div>
      <style>{'@keyframes vertical { from { transform: translateY(0) } to { transform: translateY(-50%) } }'}</style>
    </div>
  );
}
