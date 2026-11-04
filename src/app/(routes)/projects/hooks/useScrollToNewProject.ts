'use client';

import { useEffect } from 'react';

import { waitForElement } from '@/lib/utils/waitForElement';

interface UseScrollToNewProjectParams {
  lastCreatedProjectId: string | null;
  setLastCreatedProjectId: React.Dispatch<React.SetStateAction<string | null>>;
}

/** Durée de l'animation de mise en avant du nouveau projet. */
const HIGHLIGHT_MS = 2000;

/**
 * Amène le projet créé à l'écran (où qu'il soit selon le tri), puis retire sa mise en avant.
 */
export function useScrollToNewProject({
  lastCreatedProjectId,
  setLastCreatedProjectId,
}: UseScrollToNewProjectParams) {
  useEffect(() => {
    if (!lastCreatedProjectId) return;

    const controller = new AbortController();
    waitForElement(`#project-${CSS.escape(lastCreatedProjectId)}`, {
      signal: controller.signal,
    }).then((el) => el?.scrollIntoView({ behavior: 'smooth', block: 'center' }));

    const resetTimer = setTimeout(() => setLastCreatedProjectId(null), HIGHLIGHT_MS);

    return () => {
      controller.abort();
      clearTimeout(resetTimer);
    };
  }, [lastCreatedProjectId, setLastCreatedProjectId]);
}
