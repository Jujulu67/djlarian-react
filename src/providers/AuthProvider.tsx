'use client';

import { SessionProvider } from 'next-auth/react';
import { useEffect } from 'react';

import ErrorBoundary from '@/components/ErrorBoundary';

// Cache global pour dédupliquer les requêtes de session
let sessionRequestCache: {
  promise: Promise<Response> | null;
  timestamp: number;
  response: Response | null;
  pendingRequests: number; // Compteur de requêtes en attente
} | null = null;

const CACHE_DURATION = 5000; // 5 secondes de cache pour dédupliquer les requêtes simultanées
const DEDUP_WINDOW = 500; // Fenêtre de 500ms pour considérer les requêtes comme simultanées (augmenté pour mieux dédupliquer)
const ENABLE_LOGS = false; // Désactiver les logs en production

// Intercepter fetch AVANT que les composants ne se montent
if (typeof window !== 'undefined') {
  const originalFetch = window.fetch;

  window.fetch = async (...args): Promise<Response> => {
    // Safely extract URL from fetch arguments
    let url: string | undefined;
    if (typeof args[0] === 'string') {
      url = args[0];
    } else if (args[0] instanceof Request) {
      url = args[0].url;
    } else if (args[0] && typeof args[0] === 'object' && 'url' in args[0]) {
      url = (args[0] as { url: string }).url;
    }

    // Si c'est une requête vers /api/auth/session
    if (url && typeof url === 'string' && url.includes('/api/auth/session')) {
      const now = Date.now();

      // Logs désactivés pour réduire le bruit dans la console

      // Vérifier si on a une réponse en cache valide
      if (sessionRequestCache) {
        const cacheAge = now - sessionRequestCache.timestamp;

        // Si le cache est récent et qu'on a une réponse, la réutiliser
        if (cacheAge < CACHE_DURATION && sessionRequestCache.response) {
          // Cloner la réponse pour qu'elle puisse être utilisée plusieurs fois
          return sessionRequestCache.response.clone();
        }

        // Si on a une requête en cours (même si elle vient de commencer), réutiliser la promesse
        // Augmenté la fenêtre à 500ms pour mieux dédupliquer les requêtes quasi-simultanées
        if (sessionRequestCache.promise && cacheAge < DEDUP_WINDOW) {
          sessionRequestCache.pendingRequests++;
          return sessionRequestCache.promise.then((response) => {
            // Décrémenter le compteur quand la réponse arrive
            if (sessionRequestCache) {
              sessionRequestCache.pendingRequests = Math.max(
                0,
                sessionRequestCache.pendingRequests - 1
              );
            }
            return response.clone();
          });
        }
      }

      // Créer une nouvelle requête et la mettre en cache
      const promise = originalFetch(...args)
        .then((response) => {
          // Mettre en cache la réponse
          if (sessionRequestCache) {
            sessionRequestCache.response = response.clone();
            sessionRequestCache.pendingRequests = Math.max(
              0,
              sessionRequestCache.pendingRequests - 1
            );
          }
          return response;
        })
        .catch((error) => {
          if (sessionRequestCache) {
            sessionRequestCache.pendingRequests = Math.max(
              0,
              sessionRequestCache.pendingRequests - 1
            );
          }
          throw error;
        });

      sessionRequestCache = {
        promise,
        timestamp: now,
        response: null,
        pendingRequests: 0,
      };

      // Nettoyer le cache après la durée de cache
      setTimeout(() => {
        if (sessionRequestCache?.promise === promise) {
          sessionRequestCache = null;
        }
      }, CACHE_DURATION);

      return promise;
    }

    // Pour les autres requêtes, utiliser fetch normal
    // Intercepter les erreurs 404 sur les images -ori.* pour éviter le bruit dans la console
    // Si c'est une requête vers une image originale qui pourrait ne pas exister
    if (url && typeof url === 'string' && url.includes('/uploads/') && url.includes('-ori.')) {
      return originalFetch(...args)
        .then((response) => {
          // Si c'est une 404, retourner la réponse normalement (le code gère déjà les 404)
          // Mais on ne veut pas que le navigateur l'affiche dans la console
          return response;
        })
        .catch((error) => {
          // Si c'est une erreur réseau, créer une réponse 404 factice
          // Le code appelant vérifie res.ok, donc ça fonctionnera
          return new Response(null, { status: 404, statusText: 'Not Found' });
        });
    }

    return originalFetch(...args);
  };

  // Interception activée silencieusement
}

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      <SessionProvider
        refetchInterval={5 * 60} // Refetch toutes les 5 minutes au lieu de toutes les 0 secondes (désactivé)
        refetchOnWindowFocus={false} // Ne pas refetch quand la fenêtre reprend le focus
        basePath="/api/auth" // Spécifier le basePath pour éviter les requêtes multiples
        refetchWhenOffline={false} // Ne pas refetch quand offline
      >
        {children}
      </SessionProvider>
    </ErrorBoundary>
  );
}
