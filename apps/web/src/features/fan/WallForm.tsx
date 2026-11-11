import { useState } from 'react';
import { addDoc } from 'firebase/firestore';
import { MessageSquarePlus } from 'lucide-react';
import { cols } from '@/shared/lib/collections';
import { useAuth } from '@/features/auth/AuthProvider';
import { useTournament } from '@/features/tournament/TournamentProvider';
import { Button, Input, useToast } from '@/shared/ui';
import { errorMessage } from '@/shared/lib/api';

export function WallForm() {
  const { user, profile, openLogin } = useAuth();
  const { tournamentId } = useTournament();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  const send = async () => {
    if (!user) return openLogin();
    if (!text.trim()) return;
    setBusy(true);
    try {
      await addDoc(cols.wall(), {
        id: '',
        tournamentId,
        uid: user.uid,
        displayName: profile?.displayName ?? 'Torcedor',
        text: text.trim().slice(0, 140),
        status: 'pending',
        createdAt: Date.now(),
      });
      setText('');
      toast('Mensagem enviada! Ela aparece no telão depois da aprovação.');
    } catch (error) {
      toast(errorMessage(error), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border border-gray-800 bg-gray-900/70 p-4">
      <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-gray-400">
        <MessageSquarePlus className="size-4" /> Recado para o telão
      </p>
      <div className="flex gap-2">
        <Input value={text} maxLength={140} placeholder="Manda um salve para o seu time!" onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} />
        <Button onClick={send} loading={busy}>
          Enviar
        </Button>
      </div>
      <p className="mt-1 text-right text-[10px] text-gray-600">{text.length}/140</p>
    </div>
  );
}
