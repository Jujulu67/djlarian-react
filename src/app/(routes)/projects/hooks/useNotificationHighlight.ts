'use client';

import { useEffect } from 'react';

import { waitForElement } from '@/lib/utils/waitForElement';

interface UseNotificationHighlightParams {
  setHighlightedFromNotification: React.Dispatch<React.SetStateAction<string | null>>;
}

/**
 * Arrivée depuis une notification (`?highlight=<id>&fromNotification=true`) : met le projet en
 * avant, nettoie l'URL et l'amène à l'écran dès qu'il est affiché.
 */
export function useNotificationHighlight({
  setHighlightedFromNotification,
}: UseNotificationHighlightParams) {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const highlightId = params.get('highlight');
    if (!highlightId || params.get('fromNotification') !== 'true') return;

    setHighlightedFromNotification(highlightId);

    params.delete('highlight');
    params.delete('fromNotification');
    const query = params.toString();
    window.history.replaceState({}, '', window.location.pathname + (query ? `?${query}` : ''));

    // Les projets arrivent après un chargement réseau : laisser plus de temps que par défaut
    const controller = new AbortController();
    void waitForElement(`#project-${CSS.escape(highlightId)}`, {
      timeoutMs: 10000,
      signal: controller.signal,
    }).then((el) => el?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
    return () => controller.abort();
  }, [setHighlightedFromNotification]);
}
