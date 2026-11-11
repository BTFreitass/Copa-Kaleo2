import { useMemo, useState } from 'react';
import { addDoc, doc, updateDoc } from 'firebase/firestore';
import { ArrowLeftRight, Gift, PackageOpen, Sticker as StickerIcon } from 'lucide-react';
import type { Sticker } from '@copa/shared';
import { useAuth } from '@/features/auth/AuthProvider';
import { useTournament } from '@/features/tournament/TournamentProvider';
import { cols, queries } from '@/shared/lib/collections';
import { useCollection } from '@/shared/lib/data';
import { api, errorMessage } from '@/shared/lib/api';
import { Badge, Button, Card, EmptyState, Field, Modal, PageHeader, Select, Tabs, TeamCrest, useToast } from '@/shared/ui';
import { cn } from '@/shared/utils/format';

export function StickersPage() {
  const { user, profile, openLogin } = useAuth();
  const { tournamentId, teams, teamsById } = useTournament();
  const stickers = useCollection(tournamentId ? queries.stickers(tournamentId) : null);
  const owned = useCollection(user && tournamentId ? queries.myCollection(user.uid, tournamentId) : null);
  const packs = useCollection(user ? queries.myPacks(user.uid) : null);
  const [tab, setTab] = useState<'album' | 'repetidas' | 'trocas'>('album');
  const [opening, setOpening] = useState(false);
  const [revealed, setRevealed] = useState<Sticker[] | null>(null);
  const toast = useToast();

  const qty = useMemo(() => new Map(owned.data.map((o) => [o.id, o.quantity])), [owned.data]);
  const base = stickers.data.filter((s) => s.kind !== 'shiny');
  const have = base.filter((s) => (qty.get(s.id) ?? 0) > 0).length;
  const pct = base.length ? Math.round((have / base.length) * 100) : 0;
  const myPacks = packs.data.filter((p) => p.tournamentId === tournamentId);

  if (!user) return <EmptyState icon={<StickerIcon />} title="Entre para colecionar" description="Você ganha 2 pacotes de boas-vindas!" action={<Button onClick={openLogin}>Entrar</Button>} />;

  const open = async () => {
    const pack = myPacks[0];
    if (!pack) return;
    setOpening(true);
    try {
      const { contents } = await api.openPack({ packId: pack.id });
      setRevealed(contents.map((id) => stickers.data.find((s) => s.id === id)).filter((s): s is Sticker => Boolean(s)));
    } catch (error) {
      toast(errorMessage(error), 'error');
    } finally {
      setOpening(false);
    }
  };

  const groups = [...teams.map((t) => ({ id: t.id, title: t.name, items: base.filter((s) => s.teamId === t.id) })), { id: 'shiny', title: '✨ Brilhantes', items: stickers.data.filter((s) => s.kind === 'shiny') }].filter((g) => g.items.length);
  const duplicates = stickers.data.filter((s) => (qty.get(s.id) ?? 0) > 1);

  return (
    <div>
      <PageHeader
        title="Álbum de figurinhas"
        subtitle={`${have} de ${base.length} figurinhas · ${pct}% completo`}
        icon={<StickerIcon />}
        actions={
          <Button size="lg" onClick={open} loading={opening} disabled={myPacks.length === 0} icon={<PackageOpen className="size-5" />}>
            Abrir pacote ({myPacks.length})
          </Button>
        }
      />
      <div className="mb-6 h-3 overflow-hidden rounded-full bg-gray-800">
        <div className="h-full bg-gradient-brand transition-all duration-700" style={{ width: `${pct}%` }} />
      </div>
      <Card className="mb-6 flex items-start gap-3 p-4 text-sm text-gray-300">
        <Gift className="mt-0.5 size-5 shrink-0 text-pink-300" />
        <p>Ganhe pacotes fazendo check-in na arquibancada, acertando placares exatos, entrando em ligas, vencendo duelos e desbloqueando conquistas. Figurinhas brilhantes aparecem para quem faz hat-trick ou é eleito Craque do Jogo.</p>
      </Card>
      {stickers.data.length === 0 && <EmptyState title="O álbum abre em breve" description="A organização libera as figurinhas quando os elencos estiverem confirmados." />}
      {stickers.data.length > 0 && (
        <>
          <div className="mb-6 max-w-md">
            <Tabs value={tab} onChange={setTab} tabs={[{ id: 'album', label: 'Álbum' }, { id: 'repetidas', label: `Repetidas (${duplicates.length})` }, { id: 'trocas', label: 'Trocas' }]} />
          </div>
          {tab === 'album' && (
            <div className="flex flex-col gap-8">
              {groups.map((g) => (
                <section key={g.id}>
                  <h2 className="mb-3 flex items-center gap-2 font-black">
                    {g.id !== 'shiny' && <TeamCrest team={teamsById.get(g.id) ?? null} size="xs" />}
                    {g.title}
                    <span className="text-xs font-normal text-gray-500">{g.items.filter((s) => (qty.get(s.id) ?? 0) > 0).length}/{g.items.length}</span>
                  </h2>
                  <div className="grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-8">
                    {g.items.map((s) => <StickerTile key={s.id} sticker={s} quantity={qty.get(s.id) ?? 0} />)}
                  </div>
                </section>
              ))}
            </div>
          )}
          {tab === 'repetidas' && (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-8">
              {duplicates.length === 0 && <p className="col-span-full text-sm text-gray-500">Sem repetidas por enquanto.</p>}
              {duplicates.map((s) => <StickerTile key={s.id} sticker={s} quantity={qty.get(s.id) ?? 0} />)}
            </div>
          )}
          {tab === 'trocas' && <Trades stickers={stickers.data} qty={qty} myName={profile?.displayName ?? 'Torcedor'} />}
        </>
      )}
      <Modal open={Boolean(revealed)} onClose={() => setRevealed(null)} title="Seu pacote!" wide>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
          {revealed?.map((s, i) => (
            <div key={`${s.id}-${i}`} className="animate-pop" style={{ animationDelay: `${i * 150}ms` }}>
              <StickerTile sticker={s} quantity={1} isNew={(qty.get(s.id) ?? 0) <= revealed.filter((x) => x.id === s.id).length} />
            </div>
          ))}
        </div>
        <Button className="mt-6 w-full" onClick={() => setRevealed(null)}>Colar no álbum</Button>
      </Modal>
    </div>
  );
}

