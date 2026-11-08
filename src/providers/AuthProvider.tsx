'use client';

import { SessionProvider } from 'next-auth/react';
import { Session } from 'next-auth';

import ErrorBoundary from '@/components/ErrorBoundary';
import { shouldShowIngestLocalhostWarning } from '@/lib/utils/warning-flags';
import { logger } from '@/lib/logger';

// Cache global pour dédupliquer les requêtes de session
let sessionRequestCache: {
  promise: Promise<Response> | null;
  timestamp: number;
  response: Response | null;
  pendingRequests: number; // Compteur de requêtes en attente
} | null = null;

const CACHE_DURATION = 5000; // 5 secondes de cache pour dédupliquer les requêtes simultanées
const DEDUP_WINDOW = 500; // Fenêtre de 500ms pour considérer les requêtes comme simultanées (augmenté pour mieux dédupliquer)

type FetchArgs = Parameters<typeof window.fetch>;

// Safely extract URL from fetch arguments
function extractUrl(args: FetchArgs): string | undefined {
  if (typeof args[0] === 'string') {
    return args[0];
  }
  if (args[0] instanceof Request) {
    return args[0].url;
  }
  if (args[0] && typeof args[0] === 'object' && 'url' in args[0]) {
    return (args[0] as { url: string }).url;
  }
  return undefined;
}

