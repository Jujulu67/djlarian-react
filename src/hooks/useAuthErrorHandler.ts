'use client';

import { useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { useCallback, useRef } from 'react';

/**
 * Hook pour gérer les erreurs d'authentification (401)
 * Détecte les erreurs 401, force un refresh de session et retry automatiquement
 */
export function useAuthErrorHandler() {
  const router = useRouter();
  const { data: session, update, status } = useSession();
  const isRefreshingRef = useRef(false);
  const pendingRetriesRef = useRef<Array<() => Promise<any>>>([]);

  /**
   * Force un refresh de la session
   */
  const refreshSession = useCallback(async (): Promise<boolean> => {
    if (isRefreshingRef.current) {
      // Attendre que le refresh en cours se termine
      return new Promise((resolve) => {
        const checkInterval = setInterval(() => {
          if (!isRefreshingRef.current) {
            clearInterval(checkInterval);
            resolve(true);
          }
        }, 100);
      });
    }

    isRefreshingRef.current = true;

    try {
      // Invalider le cache de session avant le refresh
      if (typeof window !== 'undefined') {
        const sessionCache = (window as any).sessionRequestCache;
        if (sessionCache) {
          (window as any).sessionRequestCache = null;
        }
      }

      // Forcer un refresh de la session via update()
      await update();

      // Attendre un peu pour que la session soit mise à jour
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Vérifier la session en faisant une requête à l'endpoint de session
      try {
        const sessionResponse = await fetch('/api/auth/session', {
          method: 'GET',
          credentials: 'include',
          cache: 'no-store',
        });

        if (sessionResponse.ok) {
          const sessionData = await sessionResponse.json();
          if (sessionData?.user?.id) {
            isRefreshingRef.current = false;
            return true;
          }
        }
      } catch (error) {
        console.debug('Erreur lors de la vérification de session:', error);
      }

      isRefreshingRef.current = false;
      return false;
    } catch (error) {
      console.error('Erreur lors du refresh de session:', error);
      isRefreshingRef.current = false;
      return false;
    }
  }, [update]);

  /**
   * Gère une erreur 401 en rafraîchissant la session et en retryant la requête
   */
  const handle401Error = useCallback(
    async <T>(originalRequest: () => Promise<T>, maxRetries: number = 1): Promise<T | null> => {
      // Si on a déjà essayé plusieurs fois, déconnecter l'utilisateur
      if (maxRetries <= 0) {
        console.warn("Session expirée après retries, déconnexion de l'utilisateur");
        signOut({ callbackUrl: '/' });
        return null;
      }

      // Rafraîchir la session
      const refreshed = await refreshSession();

      if (!refreshed) {
        // Si le refresh a échoué, déconnecter l'utilisateur
        console.warn("Impossible de rafraîchir la session, déconnexion de l'utilisateur");
        signOut({ callbackUrl: '/' });
        return null;
      }

      // Retry la requête originale
      try {
        return await originalRequest();
      } catch (error) {
        // Si ça échoue encore, retry une fois de moins
        return handle401Error(originalRequest, maxRetries - 1);
      }
    },
    [refreshSession, router]
  );

  /**
   * Vérifie si une réponse est une erreur 401
   */
  const is401Error = useCallback((response: Response): boolean => {
    return response.status === 401;
  }, []);

  /**
   * Wrapper pour fetch qui gère automatiquement les erreurs 401
   */
  const fetchWithAuth = useCallback(
    async (url: string | Request | URL, options?: RequestInit): Promise<Response> => {
      const makeRequest = async (): Promise<Response> => {
        const response = await fetch(url, options);

        if (is401Error(response)) {
          // Si c'est une erreur 401, rafraîchir et retry
          const retriedResponse = await handle401Error(() => fetch(url, options), 1);

          if (!retriedResponse) {
            // Si le retry a échoué, retourner la réponse 401 originale
            return response;
          }

          return retriedResponse;
        }

        return response;
      };

      return makeRequest();
    },
    [is401Error, handle401Error]
  );

  return {
    handle401Error,
    is401Error,
    refreshSession,
    fetchWithAuth,
    isRefreshing: isRefreshingRef.current,
  };
}
