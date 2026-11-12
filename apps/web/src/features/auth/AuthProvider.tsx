import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { onIdTokenChanged, signOut, type User } from 'firebase/auth';
import { getDoc, setDoc } from 'firebase/firestore';
import type { UserProfile } from '@copa/shared';
import { auth } from '@/shared/lib/firebase';
import { refs } from '@/shared/lib/collections';
import { useDocument } from '@/shared/lib/data';

interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  isAdmin: boolean;
  isMesario: boolean;
  loading: boolean;
  loginOpen: boolean;
  openLogin: () => void;
  closeLogin: () => void;
}

const DEAD_SESSION = new Set(['auth/invalid-refresh-token', 'auth/user-token-expired', 'auth/user-not-found', 'auth/user-disabled', 'auth/invalid-user-token']);

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [claims, setClaims] = useState<{ admin: boolean; mesario: boolean }>({ admin: false, mesario: false });
  const [loading, setLoading] = useState(true);
  const [loginOpen, setLoginOpen] = useState(false);
  const { data: profile, loading: profileLoading } = useDocument(user ? refs.user(user.uid) : null);

  useEffect(() => {
    if (user && !loading && !profileLoading && !profile) ensureProfile(user).catch((error) => console.error(error));
  }, [user, loading, profileLoading, profile]);

  useEffect(
    () =>
      onIdTokenChanged(auth, async (next) => {
        setUser(next);
        if (!next) {
          setClaims({ admin: false, mesario: false });
          setLoading(false);
          return;
        }
        try {
          const token = await next.getIdTokenResult();
          setClaims({ admin: token.claims.admin === true, mesario: token.claims.mesario === true || token.claims.admin === true });
        } catch (error) {
          console.error(error);
          setClaims({ admin: false, mesario: false });
          if (DEAD_SESSION.has((error as { code?: string }).code ?? '')) {
            await signOut(auth);
            return;
          }
        } finally {
          setLoading(false);
        }
        ensureProfile(next).catch((error) => console.error(error));
      }),
    [],
  );

  const value = useMemo<AuthState>(
    () => ({
      user,
      profile,
      isAdmin: claims.admin,
      isMesario: claims.mesario,
      loading,
      loginOpen,
      openLogin: () => setLoginOpen(true),
      closeLogin: () => setLoginOpen(false),
    }),
    [user, profile, claims, loading, loginOpen],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

async function ensureProfile(user: User) {
  const reference = refs.user(user.uid);
  const snap = await getDoc(reference);
  const fallbackName = user.displayName || user.email?.split('@')[0] || (user.phoneNumber ? `Torcedor ${user.phoneNumber.slice(-4)}` : 'Torcedor convidado');
  if (!snap.exists()) {
    await setDoc(reference, {
      id: user.uid,
      displayName: fallbackName.slice(0, 60),
      photoURL: user.photoURL ?? null,
      isGuest: user.isAnonymous,
      createdAt: Date.now(),
    });
  } else if (snap.data().isGuest && !user.isAnonymous) {
    await setDoc(reference, { ...snap.data(), isGuest: false, displayName: user.displayName || snap.data().displayName }, { merge: true });
  }
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth fora do AuthProvider');
  return ctx;
}
