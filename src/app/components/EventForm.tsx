import React from 'react';
import ImageCropModal from '@/components/ui/ImageCropModal';
import ImageDropzone from '@/components/ui/ImageDropzone';

import { EventFormTickets } from './EventForm/components/EventFormTickets';
import { EventFormData, TicketInfo, RecurrenceConfig } from './EventForm/types';
import { EventFormGlobalStyles } from './event-form/EventFormGlobalStyles';
import { EventFormInfoSection } from './event-form/components/EventFormInfoSection';
import { sectionHeaderClass, sectionNumberClass } from './event-form/eventFormStyles';
import { useEventImageCrop } from './event-form/hooks/useEventImageCrop';

export type { EventFormData, TicketInfo, RecurrenceConfig };

// Définir un type pour les erreurs qui permet d'accéder aux propriétés imbriquées
interface FormErrors extends Partial<Record<keyof EventFormData, string>> {
  'tickets.price'?: string;
  'tickets.buyUrl'?: string;
  'tickets.quantity'?: string;
  'recurrence.day'?: string;
  'recurrence.endDate'?: string;
}

type EventFormProps = {
  formData: EventFormData;
  errors: Record<string, string>;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
  handleChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => void;
  handleCheckboxChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleRemoveImage: () => void;
  onImageSelected: (file: File) => void;
  isEditMode?: boolean;
  setFormData: React.Dispatch<React.SetStateAction<EventFormData>>;
  onImageFilesChange?: (original: File | null, crop: File | null) => void;
  imagePreview?: string;
};

const EventForm: React.FC<EventFormProps> = ({
  formData,
  errors,
  handleSubmit,
  handleChange,
  handleRemoveImage,
  handleCheckboxChange,
  isEditMode,
  onImageSelected,
  setFormData,
  onImageFilesChange,
  imagePreview: imagePreviewProp,
}) => {
  const formRef = React.useRef<HTMLFormElement>(null);
  const {
    imagePreview,
    imageToEdit,
    canRecrop,
    handleImageInputChange,
    handleRecropOriginal,
    handleRemoveImageAndCache,
    handleSubmitWithCache,
    handleCrop,
    handleCancelRecrop,
  } = useEventImageCrop({
    formData,
    isEditMode,
    imagePreviewProp,
    onImageSelected,
    onImageFilesChange,
    handleRemoveImage,
    handleSubmit,
  });

  return (
    <>
      <EventFormGlobalStyles />

      <form
        onSubmit={handleSubmitWithCache}
        className="p-6 space-y-10 max-w-4xl mx-auto"
        ref={formRef}
      >
        <h2 className="text-2xl font-bold mb-6">
          {isEditMode ? 'Modifier l&apos;événement' : 'Créer un nouvel événement'}
        </h2>

        <EventFormInfoSection
          formData={formData}
          setFormData={setFormData}
          errors={errors}
          handleChange={handleChange}
        />

        {/* Section 2: Image */}
        <div className="space-y-6 pt-2">
          <h2 className={sectionHeaderClass}>
            <span className={sectionNumberClass}>2</span>
            Image de l'événement
          </h2>

          <div className="mb-6">
            <ImageDropzone
              label="Image de l'événement"
              imageUrl={imagePreview || undefined}
              onDrop={handleImageInputChange}
              onRecrop={handleRecropOriginal}
              onRemove={handleRemoveImageAndCache}
              placeholderText="Glissez votre image ici ou cliquez pour parcourir"
              helpText="PNG, JPG, GIF, WEBP jusqu'à 5MB"
              accept="image/*"
              aspectRatio="aspect-[16/9]"
              canRecrop={canRecrop}
            />
            {!canRecrop && (
              <p className="text-amber-400 text-xs mt-2">
                Aucune image originale trouvée pour recadrer.
              </p>
            )}
          </div>
        </div>

        {/* Section 3: Billets */}
        <EventFormTickets
          formData={formData}
          setFormData={setFormData}
          errors={errors}
          handleChange={handleChange}
          handleCheckboxChange={handleCheckboxChange}
        />

        <div className="pt-8 flex justify-end space-x-4">
          <button
            type="submit"
            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50 shadow-lg shadow-purple-600/20 hover:shadow-purple-600/40"
          >
            {isEditMode ? 'Mettre à jour' : "Créer l'événement"}
          </button>
        </div>
      </form>

      <ImageCropModal
        imageToEdit={imageToEdit}
        aspect={16 / 9}
        onCrop={handleCrop}
        onCancel={handleCancelRecrop}
      />
    </>
  );
};

export default EventForm;