// Réponse JSON de secours : aucun utilisateur connecté
function createAnonymousSessionResponse(): Response {
  return new Response(JSON.stringify({ user: null, expires: null }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

// Décrémente le compteur de requêtes en attente (sans descendre sous zéro)
function decrementPendingRequests(): void {
  if (sessionRequestCache) {
    sessionRequestCache.pendingRequests = Math.max(0, sessionRequestCache.pendingRequests - 1);
  }
}

// Requête vers /api/auth/session : cache, dédoublonnage et repli JSON
function handleSessionRequest(
  args: FetchArgs,
  originalFetch: typeof window.fetch
): Promise<Response> {
  const now = Date.now();

  // Logs désactivés pour réduire le bruit dans la console

  // Vérifier si on a une réponse en cache valide
  if (sessionRequestCache) {
    const cacheAge = now - sessionRequestCache.timestamp;

    // Si le cache est récent et qu'on a une réponse, la réutiliser
    if (cacheAge < CACHE_DURATION && sessionRequestCache.response) {
      // Cloner la réponse pour qu'elle puisse être utilisée plusieurs fois
      return Promise.resolve(sessionRequestCache.response.clone());
    }

    // Si on a une requête en cours (même si elle vient de commencer), réutiliser la promesse
    // Augmenté la fenêtre à 500ms pour mieux dédupliquer les requêtes quasi-simultanées
    if (sessionRequestCache.promise && cacheAge < DEDUP_WINDOW) {
      sessionRequestCache.pendingRequests++;
      return sessionRequestCache.promise.then((response) => {
        // Décrémenter le compteur quand la réponse arrive
        decrementPendingRequests();
        return response.clone();
      });
    }
  }

  // Créer une nouvelle requête et la mettre en cache
  const promise = originalFetch(...args)
    .then((response) => {
      // Vérifier si la réponse est du HTML au lieu de JSON (erreur NextAuth)
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('text/html')) {
        // Si c'est du HTML, NextAuth a probablement redirigé vers la page de sign-in
        // Créer une réponse JSON valide avec { user: null } pour éviter l'erreur
        const jsonResponse = createAnonymousSessionResponse();
        // Mettre en cache la réponse JSON
        if (sessionRequestCache) {
          sessionRequestCache.response = jsonResponse.clone();
          decrementPendingRequests();
        }
        return jsonResponse;
      }

      // Mettre en cache la réponse normale
      if (sessionRequestCache) {
        sessionRequestCache.response = response.clone();
        decrementPendingRequests();
      }
      return response;
    })
    .catch(() => {
      decrementPendingRequests();
      // En cas d'erreur, retourner une réponse JSON valide avec { user: null }
      return createAnonymousSessionResponse();
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

// Autres requêtes /api/ : sur 401, invalider le cache de session et forcer un refresh
function handleApiRequest(args: FetchArgs, originalFetch: typeof window.fetch): Promise<Response> {
  return originalFetch(...args)
    .then(async (response) => {
      // Si c'est une erreur 401, invalider le cache de session
      if (response.status === 401) {
        // Invalider le cache de session pour forcer un refresh
        if (sessionRequestCache) {
          sessionRequestCache = null;
        }

        // Forcer un refresh de session en appelant l'endpoint
        try {
          await originalFetch('/api/auth/session', {
            method: 'GET',
            credentials: 'include',
            cache: 'no-store',
          });
        } catch {
          // Ignorer les erreurs de refresh silencieusement
        }
      }
      return response;
    })
    .catch((error) => {
      throw error;
    });
}

// Images originales (-ori.) : une erreur réseau devient une 404 factice
function handleOriginalImageRequest(
  args: FetchArgs,
  originalFetch: typeof window.fetch
): Promise<Response> {
  return originalFetch(...args)
    .then((response) => {
      // Si c'est une 404, retourner la réponse normalement (le code gère déjà les 404)
      return response;
    })
    .catch(() => {
      // Si c'est une erreur réseau, créer une réponse 404 factice
      // Le code appelant vérifie res.ok, donc ça fonctionnera
      return new Response(null, { status: 404, statusText: 'Not Found' });
    });
}

// Télémétrie /ingest en localhost : factice en dev, avertissement en production
function handleIngestRequest(
  args: FetchArgs,
  originalFetch: typeof window.fetch
): Promise<Response> {
  // Guard DEV-ONLY: ne s'applique qu'en développement
  // En développement uniquement: intercepter et retourner une réponse factice
  if (process.env.NODE_ENV === 'development') {
    // Retourner une promesse résolue avec une réponse factice pour éviter les erreurs
    // Pas d'appel réseau, pas de console.error
    return Promise.resolve(
      new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );
  }

  // En production: détecter la mauvaise config et logger une alerte (une seule fois)
  // Ne pas masquer l'erreur, laisser l'appel passer normalement
  if (shouldShowIngestLocalhostWarning()) {
    logger.warn('[AuthProvider] Ingest endpoint is localhost in production. Check configuration.');
  }
  // Laisser l'appel passer normalement (pas de catch silencieux)
  return originalFetch(...args);
}

// Intercepter fetch AVANT que les composants ne se montent
if (typeof window !== 'undefined') {
  const originalFetch = window.fetch;

  window.fetch = async (...args): Promise<Response> => {
    const url = extractUrl(args);

    // Si c'est une requête vers /api/auth/session
    if (url?.includes('/api/auth/session')) {
      return handleSessionRequest(args, originalFetch);
    }

    // Intercepter les erreurs 401 sur toutes les requêtes API (hors /api/auth/session)
    if (url?.includes('/api/')) {
      return handleApiRequest(args, originalFetch);
    }

    // Intercepter les erreurs 404 sur les images -ori.* pour éviter le bruit dans la console
    if (url && url.includes('/uploads/') && url.includes('-ori.')) {
      return handleOriginalImageRequest(args, originalFetch);
    }

    // Intercepter les appels de télémétrie /ingest pour éviter ERR_CONNECTION_REFUSED en dev
    const isIngestCall = url?.includes('/ingest/');
    const isLocalhost = url && (url.includes('127.0.0.1') || url.includes('localhost'));

    if (isIngestCall && isLocalhost) {
      return handleIngestRequest(args, originalFetch);
    }

    return originalFetch(...args);
  };

  // Interception activée silencieusement
}

interface AuthProviderProps {
  children: React.ReactNode;
  session?: Session | null; // Session serveur passée depuis le layout pour éviter le délai initial
}

export default function AuthProvider({ children, session }: Readonly<AuthProviderProps>) {
  return (
    <ErrorBoundary>
      <SessionProvider
        session={session} // Utiliser la session serveur si disponible pour éviter le délai initial
        refetchInterval={2 * 60} // Refetch toutes les 2 minutes pour maintenir la session à jour
        refetchOnWindowFocus={true} // Refetch quand la fenêtre reprend le focus pour synchroniser
        basePath="/api/auth" // Spécifier le basePath pour éviter les requêtes multiples
        refetchWhenOffline={false} // Ne pas refetch quand offline
      >
        {children}
      </SessionProvider>
    </ErrorBoundary>
  );
}
