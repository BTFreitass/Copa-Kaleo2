import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { updateDoc } from 'firebase/firestore';
import { Bot, CalendarRange, Gamepad2, Monitor } from 'lucide-react';
import { STAGE_LABEL, type MatchStatus } from '@copa/shared';
import { useTournament } from '@/features/tournament/TournamentProvider';
import { useAuth } from '@/features/auth/AuthProvider';
import { refs } from '@/shared/lib/collections';
import { api, errorMessage } from '@/shared/lib/api';
import { Badge, Button, Card, Input, PageHeader, TeamCrest, useToast } from '@/shared/ui';
import { slotName } from '@/features/matches/components';
import { formatTime } from '@/shared/utils/format';

const STATUS_TONE: Record<MatchStatus, 'gray' | 'red' | 'yellow' | 'green' | 'blue'> = { scheduled: 'blue', live: 'red', halftime: 'yellow', finished: 'gray', postponed: 'yellow' };

export function MatchesAdmin() {
  const { matches } = useTournament();
  const { isAdmin } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [busy, setBusy] = useState<string | null>(null);

  const setKickoff = (id: string, value: string, base: number) => {
    const [h, m] = value.split(':').map(Number);
    const d = new Date(base);
    d.setHours(h ?? 0, m ?? 0, 0, 0);
    updateDoc(refs.match(id), { kickoffAt: d.getTime() }).catch((e) => toast(errorMessage(e), 'error'));
  };

  const draft = async (matchId: string) => {
    setBusy(matchId);
    try {
      const r = await api.generateMatchDraft({ matchId });
      toast(r.usedAi ? 'Rascunho criado com IA. Revise antes de publicar.' : 'Rascunho criado pelo modelo automático (IA não configurada).');
      navigate(`/admin/noticias/${r.postId}`);
    } catch (error) {
      toast(errorMessage(error), 'error');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div>
      <PageHeader
        title="Jogos"
        subtitle="Abra o modo mesário para registrar os lances na beira do campo"
        icon={<CalendarRange />}
        actions={<Link to="/telao" target="_blank"><Button variant="secondary" icon={<Monitor className="size-4" />}>Telão</Button></Link>}
      />
      <div className="flex flex-col gap-2">
        {matches.map((m) => (
          <Card key={m.id} className="flex flex-wrap items-center gap-3 p-3">
            <span className="w-10 font-mono text-xs font-bold text-gray-500">{m.code}</span>
            {isAdmin && m.status === 'scheduled' ? (
              <Input type="time" defaultValue={formatTime(m.kickoffAt)} onBlur={(e) => setKickoff(m.id, e.target.value, m.kickoffAt)} className="w-28 py-1.5" />
            ) : (
              <span className="w-28 text-sm text-gray-400">{formatTime(m.kickoffAt)}</span>
            )}
            <div className="flex min-w-60 flex-1 items-center gap-2 text-sm">
              <TeamCrest team={m.home} size="xs" />
              <span className="font-semibold">{slotName(m, 'home')}</span>
              <span className="font-black tabular-nums text-white">{m.status === 'scheduled' ? 'x' : `${m.score.home} x ${m.score.away}`}</span>
              <span className="font-semibold">{slotName(m, 'away')}</span>
              <TeamCrest team={m.away} size="xs" />
            </div>
            <span className="text-xs text-gray-500">{m.group ? `Grupo ${m.group}` : STAGE_LABEL[m.stage]}</span>
            <Badge tone={STATUS_TONE[m.status]}>{{ scheduled: 'Agendado', live: 'Ao vivo', halftime: 'Intervalo', finished: 'Encerrado', postponed: 'Adiado' }[m.status]}</Badge>
            <Link to={`/mesario/${m.id}`}>
              <Button size="sm" icon={<Gamepad2 className="size-4" />} disabled={!m.homeTeamId || !m.awayTeamId}>Mesário</Button>
            </Link>
            {isAdmin && m.status === 'finished' && (
              <Button size="sm" variant="secondary" icon={<Bot className="size-4" />} loading={busy === m.id} onClick={() => draft(m.id)}>Rascunho</Button>
            )}
          </Card>
        ))}
        {matches.length === 0 && <p className="text-sm text-gray-500">Gere a tabela em Torneio → Montador.</p>}
      </div>
    </div>
  );
}
