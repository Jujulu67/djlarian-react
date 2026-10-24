import { useEffect } from 'react';

import { logger } from '@/lib/logger';
import type { Track } from '@/lib/utils/types';

/**
 * Scrolle vers le haut quand une track en succès apparaît et est dans la liste.
 * @param tracks liste complète des tracks (tracks.tracks dans la page)
 */
export function useScrollToSuccessTrack(
  successTrackId: string | null | undefined,
  tracks: Track[]
) {
  useEffect(() => {
    if (!successTrackId) return;

    // Vérifier que la track est dans tracks (pas filteredTracks car il peut y avoir un délai)
    const checkAndScroll = () => {
      const trackExists = tracks.some((t) => t.id === successTrackId);
      if (trackExists && typeof window !== 'undefined') {
        // Vérifier que la track est bien rendue dans le DOM avant de scroller
        const trackElement = document.querySelector(`[data-track-id="${successTrackId}"]`);
        if (trackElement) {
          logger.debug('[Admin Music] Track trouvée et rendue, scroll vers le haut');
          // Petit délai pour s'assurer que l'animation est visible
          setTimeout(() => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }, 50);
          return true;
        } else {
          logger.debug(
            '[Admin Music] Track trouvée dans la liste mais pas encore rendue dans le DOM'
          );
        }
      }
      return false;
    };

    // Essayer après un court délai pour laisser le temps au DOM de se mettre à jour
    const timer1 = setTimeout(() => {
      if (!checkAndScroll()) {
        // Essayer encore après un délai plus long
        setTimeout(() => {
          if (!checkAndScroll()) {
            // Dernière tentative après un délai encore plus long
            setTimeout(() => {
              checkAndScroll();
            }, 300);
          }
        }, 200);
      }
    }, 150);

    return () => clearTimeout(timer1);
    // Utiliser successTrackId et la longueur des tracks comme dépendances stables
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [successTrackId, tracks.length]);
}
