import { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { decodeProgress, emptyProgress } from './core/session';
const KEY = 'doodle-heroes:native:v1';

export default function useProgress() {
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState(null);
  const [saveError, setSaveError] = useState(null);
  const current = useRef(null);
  const writes = useRef(Promise.resolve());
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    AsyncStorage.getItem(KEY).then(raw => {
      const next = decodeProgress(raw);
      if (alive.current) { current.current = next; setProgress(next); }
    }).catch(() => { if (alive.current) setError('Your saved progress could not be opened. Retry before starting a new save.'); });
    return () => { alive.current = false; };
  }, []);
  const persist = useCallback(next => {
    writes.current = writes.current.catch(() => {}).then(() => AsyncStorage.setItem(KEY, JSON.stringify(next)));
    writes.current.then(() => { if (alive.current) setSaveError(null); }).catch(() => {
      if (alive.current) setSaveError('Progress is in memory, but could not be saved to this device.');
    });
  }, []);
  const update = useCallback(recipe => {
    if (!current.current) return;
    const next = recipe(current.current);
    if (next === current.current) return;
    current.current = next; setProgress(next); persist(next);
  }, [persist]);
  const retry = useCallback(async () => {
    try {
      const next = decodeProgress(await AsyncStorage.getItem(KEY));
      current.current = next; setProgress(next); setError(null);
    } catch { setError('The save is still unavailable. You can retry or explicitly reset it.'); }
  }, []);
  const reset = useCallback(async () => {
    // Queue behind pending snapshots so an older write cannot restore deleted data.
    const next = emptyProgress();
    current.current = null; setProgress(null); setError(null);
    writes.current = writes.current.catch(() => {}).then(() => AsyncStorage.setItem(KEY, JSON.stringify(next)));
    try { await writes.current; current.current = next; setProgress(next); setError(null); setSaveError(null); }
    catch { setError('The device could not reset the save. Please try again.'); }
  }, []);
  return { progress, update, error, saveError, retry, reset, retrySave: () => current.current && persist(current.current) };
}
