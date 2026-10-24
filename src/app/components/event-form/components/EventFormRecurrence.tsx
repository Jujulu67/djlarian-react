import React from 'react';

import type { EventFormData } from '../../EventForm/types';
import { inputBaseClass, labelBaseClass } from '../eventFormStyles';
import { RecurringDates } from '../RecurringDates';

interface EventFormRecurrenceProps {
  formData: EventFormData;
  setFormData: React.Dispatch<React.SetStateAction<EventFormData>>;
  errors: Record<string, string>;
}

export function EventFormRecurrence({ formData, setFormData, errors }: EventFormRecurrenceProps) {
  return (
    <div className="mb-6 pl-4 border-l-2 border-purple-500/30 pb-2">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
        <div>
          <label htmlFor="recurrence.frequency" className={labelBaseClass}>
            Fréquence de répétition
          </label>
          <select
            id="recurrence.frequency"
            name="recurrence.frequency"
            value={formData.recurrence?.frequency || 'weekly'}
            onChange={(e) => {
              setFormData({
                ...formData,
                recurrence: {
                  ...formData.recurrence!,
                  frequency: e.target.value as 'weekly' | 'monthly',
                },
              });
            }}
            className={inputBaseClass}
          >
            <option value="weekly">Hebdomadaire</option>
            <option value="monthly">Mensuelle</option>
          </select>
        </div>

        {formData.recurrence?.frequency === 'weekly' && (
          <div>
            <label htmlFor="recurrence.day" className={labelBaseClass}>
              Jour de la semaine
            </label>
            <select
              id="recurrence.day"
              name="recurrence.day"
              value={formData.recurrence?.day || 0}
              onChange={(e) => {
                setFormData({
                  ...formData,
                  recurrence: {
                    ...formData.recurrence!,
                    day: parseInt(e.target.value),
                  },
                });
              }}
              className={`${inputBaseClass} ${errors['recurrence.day'] ? 'border-red-500 bg-red-900/10' : ''}`}
            >
              <option value="1">Lundi</option>
              <option value="2">Mardi</option>
              <option value="3">Mercredi</option>
              <option value="4">Jeudi</option>
              <option value="5">Vendredi</option>
              <option value="6">Samedi</option>
              <option value="0">Dimanche</option>
            </select>
            {errors['recurrence.day'] && (
              <p className="mt-2 text-red-500 text-sm">{errors['recurrence.day']}</p>
            )}
          </div>
        )}
      </div>

      <div>
        <label htmlFor="recurrence.endDate" className={labelBaseClass}>
          Date de fin de récurrence
        </label>
        <input
          type="date"
          id="recurrence.endDate"
          name="recurrence.endDate"
          value={formData.recurrence?.endDate || ''}
          onChange={(e) => {
            setFormData({
              ...formData,
              recurrence: {
                ...formData.recurrence!,
                endDate: e.target.value,
              },
            });
          }}
          className={`${inputBaseClass} ${errors['recurrence.endDate'] ? 'border-red-500 bg-red-900/10' : ''} cursor-pointer`}
          onClick={(e) => e.currentTarget.showPicker()}
        />
        {errors['recurrence.endDate'] && (
          <p className="mt-2 text-red-500 text-sm">{errors['recurrence.endDate']}</p>
        )}
        <p className="text-gray-400 text-sm mt-1">Laissez vide pour une récurrence sans fin.</p>
      </div>

      {/* Section pour les dates exclues */}
      <div className="mt-6">
        <label className={labelBaseClass}>Dates à exclure de la récurrence</label>
        <p className="text-gray-400 text-sm mb-3">
          Sélectionnez les dates spécifiques où l'événement ne doit pas avoir lieu.
        </p>

        <RecurringDates formData={formData} setFormData={setFormData} />
      </div>
    </div>
  );
}
