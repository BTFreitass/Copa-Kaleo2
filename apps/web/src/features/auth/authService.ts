import {
  EmailAuthProvider,
  FacebookAuthProvider,
  GoogleAuthProvider,
  RecaptchaVerifier,
  createUserWithEmailAndPassword,
  isSignInWithEmailLink,
  linkWithCredential,
  linkWithPhoneNumber,
  linkWithPopup,
  sendPasswordResetEmail,
  sendSignInLinkToEmail,
  signInAnonymously,
  signInWithEmailAndPassword,
  signInWithEmailLink,
  signInWithPhoneNumber,
  signInWithPopup,
  signOut,
  updateProfile,
  type AuthProvider,
  type ConfirmationResult,
} from 'firebase/auth';
import { auth } from '@/shared/lib/firebase';

const EMAIL_KEY = 'copa:emailForSignIn';

const guest = () => (auth.currentUser?.isAnonymous ? auth.currentUser : null);

async function withProvider(provider: AuthProvider) {
  const current = guest();
  if (current) {
    try {
      return await linkWithPopup(current, provider);
    } catch (error) {
      if ((error as { code?: string }).code !== 'auth/credential-already-in-use') throw error;
    }
  }
  return signInWithPopup(auth, provider);
}

export const authService = {
  google: () => withProvider(new GoogleAuthProvider()),
  facebook: () => withProvider(new FacebookAuthProvider()),
  guest: () => signInAnonymously(auth),

  async emailSignIn(email: string, password: string) {
    return signInWithEmailAndPassword(auth, email, password);
  },

  async emailSignUp(name: string, email: string, password: string) {
    const current = guest();
    const result = current
      ? await linkWithCredential(current, EmailAuthProvider.credential(email, password))
      : await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(result.user, { displayName: name });
    return result;
  },

  resetPassword: (email: string) => sendPasswordResetEmail(auth, email),

  async sendMagicLink(email: string) {
    await sendSignInLinkToEmail(auth, email, { url: `${window.location.origin}/entrar/link`, handleCodeInApp: true });
    window.localStorage.setItem(EMAIL_KEY, email);
  },

  isMagicLink: (url: string) => isSignInWithEmailLink(auth, url),

  async completeMagicLink(url: string, typedEmail?: string) {
    const email = typedEmail || window.localStorage.getItem(EMAIL_KEY);
    if (!email) throw new Error('Informe o e-mail usado para pedir o link.');
    const current = guest();
    const result = current
      ? await linkWithCredential(current, EmailAuthProvider.credentialWithLink(email, url))
      : await signInWithEmailLink(auth, email, url);
    window.localStorage.removeItem(EMAIL_KEY);
    return result;
  },

  async sendPhoneCode(phone: string, containerId: string): Promise<ConfirmationResult> {
    const verifier = new RecaptchaVerifier(auth, containerId, { size: 'invisible' });
    const current = guest();
    return current ? linkWithPhoneNumber(current, phone, verifier) : signInWithPhoneNumber(auth, phone, verifier);
  },

  signOut: () => signOut(auth),
};

export function authErrorMessage(error: unknown) {
  const code = (error as { code?: string }).code ?? '';
  const messages: Record<string, string> = {
    'auth/invalid-credential': 'E-mail ou senha incorretos.',
    'auth/wrong-password': 'E-mail ou senha incorretos.',
    'auth/user-not-found': 'Não existe conta com esse e-mail.',
    'auth/email-already-in-use': 'Esse e-mail já tem conta. Use "Entrar".',
    'auth/weak-password': 'A senha precisa ter pelo menos 6 caracteres.',
    'auth/invalid-email': 'E-mail inválido.',
    'auth/popup-closed-by-user': 'Login cancelado.',
    'auth/invalid-phone-number': 'Telefone inválido. Use o formato +55 11 99999-9999.',
    'auth/invalid-verification-code': 'Código incorreto.',
    'auth/too-many-requests': 'Muitas tentativas. Aguarde um pouco.',
    'auth/operation-not-allowed': 'Esse método de login ainda não foi ativado no Firebase.',
  };
  return messages[code] ?? 'Não foi possível entrar. Tente outro método.';
}
