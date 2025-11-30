/**
 * Utilitaire fetch qui gère automatiquement les erreurs 401
 * En cas d'erreur 401, force un refresh de session et retry la requête
 * Si le refresh échoue, déconnecte l'utilisateur
 */

import { signOut } from 'next-auth/react';

// Cache pour éviter les refresh multiples simultanés
let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

/**
 * Force un refresh de la session en appelant l'endpoint de session
 */
async function refreshSession(): Promise<boolean> {
  // Si un refresh est déjà en cours, attendre qu'il se termine
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      // Invalider le cache de session
      if (typeof window !== 'undefined') {
        const windowWithCache = window as typeof window & {
          sessionRequestCache?: unknown;
        };
        if (windowWithCache.sessionRequestCache) {
          windowWithCache.sessionRequestCache = null;
        }
      }

      // Appeler l'endpoint de session pour forcer un refresh
      const response = await fetch('/api/auth/session', {
        method: 'GET',
        credentials: 'include',
        cache: 'no-store',
      });

      const refreshed = response.ok;
      isRefreshing = false;
      refreshPromise = null;
      return refreshed;
    } catch (error) {
      console.error('Erreur lors du refresh de session:', error);
      isRefreshing = false;
      refreshPromise = null;
      return false;
    }
  })();

  return refreshPromise;
}

/**
 * Wrapper pour fetch qui gère automatiquement les erreurs 401
 *
 * @param url - URL ou Request à fetch
 * @param options - Options de fetch
 * @param maxRetries - Nombre maximum de retries (défaut: 1)
 * @returns Promise<Response>
 */
export async function fetchWithAuth(
  url: string | Request | URL,
  options?: RequestInit,
  maxRetries: number = 1
): Promise<Response> {
  // Faire la requête initiale
  let response = await fetch(url, {
    ...options,
    credentials: 'include', // S'assurer que les cookies sont envoyés
  });

  // Si c'est une erreur 401 et qu'on a encore des retries
  if (response.status === 401 && maxRetries > 0) {
    // Rafraîchir la session
    const refreshed = await refreshSession();

    if (refreshed) {
      // Retry la requête après refresh
      response = await fetch(url, {
        ...options,
        credentials: 'include',
      });

      // Si ça échoue encore et qu'on a encore des retries, retry une fois de plus
      if (response.status === 401 && maxRetries > 1) {
        // Attendre un peu avant de retry
        await new Promise((resolve) => setTimeout(resolve, 500));
        response = await fetch(url, {
          ...options,
          credentials: 'include',
        });
      }
    } else {
      // Si le refresh a échoué, la session est vraiment expirée
      // Déconnecter l'utilisateur pour éviter des 401 partout
      if (typeof window !== 'undefined') {
        console.warn("Session expirée, déconnexion de l'utilisateur");
        signOut({ callbackUrl: '/' });
      }
    }
  } else if (response.status === 401 && maxRetries === 0) {
    // Si on n'a plus de retries et qu'on a toujours une 401, déconnecter
    if (typeof window !== 'undefined') {
      console.warn("Session expirée après retries, déconnexion de l'utilisateur");
      signOut({ callbackUrl: '/' });
    }
  }

  return response;
}

/**
 * Vérifie si une réponse est une erreur d'authentification
 */
export function isAuthError(response: Response): boolean {
  return response.status === 401 || response.status === 403;
}

/**
 * Extrait le message d'erreur d'une réponse
 */
export async function getErrorMessage(response: Response): Promise<string> {
  try {
    const data = await response.json();
    return data.error || data.message || "Erreur d'authentification";
  } catch {
    return response.statusText || "Erreur d'authentification";
  }
}
