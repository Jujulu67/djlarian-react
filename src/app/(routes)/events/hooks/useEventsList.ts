import { useEffect, useState } from 'react';

import { logger } from '@/lib/logger';

import {
  buildEventsUrl,
  type Event,
  generateVirtualOccurrences,
  sortEventsForDisplay,
} from '../utils';

export function useEventsList(selectedStatus: string) {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Récupérer les événements depuis l'API
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoading(true);

        const response = await fetch(buildEventsUrl(selectedStatus));
        if (!response.ok) {
          throw new Error('Erreur lors du chargement des événements');
        }

        const result = await response.json();
        // La réponse API utilise createSuccessResponse qui retourne { data: { events: [...], pagination: {...} } }
        const fetchedEvents = result.data?.events || [];

        // Générer les occurrences virtuelles
        const eventsWithVirtualOccurrences = generateVirtualOccurrences(fetchedEvents);

        // Trier les événements pour mettre ceux en avant en premier
        const sortedEvents = sortEventsForDisplay(eventsWithVirtualOccurrences);

        setEvents(sortedEvents);
      } catch (err) {
        logger.error('Erreur:', err);
        setError('Impossible de charger les événements. Veuillez réessayer plus tard.');
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, [selectedStatus]);

  return { events, loading, error };
}
