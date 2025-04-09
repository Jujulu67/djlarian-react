import React from 'react';
import { useState } from 'react';
import { Button, Input, Label, Switch, Textarea } from '@/components/ui';
import { Upload, X, Image as ImageIcon, XCircle, Crop } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import ReactCrop, { type Crop as CropType } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

export interface TicketInfo {
  price?: number;
  currency?: string;
  quantity?: number;
  buyUrl?: string;
  url?: string;
  availableTo?: string;
  availableFrom?: string;
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
  image?: File | null;
  currentImage?: string;
  originalImage?: string;
  tickets: TicketInfo;
  imageUrl?: string;
}

// Définir un type pour les erreurs qui permet d'accéder aux propriétés imbriquées
interface FormErrors extends Partial<Record<keyof EventFormData, string>> {
  'tickets.price'?: string;
  'tickets.url'?: string;
  'tickets.quantity'?: string;
}

interface EventFormProps {
  formData: EventFormData;
  errors: FormErrors;
  imagePreview: string | null;
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  handleChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => void;
  handleImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleRemoveImage: () => void;
  handleCheckboxChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isEditMode: boolean;
}

// Style global pour les inputs et labels
const inputBaseClass =
  'w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200';
const labelBaseClass = 'block text-gray-300 font-medium mb-2';
const sectionHeaderClass =
  'text-xl font-bold text-white mb-6 pb-3 border-b border-gray-700/60 flex items-center';
const sectionNumberClass =
  'flex items-center justify-center h-7 w-7 bg-purple-500/20 text-purple-400 rounded-lg mr-3 text-sm font-semibold';

