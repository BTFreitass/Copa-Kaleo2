import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { addDoc, deleteDoc, setDoc } from 'firebase/firestore';
import { Bot, Eye, Newspaper, Plus, Trash2 } from 'lucide-react';
import { CATEGORY_LABEL, slugify, type Post, type PostCategory } from '@copa/shared';
import { useAuth } from '@/features/auth/AuthProvider';
import { useTournament } from '@/features/tournament/TournamentProvider';
import { cols, queries, refs } from '@/shared/lib/collections';
import { useCollection, useDocument } from '@/shared/lib/data';
import { errorMessage } from '@/shared/lib/api';
import { Badge, Button, Card, Field, Input, PageHeader, PageLoader, Select, Tabs, Textarea, useToast } from '@/shared/ui';
import { Markdown } from '@/shared/components/Markdown';
import { formatDateTime } from '@/shared/utils/format';
import { uploadPublic } from './upload';

export function PostsAdmin() {
  const { tournamentId } = useTournament();
  const posts = useCollection(tournamentId ? queries.allPosts(tournamentId) : null);
  return (
    <div>
      <PageHeader title="Notícias" icon={<Newspaper />} actions={<Link to="/admin/noticias/nova"><Button icon={<Plus className="size-4" />}>Nova matéria</Button></Link>} />
      <div className="flex flex-col gap-2">
        {posts.data.map((p) => (
          <Link key={p.id} to={`/admin/noticias/${p.id}`}>
            <Card className="flex items-center gap-3 p-3 hover:border-gray-600">
              {p.source === 'ai_draft' && <Bot className="size-4 text-purple-300" />}
              <span className="flex-1 truncate font-semibold">{p.title}</span>
              <span className="text-xs text-gray-500">{CATEGORY_LABEL[p.category]}</span>
              <Badge tone={p.status === 'published' ? 'green' : 'yellow'}>{p.status === 'published' ? 'Publicado' : 'Rascunho'}</Badge>
              <span className="w-28 text-right text-xs text-gray-500">{formatDateTime(p.updatedAt)}</span>
            </Card>
          </Link>
        ))}
        {posts.data.length === 0 && <p className="text-sm text-gray-500">Nenhuma matéria ainda.</p>}
      </div>
    </div>
  );
}

