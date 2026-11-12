import { useEffect, useRef, useState } from 'react';
import {
  collection,
  doc,
  onSnapshot,
  queryEqual,
  refEqual,
  type DocumentData,
  type DocumentReference,
  type FirestoreDataConverter,
  type Query,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { db } from './firebase';

const sharedConverter: FirestoreDataConverter<{ id: string }, DocumentData> = {
  toFirestore: (value) => {
    const { id: _id, ...rest } = value as { id: string };
    return rest as DocumentData;
  },
  fromFirestore: (snap: QueryDocumentSnapshot) => ({ ...snap.data(), id: snap.id }),
};

export function converter<T extends { id: string }>(): FirestoreDataConverter<T, DocumentData> {
  return sharedConverter as unknown as FirestoreDataConverter<T, DocumentData>;
}

export const col = <T extends { id: string }>(path: string) => collection(db, path).withConverter(converter<T>());
export const ref = <T extends { id: string }>(path: string) => doc(db, path).withConverter(converter<T>());

interface State<T> {
  data: T;
  loading: boolean;
  error: Error | null;
}

export function useCollection<T>(query: Query<T> | null): State<T[]> {
  const stable = useStable(query, (a, b) => queryEqual(a, b));
  const [state, setState] = useState<State<T[]>>({ data: [], loading: Boolean(query), error: null });
  useEffect(() => {
    if (!stable) {
      setState({ data: [], loading: false, error: null });
      return;
    }
    setState((s) => ({ ...s, loading: true }));
    return onSnapshot(
      stable,
      (snap) => setState({ data: snap.docs.map((d) => d.data()), loading: false, error: null }),
      (error) => {
        console.error(error);
        setState({ data: [], loading: false, error });
      },
    );
  }, [stable]);
  return state;
}

export function useDocument<T>(reference: DocumentReference<T> | null): State<T | null> {
  const stable = useStable(reference, (a, b) => refEqual(a, b));
  const [state, setState] = useState<State<T | null>>({ data: null, loading: Boolean(reference), error: null });
  useEffect(() => {
    if (!stable) {
      setState({ data: null, loading: false, error: null });
      return;
    }
    setState((s) => ({ ...s, loading: true }));
    return onSnapshot(
      stable,
      (snap) => setState({ data: snap.exists() ? snap.data() : null, loading: false, error: null }),
      (error) => {
        console.error(error);
        setState({ data: null, loading: false, error });
      },
    );
  }, [stable]);
  return state;
}

function useStable<T>(value: T | null, equal: (a: T, b: T) => boolean) {
  const holder = useRef<T | null>(value);
  if (value === null || holder.current === null ? value !== holder.current : !equal(holder.current, value)) {
    holder.current = value;
  }
  return holder.current;
}

export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}
