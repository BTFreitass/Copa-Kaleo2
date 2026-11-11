import { Link } from 'react-router';
import { ArrowRight, CalendarClock, ClipboardList, Medal, Radio, Sticker, Target, Trophy } from 'lucide-react';
import { CATEGORY_LABEL } from '@copa/shared';
import { useTournament } from '@/features/tournament/TournamentProvider';
import { useAuth } from '@/features/auth/AuthProvider';
import { queries } from '@/shared/lib/collections';
import { useCollection, useNow } from '@/shared/lib/data';
import { Avatar, Badge, Button, Card, Skeleton } from '@/shared/ui';
import { formatCountdown, formatDate, formatFullDate } from '@/shared/utils/format';
import { MatchCard, Scoreboard } from '@/features/matches/components';
import { StreamPlayer } from '@/features/live/StreamPlayer';

export function HomePage() {
  const { tournament, tournamentId, liveMatch, nextMatch, matches, loading } = useTournament();
  const { user, openLogin } = useAuth();
  const posts = useCollection(tournamentId ? queries.publishedPosts(tournamentId, 4) : null);
  const top = useCollection(tournamentId ? queries.leaderboard(tournamentId, 5) : null);
  const now = useNow(1000);

  if (loading) return <Skeleton className="h-96" />;

  const firstKickoff = matches[0]?.kickoffAt ?? null;
  const phase = tournament?.phase ?? 'pre';
  const upcoming = matches.filter((m) => m.status === 'scheduled').slice(0, 4);
  const recent = matches.filter((m) => m.status === 'finished').slice(-3).reverse();

  return (
    <div className="flex flex-col gap-10">
      <section className="relative overflow-hidden rounded-3xl border border-gray-800 bg-gradient-to-br from-blue-950 via-purple-950 to-gray-950 p-6 sm:p-10">
        <div className="absolute -right-24 -top-24 size-80 rounded-full bg-pink-500/20 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 size-80 rounded-full bg-blue-500/20 blur-3xl" />
        <div className="relative grid items-center gap-8 lg:grid-cols-[1.2fr_1fr]">
          <div className="flex flex-col gap-4">
            <Badge tone="purple" className="w-fit">
              {phase === 'pre' ? '🔥 Pré-Copa' : phase === 'matchday' ? '⚽ Dia da Copa' : '🏅 Pós-Copa'}
            </Badge>
            <h1 className="text-4xl font-black uppercase leading-none tracking-tighter sm:text-6xl">
              <span className="text-gradient">{tournament?.name ?? 'Copa Kaleo'}</span>
            </h1>
            {tournament?.eventDate && (
              <p className="flex items-center gap-2 text-gray-300">
                <CalendarClock className="size-5 text-purple-300" />
                {formatFullDate(new Date(`${tournament.eventDate}T12:00:00`).getTime())}
              </p>
            )}
            {phase === 'pre' && firstKickoff && firstKickoff > now && (
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="text-sm uppercase tracking-widest text-gray-400">Faltam</span>
                <span className="text-4xl font-black tabular-nums text-white">{formatCountdown(firstKickoff - now)}</span>
              </div>
            )}
            <div className="flex flex-wrap gap-3 pt-2">
              <Link to="/bolao">
                <Button size="lg" icon={<Target className="size-5" />}>
                  Fazer meus palpites
                </Button>
              </Link>
              <Link to="/figurinhas">
                <Button size="lg" variant="secondary" icon={<Sticker className="size-5" />}>
                  Álbum de figurinhas
                </Button>
              </Link>
              {!user && (
                <Button size="lg" variant="ghost" onClick={openLogin}>
                  Entrar
                </Button>
              )}
            </div>
          </div>
          <div>
            {liveMatch ? (
              <Link to="/ao-vivo">
                <Card className="p-5">
                  <Scoreboard match={liveMatch} />
                  <p className="mt-4 flex items-center justify-center gap-2 text-sm font-semibold text-red-300">
                    <Radio className="size-4" /> Assistir ao vivo
                  </p>
                </Card>
              </Link>
            ) : nextMatch ? (
              <Card className="p-5">
                <p className="mb-4 text-center text-xs font-bold uppercase tracking-widest text-gray-400">Próximo jogo</p>
                <Scoreboard match={nextMatch} />
              </Card>
            ) : (
              <StreamPlayer />
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <QuickLink to="/bolao/ranking" icon={<Trophy />} title="Ranking do bolão" text="Veja quem lidera a torcida" />
        <QuickLink to="/figurinhas" icon={<Sticker />} title="Figurinhas" text="Abra pacotes e troque repetidas" />
        <QuickLink to="/perfil" icon={<Medal />} title="Minha medalha" text="Junte Pontos Kaleo e suba de nível" />
        <QuickLink to="/inscricao" icon={<ClipboardList />} title="Inscrições" text="Inscreva seu time ou atleta" />
      </section>

      <div className="grid gap-8 lg:grid-cols-[1.6fr_1fr]">
        <section>
          <SectionTitle title="Últimas notícias" to="/noticias" />
          {posts.data.length === 0 ? (
            <p className="text-sm text-gray-500">As primeiras matérias chegam em breve.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {posts.data.map((p) => (
                <Link key={p.id} to={`/noticias/${p.slug}`} className="group overflow-hidden rounded-2xl border border-gray-800 bg-gray-900/60">
                  <div className="aspect-video overflow-hidden bg-gradient-brand">
                    {p.coverImageUrl && <img src={p.coverImageUrl} alt="" className="size-full object-cover transition group-hover:scale-105" />}
                  </div>
                  <div className="p-4">
                    <div className="mb-2 flex items-center gap-2 text-xs text-gray-500">
                      <Badge tone="purple">{CATEGORY_LABEL[p.category]}</Badge>
                      {p.publishedAt && formatDate(p.publishedAt)}
                    </div>
                    <h3 className="font-bold leading-snug text-white group-hover:text-purple-200">{p.title}</h3>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="flex flex-col gap-8">
          <div>
            <SectionTitle title="Top 5 do bolão" to="/bolao/ranking" />
            <Card className="divide-y divide-gray-800">
              {top.data.length === 0 && <p className="p-4 text-sm text-gray-500">Nenhum palpite pontuado ainda.</p>}
              {top.data.map((entry, i) => (
                <div key={entry.id} className="flex items-center gap-3 p-3">
                  <span className="w-6 text-center text-lg">{['🥇', '🥈', '🥉'][i] ?? `${i + 1}º`}</span>
                  <Avatar name={entry.displayName} src={entry.photoURL} size="sm" />
                  <span className="flex-1 truncate text-sm font-semibold">{entry.displayName}</span>
                  <span className="font-black text-white">{entry.totalPoints}</span>
                </div>
              ))}
            </Card>
          </div>
          <div>
            <SectionTitle title={recent.length ? 'Resultados recentes' : 'Próximos jogos'} to="/jogos" />
            <div className="flex flex-col gap-3">
              {(recent.length ? recent : upcoming).map((m) => (
                <MatchCard key={m.id} match={m} compact />
              ))}
              {matches.length === 0 && <p className="text-sm text-gray-500">A tabela de jogos será divulgada em breve.</p>}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function SectionTitle({ title, to }: { title: string; to: string }) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h2 className="text-xl font-black text-white">{title}</h2>
      <Link to={to} className="flex items-center gap-1 text-sm font-semibold text-purple-300 hover:text-purple-200">
        Ver tudo <ArrowRight className="size-4" />
      </Link>
    </div>
  );
}

function QuickLink({ to, icon, title, text }: { to: string; icon: React.ReactNode; title: string; text: string }) {
  return (
    <Link to={to} className="group flex items-center gap-4 rounded-2xl border border-gray-800 bg-gray-900/60 p-4 transition hover:border-purple-500/50">
      <span className="rounded-xl bg-gradient-brand p-2.5 text-white [&>svg]:size-5">{icon}</span>
      <span>
        <span className="block font-bold text-white">{title}</span>
        <span className="text-xs text-gray-400">{text}</span>
      </span>
    </Link>
  );
}
