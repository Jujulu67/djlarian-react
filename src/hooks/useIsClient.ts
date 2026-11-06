import { useSyncExternalStore } from 'react';

const subscribe = () => () => {};

/**
 * false pendant le rendu serveur et l'hydratation, true ensuite.
 * Remplace le motif `useEffect(() => setMounted(true), [])` sans rendu en cascade.
 */
export function useIsClient(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );
}
