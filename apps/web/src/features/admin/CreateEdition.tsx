import { useState, type FormEvent } from 'react';
import { getDoc, setDoc, writeBatch } from 'firebase/firestore';
import { Sparkles, Trophy } from 'lucide-react';
import { EMPTY_SITE_SETTINGS, FUTSAL_TIMING, editionId, newEdition, validateEdition } from '@copa/shared';
import { refs } from '@/shared/lib/collections';
import { db } from '@/shared/lib/firebase';
import { errorMessage } from '@/shared/lib/api';
import { Button, Card, Field, Input, useToast } from '@/shared/ui';

export function CreateEdition() {
  const year = new Date().getFullYear() + 1;
  const [form, setForm] = useState({ name: `Copa Kaleo ${year}`, season: year, edition: 1, eventDate: '', dayStartsAt: '08:00' });
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const error = validateEdition(form);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (error) return toast(error, 'error');
    setBusy(true);
    try {
      const id = editionId(form.season);
      const existing = await getDoc(refs.tournament(id));
      if (!existing.exists()) {
        const batch = writeBatch(db);
        batch.set(refs.tournament(id), { id, ...newEdition(form) });
        await batch.commit();
      }
      await setDoc(refs.settings(), { id: 'site', activeTournamentId: id, ...EMPTY_SITE_SETTINGS }, { merge: true });
      toast(existing.exists() ? `A edição ${form.season} já existia e agora está ativa.` : 'Edição criada! Agora cadastre os times.');
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="mx-auto max-w-2xl p-6">
      <div className="mb-5 flex items-center gap-3">
        <span className="rounded-2xl bg-gradient-brand p-2.5 text-snow"><Trophy className="size-6" /></span>
        <div>
          <h1 className="text-xl font-black text-white">Criar a edição do torneio</h1>
          <p className="text-sm text-gray-400">Ainda não há nenhuma edição ativa. Crie a primeira para cadastrar times, jogos e notícias.</p>
        </div>
      </div>
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <Field label="Nome da edição" className="sm:col-span-2">
          <Input value={form.name} maxLength={80} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </Field>
        <Field label="Ano">
          <Input
            type="number"
            min={2000}
            max={2100}
            value={form.season}
            onChange={(e) => {
              const season = Number(e.target.value);
              setForm({ ...form, season, name: form.name === `Copa Kaleo ${form.season}` ? `Copa Kaleo ${season}` : form.name });
            }}
          />
        </Field>
        <Field label="Edição nº" hint="Ex.: 5 para a 5ª Copa Kaleo">
          <Input type="number" min={1} value={form.edition} onChange={(e) => setForm({ ...form, edition: Number(e.target.value) })} />
        </Field>
        <Field label="Data do evento">
          <Input type="date" value={form.eventDate} onChange={(e) => setForm({ ...form, eventDate: e.target.value })} />
        </Field>
        <Field label="Primeiro jogo às">
          <Input type="time" value={form.dayStartsAt} onChange={(e) => setForm({ ...form, dayStartsAt: e.target.value })} />
        </Field>
        <p className="text-xs text-gray-500 sm:col-span-2">
          Já vem com 2 grupos, 2 classificados por grupo, disputa de 3º lugar e tempo de futsal ({FUTSAL_TIMING.halfDurationMin} min cada tempo, intervalo de {FUTSAL_TIMING.halftimeMin}). Tudo isso pode ser mudado depois em Torneio.
        </p>
        <Button type="submit" icon={<Sparkles className="size-4" />} loading={busy} disabled={Boolean(error)} className="sm:col-span-2">
          Criar edição
        </Button>
      </form>
    </Card>
  );
}
