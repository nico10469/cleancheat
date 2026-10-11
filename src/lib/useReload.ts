import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

/** Runs `load` whenever the screen gains focus and on demand, so lists stay fresh after edits elsewhere. */
export function useReload<T>(load: () => Promise<T>, deps: unknown[]): { data: T | undefined; reload: () => void } {
  const [data, setData] = useState<T>();
  const run = useCallback(() => {
    let cancelled = false;
    load().then((d) => {
      if (!cancelled) setData(d);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useFocusEffect(run);
  return { data, reload: run };
}