export function StickerTile({ sticker, quantity, isNew }: { sticker: Sticker; quantity: number; isNew?: boolean }) {
  const { teamsById } = useTournament();
  const team = teamsById.get(sticker.teamId) ?? null;
  const has = quantity > 0;
  return (
    <div
      className={cn(
        'relative flex aspect-[3/4] flex-col items-center justify-between overflow-hidden rounded-xl border p-2 text-center',
        has ? 'border-white/20' : 'border-dashed border-gray-700 bg-gray-900/50',
        sticker.rarity === 'shiny' && has && 'ring-2 ring-yellow-300',
      )}
      style={has ? { background: `linear-gradient(160deg, ${team?.primaryColor ?? '#7c3aed'}, #111827)` } : undefined}
    >
      {has && sticker.rarity === 'shiny' && <div className="pointer-events-none absolute inset-0 shiny" />}
      <span className={cn('self-start text-[10px] font-black', has ? 'text-white/70' : 'text-gray-600')}>{sticker.number}</span>
      {has ? (
        sticker.imageUrl ? <img src={sticker.imageUrl} alt="" className="size-12 rounded-full object-cover" /> : sticker.kind === 'team' ? <TeamCrest team={team} size="md" /> : <span className="text-3xl">⚽</span>
      ) : (
        <span className="text-2xl text-gray-700">?</span>
      )}
      <span className={cn('line-clamp-2 text-[10px] font-bold leading-tight', has ? 'text-white' : 'text-gray-600')}>{has ? sticker.name : '???'}</span>
      {quantity > 1 && <span className="absolute right-1 top-1 rounded-full bg-pink-600 px-1.5 text-[10px] font-black">x{quantity}</span>}
      {isNew && <Badge tone="green" className="absolute bottom-6 text-[9px]">NOVA</Badge>}
    </div>
  );
}

