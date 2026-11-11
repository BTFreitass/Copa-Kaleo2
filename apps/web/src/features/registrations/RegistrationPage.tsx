import { useState, type FormEvent } from 'react';
import { addDoc } from 'firebase/firestore';
import { ref as storageRef, uploadBytes } from 'firebase/storage';
import { ClipboardList } from 'lucide-react';
import { POSITION_LABEL, type Position } from '@copa/shared';
import { useAuth } from '@/features/auth/AuthProvider';
import { useTournament } from '@/features/tournament/TournamentProvider';
import { cols, queries } from '@/shared/lib/collections';
import { useCollection } from '@/shared/lib/data';
import { storage } from '@/shared/lib/firebase';
import { errorMessage } from '@/shared/lib/api';
import { Badge, Button, Card, EmptyState, Field, Input, PageHeader, Select, Tabs, useToast } from '@/shared/ui';

export function RegistrationPage() {
  const { user, openLogin } = useAuth();
  const { tournamentId, teams } = useTournament();
  const mine = useCollection(user ? queries.myRegistrations(user.uid) : null);
  const [type, setType] = useState<'athlete' | 'team'>('athlete');
  const [form, setForm] = useState({ name: '', birthDate: '', phone: '', teamId: '', teamName: '', position: 'MID' as Position });
  const [photo, setPhoto] = useState<File | null>(null);
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [terms, setTerms] = useState(false);
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  if (!user) return <EmptyState icon={<ClipboardList />} title="Entre para fazer a inscrição" action={<Button onClick={openLogin}>Entrar</Button>} />;

  const upload = async (file: File | null, kind: string) => {
    if (!file) return undefined;
    const path = `registrations/${user.uid}/${kind}-${Date.now()}-${file.name.replace(/[^\w.]/g, '_')}`;
    await uploadBytes(storageRef(storage, path), file, { contentType: file.type });
    return path;
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!terms) return toast('Aceite o termo de responsabilidade.', 'info');
    setBusy(true);
    try {
      const [photoPath, documentPath] = await Promise.all([upload(photo, 'foto'), upload(documentFile, 'documento')]);
      await addDoc(cols.registrations(), {
        id: '',
        tournamentId,
        type,
        submittedBy: user.uid,
        teamId: type === 'athlete' ? form.teamId || undefined : undefined,
        teamName: type === 'team' ? form.teamName : teams.find((t) => t.id === form.teamId)?.name,
        name: form.name,
        birthDate: form.birthDate,
        position: type === 'athlete' ? form.position : undefined,
        phone: form.phone,
        photoPath,
        documentPath,
        termsAcceptedAt: Date.now(),
        status: 'pending',
        createdAt: Date.now(),
      });
      toast('Inscrição enviada! A organização vai analisar.');
      setForm({ name: '', birthDate: '', phone: '', teamId: '', teamName: '', position: 'MID' });
      setTerms(false);
    } catch (error) {
      toast(errorMessage(error), 'error');
    } finally {
      setBusy(false);
    }
  };

  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm({ ...form, [k]: e.target.value });

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Inscrições" subtitle="Inscreva seu time ou entre como atleta" icon={<ClipboardList />} />
      <Card className="p-6">
        <div className="mb-6">
          <Tabs value={type} onChange={setType} tabs={[{ id: 'athlete', label: 'Sou atleta' }, { id: 'team', label: 'Inscrever um time' }]} />
        </div>
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          {type === 'team' ? (
            <Field label="Nome do time" className="sm:col-span-2">
              <Input required value={form.teamName} onChange={set('teamName')} maxLength={40} />
            </Field>
          ) : (
            <Field label="Time" className="sm:col-span-2" hint="Não achou? Peça para o responsável inscrever o time primeiro.">
              <Select required value={form.teamId} onChange={set('teamId')}>
                <option value="">Escolha</option>
                {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </Select>
            </Field>
          )}
          <Field label={type === 'team' ? 'Responsável' : 'Nome completo'}>
            <Input required value={form.name} onChange={set('name')} maxLength={60} />
          </Field>
          <Field label="Data de nascimento">
            <Input required type="date" value={form.birthDate} onChange={set('birthDate')} />
          </Field>
          <Field label="WhatsApp">
            <Input required type="tel" value={form.phone} onChange={set('phone')} placeholder="(11) 99999-9999" />
          </Field>
          {type === 'athlete' && (
            <Field label="Posição">
              <Select value={form.position} onChange={set('position')}>
                {Object.entries(POSITION_LABEL).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
              </Select>
            </Field>
          )}
          <Field label="Foto" hint="Vira a sua figurinha oficial!">
            <Input type="file" accept="image/*" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} />
          </Field>
          <Field label="Documento (RG ou CNH)">
            <Input type="file" accept="image/*,application/pdf" onChange={(e) => setDocumentFile(e.target.files?.[0] ?? null)} />
          </Field>
          <label className="flex items-start gap-3 rounded-xl bg-gray-950 p-3 text-sm text-gray-300 sm:col-span-2">
            <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} className="mt-1" />
            Declaro estar apto a praticar atividade física, assumo responsabilidade pela minha participação e autorizo o uso da minha imagem na divulgação da Copa Kaleo.
          </label>
          <Button type="submit" loading={busy} className="sm:col-span-2">Enviar inscrição</Button>
        </form>
      </Card>
      {mine.data.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 font-black">Minhas inscrições</h2>
          <div className="flex flex-col gap-2">
            {mine.data.map((r) => (
              <Card key={r.id} className="flex items-center justify-between p-3 text-sm">
                <span>{r.type === 'team' ? `Time ${r.teamName}` : `${r.name} · ${r.teamName ?? ''}`}</span>
                <Badge tone={r.status === 'approved' ? 'green' : r.status === 'rejected' ? 'red' : 'yellow'}>
                  {{ pending: 'Em análise', approved: 'Aprovada', rejected: 'Recusada' }[r.status]}
                </Badge>
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
