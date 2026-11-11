import { useState } from 'react';
import { addDoc, deleteDoc, doc, setDoc } from 'firebase/firestore';
import { Pencil, Plus, Trash2, Users } from 'lucide-react';
import { POSITION_LABEL, slugify, type Player, type Position, type Team } from '@copa/shared';
import { useTournament } from '@/features/tournament/TournamentProvider';
import { cols } from '@/shared/lib/collections';
import { errorMessage } from '@/shared/lib/api';
import { Button, Card, Field, Input, Modal, PageHeader, Select, TeamCrest, useToast } from '@/shared/ui';
import { uploadPublic } from './upload';
import { db } from '@/shared/lib/firebase';

const emptyTeam = (tournamentId: string): Team => ({ id: '', tournamentId, name: '', slug: '', shortName: '', logoUrl: '', primaryColor: '#2563eb', secondaryColor: '#ffffff', group: null });

export function TeamsAdmin() {
  const { teams, players, tournamentId } = useTournament();
  const [team, setTeam] = useState<Team | null>(null);
  const [player, setPlayer] = useState<Player | null>(null);
  const toast = useToast();

  const saveTeam = async (t: Team, logo: File | null) => {
    try {
      const logoUrl = logo ? (await uploadPublic('teams', logo)).url : t.logoUrl;
      const data = { ...t, logoUrl, slug: slugify(t.name), shortName: t.shortName.toUpperCase().slice(0, 4) };
      if (t.id) await setDoc(doc(cols.teams(), t.id), data);
      else await addDoc(cols.teams(), data);
      toast('Time salvo.');
      setTeam(null);
    } catch (error) {
      toast(errorMessage(error), 'error');
    }
  };

  const savePlayer = async (p: Player, photo: File | null) => {
    try {
      const photoUrl = photo ? (await uploadPublic('players', photo)).url : p.photoUrl;
      const data = { ...p, photoUrl };
      if (p.id) await setDoc(doc(cols.players(), p.id), data);
      else await addDoc(cols.players(), data);
      toast('Atleta salvo.');
      setPlayer(null);
    } catch (error) {
      toast(errorMessage(error), 'error');
    }
  };

  const remove = async (kind: 'teams' | 'players', id: string) => {
    if (!window.confirm('Remover definitivamente?')) return;
    const target = doc(db, kind, id);
    await deleteDoc(target).catch((e) => toast(errorMessage(e), 'error'));
  };

  return (
    <div>
      <PageHeader title="Times e atletas" icon={<Users />} actions={<Button icon={<Plus className="size-4" />} onClick={() => setTeam(emptyTeam(tournamentId))}>Novo time</Button>} />
      <div className="grid gap-4 lg:grid-cols-2">
        {teams.map((t) => (
          <Card key={t.id} className="p-4">
            <div className="mb-3 flex items-center gap-3">
              <TeamCrest team={t} size="md" />
              <div className="flex-1">
                <p className="font-black">{t.name}</p>
                <p className="text-xs text-gray-500">{t.shortName} · {t.group ? `Grupo ${t.group}` : 'Sem grupo'}</p>
              </div>
              <Button size="sm" variant="ghost" onClick={() => setTeam(t)}><Pencil className="size-4" /></Button>
              <Button size="sm" variant="ghost" onClick={() => remove('teams', t.id)}><Trash2 className="size-4" /></Button>
            </div>
            <ul className="mb-3 flex flex-col gap-1 text-sm">
              {players.filter((p) => p.teamId === t.id).sort((a, b) => a.number - b.number).map((p) => (
                <li key={p.id} className="flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-gray-800">
                  <span className="w-6 text-right font-mono text-gray-500">{p.number}</span>
                  <span className="flex-1">{p.name}</span>
                  <span className="text-xs text-gray-500">{p.position}{p.linkedUid && ' · 🔗'}</span>
                  <button onClick={() => setPlayer(p)} className="text-gray-500 hover:text-white"><Pencil className="size-3.5" /></button>
                  <button onClick={() => remove('players', p.id)} className="text-gray-500 hover:text-red-400"><Trash2 className="size-3.5" /></button>
                </li>
              ))}
            </ul>
            <Button size="sm" variant="secondary" icon={<Plus className="size-3.5" />} onClick={() => setPlayer({ id: '', tournamentId, teamId: t.id, name: '', number: players.filter((p) => p.teamId === t.id).length + 1, position: 'MID' })}>
              Atleta
            </Button>
          </Card>
        ))}
      </div>
      {team && <TeamForm team={team} onClose={() => setTeam(null)} onSave={saveTeam} />}
      {player && <PlayerForm player={player} onClose={() => setPlayer(null)} onSave={savePlayer} />}
    </div>
  );
}

