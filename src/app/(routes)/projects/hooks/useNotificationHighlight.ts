'use client';

import { useEffect } from 'react';

interface UseNotificationHighlightParams {
  setHighlightedFromNotification: React.Dispatch<React.SetStateAction<string | null>>;
}

export function useNotificationHighlight({
  setHighlightedFromNotification,
}: UseNotificationHighlightParams) {
  // Gérer le highlight depuis les notifications (animation dorée persistante)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const params = new URLSearchParams(window.location.search);
      const highlightId = params.get('highlight');
      const fromNotification = params.get('fromNotification') === 'true';

      if (highlightId && fromNotification) {
        setHighlightedFromNotification(highlightId);

        // Nettoyer l'URL sans recharger la page
        try {
          params.delete('highlight');
          params.delete('fromNotification');
          const newUrl =
            window.location.pathname + (params.toString() ? '?' + params.toString() : '');
          window.history.replaceState({}, '', newUrl);
        } catch (historyError) {
          // Ignorer les erreurs d'historique (peuvent être causées par des extensions)
          // Erreur silencieuse - pas besoin de logger
        }

        // Scroller vers le projet après un délai plus long pour laisser le temps au rendu
        setTimeout(() => {
          try {
            const element = document.getElementById(`project-${highlightId}`);
            if (element) {
              element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            } else {
              console.warn('Projet non trouvé dans le DOM:', highlightId);
            }
          } catch (scrollError) {
            // Erreur silencieuse - pas besoin de logger
          }
        }, 500); // Délai augmenté pour laisser le temps au rendu
      }
    } catch (error) {
      // Ignorer les erreurs silencieusement (peuvent être causées par des extensions)
      // Erreur silencieuse - pas besoin de logger
    }
  }, []);
}
