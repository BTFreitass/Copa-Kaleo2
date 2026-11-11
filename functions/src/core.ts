import { initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore, type DocumentSnapshot, type QuerySnapshot, type WriteBatch } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { getMessaging } from 'firebase-admin/messaging';
import { logger, setGlobalOptions } from 'firebase-functions/v2';
import { HttpsError, type CallableRequest } from 'firebase-functions/v2/https';
import { DEFAULT_KALEO_POINTS, FUNCTIONS_REGION, type ActivityType, type Tournament } from '@copa/shared';

setGlobalOptions({ region: FUNCTIONS_REGION, maxInstances: 10 });

initializeApp();

export const db = getFirestore();
export const auth = getAuth();
export { FieldValue, logger };

export const isEmulator = process.env.FUNCTIONS_EMULATOR === 'true';

export function withId<T>(snap: DocumentSnapshot): T {
  return { ...(snap.data() ?? {}), id: snap.id } as T;
}

export function listOf<T>(snap: QuerySnapshot): T[] {
  return snap.docs.map((d) => withId<T>(d));
}

export function requireAuth(request: CallableRequest) {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Faça login para continuar.');
  return request.auth;
}

export function requireAdmin(request: CallableRequest) {
  const user = requireAuth(request);
  if (user.token.admin !== true) throw new HttpsError('permission-denied', 'Apenas administradores.');
  return user;
}

export function requireMesario(request: CallableRequest) {
  const user = requireAuth(request);
  if (user.token.admin !== true && user.token.mesario !== true) throw new HttpsError('permission-denied', 'Apenas mesários.');
  return user;
}

export async function getTournament(id: string) {
  const snap = await db.doc(`tournaments/${id}`).get();
  if (!snap.exists) throw new HttpsError('not-found', 'Torneio não encontrado.');
  return withId<Tournament>(snap);
}

export async function commitInChunks(ops: ((batch: WriteBatch) => void)[], size = 400) {
  for (let i = 0; i < ops.length; i += size) {
    const batch = db.batch();
    ops.slice(i, i + size).forEach((op) => op(batch));
    await batch.commit();
  }
}

export async function recordActivity(uid: string, tournamentId: string, type: ActivityType, refId: string) {
  const id = `${type}_${refId}_${uid}`.replace(/[/\s]/g, '-');
  try {
    await db.doc(`activity/${id}`).create({ uid, tournamentId, type, refId, createdAt: Date.now() });
    return true;
  } catch (error) {
    if ((error as { code?: number }).code === 6) return false;
    throw error;
  }
}

export function kaleoPointsFor(tournament: Tournament, type: ActivityType) {
  return tournament.kaleoPointsRules?.[type] ?? DEFAULT_KALEO_POINTS[type];
}

export async function displayNameOf(uid: string) {
  const snap = await db.doc(`users/${uid}`).get();
  return (snap.get('displayName') as string | undefined) ?? 'Torcedor';
}

export async function ensureLeaderboardEntry(tournamentId: string, uid: string) {
  const ref = db.doc(`leaderboard/${tournamentId}_${uid}`);
  const snap = await ref.get();
  if (snap.exists) return ref;
  const user = await db.doc(`users/${uid}`).get();
  await ref.set(
    {
      tournamentId,
      uid,
      displayName: user.get('displayName') ?? 'Torcedor',
      photoURL: user.get('photoURL') ?? null,
      totalPoints: 0,
      exactScores: 0,
      predictionsCount: 0,
      rank: 0,
      bestRank: 0,
      leagueIds: [],
      updatedAt: Date.now(),
    },
    { merge: true },
  );
  return ref;
}

export async function notifyTopic(topic: string, title: string, body: string, link = '/') {
  if (isEmulator) {
    logger.info(`[push:${topic}] ${title} — ${body}`);
    return;
  }
  try {
    await getMessaging().send({ topic, notification: { title, body }, webpush: { fcmOptions: { link } } });
  } catch (error) {
    logger.warn('Falha ao enviar push', error);
  }
}

export function randomToken(length = 24) {
  const alphabet = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < length; i += 1) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}
