import { Link, useParams, useSearchParams } from 'react-router';
import { ArrowLeft, Bot, Newspaper } from 'lucide-react';
import { CATEGORY_LABEL, type PostCategory } from '@copa/shared';
import { useTournament } from '@/features/tournament/TournamentProvider';
import { queries } from '@/shared/lib/collections';
import { useCollection } from '@/shared/lib/data';
import { Badge, EmptyState, PageHeader, PageLoader, Select, Skeleton, TeamCrest } from '@/shared/ui';
import { formatFullDate } from '@/shared/utils/format';
import { Markdown } from '@/shared/components/Markdown';
import { cn } from '@/shared/utils/format';

export function NewsListPage() {
  const { tournamentId, teams, teamsById } = useTournament();
  const [params, setParams] = useSearchParams();
  const category = params.get('categoria') as PostCategory | null;
  const team = params.get('time');
  const posts = useCollection(tournamentId ? queries.publishedPosts(tournamentId, 60) : null);
  const list = posts.data.filter((p) => (!category || p.category === category) && (!team || p.teamIds.includes(team)));
  const [featured, ...rest] = list;

  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next);
  };

  return (
    <div>
      <PageHeader
        title="Notícias"
        subtitle="Pré-jogo, pós-jogo e bastidores da Copa"
        icon={<Newspaper />}
        actions={
          <div className="flex gap-2">
            <Select value={category ?? ''} onChange={(e) => set('categoria', e.target.value)} className="w-40">
              <option value="">Todas as categorias</option>
              {Object.entries(CATEGORY_LABEL).map(([id, label]) => (
                <option key={id} value={id}>{label}</option>
              ))}
            </Select>
            <Select value={team ?? ''} onChange={(e) => set('time', e.target.value)} className="w-40">
              <option value="">Todos os times</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </Select>
          </div>
        }
      />
      {posts.loading && <Skeleton className="h-80" />}
      {!posts.loading && list.length === 0 && <EmptyState icon={<Newspaper />} title="Nenhuma matéria por aqui" description="Tente outro filtro." />}
      {featured && (
        <Link to={`/noticias/${featured.slug}`} className="group mb-8 grid overflow-hidden rounded-3xl border border-gray-800 bg-gray-900/60 md:grid-cols-2">
          <div className="aspect-video bg-gradient-brand md:aspect-auto">
            {featured.coverImageUrl && <img src={featured.coverImageUrl} alt="" className="size-full object-cover" />}
          </div>
          <div className="flex flex-col justify-center gap-3 p-6 sm:p-8">
            <Badge tone="purple" className="w-fit">{CATEGORY_LABEL[featured.category]}</Badge>
            <h2 className="text-2xl font-black leading-tight text-white group-hover:text-purple-200 sm:text-3xl">{featured.title}</h2>
            <p className="text-gray-400">{featured.excerpt}</p>
            <div className="flex gap-1">{featured.teamIds.map((id) => <TeamCrest key={id} team={teamsById.get(id) ?? null} size="xs" />)}</div>
          </div>
        </Link>
      )}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {rest.map((p) => (
          <Link key={p.id} to={`/noticias/${p.slug}`} className="group overflow-hidden rounded-2xl border border-gray-800 bg-gray-900/60">
            <div className="aspect-video overflow-hidden bg-gradient-brand">
              {p.coverImageUrl && <img src={p.coverImageUrl} alt="" className="size-full object-cover transition group-hover:scale-105" />}
            </div>
            <div className="flex flex-col gap-2 p-4">
              <span className="text-xs font-semibold uppercase text-purple-300">{CATEGORY_LABEL[p.category]}</span>
              <h3 className="font-bold leading-snug text-white">{p.title}</h3>
              <p className="line-clamp-2 text-sm text-gray-400">{p.excerpt}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export function PostPage() {
  const { slug = '' } = useParams();
  const result = useCollection(queries.postBySlug(slug));
  const { teamsById } = useTournament();
  const post = result.data[0];
  if (result.loading) return <PageLoader />;
  if (!post) return <EmptyState title="Matéria não encontrada" action={<Link to="/noticias" className="text-purple-300">Ver todas</Link>} />;

  return (
    <article className="mx-auto max-w-3xl">
      <Link to="/noticias" className="mb-6 inline-flex items-center gap-1 text-sm text-gray-400 hover:text-white">
        <ArrowLeft className="size-4" /> Notícias
      </Link>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Badge tone="purple">{CATEGORY_LABEL[post.category]}</Badge>
        {post.teamIds.map((id) => {
          const t = teamsById.get(id);
          return t ? (
            <Link key={id} to={`/noticias?time=${id}`} className="flex items-center gap-1 rounded-full bg-gray-800 py-0.5 pl-0.5 pr-2 text-xs">
              <TeamCrest team={t} size="xs" /> {t.shortName}
            </Link>
          ) : null;
        })}
      </div>
      <h1 className="text-3xl font-black leading-tight text-white sm:text-5xl">{post.title}</h1>
      <p className="mt-4 text-lg text-gray-400">{post.excerpt}</p>
      <p className={cn('mt-4 flex items-center gap-2 text-sm text-gray-500')}>
        {post.source === 'ai_draft' && <Bot className="size-4" />}
        {post.authorName} · {post.publishedAt && formatFullDate(post.publishedAt)}
      </p>
      {post.coverImageUrl && <img src={post.coverImageUrl} alt="" className="mt-8 w-full rounded-3xl" />}
      <div className="mt-8">
        <Markdown>{post.content}</Markdown>
      </div>
      {post.matchId && (
        <Link to={`/jogos/${post.matchId}`} className="mt-10 block rounded-2xl border border-gray-800 p-4 text-center font-semibold text-purple-300 hover:border-purple-500/50">
          Ver súmula completa do jogo →
        </Link>
      )}
    </article>
  );
}
