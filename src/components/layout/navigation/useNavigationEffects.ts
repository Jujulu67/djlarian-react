import { useEffect, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';

import { logger } from '@/lib/logger';
import { fetchWithAuth } from '@/lib/api/fetchWithAuth';

/** Vérifie les notifications en arrière-plan une fois l'utilisateur connecté. */
export function useNotificationCheck(status: string, userId: string | undefined) {
  useEffect(() => {
    if (status === 'authenticated' && userId) {
      // Vérifier les notifications en arrière-plan (optimisé)
      // Utiliser un timeout pour éviter de bloquer le rendu initial
      const timeoutId = setTimeout(() => {
        fetchWithAuth('/api/notifications/check-all').catch((error) => {
          // Ignorer les erreurs silencieusement (peuvent être causées par des extensions)
          if (error.name !== 'AbortError') {
            // Erreur silencieuse - pas besoin de logger
          }
        });
      }, 1000); // Attendre 1 seconde après le chargement

      return () => clearTimeout(timeoutId);
    }
  }, [status, userId]);
}

/** Journalise les erreurs globales de la navigation. */
export function useRouteErrorLogging(pathname: string) {
  useEffect(() => {
    const errorHandler = (event: ErrorEvent) => {
      logger.error('Navigation error caught:', {
        message: event.message,
        error: event.error,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        pathname: pathname,
      });
    };

    const unhandledRejectionHandler = (event: PromiseRejectionEvent) => {
      logger.error('Navigation unhandled promise rejection:', {
        reason: event.reason,
        pathname: pathname,
      });
    };

    window.addEventListener('error', errorHandler);
    window.addEventListener('unhandledrejection', unhandledRejectionHandler);

    return () => {
      window.removeEventListener('error', errorHandler);
      window.removeEventListener('unhandledrejection', unhandledRejectionHandler);
    };
  }, [pathname]);
}

/** Passe `isScrolled` à true quand la page est scrollée (et marque le composant monté). */
export function useHeaderScroll(setMounted: Dispatch<SetStateAction<boolean>>) {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    try {
      setMounted(true);
      let timeout: NodeJS.Timeout | null = null;
      const handleScroll = () => {
        try {
          if (timeout) clearTimeout(timeout);
          timeout = setTimeout(() => {
            setIsScrolled(window.scrollY > 10);
          }, 30);
        } catch (error) {
          logger.error('Error in scroll handler:', error);
        }
      };
      if (typeof window !== 'undefined') {
        window.addEventListener('scroll', handleScroll, { passive: true });
      }
      return () => {
        if (timeout) clearTimeout(timeout);
        if (typeof window !== 'undefined') {
          window.removeEventListener('scroll', handleScroll);
        }
      };
    } catch (error) {
      logger.error('Error in Navigation mount effect:', error);
    }
  }, []);

  return isScrolled;
}

/** Charge le réglage d'activation de la boutique (activée par défaut). */
export function useShopEnabled() {
  const [shopEnabled, setShopEnabled] = useState(true);

  // Fetch shop enabled setting
  useEffect(() => {
    fetch('/api/shop/settings')
      .then((res) => res.json())
      .then((data) => {
        setShopEnabled(data.shopEnabled !== false);
      })
      .catch(() => {
        // Keep default (enabled)
      });
  }, []);

  return shopEnabled;
}

interface ClickOutsideMenusParams {
  isUserMenuOpen: boolean;
  isMobileMenuOpen: boolean;
  isMobileUserMenuOpen: boolean;
  setIsUserMenuOpen: Dispatch<SetStateAction<boolean>>;
  setIsMobileMenuOpen: Dispatch<SetStateAction<boolean>>;
  setIsMobileUserMenuOpen: Dispatch<SetStateAction<boolean>>;
}

/** Ferme les menus ouverts lors d'un clic en dehors. */
export function useClickOutsideMenus({
  isUserMenuOpen,
  isMobileMenuOpen,
  isMobileUserMenuOpen,
  setIsUserMenuOpen,
  setIsMobileMenuOpen,
  setIsMobileUserMenuOpen,
}: ClickOutsideMenusParams) {
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      try {
        const target = event.target as HTMLElement;
        if (!target) return;

        if (isUserMenuOpen && !target.closest('.user-menu')) {
          setIsUserMenuOpen(false);
        }
        if (
          isMobileMenuOpen &&
          !target.closest('.mobile-menu') &&
          !target.closest('.mobile-menu-button')
        ) {
          setIsMobileMenuOpen(false);
        }
        if (
          isMobileUserMenuOpen &&
          !target.closest('.mobile-user-menu') &&
          !target.closest('.mobile-user-button')
        ) {
          setIsMobileUserMenuOpen(false);
        }
      } catch (error) {
        logger.error('Error in click outside handler:', error);
      }
    };

    if (typeof document !== 'undefined') {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [isUserMenuOpen, isMobileMenuOpen, isMobileUserMenuOpen]);
}
