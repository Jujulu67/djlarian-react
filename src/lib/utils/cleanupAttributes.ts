'use client';

import { isBrowser } from './env';

export function cleanupAttributes() {
  if (!isBrowser()) return;

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'attributes') {
        const node = mutation.target as HTMLElement;
        if (
          node.hasAttribute('bis_skin_checked') ||
          node.hasAttribute('bis_register') ||
          node.hasAttribute('__processed')
        ) {
          node.removeAttribute('bis_skin_checked');
          node.removeAttribute('bis_register');
          node.removeAttribute('__processed');
        }
      }
    });
  });

  // Observer les changements d'attributs sur tout le document
  observer.observe(document.documentElement, {
    attributes: true,
    subtree: true,
    attributeFilter: ['bis_skin_checked', 'bis_register', '__processed'],
  });

  // Nettoyage initial
  const cleanup = () => {
    const elements = document.querySelectorAll('[bis_skin_checked], [bis_register], [__processed]');
    elements.forEach((element) => {
      element.removeAttribute('bis_skin_checked');
      element.removeAttribute('bis_register');
      element.removeAttribute('__processed');
    });
  };

  // Exécuter le nettoyage immédiatement
  cleanup();

  // Retourner une fonction de nettoyage pour l'observer
  return () => observer.disconnect();
}
