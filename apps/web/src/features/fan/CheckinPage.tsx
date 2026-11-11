import { useEffect, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import { CheckCircle2, Ticket, XCircle } from 'lucide-react';
import { useAuth } from '@/features/auth/AuthProvider';
import { refs } from '@/shared/lib/collections';
import { useDocument } from '@/shared/lib/data';
import { api, errorMessage } from '@/shared/lib/api';
import { Button, Card, PageLoader, Spinner } from '@/shared/ui';
import { Scoreboard } from '@/features/matches/components';

export function CheckinPage() {
  const { matchId = '' } = useParams();
  const [params] = useSearchParams();
  const token = params.get('t') ?? '';
  const { user, loading, openLogin } = useAuth();
  const match = useDocument(refs.match(matchId));
  const [state, setState] = useState<{ status: 'idle' | 'busy' | 'ok' | 'already' | 'error'; message?: string }>({ status: 'idle' });
  const attempted = useRef(false);

  useEffect(() => {
    if (!user || attempted.current || !token) return;
    attempted.current = true;
    setState({ status: 'busy' });
    api
      .checkIn({ matchId, token })
      .then((r) => setState({ status: r.already ? 'already' : 'ok' }))
      .catch((error) => setState({ status: 'error', message: errorMessage(error) }));
  }, [user, matchId, token]);

  if (loading || match.loading) return <PageLoader />;

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6">
      <Card className="p-6">
        {match.data && <Scoreboard match={match.data} />}
      </Card>
      <Card className="flex flex-col items-center gap-4 p-8 text-center">
        {!user && (
          <>
            <Ticket className="size-12 text-purple-300" />
            <p className="text-lg font-bold">Entre para confirmar presença</p>
            <p className="text-sm text-gray-400">Pode entrar como convidado: leva 2 segundos.</p>
            <Button size="lg" onClick={openLogin}>Entrar e fazer check-in</Button>
          </>
        )}
        {state.status === 'busy' && <Spinner className="size-10" />}
        {state.status === 'ok' && (
          <>
            <CheckCircle2 className="size-16 animate-pop text-emerald-400" />
            <p className="text-2xl font-black">Presença confirmada!</p>
            <p className="text-gray-400">Você ganhou Pontos Kaleo e um pacote de figurinhas.</p>
          </>
        )}
        {state.status === 'already' && (
          <>
            <CheckCircle2 className="size-16 text-blue-400" />
            <p className="text-xl font-black">Você já fez check-in neste jogo</p>
          </>
        )}
        {state.status === 'error' && (
          <>
            <XCircle className="size-16 text-red-400" />
            <p className="text-lg font-bold">{state.message}</p>
          </>
        )}
        {user && !token && <p className="text-gray-400">Escaneie o QR code mostrado no telão para fazer check-in.</p>}
        {user && (
          <div className="flex gap-2">
            <Link to="/figurinhas"><Button variant="secondary">Abrir pacotes</Button></Link>
            <Link to="/ao-vivo"><Button variant="ghost">Ao vivo</Button></Link>
          </div>
        )}
      </Card>
    </div>
  );
}
