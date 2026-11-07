'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { secondsLeft } from '@/lib/polls/rules';

type PolledState<T> = {
  data: T | null;
  /** Message d'erreur et code HTTP du dernier échec (null si la dernière requête a réussi). */
  error: { message: string; status: number } | null;
  /** Écart horloge serveur - horloge locale, en ms (0 sans `serverNow`). */
  clockOffsetMs: number;
};

/**
 * Lit `url` puis la relit toutes les `interval` ms (null : pas de relecture ; une fonction
 * choisit l'intervalle selon les dernières données). La relecture
 * s'arrête quand l'onglet est masqué et reprend aussitôt à son retour.
 * Réponses attendues au format `{ data }` des routes API, erreurs au format `{ error }`.
 */
export function usePolledData<T>(
  url: string,
  interval: number | null | ((data: T | null) => number | null)
) {
  const [state, setState] = useState<PolledState<T>>({
    data: null,
    error: null,
    clockOffsetMs: 0,
  });
  const inFlight = useRef(false);

  const apply = useCallback((data: T) => {
    const serverNow = (data as { serverNow?: unknown } | null)?.serverNow;
    const offset = typeof serverNow === 'string' ? new Date(serverNow).getTime() - Date.now() : 0;
    setState({ data, error: null, clockOffsetMs: offset });
  }, []);

  const refresh = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      const response = await fetch(url, { cache: 'no-store' });
      const body = await response.json().catch(() => ({}));
      if (response.ok) {
        apply(body.data as T);
      } else {
        const message = typeof body.error === 'string' ? body.error : 'Erreur de chargement';
        setState((prev) => ({ ...prev, error: { message, status: response.status } }));
      }
    } catch {
      setState((prev) => ({ ...prev, error: { message: 'Connexion perdue', status: 0 } }));
    } finally {
      inFlight.current = false;
    }
  }, [url, apply]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const intervalMs = typeof interval === 'function' ? interval(state.data) : interval;

  useEffect(() => {
    if (intervalMs === null) return;
    const tick = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    const timer = setInterval(tick, intervalMs);
    document.addEventListener('visibilitychange', tick);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [intervalMs, refresh]);

  return { ...state, refresh, apply };
}

/** Secondes restantes avant `endsAt`, recalculées 4 fois par seconde. */
export function useCountdown(endsAt: string | null, clockOffsetMs: number): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!endsAt) return;
    const timer = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(timer);
  }, [endsAt]);

  return endsAt ? secondsLeft(endsAt, now + clockOffsetMs) : 0;
}