function Trades({ stickers, qty, myName }: { stickers: Sticker[]; qty: Map<string, number>; myName: string }) {
  const { user } = useAuth();
  const { tournamentId } = useTournament();
  const board = useCollection(tournamentId ? queries.leaderboard(tournamentId, 200) : null);
  const incoming = useCollection(user ? queries.tradesTo(user.uid) : null);
  const outgoing = useCollection(user ? queries.tradesFrom(user.uid) : null);
  const [open, setOpen] = useState(false);
  const [to, setTo] = useState('');
  const [offer, setOffer] = useState('');
  const [want, setWant] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const toast = useToast();
  const byId = new Map(stickers.map((s) => [s.id, s]));
  const name = (id: string) => (byId.get(id) ? `#${byId.get(id)!.number} ${byId.get(id)!.name}` : id);

  const propose = async () => {
    const target = board.data.find((e) => e.uid === to);
    if (!user || !target) return;
    try {
      await addDoc(cols.trades(), { id: '', tournamentId, fromUid: user.uid, fromName: myName, toUid: target.uid, toName: target.displayName, offer: [offer], request: [want], status: 'open', createdAt: Date.now() });
      toast('Proposta enviada!');
      setOpen(false);
    } catch (error) {
      toast(errorMessage(error), 'error');
    }
  };

  const accept = async (id: string) => {
    setBusy(id);
    try {
      await api.acceptTrade({ tradeId: id });
      toast('Troca feita!');
    } catch (error) {
      toast(errorMessage(error), 'error');
    } finally {
      setBusy(null);
    }
  };

  const setStatus = (id: string, status: 'declined' | 'cancelled') => updateDoc(doc(cols.trades(), id), { status }).catch((e) => toast(errorMessage(e), 'error'));
  const openIncoming = incoming.data.filter((t) => t.status === 'open');
  const openOutgoing = outgoing.data.filter((t) => t.status === 'open');

  return (
    <div className="flex flex-col gap-6">
      <Button className="w-fit" icon={<ArrowLeftRight className="size-4" />} onClick={() => setOpen(true)}>Propor troca</Button>
      <section>
        <h3 className="mb-2 font-black">Recebidas</h3>
        {openIncoming.length === 0 && <p className="text-sm text-gray-500">Nenhuma proposta.</p>}
        {openIncoming.map((t) => (
          <Card key={t.id} className="mb-2 flex flex-wrap items-center gap-3 p-3 text-sm">
            <span className="flex-1"><strong>{t.fromName}</strong> oferece {t.offer.map(name).join(', ')} por {t.request.map(name).join(', ')}</span>
            <Button size="sm" variant="success" loading={busy === t.id} onClick={() => accept(t.id)}>Aceitar</Button>
            <Button size="sm" variant="secondary" onClick={() => setStatus(t.id, 'declined')}>Recusar</Button>
          </Card>
        ))}
      </section>
      <section>
        <h3 className="mb-2 font-black">Enviadas</h3>
        {openOutgoing.length === 0 && <p className="text-sm text-gray-500">Nenhuma proposta pendente.</p>}
        {openOutgoing.map((t) => (
          <Card key={t.id} className="mb-2 flex items-center gap-3 p-3 text-sm">
            <span className="flex-1">Para <strong>{t.toName}</strong>: {t.offer.map(name).join(', ')} ⇄ {t.request.map(name).join(', ')}</span>
            <Button size="sm" variant="ghost" onClick={() => setStatus(t.id, 'cancelled')}>Cancelar</Button>
          </Card>
        ))}
      </section>
      <Modal open={open} onClose={() => setOpen(false)} title="Propor troca">
        <div className="flex flex-col gap-4">
          <Field label="Com quem">
            <Select value={to} onChange={(e) => setTo(e.target.value)}>
              <option value="">Escolha</option>
              {board.data.filter((e) => e.uid !== user?.uid).map((e) => <option key={e.uid} value={e.uid}>{e.displayName}</option>)}
            </Select>
          </Field>
          <Field label="Eu dou (repetida)">
            <Select value={offer} onChange={(e) => setOffer(e.target.value)}>
              <option value="">Escolha</option>
              {stickers.filter((s) => (qty.get(s.id) ?? 0) > 1).map((s) => <option key={s.id} value={s.id}>{name(s.id)}</option>)}
            </Select>
          </Field>
          <Field label="Eu quero (que me falta)">
            <Select value={want} onChange={(e) => setWant(e.target.value)}>
              <option value="">Escolha</option>
              {stickers.filter((s) => (qty.get(s.id) ?? 0) === 0).map((s) => <option key={s.id} value={s.id}>{name(s.id)}</option>)}
            </Select>
          </Field>
          <Button onClick={propose} disabled={!to || !offer || !want}>Enviar proposta</Button>
        </div>
      </Modal>
    </div>
  );
}
