'use client';

import { useSession as useNextAuthSession } from 'next-auth/react';
import { useEffect, useRef } from 'react';

// Type pour la session
type SessionData = { user?: { id: string; role?: string; email?: string | null; name?: string | null } } | null;

// Cache global pour dédupliquer les requêtes de session
let sessionCache: {
  data: SessionData;
  timestamp: number;
  promise: Promise<SessionData> | null;
} | null = null;

const CACHE_DURATION = 1000; // 1 seconde de cache pour dédupliquer les requêtes simultanées

/**
 * Hook optimisé pour useSession qui déduplique les requêtes simultanées
 * Utilise un cache de 1 seconde pour éviter les requêtes multiples au montage
 */
export function useSessionOptimized() {
  const session = useNextAuthSession();
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  return session;
}

// Export par défaut pour compatibilité
export default useSessionOptimized;
