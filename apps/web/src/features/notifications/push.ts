import { getMessaging, getToken, isSupported } from 'firebase/messaging';
import { app, useEmulators } from '@/shared/lib/firebase';
import { api } from '@/shared/lib/api';

export async function enablePush(favoriteTeamId: string | null) {
  if (useEmulators) throw new Error('Notificações push só funcionam no site publicado (não nos emuladores).');
  if (!(await isSupported())) throw new Error('Este navegador não suporta notificações.');
  const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY as string | undefined;
  if (!vapidKey) throw new Error('Chave VAPID não configurada.');
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('Permissão de notificação negada.');
  const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
  const token = await getToken(getMessaging(app), { vapidKey, serviceWorkerRegistration: registration });
  await api.registerPushToken({ token, teamId: favoriteTeamId });
}
