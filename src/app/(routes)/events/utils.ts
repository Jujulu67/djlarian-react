import { addDaysInTimeZone, addMonthsInTimeZone } from '@/lib/utils/timezone';

import { logger } from '@/lib/logger';

// Types
export type RecurrenceConfig = {
  frequency: 'weekly' | 'monthly';
  day?: number;
  endDate?: string;
  excludedDates?: string[];
};

export type Event = {
  id: string;
  title: string;
  description: string;
  location: string;
  address?: string;
  startDate: string;
  endDate?: string;
  status: string;
  isPublished: boolean;
  featured?: boolean;
  tickets?: {
    price?: number;
    currency: string;
    buyUrl?: string;
    quantity?: number;
  };
  isMasterEvent?: boolean;
  isRecurringMaster?: boolean;
  recurrenceConfig?: RecurrenceConfig;
  master?: { id: string };
  isVirtualOccurrence?: boolean;
  virtualStartDate?: string;
  masterId?: string;
  imageId?: string;
  updatedAt?: string;
};

/** Construit l'URL de l'API de liste (événements publiés, filtre de statut optionnel). */
export function buildEventsUrl(selectedStatus: string): string {
  let url = '/api/events';
  const params = new URLSearchParams();

  // Toujours récupérer les événements publiés
  params.append('isPublished', 'true');

  // Filtrer par statut si différent de 'all'
  if (selectedStatus !== 'all') {
    params.append('status', selectedStatus);
  }

  // Ajouter les paramètres à l'URL
  if (params.toString()) {
    url += `?${params.toString()}`;
  }

  return url;
}

// Générer des occurrences virtuelles pour les événements récurrents
export function generateVirtualOccurrences(events: Event[]): Event[] {
  const allEvents: Event[] = [];

  for (const event of events) {
    // Marquer l'événement maître comme récurrent pour l'affichage
    if (event.isMasterEvent && event.recurrenceConfig) {
      allEvents.push({
        ...event,
        // On préserve cette propriété pour le badge d'UI
        isRecurringMaster: true,
      });
    } else {
      // Ajouter l'événement d'origine non-récurrent tel quel
      allEvents.push(event);
    }

    // Générer des occurrences virtuelles si c'est un événement maître avec une config de récurrence
    if (event.isMasterEvent && event.recurrenceConfig) {
      const masterEvent = event;
      const recurrenceConfig = masterEvent.recurrenceConfig as RecurrenceConfig;
      const occurrences = generateRecurringDatesForEvent(
        masterEvent,
        recurrenceConfig,
        recurrenceConfig.excludedDates || []
      );

      // Ajouter chaque occurrence comme un événement virtuel
      for (const occurrence of occurrences) {
        // Générer un ID spécial pour les occurrences virtuelles en utilisant un format clair
        // Nous séparons l'ID et la date avec "___VIRTUAL___" pour éviter toute ambiguïté
        const occurrenceDate = occurrence.toISOString();
        const virtualEventId = `${masterEvent.id}___VIRTUAL___${occurrenceDate}`;
        logger.debug(`Generated virtual event ID: ${virtualEventId}`);

        const virtualEvent: Event = {
          ...masterEvent,
          id: virtualEventId,
          startDate: occurrenceDate,
          // Calculer la date de fin si l'événement original en a une
          endDate: masterEvent.endDate
            ? calculateEndDate(
                occurrence,
                new Date(masterEvent.startDate),
                new Date(masterEvent.endDate)
              )
            : undefined,
          isVirtualOccurrence: true,
          virtualStartDate: occurrenceDate,
          masterId: masterEvent.id,
        };

        // Vérifier si cette occurrence est dans le futur et si la date n'est pas exclue
        if (new Date(virtualEvent.startDate) >= new Date()) {
          allEvents.push(virtualEvent);
        }
      }
    }
  }

  // Trier tous les événements par date
  return allEvents.sort(
    (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
  );
}

// Fonction pour calculer la date de fin d'une occurrence
export function calculateEndDate(
  occurrenceStart: Date,
  originalStart: Date,
  originalEnd: Date
): string {
  // Calculer la durée de l'événement original
  const duration = originalEnd.getTime() - originalStart.getTime();

  // Ajouter cette durée à la date de début de l'occurrence
  const newEndDate = new Date(occurrenceStart.getTime() + duration);

  return newEndDate.toISOString();
}

// Fonction pour générer les dates récurrentes d'un événement
export function generateRecurringDatesForEvent(
  event: Event,
  recurrence: RecurrenceConfig,
  excludedDates: string[] = []
): Date[] {
  const dates: Date[] = [];
  const startDate = new Date(event.startDate);
  const endDate = recurrence.endDate ? new Date(recurrence.endDate) : null;

  // Date de début (on ignore la première occurrence car c'est l'événement maître)
  let currentDate = new Date(startDate);

  // Passer à la prochaine occurrence
  if (recurrence.frequency === 'weekly') {
    currentDate = addDaysInTimeZone(currentDate, 7);
  } else if (recurrence.frequency === 'monthly') {
    currentDate = addMonthsInTimeZone(currentDate, 1);
  }

  // Calculer la date limite maximum selon la fréquence:
  // - 6 semaines pour les événements hebdomadaires
  // - 6 mois pour les événements mensuels
  const maxDate = new Date();
  if (recurrence.frequency === 'weekly') {
    maxDate.setDate(maxDate.getDate() + 42); // 6 semaines = 42 jours
  } else {
    maxDate.setMonth(maxDate.getMonth() + 6); // 6 mois pour les mensuels
  }

  // Générer des dates en fonction de la fréquence
  while ((!endDate || currentDate <= endDate) && currentDate <= maxDate) {
    // Vérifier si cette date n'est pas exclue
    const dateString = currentDate.toISOString().split('T')[0];
    if (!excludedDates.includes(dateString)) {
      dates.push(new Date(currentDate));
    }

    // Passer à la prochaine date selon la fréquence
    if (recurrence.frequency === 'weekly') {
      currentDate = addDaysInTimeZone(currentDate, 7);
    } else if (recurrence.frequency === 'monthly') {
      currentDate = addMonthsInTimeZone(currentDate, 1);
    }
  }

  return dates;
}

/** Tri d'affichage : événements mis en avant d'abord (non virtuels), puis par date. */
export function sortEventsForDisplay(events: Event[]): Event[] {
  return events.sort((a: Event, b: Event) => {
    // Événements mis en avant en premier (mais seulement les non-virtuels)
    if (a.featured && !b.featured && !a.isVirtualOccurrence) return -1;
    if (!a.featured && b.featured && !b.isVirtualOccurrence) return 1;

    // Puis par date (les prochains événements d'abord)
    return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
  });
}

/** Filtre par recherche texte (titre, description, lieu). */
export function filterEventsBySearch(events: Event[], searchTerm: string): Event[] {
  return events.filter((event) => {
    if (!searchTerm) return true;

    const searchTermLower = searchTerm.toLowerCase();
    return (
      event.title.toLowerCase().includes(searchTermLower) ||
      event.description?.toLowerCase().includes(searchTermLower) ||
      event.location.toLowerCase().includes(searchTermLower)
    );
  });
}

// Vérifier si un événement est passé
export function isPastEvent(dateString: string): boolean {
  return new Date(dateString) < new Date();
}
