'use client';

import { ThemeProvider } from 'next-themes';
import { ReactNode, useEffect } from 'react';
import { SessionProvider } from 'next-auth/react';
import ErrorBoundary from '@/components/ErrorBoundary';
import { setupConsoleFilters } from '@/lib/console-filters';

/**
 * Providers globaux pour l'application
 * Encapsule SessionProvider pour next-auth et ThemeProvider pour le thème
 */
export function Providers({ children }: { children: ReactNode }) {
  useEffect(() => {
    // Configurer les filtres de console EN PREMIER (avant tout autre code)
    // Cela permet d'intercepter les warnings de framer-motion qui passent par forward-logs-shared.ts
    const cleanupConsoleFilters = setupConsoleFilters();

    // Cette fonction supprime les attributs bis_skin_checked qui causent des erreurs d'hydratation
    // Ces attributs sont ajoutés par des extensions comme BitDefender
    const removeBisAttributes = () => {
      try {
        const elements = document.querySelectorAll('[bis_skin_checked]');
        elements.forEach((el) => {
          el.removeAttribute('bis_skin_checked');
        });
      } catch (error) {
        // Erreur silencieuse
      }
    };

    // Exécuter immédiatement
    removeBisAttributes();

    // Créer un observateur pour détecter les nouveaux attributs ajoutés dynamiquement
    const observer = new MutationObserver((mutations) => {
      let shouldRemove = false;
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'bis_skin_checked') {
          shouldRemove = true;
        }
      });

      if (shouldRemove) {
        removeBisAttributes();
      }
    });

    // Observer tout le document pour les changements d'attributs
    observer.observe(document.body, {
      attributes: true,
      childList: true,
      subtree: true,
      attributeFilter: ['bis_skin_checked'],
    });

    return () => {
      observer.disconnect();
      // Nettoyer les filtres de console
      if (cleanupConsoleFilters) {
        cleanupConsoleFilters();
      }
    };
  }, []);

  return (
    <ErrorBoundary>
      <SessionProvider
        session={undefined}
        refetchInterval={5 * 60} // Refetch toutes les 5 minutes au lieu de toutes les 0 secondes (désactivé)
        refetchOnWindowFocus={false} // Ne pas refetch quand la fenêtre reprend le focus
        refetchWhenOffline={false} // Ne pas refetch quand offline
      >
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          {children}
        </ThemeProvider>
      </SessionProvider>
    </ErrorBoundary>
  );
}
