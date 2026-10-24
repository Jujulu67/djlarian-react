import React from 'react';

import { PublicationStatusSelector } from '@/components/admin/PublicationStatusSelector';
import { Switch } from '@/components/ui';
import { DateTimeField } from '@/components/ui/DateTimeField';

import type { EventFormData } from '../../EventForm/types';
import { inputBaseClass, labelBaseClass } from '../eventFormStyles';
import { EventFormRecurrence } from './EventFormRecurrence';

interface EventFormInfoSectionProps {
  formData: EventFormData;
  setFormData: React.Dispatch<React.SetStateAction<EventFormData>>;
  errors: Record<string, string>;
  handleChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => void;
}

export function EventFormInfoSection({
  formData,
  setFormData,
  errors,
  handleChange,
}: EventFormInfoSectionProps) {
  return (
    <div>
      <h3 className="text-xl font-semibold mb-4">Informations de l&apos;événement</h3>

      <div className="input-group">
        <label htmlFor="title" className={labelBaseClass}>
          Titre de l&apos;événement <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="title"
          name="title"
          value={formData.title}
          onChange={handleChange}
          className={`${inputBaseClass} ${errors.title ? 'border-red-500 bg-red-900/10' : ''}`}
          required
        />
        {errors.title && <p className="mt-2 text-red-500 text-sm">{errors.title}</p>}
      </div>

      <div className="mb-6">
        <div className="flex items-center justify-between py-2">
          <label htmlFor="isRecurring" className="text-gray-300 font-medium">
            Cet événement se répète régulièrement
          </label>
          <Switch
            id="isRecurring"
            name="isRecurring"
            checked={formData.recurrence?.isRecurring || false}
            onCheckedChange={(checked) => {
              // Si recurrence n'existe pas, créer un objet avec les valeurs par défaut
              const currentRecurrence = formData.recurrence || {
                isRecurring: false,
                frequency: 'weekly',
                day: new Date().getDay(),
                excludedDates: [],
              };

              setFormData({
                ...formData,
                recurrence: {
                  ...currentRecurrence,
                  isRecurring: checked,
                },
              });
            }}
          />
        </div>
        <p className="text-gray-400 text-sm mt-1">
          En activant cette option, l&apos;événement sera automatiquement répété selon la
          configuration définie ci-dessous.
        </p>
      </div>

      {formData.recurrence?.isRecurring && (
        <EventFormRecurrence formData={formData} setFormData={setFormData} errors={errors} />
      )}

      <div className="mb-6">
        <label htmlFor="date" className={labelBaseClass}>
          Date{' '}
          {!formData.recurrence?.isRecurring ? (
            <span className="text-red-500">*</span>
          ) : (
            <span className="text-green-400">(première occurrence)</span>
          )}
        </label>
        <DateTimeField
          value={formData.date || ''}
          onChange={handleChange}
          required
          error={!!errors.date}
        />
        {errors.date && <p className="mt-2 text-red-500 text-sm">{errors.date}</p>}
      </div>

      {/* Masquer la date de fin si l'événement est récurrent */}
      {!formData.recurrence?.isRecurring && (
        <div className="mb-6">
          <label htmlFor="endDate" className={labelBaseClass}>
            Date de fin
          </label>
          <DateTimeField
            value={formData.endDate || ''}
            onChange={handleChange}
            error={!!errors.endDate}
          />
          {errors.endDate && <p className="mt-2 text-red-500 text-sm">{errors.endDate}</p>}
        </div>
      )}

      <div className="mb-6">
        <label htmlFor="location" className={labelBaseClass}>
          Lieu <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="location"
          name="location"
          value={formData.location}
          onChange={handleChange}
          className={`${inputBaseClass} ${errors.location ? 'border-red-500 bg-red-900/10' : ''}`}
          required
        />
        {errors.location && <p className="mt-2 text-red-500 text-sm">{errors.location}</p>}
      </div>

      <div>
        <label htmlFor="description" className={labelBaseClass}>
          Description <span className="text-red-500">*</span>
        </label>
        <textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleChange}
          rows={4}
          className={`${inputBaseClass} resize-none ${errors.description ? 'border-red-500 bg-red-900/10' : ''}`}
          required
        />
        {errors.description && <p className="mt-2 text-red-500 text-sm">{errors.description}</p>}
      </div>

      <div className="mb-6">
        <label className={labelBaseClass}>Statut de publication</label>
        <PublicationStatusSelector
          isPublished={formData.isPublished}
          publishAt={formData.publishAt ?? undefined}
          onChange={(status: 'published' | 'draft' | 'scheduled', date?: string) => {
            if (status === 'published') {
              setFormData({ ...formData, isPublished: true, publishAt: undefined });
            } else if (status === 'draft') {
              setFormData({ ...formData, isPublished: false, publishAt: undefined });
            } else if (status === 'scheduled' && date) {
              setFormData({ ...formData, isPublished: false, publishAt: date });
            }
          }}
        />
        <p className="text-gray-400 text-sm mt-1">
          Choisissez si l&apos;événement doit être visible publiquement, rester en brouillon, ou
          être publié automatiquement à une date précise.
        </p>
      </div>
    </div>
  );
}