function TeamForm({ team, onClose, onSave }: { team: Team; onClose: () => void; onSave: (t: Team, logo: File | null) => Promise<void> }) {
  const [t, setT] = useState(team);
  const [logo, setLogo] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <Modal open onClose={onClose} title={team.id ? 'Editar time' : 'Novo time'}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Nome" className="col-span-2"><Input value={t.name} onChange={(e) => setT({ ...t, name: e.target.value })} /></Field>
        <Field label="Sigla"><Input value={t.shortName} maxLength={4} onChange={(e) => setT({ ...t, shortName: e.target.value })} /></Field>
        <Field label="Grupo"><Input value={t.group ?? ''} maxLength={1} onChange={(e) => setT({ ...t, group: e.target.value.toUpperCase() || null })} /></Field>
        <Field label="Cor principal"><Input type="color" value={t.primaryColor} onChange={(e) => setT({ ...t, primaryColor: e.target.value })} className="h-11 p-1" /></Field>
        <Field label="Cor secundária"><Input type="color" value={t.secondaryColor} onChange={(e) => setT({ ...t, secondaryColor: e.target.value })} className="h-11 p-1" /></Field>
        <Field label="Escudo" className="col-span-2"><Input type="file" accept="image/*" onChange={(e) => setLogo(e.target.files?.[0] ?? null)} /></Field>
      </div>
      <Button className="mt-4 w-full" loading={busy} disabled={!t.name || !t.shortName} onClick={async () => { setBusy(true); await onSave(t, logo); setBusy(false); }}>Salvar</Button>
    </Modal>
  );
}

function PlayerForm({ player, onClose, onSave }: { player: Player; onClose: () => void; onSave: (p: Player, photo: File | null) => Promise<void> }) {
  const { teams } = useTournament();
  const [p, setP] = useState(player);
  const [photo, setPhoto] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <Modal open onClose={onClose} title={player.id ? 'Editar atleta' : 'Novo atleta'}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Nome" className="col-span-2"><Input value={p.name} onChange={(e) => setP({ ...p, name: e.target.value })} /></Field>
        <Field label="Número"><Input type="number" min={0} max={99} value={p.number} onChange={(e) => setP({ ...p, number: Number(e.target.value) })} /></Field>
        <Field label="Posição">
          <Select value={p.position} onChange={(e) => setP({ ...p, position: e.target.value as Position })}>
            {Object.entries(POSITION_LABEL).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
          </Select>
        </Field>
        <Field label="Time" className="col-span-2">
          <Select value={p.teamId} onChange={(e) => setP({ ...p, teamId: e.target.value })}>
            {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </Select>
        </Field>
        <Field label="Conta vinculada (UID)" className="col-span-2" hint="Preenchido automaticamente ao aprovar uma inscrição. Dá a Medalha de Atleta.">
          <Input value={p.linkedUid ?? ''} onChange={(e) => setP({ ...p, linkedUid: e.target.value || undefined })} />
        </Field>
        <Field label="Foto" className="col-span-2"><Input type="file" accept="image/*" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} /></Field>
      </div>
      <Button className="mt-4 w-full" loading={busy} disabled={!p.name} onClick={async () => { setBusy(true); await onSave(p, photo); setBusy(false); }}>Salvar</Button>
    </Modal>
  );
}
