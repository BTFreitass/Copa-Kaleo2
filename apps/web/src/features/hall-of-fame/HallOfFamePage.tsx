import { orderBy, query } from 'firebase/firestore';
import { Crown } from 'lucide-react';
import { MEDAL_LABEL, type MedalTier } from '@copa/shared';
import { cols } from '@/shared/lib/collections';
import { useCollection } from '@/shared/lib/data';
import { Card, EmptyState, PageHeader, PageLoader, TeamCrest } from '@/shared/ui';

export function HallOfFamePage() {
  const editions = useCollection(query(cols.hallOfFame(), orderBy('season', 'desc')));
  if (editions.loading) return <PageLoader />;
  return (
    <div>
      <PageHeader title="Hall da Fama" subtitle="A história de todas as edições da Copa Kaleo" icon={<Crown />} />
      {editions.data.length === 0 && <EmptyState icon={<Crown />} title="A história começa a ser escrita" />}
      <div className="flex flex-col gap-6">
        {editions.data.map((e) => (
          <Card key={e.id} className="overflow-hidden">
            <div className="flex flex-col gap-6 p-6 md:flex-row md:items-center">
              <div className="flex items-center gap-4">
                <div className="flex size-20 flex-col items-center justify-center rounded-2xl bg-gradient-brand text-snow">
                  <span className="text-xs font-bold uppercase">{e.edition}ª ed.</span>
                  <span className="text-2xl font-black">{e.season}</span>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-widest text-yellow-300">🏆 Campeão</p>
                  <div className="flex items-center gap-2">
                    <TeamCrest team={e.championTeam} size="md" />
                    <span className="text-2xl font-black text-white">{e.championTeam?.name ?? '—'}</span>
                  </div>
                  {e.runnerUpTeam && <p className="text-sm text-gray-400">Vice: {e.runnerUpTeam.name}</p>}
                </div>
              </div>
              <div className="grid flex-1 grid-cols-2 gap-3 text-sm lg:grid-cols-4">
                <Info label="⚽ Artilheiro" value={e.topScorer ? `${e.topScorer.name} (${e.topScorer.goals})` : '—'} />
                <Info label="⭐ Craque da Copa" value={e.bestPlayer?.name ?? '—'} />
                <Info label="🎯 Campeão do bolão" value={e.bolaoChampion ? `${e.bolaoChampion.displayName} (${e.bolaoChampion.points})` : '—'} />
                <Info label="💥 Maior placar" value={e.biggestWin ?? '—'} />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-4 border-t border-gray-800 bg-gray-950/40 px-6 py-3 text-xs text-gray-400">
              <span>{e.totalFans} torcedores</span>
              <span>{e.totalCheckins} check-ins</span>
              {(Object.keys(MEDAL_LABEL) as MedalTier[]).map((t) => (
                <span key={t}>
                  {MEDAL_LABEL[t].emoji} {e.medalCounts?.[t] ?? 0}
                </span>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="font-semibold text-white">{value}</p>
    </div>
  );
}
