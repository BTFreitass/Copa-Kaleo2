import { DISTINCTION_LABEL, MEDAL_LABEL, type Medal, type MedalTier } from '@copa/shared';
import { cn } from '@/shared/utils/format';

const TIER_STYLE: Record<MedalTier, { ring: string; face: string; ribbon: string; glow: string }> = {
  bronze: { ring: 'from-amber-700 via-orange-400 to-amber-800', face: 'from-amber-600 to-orange-900', ribbon: 'from-amber-800 to-orange-950', glow: 'shadow-orange-500/30' },
  silver: { ring: 'from-gray-400 via-white to-gray-500', face: 'from-gray-300 to-gray-600', ribbon: 'from-slate-500 to-slate-800', glow: 'shadow-gray-300/30' },
  gold: { ring: 'from-yellow-600 via-yellow-200 to-yellow-600', face: 'from-yellow-400 to-amber-700', ribbon: 'from-blue-700 to-blue-950', glow: 'shadow-yellow-400/40' },
  legendary: { ring: 'from-cyan-300 via-fuchsia-300 to-blue-400', face: 'from-cyan-400 via-purple-500 to-pink-500', ribbon: 'from-purple-700 to-pink-900', glow: 'shadow-fuchsia-400/50' },
};

export function MedalView({ medal, size = 'md', hidden }: { medal: Pick<Medal, 'tier' | 'variant' | 'season' | 'serialNumber' | 'totalAwarded' | 'artUrl'>; size?: 'sm' | 'md' | 'lg'; hidden?: boolean }) {
  const style = TIER_STYLE[medal.tier];
  const dims = { sm: 'w-20', md: 'w-36', lg: 'w-56' }[size];
  const label = MEDAL_LABEL[medal.tier];
  return (
    <div className={cn('flex flex-col items-center', dims)}>
      <div className="flex w-1/2 justify-center gap-0.5">
        <div className={cn('h-10 w-1/2 -skew-x-12 bg-gradient-to-b', style.ribbon, size === 'lg' && 'h-16')} />
        <div className={cn('h-10 w-1/2 skew-x-12 bg-gradient-to-b', style.ribbon, size === 'lg' && 'h-16')} />
      </div>
      <div className={cn('-mt-2 aspect-square w-full rounded-full bg-gradient-to-br p-[6%] shadow-2xl', style.ring, style.glow, hidden && 'blur-md grayscale')}>
        <div className={cn('relative flex size-full flex-col items-center justify-center overflow-hidden rounded-full bg-gradient-to-br text-center', style.face)}>
          {medal.artUrl ? (
            <img src={medal.artUrl} alt="" className="absolute inset-0 size-full object-cover" />
          ) : (
            <>
              <img src="/img/Kaleo.jpg" alt="" className="mb-1 w-1/3 rounded-lg opacity-90" />
              <span className={cn('font-black uppercase leading-none text-white drop-shadow', size === 'sm' ? 'text-[8px]' : size === 'md' ? 'text-xs' : 'text-base')}>Copa Kaleo</span>
              <span className={cn('font-black text-white/90', size === 'sm' ? 'text-[10px]' : 'text-sm')}>{medal.season}</span>
            </>
          )}
          <div className="pointer-events-none absolute inset-0 shiny opacity-60" />
        </div>
      </div>
      {size !== 'sm' && (
        <div className="mt-3 text-center">
          <p className="font-black text-white">
            {label.emoji} {label.name}
            {medal.variant !== 'fan' && <span className="ml-1 text-xs text-yellow-300">{medal.variant === 'athlete_champion' ? '· Atleta Campeão' : '· Atleta'}</span>}
          </p>
          <p className="text-xs text-gray-400">
            nº {String(medal.serialNumber).padStart(4, '0')} de {medal.totalAwarded}
          </p>
        </div>
      )}
    </div>
  );
}

export function DistinctionList({ medal }: { medal: Pick<Medal, 'distinctions'> }) {
  if (!medal.distinctions.length) return null;
  return (
    <div className="flex flex-wrap justify-center gap-1.5">
      {medal.distinctions.map((d) => (
        <span key={d} className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-semibold text-white">
          {DISTINCTION_LABEL[d]}
        </span>
      ))}
    </div>
  );
}
