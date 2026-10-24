import React, { useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Calendar, Plus, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui';

import type { EventFormData } from '../EventForm/types';
import { getRecurrenceOccurrences } from './eventFormUtils';

interface RecurringDatesProps {
  formData: EventFormData;
  setFormData: React.Dispatch<React.SetStateAction<EventFormData>>;
}

export function RecurringDates({ formData, setFormData }: RecurringDatesProps) {
  const inputBaseClass =
    'bg-gray-800/50 border border-gray-600 rounded-lg px-4 py-3 text-white w-full focus:outline-none focus:border-purple-500';

  // Générer les prochaines dates selon la fréquence
  const futureOccurrences = useMemo(
    () =>
      getRecurrenceOccurrences(
        formData.date,
        formData.recurrence?.frequency,
        formData.recurrence?.endDate,
        formData.recurrence?.excludedDates
      ),
    [
      formData.date,
      formData.recurrence?.frequency,
      formData.recurrence?.endDate,
      formData.recurrence?.excludedDates,
    ]
  );

  return (
    <div className="space-y-3">
      {/* Liste des dates déjà exclues */}
      {formData.recurrence?.excludedDates?.length ? (
        <div className="mb-4">
          <h4 className="text-gray-300 text-sm font-medium mb-2">Dates exclues:</h4>
          <div className="flex flex-wrap gap-2">
            {formData.recurrence.excludedDates.map((date, index) => (
              <div
                key={index}
                className="bg-gray-700/50 rounded-lg px-3 py-1.5 flex items-center gap-2 text-sm"
              >
                <Calendar className="w-4 h-4 text-purple-400" />
                <span className="text-gray-200">
                  {format(parseISO(date), 'dd MMMM yyyy', { locale: fr })}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    // Filtrer cette date de la liste
                    const newExcludedDates =
                      formData.recurrence?.excludedDates?.filter((d) => d !== date) || [];

                    setFormData({
                      ...formData,
                      recurrence: {
                        ...formData.recurrence!,
                        excludedDates: newExcludedDates,
                      },
                    });
                  }}
                  className="text-gray-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="flex items-end gap-2">
        <div className="flex-1">
          <select
            id="new-excluded-date"
            className={`${inputBaseClass} cursor-pointer`}
            disabled={futureOccurrences.length === 0}
          >
            <option value="">Sélectionner une date à exclure</option>
            {futureOccurrences.map((occurrence, index) => (
              <option key={index} value={occurrence.value}>
                {occurrence.label}
              </option>
            ))}
          </select>
          {futureOccurrences.length === 0 && formData.date && (
            <p className="text-amber-400 text-xs mt-1">
              Pour voir les occurrences, définissez d&apos;abord la date de première occurrence.
            </p>
          )}
        </div>
        <Button
          type="button"
          variant="outline"
          className="border-purple-500/50 hover:bg-purple-500/20 text-purple-400 px-3"
          disabled={futureOccurrences.length === 0}
          onClick={() => {
            const dateSelect = document.getElementById('new-excluded-date') as HTMLSelectElement;
            if (dateSelect && dateSelect.value) {
              // Vérifier si la date n'est pas déjà dans la liste
              const dateExists = formData.recurrence?.excludedDates?.includes(dateSelect.value);

              if (!dateExists) {
                // Ajouter la date à la liste des dates exclues
                const currentExcludedDates = formData.recurrence?.excludedDates || [];
                setFormData({
                  ...formData,
                  recurrence: {
                    ...formData.recurrence!,
                    excludedDates: [...currentExcludedDates, dateSelect.value],
                  },
                });
                // Réinitialiser le champ
                dateSelect.value = '';
              }
            }
          }}
        >
          <Plus className="w-4 h-4 mr-1" /> Ajouter
        </Button>
      </div>
      <p className="text-gray-400 text-xs italic mt-2">
        Les occurrences exclues n&apos;apparaîtront pas dans le calendrier des événements.
      </p>
    </div>
  );
}
