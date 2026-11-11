import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { Button, Card, Field, Input, Spinner, useToast } from '@/shared/ui';
import { authErrorMessage, authService } from './authService';

export function MagicLinkPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [needsEmail, setNeedsEmail] = useState(false);
  const [email, setEmail] = useState('');
  const tried = useRef(false);

  const complete = async (typed?: string) => {
    try {
      await authService.completeMagicLink(window.location.href, typed);
      toast('Login confirmado!');
      navigate('/', { replace: true });
    } catch (error) {
      if (!typed && (error as Error).message.includes('Informe')) setNeedsEmail(true);
      else toast(authErrorMessage(error), 'error');
    }
  };

  useEffect(() => {
    if (tried.current) return;
    tried.current = true;
    if (!authService.isMagicLink(window.location.href)) {
      navigate('/', { replace: true });
      return;
    }
    complete();
  });

  return (
    <Card className="mx-auto mt-10 max-w-sm p-6">
      {needsEmail ? (
        <div className="flex flex-col gap-3">
          <Field label="Confirme seu e-mail">
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Button onClick={() => complete(email)}>Entrar</Button>
        </div>
      ) : (
        <div className="flex justify-center"><Spinner /></div>
      )}
    </Card>
  );
}