const EventForm: React.FC<EventFormProps> = ({
  formData,
  errors,
  imagePreview,
  handleSubmit,
  handleChange,
  handleImageChange,
  handleRemoveImage,
  handleCheckboxChange,
  isEditMode,
}) => {
  const [dragActive, setDragActive] = useState(false);
  const formRef = React.useRef<HTMLFormElement>(null);
  const [showCropper, setShowCropper] = useState<boolean>(false);
  const [cropData, setCropData] = useState<CropType>({
    unit: '%',
    width: 100,
    height: 56.25,
    x: 0,
    y: 21.875,
  });
  const [imageToEdit, setImageToEdit] = useState<string | null>(null);
  const imageRef = React.useRef<HTMLImageElement | null>(null);

  // Ajout de l'écouteur d'événement pour le recadrage
  React.useEffect(() => {
    const handleRecropImage = (e: CustomEvent) => {
      if (e.detail && e.detail.imageUrl) {
        // Utiliser l'image d'origine si disponible, sinon utiliser l'image actuelle
        const imageToUse = formData.originalImage || e.detail.imageUrl;
        setImageToEdit(imageToUse);
        setShowCropper(true);

        // Réinitialiser toujours les données de recadrage pour éviter les problèmes
        setCropData({
          unit: '%',
          width: 100,
          height: 56.25,
          x: 0,
          y: 21.875,
        });
      }
    };

    document.addEventListener('recrop-image', handleRecropImage as EventListener);

    return () => {
      document.removeEventListener('recrop-image', handleRecropImage as EventListener);
    };
  }, [formData.originalImage]);

  // Fonction pour précharger l'image
  const handleImageLoad = (img: HTMLImageElement) => {
    imageRef.current = img;
  };

  // Fonction pour finaliser le recadrage
  const handleCompleteRecrop = () => {
    if (imageRef.current && imageToEdit) {
      const canvas = document.createElement('canvas');
      const scaleX = imageRef.current.naturalWidth / imageRef.current.width;
      const scaleY = imageRef.current.naturalHeight / imageRef.current.height;

      // S'assurer que le recadrage respecte le ratio 16:9
      const aspectRatio = 16 / 9;
      const adjustedCrop = { ...cropData };

      // Garantir que la hauteur correspond exactement à la largeur / aspectRatio
      if (adjustedCrop.unit === '%') {
        adjustedCrop.height = adjustedCrop.width / aspectRatio;
        const maxY = 100 - adjustedCrop.height;
        if (adjustedCrop.y !== undefined) {
          adjustedCrop.y = Math.min(adjustedCrop.y, maxY);
        }
      }

      // Vérifier que le ratio est strictement respecté
      if (Math.abs(adjustedCrop.width / adjustedCrop.height - aspectRatio) > 0.01) {
        console.warn('Correction du ratio de recadrage pour respecter 16:9');
        adjustedCrop.height = adjustedCrop.width / aspectRatio;
      }

      const cropX = adjustedCrop.x! * scaleX;
      const cropY = adjustedCrop.y! * scaleY;
      const cropWidth = adjustedCrop.width! * scaleX;
      const cropHeight = adjustedCrop.height! * scaleY;

      canvas.width = cropWidth;
      canvas.height = cropHeight;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(
          imageRef.current,
          cropX,
          cropY,
          cropWidth,
          cropHeight,
          0,
          0,
          cropWidth,
          cropHeight
        );

        const croppedImageUrl = canvas.toDataURL('image/jpeg', 0.95);

        // Créer un objet File à partir du canvas
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const file = new File([blob], 'cropped-image.jpg', { type: 'image/jpeg' });

              // Fermer d'abord le modal pour éviter l'ouverture d'une autre fenêtre de recadrage
              setShowCropper(false);
              setImageToEdit(null);

              // Mettre à jour l'image dans le formulaire avec un léger délai
              setTimeout(() => {
                const event = {
                  target: {
                    name: 'image',
                    files: [file],
                  },
                } as unknown as React.ChangeEvent<HTMLInputElement>;

                handleImageChange(event);
              }, 50);
            }
          },
          'image/jpeg',
          0.95
        );
      } else {
        // En cas d'erreur, fermer quand même le modal
        setShowCropper(false);
        setImageToEdit(null);
      }
    } else {
      // Si pas d'image référencée, fermer quand même le modal
      setShowCropper(false);
      setImageToEdit(null);
    }
  };

  // Fonction pour annuler le recadrage
  const handleCancelRecrop = () => {
    setShowCropper(false);
    setImageToEdit(null);
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

  const handleDrop = (e: React.DragEvent | any) => {
    if (e.preventDefault) {
      e.preventDefault();
      e.stopPropagation();
    }
    setDragActive(false);

    let files;
    if (e.dataTransfer) {
      files = e.dataTransfer.files;
    } else if (e.target && e.target.files) {
      files = e.target.files;
    } else if (Array.isArray(e)) {
      files = { 0: e[0], length: e.length };
    }

    if (files && files[0]) {
      // Simuler l'événement de changement de fichier
      const event = {
        target: {
          files,
        },
      } as unknown as React.ChangeEvent<HTMLInputElement>;

      handleImageChange(event);
    }
  };

  const { getRootProps, getInputProps } = useDropzone({
    onDrop: handleDrop,
    onDragEnter: () => setDragActive(true),
    onDragLeave: () => setDragActive(false),
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp'],
    },
  });

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
            <label htmlFor="date" className={labelBaseClass}>
              Date <span className="text-red-500">*</span>
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
            <label htmlFor="image" className={labelBaseClass}>
              Image
            </label>
            <div className="mt-2 relative">
              <div
                {...getRootProps()}
                className={`image-upload-container p-8 border-2 border-dashed rounded-lg text-center ${
                  dragActive ? 'border-purple-500 bg-purple-500/10' : 'border-gray-600'
                } ${errors.image ? 'border-red-500 bg-red-900/10' : ''}`}
              >
                <input
                  {...getInputProps()}
                  type="file"
                  id="image"
                  name="image"
                  className="hidden"
                  accept="image/*"
                />
                <div className="flex flex-col items-center justify-center space-y-2 py-4">
                  <Upload className="w-12 h-12 text-gray-400" />
                  <p className="text-gray-300">Glissez votre image ici ou cliquez pour parcourir</p>
                  <p className="text-gray-500 text-sm">PNG, JPG, GIF, WEBP jusqu'à 5MB</p>
                </div>
              </div>
              {errors.image && <p className="mt-2 text-red-500 text-sm">{errors.image}</p>}
            </div>

            {imagePreview && (
              <div className="mt-6 relative w-full" style={{ aspectRatio: '16/9' }}>
                <div className="w-full h-full rounded-lg border border-gray-600 overflow-hidden">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full h-full object-cover"
                    style={{ objectPosition: '50% 25%' }}
                  />
                </div>
                <div className="absolute top-0 left-0 w-full">
                  <div className="bg-gradient-to-b from-black/30 to-transparent py-2 px-3 text-xs text-white opacity-70">
                    Ratio 16:9 - Cette vue représente l'affichage final
                  </div>
                </div>
                <div className="absolute top-2 right-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      // Un nouvel événement personnalisé pour le recadrage
                      const event = new CustomEvent('recrop-image', {
                        detail: { imageUrl: imagePreview },
                      });
                      document.dispatchEvent(event);
                    }}
                    className="bg-black/60 text-white p-1 rounded-full hover:bg-black/80 transition-colors"
                    title="Recadrer l'image"
                  >
                    <ImageIcon className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="bg-black/60 text-white p-1 rounded-full hover:bg-black/80 transition-colors"
                    title="Supprimer l'image"
                  >
                    <XCircle className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}

            {/* Interface de recadrage pour l'image existante */}
            {showCropper && imageToEdit && (
              <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
                <div className="bg-gray-800 rounded-lg p-6 max-w-3xl w-full">
                  <h3 className="text-xl font-bold mb-4">Recadrez votre image</h3>
                  <p className="text-gray-300 mb-3">
                    L'image sera affichée avec un ratio 16:9 dans la présentation finale.
                  </p>
                  <div className="mb-4">
                    <ReactCrop
                      crop={cropData}
                      onChange={(c) => {
                        // Forcer le respect du ratio 16:9 lors du redimensionnement
                        const newCrop = { ...c };
                        const aspectRatio = 16 / 9;

                        // Ajuster la hauteur si la largeur change
                        if (c.width !== cropData.width) {
                          newCrop.height = c.width / aspectRatio;
                        }

                        // Ajuster la largeur si la hauteur change
                        if (c.height !== cropData.height && c.height > 0) {
                          newCrop.width = c.height * aspectRatio;
                        }

                        setCropData(newCrop);
                      }}
                      aspect={16 / 9}
                      minHeight={60}
                      locked={true} // Verrouiller le ratio d'aspect
                      className="max-h-[60vh]"
                    >
                      <img
                        ref={imageRef}
                        src={imageToEdit}
                        alt="Preview to crop"
                        className="max-w-full max-h-[60vh]"
                        onLoad={(e) => handleImageLoad(e.currentTarget)}
                      />
                    </ReactCrop>
                  </div>
                  <div className="flex justify-between space-x-3">
                    <div className="text-gray-300 text-sm">
                      Conseil: Assurez-vous que l'élément principal est visible dans le cadrage. La
                      zone visible respectera exactement le ratio 16:9.
                    </div>
                    <div className="flex space-x-3">
                      <Button type="button" variant="outline" onClick={handleCancelRecrop}>
                        Annuler
                      </Button>
                      <Button type="button" onClick={handleCompleteRecrop}>
                        Appliquer
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Section 3: Billets */}
        <div className="space-y-6 pt-2">
          <h2 className={sectionHeaderClass}>
            <span className={sectionNumberClass}>3</span>
            Informations de billetterie
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
                <label htmlFor="tickets.url" className={labelBaseClass}>
                  URL de billetterie <span className="text-red-500">*</span>
                </label>
                <input
                  type="url"
                  id="tickets.url"
                  name="tickets.url"
                  value={formData.tickets.url || ''}
                  onChange={handleChange}
                  className={`${inputBaseClass} ${errors['tickets.url'] ? 'border-red-500 bg-red-900/10' : ''}`}
                  placeholder="https://..."
                  required
                />
                {errors['tickets.url'] && (
                  <p className="mt-2 text-red-500 text-sm">{errors['tickets.url']}</p>
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
            type="button"
            onClick={() => {
              if (formRef.current) {
                formRef.current.dispatchEvent(
                  new Event('submit', { bubbles: true, cancelable: true })
                );
              }
            }}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50 shadow-lg shadow-purple-600/20 hover:shadow-purple-600/40"
          >
            {isEditMode ? 'Mettre à jour' : "Créer l'événement"}
          </button>
        </div>
      </form>
    </>
  );
};

export default EventForm;
