import { useState } from 'react';
import { addDoc, deleteDoc, doc, setDoc, updateDoc, writeBatch } from 'firebase/firestore';
import { getDownloadURL, ref as storageRef } from 'firebase/storage';
import { Check, ClipboardCheck, Cog, Film, ImagePlus, MessagesSquare, Plus, Ticket, Trash2, Wrench, X } from 'lucide-react';
import { extractInstagramCode, extractYouTubeId, type SiteSettings, type Sponsor } from '@copa/shared';
import { useTournament } from '@/features/tournament/TournamentProvider';
import { cols, queries, refs } from '@/shared/lib/collections';
import { useCollection } from '@/shared/lib/data';
import { db, storage } from '@/shared/lib/firebase';
import { api, errorMessage } from '@/shared/lib/api';
import { Badge, Button, Card, EmptyState, Field, Input, PageHeader, Select, Textarea, useToast } from '@/shared/ui';
import { formatDateTime } from '@/shared/utils/format';
import { imageSize, uploadPublic } from './upload';

export function MediaAdmin() {
  const { tournamentId, matches } = useTournament();
  const videos = useCollection(tournamentId ? queries.videos(tournamentId) : null);
  const albums = useCollection(tournamentId ? queries.albums(tournamentId) : null);
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [albumTitle, setAlbumTitle] = useState('');
  const [albumMatch, setAlbumMatch] = useState('');
  const [progress, setProgress] = useState<string | null>(null);
  const toast = useToast();

  const addVideo = async () => {
    const yt = extractYouTubeId(url);
    const ig = yt ? null : extractInstagramCode(url);
    if (!yt && !ig) return toast('Link de YouTube ou Instagram inválido.', 'error');
    await addDoc(cols.videos(), { id: '', tournamentId, title, platform: yt ? 'youtube' : 'instagram', externalId: yt?.id ?? ig!, publishedAt: Date.now() });
    setUrl('');
    setTitle('');
    toast('Vídeo adicionado.');
  };

  const upload = async (files: FileList) => {
    if (!albumTitle) return toast('Dê um título ao álbum.', 'info');
    try {
      const album = await addDoc(cols.albums(), { id: '', tournamentId, title: albumTitle, matchId: albumMatch || undefined, coverUrl: '', photoCount: 0, createdAt: Date.now() });
      const list = [...files];
      let cover = '';
      for (const [i, file] of list.entries()) {
        setProgress(`${i + 1}/${list.length}`);
        const [{ path, url: photoUrl }, size] = await Promise.all([uploadPublic(`albums/${album.id}`, file), imageSize(file)]);
        if (!cover) cover = photoUrl;
        await addDoc(cols.photos(album.id), { id: '', storagePath: path, url: photoUrl, width: size.width, height: size.height, order: i });
      }
      await updateDoc(refs.album(album.id), { coverUrl: cover, photoCount: list.length });
      toast(`${list.length} fotos publicadas!`);
      setAlbumTitle('');
    } catch (error) {
      toast(errorMessage(error), 'error');
    } finally {
      setProgress(null);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Mídia" icon={<Film />} />
      <Card className="p-5">
        <h2 className="mb-3 font-black">Melhores momentos</h2>
        <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
          <Input placeholder="Título" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Input placeholder="Link do YouTube ou do Reels" value={url} onChange={(e) => setUrl(e.target.value)} />
          <Button onClick={addVideo} disabled={!url || !title}>Adicionar</Button>
        </div>
        <ul className="mt-4 flex flex-col gap-1 text-sm">
          {videos.data.map((v) => (
            <li key={v.id} className="flex items-center gap-2">
              <Badge>{v.platform}</Badge>
              <span className="flex-1">{v.title}</span>
              <button onClick={() => deleteDoc(doc(cols.videos(), v.id))} className="text-gray-500 hover:text-red-400"><Trash2 className="size-4" /></button>
            </li>
          ))}
        </ul>
      </Card>
      <Card className="p-5">
        <h2 className="mb-3 font-black">Novo álbum de fotos</h2>
        <div className="grid gap-2 sm:grid-cols-3">
          <Input placeholder="Título do álbum" value={albumTitle} onChange={(e) => setAlbumTitle(e.target.value)} />
          <Select value={albumMatch} onChange={(e) => setAlbumMatch(e.target.value)}>
            <option value="">Sem jogo</option>
            {matches.map((m) => <option key={m.id} value={m.id}>{m.code} · {m.home?.shortName} x {m.away?.shortName}</option>)}
          </Select>
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-gray-600 px-4 py-2.5 text-sm font-semibold hover:border-purple-400">
            <ImagePlus className="size-4" /> {progress ? `Enviando ${progress}` : 'Escolher fotos'}
            <input type="file" multiple accept="image/*" className="hidden" disabled={Boolean(progress)} onChange={(e) => e.target.files && upload(e.target.files)} />
          </label>
        </div>
        <ul className="mt-4 flex flex-col gap-1 text-sm">
          {albums.data.map((a) => <li key={a.id}>{a.title} · {a.photoCount} fotos</li>)}
        </ul>
      </Card>
    </div>
  );
}

export function RegistrationsAdmin() {
  const { tournamentId } = useTournament();
  const regs = useCollection(tournamentId ? queries.registrations(tournamentId) : null);
  const toast = useToast();

  const openFile = async (path?: string) => {
    if (!path) return;
    window.open(await getDownloadURL(storageRef(storage, path)), '_blank');
  };

  const approve = async (id: string) => {
    const r = regs.data.find((x) => x.id === id);
    if (!r) return;
    try {
      const batch = writeBatch(db);
      if (r.type === 'team' && r.teamName) {
        batch.set(doc(cols.teams()), { id: '', tournamentId, name: r.teamName, slug: r.teamName.toLowerCase(), shortName: r.teamName.slice(0, 3).toUpperCase(), logoUrl: '', primaryColor: '#2563eb', secondaryColor: '#ffffff', group: null });
      }
      if (r.type === 'athlete' && r.teamId) {
        const photoUrl = r.photoPath ? await getDownloadURL(storageRef(storage, r.photoPath)) : undefined;
        const playerRef = doc(cols.players());
        batch.set(playerRef, { id: '', tournamentId, teamId: r.teamId, name: r.name, number: 0, position: r.position ?? 'MID', photoUrl, linkedUid: r.submittedBy });
        batch.update(refs.user(r.submittedBy), { linkedPlayerId: playerRef.id });
      }
      batch.update(doc(cols.registrations(), id), { status: 'approved' });
      await batch.commit();
      toast('Inscrição aprovada. Ajuste o número do atleta em Times.');
    } catch (error) {
      toast(errorMessage(error), 'error');
    }
  };

  return (
    <div>
      <PageHeader title="Inscrições" icon={<ClipboardCheck />} />
      {regs.data.length === 0 && <EmptyState title="Nenhuma inscrição" />}
      <div className="flex flex-col gap-2">
        {regs.data.map((r) => (
          <Card key={r.id} className="flex flex-wrap items-center gap-3 p-3 text-sm">
            <Badge tone={r.type === 'team' ? 'purple' : 'blue'}>{r.type === 'team' ? 'Time' : 'Atleta'}</Badge>
            <span className="flex-1 font-semibold">{r.type === 'team' ? r.teamName : `${r.name} → ${r.teamName ?? '?'}`}</span>
            <span className="text-gray-400">{r.phone} · {r.birthDate}</span>
            {r.photoPath && <Button size="sm" variant="ghost" onClick={() => openFile(r.photoPath)}>Foto</Button>}
            {r.documentPath && <Button size="sm" variant="ghost" onClick={() => openFile(r.documentPath)}>Documento</Button>}
            {r.status === 'pending' ? (
              <>
                <Button size="sm" variant="success" onClick={() => approve(r.id)}><Check className="size-4" /></Button>
                <Button size="sm" variant="secondary" onClick={() => updateDoc(doc(cols.registrations(), r.id), { status: 'rejected' })}><X className="size-4" /></Button>
              </>
            ) : (
              <Badge tone={r.status === 'approved' ? 'green' : 'red'}>{r.status === 'approved' ? 'Aprovada' : 'Recusada'}</Badge>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}

export function WallAdmin() {
  const { tournamentId } = useTournament();
  const pending = useCollection(tournamentId ? queries.pendingWall(tournamentId) : null);
  const approved = useCollection(tournamentId ? queries.approvedWall(tournamentId, 20) : null);
  const set = (id: string, status: 'approved' | 'rejected') => updateDoc(doc(cols.wall(), id), { status });
  return (
    <div>
      <PageHeader title="Mural do telão" subtitle="Aprove as mensagens antes de aparecerem no telão" icon={<MessagesSquare />} />
      <h2 className="mb-2 font-black">Pendentes ({pending.data.length})</h2>
      <div className="mb-8 flex flex-col gap-2">
        {pending.data.map((m) => (
          <Card key={m.id} className="flex items-center gap-3 p-3">
            <span className="flex-1">“{m.text}” <span className="text-xs text-gray-500">— {m.displayName}</span></span>
            <Button size="sm" variant="success" onClick={() => set(m.id, 'approved')}><Check className="size-4" /></Button>
            <Button size="sm" variant="secondary" onClick={() => set(m.id, 'rejected')}><X className="size-4" /></Button>
          </Card>
        ))}
        {pending.data.length === 0 && <p className="text-sm text-gray-500">Nada para moderar.</p>}
      </div>
      <h2 className="mb-2 font-black">No telão</h2>
      <div className="flex flex-col gap-1 text-sm text-gray-400">
        {approved.data.map((m) => (
          <div key={m.id} className="flex items-center gap-2">
            <span className="flex-1">“{m.text}” — {m.displayName}</span>
            <span className="text-xs">{formatDateTime(m.createdAt)}</span>
            <button onClick={() => set(m.id, 'rejected')} className="text-gray-600 hover:text-red-400"><X className="size-4" /></button>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CouponsAdmin() {
  const { tournamentId } = useTournament();
  const coupons = useCollection(tournamentId ? queries.coupons(tournamentId) : null);
  const [form, setForm] = useState({ sponsorName: '', title: '', description: '', minKaleoPoints: 100, codes: '', days: 30 });
  const [logo, setLogo] = useState<File | null>(null);
  const toast = useToast();

  const create = async () => {
    const codes = form.codes.split(/[\s,;]+/).map((c) => c.trim()).filter(Boolean);
    if (codes.length === 0) return toast('Informe os códigos (um por linha).', 'info');
    try {
      const sponsorLogoUrl = logo ? (await uploadPublic('coupons', logo)).url : '';
      const coupon = await addDoc(cols.coupons(), { id: '', tournamentId, sponsorName: form.sponsorName, sponsorLogoUrl, title: form.title, description: form.description, minKaleoPoints: form.minKaleoPoints, totalCodes: codes.length, redeemedCount: 0, validUntil: Date.now() + form.days * 86_400_000 });
      await setDoc(doc(db, `coupons/${coupon.id}/private/codes`), { codes });
      toast('Cupom criado.');
      setForm({ ...form, title: '', description: '', codes: '' });
    } catch (error) {
      toast(errorMessage(error), 'error');
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Cupons de patrocinadores" subtitle="Liberados para quem atingir os Pontos Kaleo mínimos" icon={<Ticket />} />
      <Card className="grid gap-3 p-5 sm:grid-cols-2">
        <Field label="Patrocinador"><Input value={form.sponsorName} onChange={(e) => setForm({ ...form, sponsorName: e.target.value })} /></Field>
        <Field label="Título"><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="10% de desconto" /></Field>
        <Field label="Descrição" className="sm:col-span-2"><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
        <Field label="Pontos Kaleo mínimos"><Input type="number" value={form.minKaleoPoints} onChange={(e) => setForm({ ...form, minKaleoPoints: Number(e.target.value) })} /></Field>
        <Field label="Validade (dias)"><Input type="number" value={form.days} onChange={(e) => setForm({ ...form, days: Number(e.target.value) })} /></Field>
        <Field label="Códigos (um por linha)" className="sm:col-span-2"><Textarea value={form.codes} onChange={(e) => setForm({ ...form, codes: e.target.value })} /></Field>
        <Field label="Logo"><Input type="file" accept="image/*" onChange={(e) => setLogo(e.target.files?.[0] ?? null)} /></Field>
        <Button className="self-end" onClick={create} disabled={!form.sponsorName || !form.title}>Criar cupom</Button>
      </Card>
      <div className="flex flex-col gap-2">
        {coupons.data.map((c) => (
          <Card key={c.id} className="flex items-center gap-3 p-3 text-sm">
            <span className="flex-1 font-semibold">{c.sponsorName}: {c.title}</span>
            <span className="text-gray-400">{c.redeemedCount}/{c.totalCodes} resgatados · {c.minKaleoPoints} pts</span>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function SettingsAdmin() {
  const { settings } = useTournament();
  const toast = useToast();
  const [live, setLive] = useState<SiteSettings['liveStream'] | null>(null);
  const [sponsorName, setSponsorName] = useState('');
  const [sponsorLink, setSponsorLink] = useState('');
  if (!settings) return null;
  const l = live ?? settings.liveStream;

  const save = (patch: Partial<SiteSettings>) => updateDoc(refs.settings(), patch).then(() => toast('Salvo.')).catch((e) => toast(errorMessage(e), 'error'));

  const addSponsor = async (file: File) => {
    const { url } = await uploadPublic('sponsors', file);
    const next: Sponsor = { name: sponsorName || file.name, logoUrl: url, link: sponsorLink || undefined, order: settings.sponsors.length + 1 };
    await save({ sponsors: [...settings.sponsors, next] });
    setSponsorName('');
    setSponsorLink('');
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Transmissão e patrocínio" icon={<Cog />} />
      <Card className="grid gap-3 p-5 sm:grid-cols-[auto_1fr_auto_auto]">
        <Select value={l.platform} onChange={(e) => setLive({ ...l, platform: e.target.value as 'youtube' | 'twitch' })}>
          <option value="youtube">YouTube</option>
          <option value="twitch">Twitch</option>
        </Select>
        <Input value={l.channelOrVideoId} placeholder="Link da live ou nome do canal" onChange={(e) => setLive({ ...l, channelOrVideoId: e.target.value })} />
        <Select value={l.active ? 'on' : 'off'} onChange={(e) => setLive({ ...l, active: e.target.value === 'on' })}>
          <option value="on">No ar</option>
          <option value="off">Fora do ar</option>
        </Select>
        <Button onClick={() => save({ liveStream: l })}>Atualizar tela</Button>
      </Card>
      <Card className="p-5">
        <h2 className="mb-3 font-black">Patrocinadores ({settings.sponsors.length})</h2>
        <div className="mb-4 grid gap-2 sm:grid-cols-3">
          <Input placeholder="Nome" value={sponsorName} onChange={(e) => setSponsorName(e.target.value)} />
          <Input placeholder="Site ou Instagram (opcional)" value={sponsorLink} onChange={(e) => setSponsorLink(e.target.value)} />
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-gray-600 px-4 py-2.5 text-sm font-semibold">
            <Plus className="size-4" /> Enviar logo
            <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && addSponsor(e.target.files[0])} />
          </label>
        </div>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
          {[...settings.sponsors].sort((a, b) => a.order - b.order).map((s) => (
            <div key={s.logoUrl} className="group relative">
              <img src={s.logoUrl} alt={s.name} className="rounded-xl border border-gray-800" />
              <button onClick={() => save({ sponsors: settings.sponsors.filter((x) => x.logoUrl !== s.logoUrl) })} className="absolute right-1 top-1 hidden rounded-full bg-red-600 p-1 group-hover:block">
                <Trash2 className="size-3" />
              </button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

export function UsersAdmin() {
  const users = useCollection(queries.users(100));
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'mesario'>('mesario');
  const toast = useToast();
  const grant = async (value: boolean) => {
    try {
      await api.setRole({ email, role, value });
      toast(value ? `Papel ${role} concedido. A pessoa precisa sair e entrar de novo.` : 'Papel removido.');
    } catch (error) {
      toast(errorMessage(error), 'error');
    }
  };
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Usuários e papéis" icon={<Wrench />} />
      <Card className="grid gap-2 p-5 sm:grid-cols-[1fr_auto_auto_auto]">
        <Input type="email" placeholder="E-mail da pessoa" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Select value={role} onChange={(e) => setRole(e.target.value as 'admin' | 'mesario')}>
          <option value="mesario">Mesário</option>
          <option value="admin">Admin</option>
        </Select>
        <Button onClick={() => grant(true)} disabled={!email}>Conceder</Button>
        <Button variant="secondary" onClick={() => grant(false)} disabled={!email}>Remover</Button>
      </Card>
      <Card className="divide-y divide-gray-800">
        {users.data.map((u) => (
          <div key={u.id} className="flex items-center gap-3 px-4 py-2 text-sm">
            <span className="flex-1 font-semibold">{u.displayName}</span>
            {u.isGuest && <Badge>convidado</Badge>}
            {u.linkedPlayerId && <Badge tone="blue">atleta</Badge>}
            <span className="font-mono text-xs text-gray-600">{u.id.slice(0, 8)}</span>
          </div>
        ))}
      </Card>
    </div>
  );
}