export function PostEditor() {
  const { id } = useParams();
  const isNew = !id || id === 'nova';
  const existing = useDocument(isNew ? null : refs.post(id));
  const { user, profile } = useAuth();
  const { tournamentId, teams, matches } = useTournament();
  const [post, setPost] = useState<Post | null>(null);
  const [tab, setTab] = useState<'edit' | 'preview'>('edit');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const toast = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (isNew && !post)
      setPost({ id: '', tournamentId, title: '', slug: '', excerpt: '', content: '', coverImageUrl: '', category: 'pre_jogo', teamIds: [], authorId: user?.uid ?? '', authorName: profile?.displayName ?? 'Redação', source: 'human', status: 'draft', publishedAt: null, updatedAt: Date.now() });
    if (!isNew && existing.data && !post) setPost(existing.data);
  }, [isNew, existing.data, post, tournamentId, user, profile]);

  if (!post) return <PageLoader />;

  const save = async (status: Post['status']) => {
    setBusy(true);
    try {
      const data: Post = {
        ...post,
        slug: post.slug || `${slugify(post.title)}-${Date.now().toString(36).slice(-4)}`,
        status,
        publishedAt: status === 'published' ? post.publishedAt ?? Date.now() : post.publishedAt,
        updatedAt: Date.now(),
      };
      if (post.id) await setDoc(refs.post(post.id), data);
      else {
        const created = await addDoc(cols.posts(), data);
        navigate(`/admin/noticias/${created.id}`, { replace: true });
      }
      setPost(data);
      toast(status === 'published' ? 'Matéria publicada!' : 'Rascunho salvo.');
    } catch (error) {
      toast(errorMessage(error), 'error');
    } finally {
      setBusy(false);
    }
  };

  const cover = async (file: File) => {
    try {
      const { url } = await uploadPublic('posts', file, setProgress);
      setPost({ ...post, coverImageUrl: url });
    } catch (error) {
      toast(errorMessage(error), 'error');
    } finally {
      setProgress(null);
    }
  };

  const insertImage = async (file: File) => {
    const { url } = await uploadPublic('posts', file, setProgress);
    setProgress(null);
    setPost((p) => (p ? { ...p, content: `${p.content}\n\n![](${url})\n` } : p));
  };

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={isNew ? 'Nova matéria' : 'Editar matéria'}
        icon={<Newspaper />}
        actions={
          <>
            {post.source === 'ai_draft' && <Badge tone="purple"><Bot className="size-3" /> Rascunho automático: revise os fatos</Badge>}
            {post.status === 'published' && <Link to={`/noticias/${post.slug}`} target="_blank"><Button variant="ghost" icon={<Eye className="size-4" />}>Ver</Button></Link>}
            {post.id && (
              <Button variant="ghost" onClick={async () => { if (window.confirm('Excluir matéria?')) { await deleteDoc(refs.post(post.id)); navigate('/admin/noticias'); } }}>
                <Trash2 className="size-4" />
              </Button>
            )}
          </>
        }
      />
      <Card className="grid gap-4 p-5 lg:grid-cols-3">
        <Field label="Título" className="lg:col-span-3"><Input value={post.title} onChange={(e) => setPost({ ...post, title: e.target.value })} /></Field>
        <Field label="Resumo" className="lg:col-span-3"><Input value={post.excerpt} maxLength={200} onChange={(e) => setPost({ ...post, excerpt: e.target.value })} /></Field>
        <Field label="Categoria">
          <Select value={post.category} onChange={(e) => setPost({ ...post, category: e.target.value as PostCategory })}>
            {Object.entries(CATEGORY_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </Select>
        </Field>
        <Field label="Jogo relacionado">
          <Select value={post.matchId ?? ''} onChange={(e) => setPost({ ...post, matchId: e.target.value || undefined })}>
            <option value="">Nenhum</option>
            {matches.map((m) => <option key={m.id} value={m.id}>{m.code} · {m.home?.shortName ?? '?'} x {m.away?.shortName ?? '?'}</option>)}
          </Select>
        </Field>
        <Field label={progress !== null ? `Enviando ${progress}%` : 'Capa'}>
          <Input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && cover(e.target.files[0])} />
        </Field>
        <div className="flex flex-wrap gap-2 lg:col-span-3">
          {teams.map((t) => {
            const on = post.teamIds.includes(t.id);
            return (
              <button key={t.id} onClick={() => setPost({ ...post, teamIds: on ? post.teamIds.filter((x) => x !== t.id) : [...post.teamIds, t.id] })} className={`rounded-full px-3 py-1 text-xs font-bold ${on ? 'bg-purple-600 text-snow' : 'bg-gray-800 text-gray-400'}`}>
                {t.shortName}
              </button>
            );
          })}
        </div>
      </Card>
      <Tabs value={tab} onChange={setTab} tabs={[{ id: 'edit', label: 'Markdown' }, { id: 'preview', label: 'Pré-visualizar' }]} />
      {tab === 'edit' ? (
        <div className="flex flex-col gap-2">
          <Textarea value={post.content} onChange={(e) => setPost({ ...post, content: e.target.value })} className="min-h-[420px] font-mono" placeholder="## Subtítulo&#10;&#10;Texto com **negrito**, listas e links." />
          <label className="w-fit cursor-pointer text-xs text-purple-300 hover:underline">
            + Inserir imagem no texto
            <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && insertImage(e.target.files[0])} />
          </label>
        </div>
      ) : (
        <Card className="p-6">
          {post.coverImageUrl && <img src={post.coverImageUrl} alt="" className="mb-6 rounded-2xl" />}
          <h1 className="text-3xl font-black">{post.title}</h1>
          <Markdown>{post.content}</Markdown>
        </Card>
      )}
      <div className="flex gap-2">
        <Button variant="secondary" onClick={() => save('draft')} loading={busy} disabled={!post.title}>Salvar rascunho</Button>
        <Button onClick={() => save('published')} loading={busy} disabled={!post.title || !post.content}>{post.status === 'published' ? 'Atualizar publicação' : 'Publicar'}</Button>
      </div>
    </div>
  );
}
