'use client';

import { ThemeProvider } from 'next-themes';
import { ReactNode, useEffect } from 'react';
import { SessionProvider } from 'next-auth/react';
import ErrorBoundary from '@/components/ErrorBoundary';

/**
 * Providers globaux pour l'application
 * Encapsule SessionProvider pour next-auth et ThemeProvider pour le thème
 */
export function Providers({ children }: { children: ReactNode }) {
  useEffect(() => {
    // Cette fonction supprime les attributs bis_skin_checked qui causent des erreurs d'hydratation
    // Ces attributs sont ajoutés par des extensions comme BitDefender
    const removeBisAttributes = () => {
      try {
        const elements = document.querySelectorAll('[bis_skin_checked]');
        elements.forEach((el) => {
          el.removeAttribute('bis_skin_checked');
        });
      } catch (error) {
        console.error('Erreur lors de la suppression des attributs bis_skin_checked:', error);
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
    };
  }, []);

  return (
    <ErrorBoundary>
      <SessionProvider session={undefined}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          {children}
        </ThemeProvider>
      </SessionProvider>
    </ErrorBoundary>
  );
}
