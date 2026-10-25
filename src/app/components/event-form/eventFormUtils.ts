import { type Crop as CropType, centerCrop, makeAspectCrop } from 'react-image-crop';
import { format, isBefore } from 'date-fns';
import { fr } from 'date-fns/locale';

import { addDaysInTimeZone, addMonthsInTimeZone } from '@/lib/utils/timezone';

import type { RecurrenceConfig } from '../EventForm/types';

// Helper function to center the crop area with a specific aspect ratio
export function centerAspectCrop(
  mediaWidth: number,
  mediaHeight: number,
  aspect: number
): CropType {
  return centerCrop(
    makeAspectCrop(
      {
        // Utiliser 100% pour maximiser la zone initiale
        unit: '%',
        width: 100,
      },
      aspect,
      mediaWidth,
      mediaHeight
    ),
    mediaWidth,
    mediaHeight
  );
}

export interface RecurrenceOccurrence {
  value: string;
  label: string;
}

/**
 * Génère les prochaines occurrences d'un événement récurrent (dates exclues retirées).
 */
export function getRecurrenceOccurrences(
  date: string | undefined,
  frequency: RecurrenceConfig['frequency'] | undefined,
  endDateValue: string | undefined,
  excludedDates: string[] | undefined
): RecurrenceOccurrence[] {
  if (!date) return [];

  const startDate = new Date(date);
  const recurrenceFrequency = frequency || 'weekly';
  const occurrences: RecurrenceOccurrence[] = [];
  const endDate = endDateValue ? new Date(endDateValue) : null;

  // Limiter le nombre d'occurrences à générer
  const maxOccurrences = recurrenceFrequency === 'weekly' ? 26 : 12; // 6 mois pour hebdo, 12 mois pour mensuel

  let currentDate = new Date(startDate);

  for (let i = 0; i < maxOccurrences; i++) {
    // Calculer la prochaine occurrence
    if (recurrenceFrequency === 'weekly') {
      currentDate = addDaysInTimeZone(currentDate, 7);
    } else {
      currentDate = addMonthsInTimeZone(currentDate, 1);
    }

    // Arrêter si on dépasse la date de fin
    if (endDate && isBefore(endDate, currentDate)) {
      break;
    }

    // Convertir la date au format YYYY-MM-DD
    const dateString = currentDate.toISOString().split('T')[0];

    // Vérifier si cette date n'est pas déjà exclue
    const isExcluded = excludedDates?.includes(dateString);

    if (!isExcluded) {
      occurrences.push({
        value: dateString,
        label: format(currentDate, 'dd MMMM yyyy', { locale: fr }),
      });
    }
  }

  return occurrences;
}
