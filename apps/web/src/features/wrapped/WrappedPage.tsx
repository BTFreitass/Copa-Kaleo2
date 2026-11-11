import { useState } from 'react';
import { useParams } from 'react-router';
import { updateDoc } from 'firebase/firestore';
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { MEDAL_LABEL } from '@copa/shared';
import { useAuth } from '@/features/auth/AuthProvider';
import { refs, queries } from '@/shared/lib/collections';
import { useCollection, useDocument } from '@/shared/lib/data';
import { Button, EmptyState, PageLoader } from '@/shared/ui';
import { ShareableCard, StoryFrame } from '@/shared/components/ShareCard';
import { DistinctionList, MedalView } from '@/features/medals/MedalView';
import { cn } from '@/shared/utils/format';

export function WrappedPage() {
  const { tournamentId = '' } = useParams();
  const { user, profile } = useAuth();
  const edition = useDocument(user ? refs.edition(user.uid, tournamentId) : null);
  const medal = useDocument(user ? refs.medal(user.uid, tournamentId) : null);
  const board = useDocument(user ? refs.leaderboard(tournamentId, user.uid) : null);
  const tournament = useDocument(refs.tournament(tournamentId));
  const owned = useCollection(user ? queries.myCollection(user.uid, tournamentId) : null);
  const achievements = useCollection(user ? queries.myAchievements(user.uid) : null);
  const [step, setStep] = useState(0);
  const [revealing, setRevealing] = useState(false);

  if (!user) return <EmptyState title="Entre para ver sua retrospectiva" />;
  if (edition.loading || medal.loading) return <PageLoader />;
  if (!edition.data) return <EmptyState title="Você ainda não participou desta edição" />;

  const c = edition.data.counters;
  const unlocked = achievements.data.filter((a) => a.tournamentId === tournamentId).length;
  const name = profile?.displayName?.split(' ')[0] ?? 'Torcedor';
  const season = tournament.data?.season ?? new Date().getFullYear();

  const cards = [
    <StoryFrame key="intro" accent="#2563eb">
      <p className="text-sm uppercase tracking-widest text-white/60">Retrospectiva</p>
      <p className="text-4xl font-black leading-tight">{name}, essa foi a sua Copa Kaleo {season}</p>
      <p className="text-white/70">Torcedor nº {String(edition.data.serialNumber).padStart(4, '0')}</p>
    </StoryFrame>,
    <StoryFrame key="presence" accent="#059669">
      <p className="text-8xl font-black">{c.checkin ?? 0}</p>
      <p className="text-xl font-bold">check-ins na arquibancada</p>
      <p className="text-white/70">e {c.mvp_vote ?? 0} votos no Craque do Jogo</p>
    </StoryFrame>,
    <StoryFrame key="bolao" accent="#7c3aed">
      <p className="text-sm uppercase tracking-widest text-white/60">No bolão</p>
      <p className="text-8xl font-black">{board.data?.totalPoints ?? 0}</p>
      <p className="text-xl font-bold">pontos · {board.data?.rank ? `${board.data.rank}º lugar` : 'sem posição'}</p>
      <p className="text-white/70">{c.prediction ?? 0} palpites · {c.exact_score ?? 0} placares exatos 🔮</p>
    </StoryFrame>,
    <StoryFrame key="album" accent="#db2777">
      <p className="text-8xl font-black">{owned.data.filter((o) => o.quantity > 0).length}</p>
      <p className="text-xl font-bold">figurinhas no álbum</p>
      <p className="text-white/70">{unlocked} conquistas desbloqueadas</p>
    </StoryFrame>,
    <StoryFrame key="points" accent="#f59e0b">
      <p className="text-sm uppercase tracking-widest text-white/60">Pontos Kaleo</p>
      <p className="text-8xl font-black">{edition.data.kaleoPoints}</p>
      <p className="text-white/70">E isso vale uma medalha...</p>
    </StoryFrame>,
  ];

  const reveal = async () => {
    if (!medal.data || medal.data.revealedAt) return;
    setRevealing(true);
    await new Promise((r) => setTimeout(r, 1200));
    await updateDoc(refs.medal(user.uid, tournamentId), { revealedAt: Date.now() });
    setRevealing(false);
  };

  if (medal.data) {
    cards.push(
      <StoryFrame key="medal" accent={medal.data.tier === 'legendary' ? '#c026d3' : medal.data.tier === 'gold' ? '#ca8a04' : medal.data.tier === 'silver' ? '#64748b' : '#c2410c'}>
        <p className="text-sm uppercase tracking-widest text-white/60">{medal.data.revealedAt ? 'Sua medalha' : 'Toque para revelar'}</p>
        <button onClick={reveal} className={cn(revealing && 'animate-spin')}>
          <MedalView medal={medal.data} size="lg" hidden={!medal.data.revealedAt} />
        </button>
        {medal.data.revealedAt && (
          <>
            <p className="text-2xl font-black">{MEDAL_LABEL[medal.data.tier].title}</p>
            <DistinctionList medal={medal.data} />
          </>
        )}
      </StoryFrame>,
    );
  }

  const current = Math.min(step, cards.length - 1);

  return (
    <div className="mx-auto flex max-w-sm flex-col items-center gap-4">
      <div className="flex w-full gap-1">
        {cards.map((_, i) => (
          <span key={i} className={cn('h-1 flex-1 rounded-full', i <= current ? 'bg-white' : 'bg-gray-700')} />
        ))}
      </div>
      <ShareableCard fileName={`minha-copa-kaleo-${season}-${current + 1}`}>{cards[current]}</ShareableCard>
      <div className="flex w-full justify-between">
        <Button variant="ghost" disabled={current === 0} onClick={() => setStep(current - 1)} icon={<ChevronLeft className="size-4" />}>Voltar</Button>
        {current < cards.length - 1 ? (
          <Button onClick={() => setStep(current + 1)}>Próximo <ChevronRight className="size-4" /></Button>
        ) : (
          medal.data && !medal.data.revealedAt && <Button onClick={reveal} loading={revealing} icon={<Sparkles className="size-4" />}>Revelar medalha</Button>
        )}
      </div>
      {!medal.data && <p className="text-center text-sm text-gray-500">A medalha da edição é entregue no encerramento da Copa.</p>}
    </div>
  );
}
