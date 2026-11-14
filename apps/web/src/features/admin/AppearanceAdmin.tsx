import { useEffect, useState } from 'react';
import { setDoc } from 'firebase/firestore';
import { Check, Eye, Palette } from 'lucide-react';
import { DEFAULT_PALETTE, SITE_PALETTES, type SitePalette } from '@copa/shared';
import { useTournament } from '@/features/tournament/TournamentProvider';
import { refs } from '@/shared/lib/collections';
import { errorMessage } from '@/shared/lib/api';
import { previewPalette } from '@/shared/lib/palette';
import { Badge, Button, Card, PageHeader, useToast } from '@/shared/ui';
import { cn } from '@/shared/utils/format';

export function AppearanceAdmin() {
  const { settings } = useTournament();
  const toast = useToast();
  const saved = settings?.palette ?? DEFAULT_PALETTE;
  const [chosen, setChosen] = useState<SitePalette>(saved);
  const [saving, setSaving] = useState(false);

  useEffect(() => setChosen(saved), [saved]);
  useEffect(() => {
    previewPalette(chosen === saved ? null : chosen);
  }, [chosen, saved]);
  useEffect(() => () => previewPalette(null), []);

  const save = async () => {
    setSaving(true);
    try {
      await setDoc(refs.settings(), { palette: chosen }, { merge: true });
      toast('Esquema de cores salvo. Todos os visitantes já veem o novo visual.');
    } catch (e) {
      toast(errorMessage(e), 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Personalização" subtitle="Escolha o esquema de cores do site. Vale para todos os visitantes, nos modos claro e escuro." icon={<Palette />} />
      <div className="grid gap-4 sm:grid-cols-2">
        {SITE_PALETTES.map((p) => {
          const selected = chosen === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => setChosen(p.id)}
              aria-pressed={selected}
              className={cn('rounded-2xl text-left transition', selected ? 'ring-2 ring-blue-500' : 'hover:ring-1 hover:ring-gray-600')}
            >
              <Card className="flex h-full flex-col gap-4 p-5">
                <div className="flex h-14 overflow-hidden rounded-xl ring-1 ring-gray-800">
                  {p.swatches.map((color) => (
                    <span key={color} className="flex-1" style={{ background: color }} />
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <h2 className="font-black">{p.name}</h2>
                  {saved === p.id && <Badge tone="green">No ar</Badge>}
                  {selected && saved !== p.id && <Badge tone="blue">Visualizando</Badge>}
                </div>
                <p className="text-sm text-gray-400">{p.description}</p>
              </Card>
            </button>
          );
        })}
      </div>
      <Card className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-center gap-2 text-sm text-gray-300">
          <Eye className="size-4 shrink-0 text-gray-400" />
          {chosen === saved
            ? 'Clique em um esquema para ver como o site fica. Só você vê a prévia até salvar.'
            : 'Prévia aplicada só para você, enquanto estiver nesta tela. Salve para publicar para todos.'}
        </p>
        <div className="flex gap-2">
          {chosen !== saved && (
            <Button variant="secondary" onClick={() => setChosen(saved)}>
              Descartar
            </Button>
          )}
          <Button icon={<Check className="size-4" />} loading={saving} disabled={chosen === saved} onClick={save}>
            Usar no site
          </Button>
        </div>
      </Card>
    </div>
  );
}
