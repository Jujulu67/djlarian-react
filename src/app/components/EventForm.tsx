import React from 'react';
import { useState, useRef, useEffect, useMemo } from 'react';
import { Button, Input, Label, Switch, Textarea } from '@/components/ui';
import { Upload, X, Image as ImageIcon, XCircle, Crop, Calendar, Plus, Trash2 } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import ReactCrop, { type Crop as CropType, centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { format, parseISO, addMonths, addWeeks, addDays, isBefore, endOfMonth } from 'date-fns';
import { fr } from 'date-fns/locale';
import ImageCropModal from '@/components/ui/ImageCropModal';
import ImageDropzone from '@/components/ui/ImageDropzone';
import { toast } from 'react-hot-toast';

export interface TicketInfo {
  price?: number;
  currency?: string;
  quantity?: number;
  buyUrl?: string;
  url?: string;
  availableTo?: string;
  availableFrom?: string;
}

export interface RecurrenceConfig {
  isRecurring: boolean;
  frequency: 'weekly' | 'monthly';
  day?: number; // 0-6 pour les jours de la semaine (0=dimanche)
  endDate?: string;
  excludedDates?: string[]; // Dates à exclure de la récurrence
}

export interface EventFormData {
  title: string;
  description: string;
  location: string;
  address?: string;
  date?: string;
  startDate?: string;
  endDate?: string;
  status?: 'UPCOMING' | 'COMPLETED' | 'CANCELLED';
  isPublished?: boolean;
  hasTickets?: boolean;
  featured?: boolean;
  imageId?: string | null;
  tickets: TicketInfo;
  recurrence?: RecurrenceConfig;
}

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

// Style global pour les inputs et labels
const inputBaseClass =
  'w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200';
const labelBaseClass = 'block text-gray-300 font-medium mb-2';
const sectionHeaderClass =
  'text-xl font-bold text-white mb-6 pb-3 border-b border-gray-700/60 flex items-center';
const sectionNumberClass =
  'flex items-center justify-center h-7 w-7 bg-purple-500/20 text-purple-400 rounded-lg mr-3 text-sm font-semibold';

// Helper function to center the crop area with a specific aspect ratio
function centerAspectCrop(mediaWidth: number, mediaHeight: number, aspect: number): CropType {
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
  const [dragActive, setDragActive] = useState(false);
  const formRef = React.useRef<HTMLFormElement>(null);
  const [showCropper, setShowCropper] = useState<boolean>(false);
  const [displayCrop, setDisplayCrop] = useState<CropType>();
  const [imageToEdit, setImageToEdit] = useState<string | null>(null);
  const imageRef = React.useRef<HTMLImageElement | null>(null);
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [originalImageFile, setOriginalImageFile] = useState<File | null>(null);
  const [croppedImageFile, setCroppedImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(imagePreviewProp || null);

  // Synchroniser le state local avec la prop imagePreview
  useEffect(() => {
    setImagePreview(imagePreviewProp || null);
  }, [imagePreviewProp]);

  // Ajout de l'écouteur d'événement pour le recadrage
  React.useEffect(() => {
    const handleRecropImage = (e: CustomEvent) => {
      const imageToUse = formData.imageId;
      setIsImageLoaded(false);
      setDisplayCrop(undefined);
      setImageToEdit(imageToUse ?? null);
      setShowCropper(true);
    };

    document.addEventListener('recrop-image', handleRecropImage as EventListener);

    return () => {
      document.removeEventListener('recrop-image', handleRecropImage as EventListener);
    };
  }, [formData.imageId]);

  // Fonction pour précharger l'image ET initialiser le recadrage
  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth, naturalHeight } = e.currentTarget;
    imageRef.current = e.currentTarget;

    if (naturalWidth > 0 && naturalHeight > 0) {
      const initialCrop = centerAspectCrop(naturalWidth, naturalHeight, 16 / 9);
      setDisplayCrop(initialCrop);
      setIsImageLoaded(true);
    } else {
      console.error("L'image chargée n'a pas de dimensions.");
      handleCancelRecrop();
    }
  };

  // Fonction pour dessiner l'image recadrée et envoyer les données au parent
  const drawCroppedImage = (crop: CropType) => {
    if (!imageRef.current || !crop.width || !crop.height) return;

    const image = imageRef.current;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      console.error('Impossible de créer le contexte 2D');
      return;
    }

    // Récupérer les dimensions de l'image
    const imageWidth = image.naturalWidth || image.width;
    const imageHeight = image.naturalHeight || image.height;

    // Calculer les dimensions du recadrage en pixels
    let cropX, cropY, cropWidth, cropHeight;

    if (crop.unit === '%') {
      // Convertir les pourcentages en pixels
      cropX = (imageWidth * crop.x) / 100;
      cropY = (imageHeight * crop.y) / 100;
      cropWidth = (imageWidth * crop.width) / 100;
      cropHeight = (imageHeight * crop.height) / 100;
    } else {
      // Utiliser directement les valeurs en pixels
      cropX = crop.x;
      cropY = crop.y;
      cropWidth = crop.width;
      cropHeight = crop.height;
    }

    // Définir les dimensions du canvas pour le recadrage
    canvas.width = cropWidth;
    canvas.height = cropHeight;

    // Dessiner la partie recadrée de l'image sur le canvas
    ctx.drawImage(image, cropX, cropY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);

    // Convertir le canvas en data URL
    const croppedImageUrl = canvas.toDataURL('image/jpeg', 0.95);

    // Convertir en Blob puis en File
    canvas.toBlob(
      (blob) => {
        if (blob) {
          const file = new File([blob], 'cropped-image.jpg', { type: 'image/jpeg' });
          onImageSelected(file);
          setShowCropper(false);
          setImageToEdit(null);
          setIsImageLoaded(false);
          setDisplayCrop(undefined);
          setCroppedImageFile(file);
        } else {
          console.error("Blob n'a pas pu être créé.");
          handleCancelRecrop();
        }
      },
      'image/jpeg',
      0.95
    );
  };

  // Fonction pour annuler le recadrage
  const handleCancelRecrop = () => {
    setShowCropper(false);
    setImageToEdit(null);
    setIsImageLoaded(false);
    setDisplayCrop(undefined);
  };

  // Gérer le drag & drop pour l'upload d'image
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  // Gère le drop d'une NOUVELLE image
  const handleNewImageDrop = (acceptedFiles: File[]) => {
    if (acceptedFiles && acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      setOriginalImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setImageToEdit(result);
        setShowCropper(true);
      };
      reader.readAsDataURL(file);
    }
  };

  // Fonction pour gérer l'input file du dropzone
  const handleImageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    handleNewImageDrop([file]);
  };

  const { getRootProps, getInputProps } = useDropzone({
    onDrop: handleNewImageDrop,
    onDragEnter: () => setDragActive(true),
    onDragLeave: () => setDragActive(false),
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp'],
    },
    noClick: false,
    noKeyboard: true,
  });

  // Component pour gérer les dates récurrentes
  const RecurringDates = ({
    formData,
    setFormData,
  }: {
    formData: EventFormData;
    setFormData: React.Dispatch<React.SetStateAction<EventFormData>>;
  }) => {
    const inputBaseClass =
      'bg-gray-800/50 border border-gray-600 rounded-lg px-4 py-3 text-white w-full focus:outline-none focus:border-purple-500';

    // Générer les prochaines dates selon la fréquence - maintenant en dehors de la structure conditionnelle
    const futureOccurrences = useMemo(() => {
      if (!formData.date) return [];

      const startDate = new Date(formData.date);
      const frequency = formData.recurrence?.frequency || 'weekly';
      const occurrences = [];
      const endDate = formData.recurrence?.endDate ? new Date(formData.recurrence.endDate) : null;

      // Limiter le nombre d'occurrences à générer
      const maxOccurrences = frequency === 'weekly' ? 26 : 12; // 6 mois pour hebdo, 12 mois pour mensuel

      let currentDate = new Date(startDate);

      for (let i = 0; i < maxOccurrences; i++) {
        // Calculer la prochaine occurrence
        if (frequency === 'weekly') {
          currentDate = addWeeks(currentDate, 1);
        } else {
          currentDate = addMonths(currentDate, 1);
        }

        // Arrêter si on dépasse la date de fin
        if (endDate && isBefore(endDate, currentDate)) {
          break;
        }

        // Convertir la date au format YYYY-MM-DD
        const dateString = currentDate.toISOString().split('T')[0];

        // Vérifier si cette date n'est pas déjà exclue
        const isExcluded = formData.recurrence?.excludedDates?.includes(dateString);

        if (!isExcluded) {
          occurrences.push({
            value: dateString,
            label: format(currentDate, 'dd MMMM yyyy', { locale: fr }),
          });
        }
      }

      return occurrences;
    }, [
      formData.date,
      formData.recurrence?.frequency,
      formData.recurrence?.endDate,
      formData.recurrence?.excludedDates,
    ]);

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
                Pour voir les occurrences, définissez d'abord la date de première occurrence.
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
          Les occurrences exclues n'apparaîtront pas dans le calendrier des événements.
        </p>
      </div>
    );
  };

  // Pour relancer le crop sur l'originale (en édition)
  const handleRecropOriginal = () => {
    if (formData.imageId) {
      const tryExtensions = ['jpg', 'jpeg', 'png', 'webp'];
      let found = false;
      let tried = 0;
      const tryNext = () => {
        if (found || tried >= tryExtensions.length) {
          if (!found) {
            toast.error("Impossible de charger l'image originale pour le recadrage.");
          }
          return;
        }
        const ext = tryExtensions[tried];
        const url = `/uploads/${formData.imageId}-ori.${ext}`;
        fetch(url)
          .then((res) => {
            if (res.ok) {
              res.blob().then((blob) => {
                const file = new File([blob], `original.${ext}`, { type: blob.type });
                setOriginalImageFile(file);
                const reader = new FileReader();
                reader.onloadend = () => {
                  setImageToEdit(reader.result as string);
                  setShowCropper(true);
                };
                reader.readAsDataURL(file);
              });
              found = true;
            } else {
              tried++;
              tryNext();
            }
          })
          .catch(() => {
            tried++;
            tryNext();
          });
      };
      tryNext();
    }
  };

  // À chaque changement de fichier, notifier le parent
  useEffect(() => {
    if (typeof onImageFilesChange === 'function') {
      onImageFilesChange(originalImageFile, croppedImageFile);
    }
  }, [originalImageFile, croppedImageFile]);

  return (
    <>
      <style jsx global>{`
        input[type='datetime-local'] {
          position: relative;
          padding-right: 2.5rem;
          cursor: pointer;
          color-scheme: dark;
          min-width: 100%;
          width: 100%;
          -webkit-appearance: none;
          -moz-appearance: none;
          appearance: none;
        }

        input[type='datetime-local']::-webkit-calendar-picker-indicator {
          position: absolute;
          right: 0.5rem;
          top: 50%;
          transform: translateY(-50%);
          filter: invert(0.8) brightness(0.8) sepia(0.3) saturate(3) hue-rotate(234deg);
          opacity: 0.7;
          cursor: pointer;
          width: 1.25rem;
          height: 1.25rem;
        }

        input[type='datetime-local']::-webkit-calendar-picker-indicator:hover {
          opacity: 1;
        }

        @supports (-moz-appearance: none) {
          input[type='datetime-local'] {
            min-width: 100%;
            width: 100%;
          }
        }

        /* Amélioration de l'espacement général */
        .form-grid {
          display: grid;
          grid-gap: 1.5rem;
        }

        .input-group {
          margin-bottom: 1.5rem;
        }

        .image-upload-container {
          border-radius: 0.5rem;
          transition: all 0.2s ease;
        }

        /* Rendre le champ de date plus visible comme un bouton */
        input[type='datetime-local'] {
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect x='3' y='4' width='18' height='18' rx='2' ry='2'%3E%3C/rect%3E%3Cline x1='16' y1='2' x2='16' y2='6'%3E%3C/line%3E%3Cline x1='8' y1='2' x2='8' y2='6'%3E%3C/line%3E%3Cline x1='3' y1='10' x2='21' y2='10'%3E%3C/line%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 8px center;
          background-size: 16px;
        }
      `}</style>

      <form onSubmit={handleSubmit} className="p-6 space-y-10 max-w-4xl mx-auto" ref={formRef}>
        <h2 className="text-2xl font-bold mb-6">
          {isEditMode ? "Modifier l'événement" : 'Créer un nouvel événement'}
        </h2>

        <div>
          <h3 className="text-xl font-semibold mb-4">Informations de l'événement</h3>

          <div className="input-group">
            <label htmlFor="title" className={labelBaseClass}>
              Titre de l'événement <span className="text-red-500">*</span>
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
              En activant cette option, l'événement sera automatiquement répété selon la
              configuration définie ci-dessous.
            </p>
          </div>

          {formData.recurrence?.isRecurring && (
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
                <p className="text-gray-400 text-sm mt-1">
                  Laissez vide pour une récurrence sans fin.
                </p>
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
            <input
              type="datetime-local"
              id="date"
              name="date"
              value={formData.date || ''}
              onChange={handleChange}
              className={`${inputBaseClass} ${errors.date ? 'border-red-500 bg-red-900/10' : ''} cursor-pointer`}
              required
              onClick={(e) => e.currentTarget.showPicker()}
            />
            {errors.date && <p className="mt-2 text-red-500 text-sm">{errors.date}</p>}
          </div>

          {/* Masquer la date de fin si l'événement est récurrent */}
          {!formData.recurrence?.isRecurring && (
            <div className="mb-6">
              <label htmlFor="endDate" className={labelBaseClass}>
                Date de fin
              </label>
              <input
                type="datetime-local"
                id="endDate"
                name="endDate"
                value={formData.endDate || ''}
                onChange={handleChange}
                className={`${inputBaseClass} ${errors.endDate ? 'border-red-500 bg-red-900/10' : ''} cursor-pointer`}
                onClick={(e) => e.currentTarget.showPicker()}
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
            {errors.description && (
              <p className="mt-2 text-red-500 text-sm">{errors.description}</p>
            )}
          </div>
        </div>

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
              onRemove={() => {
                setOriginalImageFile(null);
                setCroppedImageFile(null);
                setImagePreview(null);
                handleRemoveImage();
              }}
              placeholderText="Glissez votre image ici ou cliquez pour parcourir"
              helpText="PNG, JPG, GIF, WEBP jusqu'à 5MB"
              accept="image/*"
              aspectRatio="aspect-[16/9]"
            />
          </div>
        </div>

        {/* Section 3: Billets (changement de numéro de 4 à 3) */}
        <div className="space-y-6 pt-2">
          <h2 className={sectionHeaderClass}>
            <span className={sectionNumberClass}>3</span>
            Billetterie et mise en avant
          </h2>

          <div className="mb-6">
            <div className="flex items-center justify-between py-2">
              <label htmlFor="hasTickets" className="text-gray-300 font-medium">
                Cet événement propose des billets
              </label>
              <Switch
                id="hasTickets"
                name="hasTickets"
                checked={formData.hasTickets || false}
                onCheckedChange={(checked) => {
                  const event = {
                    target: {
                      type: 'checkbox',
                      name: 'hasTickets',
                      id: 'hasTickets',
                      checked,
                    },
                  } as React.ChangeEvent<HTMLInputElement>;
                  handleCheckboxChange(event);
                }}
              />
            </div>
          </div>

          {formData.hasTickets && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="tickets.price" className={labelBaseClass}>
                  Prix (€) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    id="tickets.price"
                    name="tickets.price"
                    value={formData.tickets.price}
                    onChange={handleChange}
                    className={`${inputBaseClass} pr-10 ${errors['tickets.price'] ? 'border-red-500 bg-red-900/10' : ''}`}
                    min="0"
                    step="0.01"
                    required
                  />
                  <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                    €
                  </span>
                </div>
                {errors['tickets.price'] && (
                  <p className="mt-2 text-red-500 text-sm">{errors['tickets.price']}</p>
                )}
              </div>

              <div>
                <label htmlFor="tickets.buyUrl" className={labelBaseClass}>
                  URL de billetterie <span className="text-red-500">*</span>
                </label>
                <input
                  type="url"
                  id="tickets.buyUrl"
                  name="tickets.buyUrl"
                  value={formData.tickets.buyUrl || ''}
                  onChange={handleChange}
                  className={`${inputBaseClass} ${errors['tickets.buyUrl'] ? 'border-red-500 bg-red-900/10' : ''}`}
                  placeholder="https://..."
                  required
                />
                {errors['tickets.buyUrl'] && (
                  <p className="mt-2 text-red-500 text-sm">{errors['tickets.buyUrl']}</p>
                )}
              </div>
            </div>
          )}

          {formData.hasTickets && (
            <div className="mt-6">
              <label htmlFor="tickets.quantity" className={labelBaseClass}>
                Quantité de billets disponibles
              </label>
              <input
                type="number"
                id="tickets.quantity"
                name="tickets.quantity"
                value={formData.tickets.quantity || ''}
                onChange={handleChange}
                className={`${inputBaseClass} ${errors['tickets.quantity'] ? 'border-red-500 bg-red-900/10' : ''}`}
                min="0"
                step="1"
              />
              {errors['tickets.quantity'] && (
                <p className="mt-2 text-red-500 text-sm">{errors['tickets.quantity']}</p>
              )}
            </div>
          )}

          <div className="flex items-center justify-between py-2 mt-6">
            <label htmlFor="featured" className="text-gray-300 font-medium">
              Mettre en avant cet événement
            </label>
            <Switch
              id="featured"
              name="featured"
              checked={formData.featured || false}
              onCheckedChange={(checked) => {
                const event = {
                  target: {
                    type: 'checkbox',
                    name: 'featured',
                    id: 'featured',
                    checked,
                  },
                } as React.ChangeEvent<HTMLInputElement>;
                handleCheckboxChange(event);
              }}
            />
          </div>
        </div>

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
        onCrop={(file, previewUrl) => {
          setCroppedImageFile(file);
          setImagePreview(previewUrl);
          onImageSelected(file);
          setShowCropper(false);
          setImageToEdit(null);
          setIsImageLoaded(false);
          setDisplayCrop(undefined);
        }}
        onCancel={() => {
          setShowCropper(false);
          setImageToEdit(null);
          setIsImageLoaded(false);
          setDisplayCrop(undefined);
        }}
      />
    </>
  );
};

export default EventForm;
