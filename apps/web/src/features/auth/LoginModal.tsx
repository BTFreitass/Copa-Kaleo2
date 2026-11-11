import { useState, type FormEvent } from 'react';
import { Mail, Phone, UserRound, Wand2 } from 'lucide-react';
import type { ConfirmationResult } from 'firebase/auth';
import { Button, Field, Input, Modal, Tabs, useToast } from '@/shared/ui';
import { authErrorMessage, authService } from './authService';
import { useAuth } from './AuthProvider';

type Method = 'email' | 'link' | 'phone';

export function LoginModal() {
  const { loginOpen, closeLogin, user } = useAuth();
  const toast = useToast();
  const [method, setMethod] = useState<Method>('email');
  const [busy, setBusy] = useState<string | null>(null);

  const run = async (key: string, action: () => Promise<unknown>, success = 'Bem-vindo à Copa Kaleo!') => {
    setBusy(key);
    try {
      await action();
      toast(success);
      closeLogin();
    } catch (error) {
      toast(authErrorMessage(error), 'error');
    } finally {
      setBusy(null);
    }
  };

  const upgrading = user?.isAnonymous;

  return (
    <Modal open={loginOpen} onClose={closeLogin} title={upgrading ? 'Salvar sua conta' : 'Entrar na Copa Kaleo'}>
      {upgrading && (
        <p className="mb-4 rounded-xl bg-purple-500/10 p-3 text-sm text-purple-200">
          Você está como convidado. Escolha um método abaixo para guardar seus palpites, figurinhas e sua medalha.
        </p>
      )}
      <div className="grid grid-cols-2 gap-2">
        <Button variant="secondary" loading={busy === 'google'} onClick={() => run('google', authService.google)} icon={<GoogleIcon />}>
          Google
        </Button>
        <Button variant="secondary" loading={busy === 'facebook'} onClick={() => run('facebook', authService.facebook)} icon={<FacebookIcon />}>
          Facebook
        </Button>
      </div>

      <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-widest text-gray-600">
        <span className="h-px flex-1 bg-gray-800" />
        ou
        <span className="h-px flex-1 bg-gray-800" />
      </div>

      <Tabs<Method>
        value={method}
        onChange={setMethod}
        tabs={[
          { id: 'email', label: <span className="flex items-center gap-1.5"><Mail className="size-4" />E-mail</span> },
          { id: 'link', label: <span className="flex items-center gap-1.5"><Wand2 className="size-4" />Link</span> },
          { id: 'phone', label: <span className="flex items-center gap-1.5"><Phone className="size-4" />Celular</span> },
        ]}
      />
      <div className="mt-4">
        {method === 'email' && <EmailForm busy={busy} run={run} />}
        {method === 'link' && <MagicLinkForm busy={busy} run={run} />}
        {method === 'phone' && <PhoneForm busy={busy} run={run} />}
      </div>

      {!user && (
        <Button
          variant="ghost"
          className="mt-4 w-full"
          loading={busy === 'guest'}
          icon={<UserRound className="size-4" />}
          onClick={() => run('guest', authService.guest, 'Você entrou como convidado. Salve sua conta depois!')}
        >
          Continuar como convidado
        </Button>
      )}
    </Modal>
  );
}

type Run = (key: string, action: () => Promise<unknown>, success?: string) => Promise<void>;

function EmailForm({ busy, run }: { busy: string | null; run: Run }) {
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const toast = useToast();

  const submit = (e: FormEvent) => {
    e.preventDefault();
    run('email', () => (mode === 'in' ? authService.emailSignIn(email, password) : authService.emailSignUp(name, email, password)));
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      {mode === 'up' && (
        <Field label="Seu nome">
          <Input required value={name} onChange={(e) => setName(e.target.value)} maxLength={60} autoComplete="name" />
        </Field>
      )}
      <Field label="E-mail">
        <Input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
      </Field>
      <Field label="Senha">
        <Input required type="password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === 'in' ? 'current-password' : 'new-password'} />
      </Field>
      <Button type="submit" loading={busy === 'email'}>
        {mode === 'in' ? 'Entrar' : 'Criar conta'}
      </Button>
      <div className="flex justify-between text-xs">
        <button type="button" className="text-purple-300 hover:underline" onClick={() => setMode(mode === 'in' ? 'up' : 'in')}>
          {mode === 'in' ? 'Criar conta nova' : 'Já tenho conta'}
        </button>
        {mode === 'in' && (
          <button
            type="button"
            className="text-gray-400 hover:underline"
            onClick={async () => {
              if (!email) return toast('Digite seu e-mail primeiro.', 'info');
              try {
                await authService.resetPassword(email);
                toast('Enviamos um link para redefinir a senha.');
              } catch (error) {
                toast(authErrorMessage(error), 'error');
              }
            }}
          >
            Esqueci a senha
          </button>
        )}
      </div>
    </form>
  );
}

function MagicLinkForm({ busy, run }: { busy: string | null; run: Run }) {
  const [email, setEmail] = useState('');
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        run('link', () => authService.sendMagicLink(email), 'Link enviado! Abra seu e-mail neste aparelho.');
      }}
      className="flex flex-col gap-3"
    >
      <p className="text-sm text-gray-400">Sem senha: mandamos um link de acesso para o seu e-mail.</p>
      <Field label="E-mail">
        <Input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </Field>
      <Button type="submit" loading={busy === 'link'}>
        Enviar link mágico
      </Button>
    </form>
  );
}

function PhoneForm({ busy, run }: { busy: string | null; run: Run }) {
  const [phone, setPhone] = useState('+55 ');
  const [code, setCode] = useState('');
  const [confirmation, setConfirmation] = useState<ConfirmationResult | null>(null);
  const toast = useToast();
  const [sending, setSending] = useState(false);

  const send = async (e: FormEvent) => {
    e.preventDefault();
    setSending(true);
    try {
      setConfirmation(await authService.sendPhoneCode(phone.replace(/[^\d+]/g, ''), 'recaptcha-container'));
      toast('Código enviado por SMS.', 'info');
    } catch (error) {
      toast(authErrorMessage(error), 'error');
    } finally {
      setSending(false);
    }
  };

  return confirmation ? (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        run('phone', () => confirmation.confirm(code));
      }}
      className="flex flex-col gap-3"
    >
      <Field label="Código recebido">
        <Input required inputMode="numeric" value={code} onChange={(e) => setCode(e.target.value)} maxLength={6} />
      </Field>
      <Button type="submit" loading={busy === 'phone'}>
        Confirmar
      </Button>
    </form>
  ) : (
    <form onSubmit={send} className="flex flex-col gap-3">
      <Field label="Celular com DDD" hint="O envio de SMS exige o plano Blaze do Firebase.">
        <Input required type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" />
      </Field>
      <div id="recaptcha-container" />
      <Button type="submit" loading={sending}>
        Receber código
      </Button>
    </form>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.9-5.5 3.9-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.7 3.3 14.6 2.4 12 2.4 6.7 2.4 2.4 6.7 2.4 12s4.3 9.6 9.6 9.6c5.5 0 9.2-3.9 9.2-9.4 0-.6-.1-1.1-.2-1.6H12z" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
      <path fill="#1877F2" d="M24 12a12 12 0 1 0-13.9 11.9v-8.4H7.1V12h3V9.4c0-3 1.8-4.7 4.5-4.7 1.3 0 2.7.2 2.7.2v2.9h-1.5c-1.5 0-2 .9-2 1.9V12h3.4l-.5 3.5h-2.9v8.4A12 12 0 0 0 24 12z" />
    </svg>
  );
}
