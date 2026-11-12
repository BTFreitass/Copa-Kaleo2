import { initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth } from 'firebase/auth';
import {
  connectFirestoreEmulator,
  initializeFirestore,
  memoryLocalCache,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';
import { connectDatabaseEmulator, getDatabase } from 'firebase/database';
import { connectStorageEmulator, getStorage } from 'firebase/storage';
import { connectFunctionsEmulator, getFunctions, httpsCallable } from 'firebase/functions';
import { FUNCTIONS_REGION } from '@copa/shared';

export const useEmulators = import.meta.env.VITE_USE_EMULATORS === 'true';

const productionConfig = {
  apiKey: 'AIzaSyA5EigXpyiczdV4k6BSNSxrxtxyYT_FjaA',
  authDomain: 'copakaleo.firebaseapp.com',
  databaseURL: 'https://copakaleo-default-rtdb.firebaseio.com',
  projectId: 'copakaleo',
  storageBucket: 'copakaleo.firebasestorage.app',
  messagingSenderId: '966505093433',
  appId: '1:966505093433:web:c15a187aca147de887f0e8',
};

const emulatorConfig = {
  ...productionConfig,
  apiKey: 'demo-key',
  projectId: 'demo-copakaleo',
  authDomain: 'demo-copakaleo.firebaseapp.com',
  databaseURL: 'https://demo-copakaleo-default-rtdb.firebaseio.com',
  storageBucket: 'demo-copakaleo.appspot.com',
};

export const app = initializeApp(useEmulators ? emulatorConfig : productionConfig);
export const auth = getAuth(app);
export const db = initializeFirestore(app, {
  localCache: useEmulators ? memoryLocalCache() : persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  ignoreUndefinedProperties: true,
});
export const rtdb = getDatabase(app);
export const storage = getStorage(app);
export const functions = getFunctions(app, FUNCTIONS_REGION);

if (useEmulators) {
  const host = window.location.hostname;
  connectAuthEmulator(auth, `http://${host}:9099`, { disableWarnings: true });
  connectFirestoreEmulator(db, host, 8080);
  connectDatabaseEmulator(rtdb, host, 9000);
  connectStorageEmulator(storage, host, 9199);
  connectFunctionsEmulator(functions, host, 5001);
  auth.settings.appVerificationDisabledForTesting = true;
}

export function callable<Req, Res>(name: string) {
  const fn = httpsCallable<Req, Res>(functions, name);
  return async (data: Req) => (await fn(data)).data;
}
