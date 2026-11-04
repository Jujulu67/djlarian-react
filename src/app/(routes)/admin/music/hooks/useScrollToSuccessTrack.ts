import { useEffect } from 'react';

import type { Track } from '@/lib/utils/types';
import { waitForElement } from '@/lib/utils/waitForElement';

/**
 * Remonte en haut de la page quand la track créée ou modifiée est affichée dans la liste.
 * @param tracks liste complète des tracks (tracks.tracks dans la page)
 */
export function useScrollToSuccessTrack(
  successTrackId: string | null | undefined,
  tracks: Track[]
) {
  const isInList = !!successTrackId && tracks.some((t) => t.id === successTrackId);

  useEffect(() => {
    if (!successTrackId || !isInList) return;

    const controller = new AbortController();
    waitForElement(`[data-track-id="${CSS.escape(successTrackId)}"]`, {
      signal: controller.signal,
    }).then((el) => {
      if (el) window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    return () => controller.abort();
  }, [successTrackId, isInList]);
}
