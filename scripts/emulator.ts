process.env.FIRESTORE_EMULATOR_HOST ??= '127.0.0.1:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST ??= '127.0.0.1:9099';
process.env.FIREBASE_DATABASE_EMULATOR_HOST ??= '127.0.0.1:9000';
process.env.FIREBASE_STORAGE_EMULATOR_HOST ??= '127.0.0.1:9199';
process.env.GCLOUD_PROJECT ??= 'demo-copakaleo';

import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { FUNCTIONS_REGION } from '@copa/shared';

export const PROJECT = 'demo-copakaleo';
initializeApp({ projectId: PROJECT });
export const db = getFirestore();
export const auth = getAuth();

export const PASSWORD = 'kaleo123';
export const TOURNAMENT_ID = '2027';

export async function idToken(email: string) {
  const res = await fetch(`http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=demo-key`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: PASSWORD, returnSecureToken: true }),
  });
  const body = (await res.json()) as { idToken?: string; error?: unknown };
  if (!body.idToken) throw new Error(`Login falhou para ${email}: ${JSON.stringify(body.error)}`);
  return body.idToken;
}

export async function call<T>(name: string, data: unknown, token: string): Promise<T> {
  const res = await fetch(`http://127.0.0.1:5001/${PROJECT}/${FUNCTIONS_REGION}/${name}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ data }),
  });
  const body = (await res.json()) as { result?: T; error?: { message: string } };
  if (body.error) throw new Error(`${name}: ${body.error.message}`);
  return body.result as T;
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function waitFor(label: string, check: () => Promise<boolean>, timeoutMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await check()) return;
    await sleep(400);
  }
  throw new Error(`Tempo esgotado esperando: ${label}`);
}

export function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}
