'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import {
  Calendar,
  ChevronLeft,
  Save,
  Upload,
  X,
  Clock,
  MapPin,
  PenLine,
  Info,
  Euro,
  Link as LinkIcon,
  Globe,
  Eye,
  Loader2,
  AlertCircle,
  Crop as CropIcon,
  Trash2,
} from 'lucide-react';
import EventPreview from '@/app/components/EventPreview';
import EventForm, { EventFormData } from '@/app/components/EventForm';
import ReactCrop, { type Crop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { Button } from '@/components/ui';
import { Image } from 'lucide-react';

export default function EventFormPage({ params }: { params: { id?: string } }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const routeParams = useParams();
  const searchParams = useSearchParams();

  // Récupérer l'ID via useEffect pour éviter les problèmes d'hydratation
  const [eventId, setEventId] = useState<string | undefined>(routeParams?.id as string);
  const isEditMode = !!eventId;

  useEffect(() => {
    // Vérifier les searchParams au montage
    const idFromQuery = searchParams.get('id');
    if (idFromQuery) {
      setEventId(idFromQuery);
    }
  }, [searchParams]);

  // État initial du formulaire
  const initialFormData = {
    title: '',
    description: '',
    location: '',
    address: '',
    date: '',
    startDate: '',
    endDate: '',
    status: 'UPCOMING' as const,
    isPublished: false,
    image: null,
    currentImage: '',
    tickets: {
      price: 0,
      currency: 'EUR',
      buyUrl: '',
      availableFrom: undefined,
      availableTo: undefined,
      quantity: 0,
    },
    hasTickets: false,
    featured: false,
    originalImage: '',
  };

  const [formData, setFormData] = useState<EventFormData>(initialFormData);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [previewMode, setPreviewMode] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [showCropModal, setShowCropModal] = useState(false);
  const [crop, setCrop] = useState<Crop>({
    unit: '%',
    width: 100,
    height: 56.25, // Ratio 16:9
    x: 0,
    y: 21.875, // Centré verticalement pour 16:9
  });
  const [completedCrop, setCompletedCrop] = useState<Crop | null>(null);
  const [croppedImageUrl, setCroppedImageUrl] = useState<string | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const previewRef = useRef<HTMLDivElement | null>(null);

  // Rediriger si l'utilisateur n'est pas un admin
  useEffect(() => {
    if (
      status === 'unauthenticated' ||
      (status === 'authenticated' && session?.user?.role !== 'ADMIN')
    ) {
      router.push('/');
    }
  }, [session, status, router]);

  // Charger les données de l'événement en mode édition
  useEffect(() => {
    const fetchEvent = async () => {
      if (!isEditMode) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/events/${eventId}`);
        if (!response.ok) {
          throw new Error('Erreur lors du chargement des données');
        }

        const event = await response.json();

        // Formater les dates pour l'input datetime-local
        const formatDateForInput = (dateString: string) => {
          if (!dateString) return '';
          const date = new Date(dateString);
          // Format ISO avec timezone locale
          return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
            .toISOString()
            .slice(0, 16);
        };

        setFormData({
          title: event.title,
          description: event.description || '',
          location: event.location,
          address: event.address || '',
          date: formatDateForInput(event.startDate),
          startDate: formatDateForInput(event.startDate),
          endDate: event.endDate ? formatDateForInput(event.endDate) : '',
          status: event.status,
          isPublished: event.isPublished,
          image: null,
          currentImage: event.image,
          tickets: event.tickets
            ? {
                price: event.tickets.price,
                currency: event.tickets.currency || 'EUR',
                buyUrl: event.tickets.buyUrl || '',
                availableFrom: event.tickets.availableFrom || undefined,
                availableTo: event.tickets.availableTo || undefined,
                quantity: event.tickets.quantity,
              }
            : {
                price: 0,
                currency: 'EUR',
                buyUrl: '',
                availableFrom: undefined,
                availableTo: undefined,
                quantity: 0,
              },
          hasTickets: !!event.tickets,
          featured: event.featured || false,
          originalImage: event.image,
        });

        if (event.image) {
          setImagePreview(event.image);
        }
      } catch (error) {
        console.error('Erreur:', error);
        setErrors({ submit: 'Erreur lors du chargement des données' });
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
  }, [eventId, isEditMode]);

  // Gérer les changements de valeur dans le formulaire
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;

    // Champs imbriqués pour les tickets
    if (name.startsWith('tickets.')) {
      const ticketField = name.split('.')[1];
      setFormData({
        ...formData,
        tickets: {
          ...formData.tickets,
          [ticketField]: value,
        },
      });
    } else {
      setFormData({
        ...formData,
        [name]: value,
      });
    }

    // Effacer les erreurs lors de la modification
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: '',
      });
    }
  };

  // Gérer les changements de case à cocher
  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData({
      ...formData,
      [name]: checked,
    });
  };

  // Effet pour faire suivre l'aperçu lors du défilement
  useEffect(() => {
    const handleScroll = () => {
      if (previewRef.current) {
        const scrollY = window.scrollY;
        const headerOffset = 100; // Offset pour tenir compte du header

        if (scrollY > headerOffset) {
          previewRef.current.style.position = 'fixed';
          previewRef.current.style.top = '100px';
          previewRef.current.style.width = previewRef.current.parentElement?.offsetWidth + 'px';
          previewRef.current.style.zIndex = '10';
        } else {
          previewRef.current.style.position = 'static';
          previewRef.current.style.width = '100%';
          previewRef.current.style.zIndex = 'auto';
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Mettre à jour le recadrage lorsque l'image est modifiée
  // Pour les images existantes, stocker l'URL originale si disponible
  useEffect(() => {
    if (isEditMode && !formData.originalImage && formData.currentImage) {
      setFormData((prev) => ({
        ...prev,
        originalImage: formData.currentImage,
      }));
    }
  }, [isEditMode, formData.currentImage, formData.originalImage]);

  // Annuler toute opération de recadrage en cours avant de démonter le composant
  useEffect(() => {
    return () => {
      // Nettoyer les ressources lors du démontage
      if (croppedImageUrl) {
        URL.revokeObjectURL(croppedImageUrl);
      }
    };
  }, []);

  // Pour gérer l'upload d'image avec recadrage
  const handleImageChangeWithCrop = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      // Nettoyer les anciens objets URL si nécessaire
      if (imagePreview && imagePreview.startsWith('blob:')) {
        URL.revokeObjectURL(imagePreview);
      }
      if (croppedImageUrl) {
        URL.revokeObjectURL(croppedImageUrl);
      }

      // Créer une URL pour la prévisualisation
      const reader = new FileReader();
      reader.onloadend = () => {
        // Stocker l'image originale pour le recadrage
        const originalImageUrl = reader.result as string;

        // Réinitialiser l'état de recadrage
        setCrop({
          unit: '%',
          width: 100,
          height: 56.25,
          x: 0,
          y: 21.875,
        });
        setCompletedCrop(null);

        // Mettre à jour l'aperçu et les données du formulaire
        setImagePreview(originalImageUrl);
        setFormData((prev) => ({
          ...prev,
          image: e.target.files![0],
          originalImage: originalImageUrl,
        }));

        // Ouvrir la modale de recadrage
        setShowCropModal(true);
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  // Fonction qui sera appelée lorsqu'une image est chargée dans la zone de recadrage
  const onImageLoaded = useCallback((img: HTMLImageElement) => {
    imgRef.current = img;
  }, []);

  // Fonction pour appliquer le recadrage
  const applyCrop = useCallback(async () => {
    if (!imgRef.current || !completedCrop?.width || !completedCrop?.height) {
      console.warn('Impossible de recadrer: image ou recadrage non défini');
      return;
    }

    try {
      // S'assurer que le recadrage respecte exactement le ratio 16:9
      const aspectRatio = 16 / 9;
      const adjustedCrop = { ...completedCrop };

      // Garantir que le ratio est bien respecté
      if (Math.abs(adjustedCrop.width / adjustedCrop.height - aspectRatio) > 0.01) {
        console.warn('Correction du ratio pour maintenir 16:9');
        adjustedCrop.height = adjustedCrop.width / aspectRatio;
      }

      // Créer un canvas pour le recadrage
      const canvas = document.createElement('canvas');
      const scaleX = imgRef.current.naturalWidth / imgRef.current.width;
      const scaleY = imgRef.current.naturalHeight / imgRef.current.height;

      // Calculer les dimensions exactes en pixels
      const pixelCrop = {
        x: (adjustedCrop.x || 0) * scaleX,
        y: (adjustedCrop.y || 0) * scaleY,
        width: adjustedCrop.width * scaleX,
        height: adjustedCrop.height * scaleY,
      };

      canvas.width = pixelCrop.width;
      canvas.height = pixelCrop.height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Impossible de créer le contexte du canvas');
      }

      // Dessiner l'image recadrée
      ctx.drawImage(
        imgRef.current,
        pixelCrop.x,
        pixelCrop.y,
        pixelCrop.width,
        pixelCrop.height,
        0,
        0,
        pixelCrop.width,
        pixelCrop.height
      );

      // Convertir le canvas en Blob puis en URL
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Échec de la création du blob'));
              return;
            }
            resolve(blob);
          },
          'image/jpeg',
          0.95
        );
      });

      // Créer une URL pour l'aperçu
      const croppedUrl = URL.createObjectURL(blob);

      // Mettre à jour l'URL de l'image recadrée
      if (croppedImageUrl) {
        URL.revokeObjectURL(croppedImageUrl);
      }
      setCroppedImageUrl(croppedUrl);

      // Créer un objet File à partir du Blob
      const file = new File([blob], 'cropped-image.jpg', { type: 'image/jpeg' });

      // Mettre à jour l'état du formulaire
      setFormData((prevData) => ({
        ...prevData,
        image: file,
        // Conserver l'image originale pour les recadrages futurs
        originalImage:
          prevData.originalImage || (typeof imagePreview === 'string' ? imagePreview : undefined),
      }));

      // Mettre à jour l'aperçu
      setImagePreview(croppedUrl);

      // Fermer la modale
      setShowCropModal(false);
    } catch (error) {
      console.error('Erreur lors du recadrage:', error);
    }
  }, [completedCrop, imagePreview, croppedImageUrl]);

  // Fonction pour annuler le recadrage
  const cancelCrop = useCallback(() => {
    setShowCropModal(false);
  }, []);

  // Gestionnaire pour le bouton de recadrage sur une image existante
  const handleRecropButtonClick = useCallback(() => {
    // Utiliser l'image originale si disponible, sinon utiliser l'image actuelle
    const imageToRecrop = formData.originalImage || formData.currentImage;
    if (imageToRecrop) {
      setImagePreview(imageToRecrop);
      setCrop({
        unit: '%',
        width: 100,
        height: 56.25,
        x: 0,
        y: 21.875,
      });
      setCompletedCrop(null);
      setShowCropModal(true);
    }
  }, [formData.originalImage, formData.currentImage]);

  // Valider le formulaire
  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.title) {
      errors.title = 'Le titre est requis';
    }

    if (!formData.location) {
      errors.location = 'Le lieu est requis';
    }

    if (!formData.date) {
      errors.date = 'La date est requise';
    }

    if (formData.hasTickets) {
      if (!formData.tickets?.price) {
        errors.ticketPrice = 'Le prix du billet est requis';
      }
      if (!formData.tickets?.quantity) {
        errors.ticketQuantity = 'La quantité de billets est requise';
      }
    }

    setErrors(errors);
    return errors;
  };

  // Soumettre le formulaire
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    try {
      // Valider le formulaire
      const validationErrors = validateForm();
      if (Object.keys(validationErrors).length > 0) {
        setErrors(validationErrors);
        setLoading(false);
        return;
      }

      let imageUrl = formData.currentImage;

      // Upload de l'image si une nouvelle image est sélectionnée
      if (formData.image) {
        const imageFormData = new FormData();
        imageFormData.append('file', formData.image);

        const uploadResponse = await fetch('/api/upload', {
          method: 'POST',
          body: imageFormData,
        });

        if (!uploadResponse.ok) {
          throw new Error("Erreur lors de l'upload de l'image");
        }

        const uploadResult = await uploadResponse.json();
        imageUrl = uploadResult.url;
      }

      // Préparer les données pour l'API
      const dataToSend = {
        title: formData.title,
        description: formData.description,
        location: formData.location,
        address: formData.address || '',
        startDate: formData.date,
        endDate: formData.endDate || null,
        status: formData.status,
        isPublished: formData.isPublished,
        featured: formData.featured || false,
        image: imageUrl,
        tickets: formData.hasTickets
          ? {
              price:
                formData.tickets?.price !== undefined
                  ? typeof formData.tickets.price === 'string'
                    ? parseFloat(formData.tickets.price) || 0
                    : formData.tickets.price
                  : 0,
              currency: formData.tickets?.currency || 'EUR',
              buyUrl: formData.tickets?.buyUrl || '',
              quantity:
                formData.tickets?.quantity !== undefined
                  ? typeof formData.tickets.quantity === 'string'
                    ? parseInt(formData.tickets.quantity, 10) || 0
                    : formData.tickets.quantity
                  : 0,
            }
          : undefined,
      };

      console.log('Données à envoyer:', JSON.stringify(dataToSend, null, 2));

      // Envoyer les données à l'API
      const response = await fetch(isEditMode ? `/api/events/${eventId}` : '/api/events', {
        method: isEditMode ? 'PATCH' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSend),
      });

      if (!response.ok) {
        throw new Error(`Erreur ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      // Rediriger vers la liste des événements admin
      router.push('/admin/events');
    } catch (error) {
      console.error("Erreur lors de la création/modification de l'événement:", error);
      setErrors({
        submit: `Une erreur est survenue lors de la ${
          isEditMode ? 'modification' : 'création'
        } de l'événement. Veuillez réessayer.`,
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black p-8">
        <div className="container mx-auto">
          <div className="flex justify-center items-center min-h-[60vh]">
            <div className="animate-pulse flex flex-col items-center">
              <Loader2 className="w-12 h-12 text-purple-500 mb-4 animate-spin" />
              <h2 className="text-2xl font-semibold text-white">Chargement...</h2>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black p-8 pt-32">
      <div className="container mx-auto max-w-5xl">
        <div className="flex justify-between items-center mb-8">
          <Link
            href={isEditMode ? `/admin/events/${eventId}` : '/admin/events'}
            className="text-gray-300 hover:text-white flex items-center gap-2 transition-colors bg-gray-800/50 px-4 py-2 rounded-lg border border-gray-700/30"
          >
            <ChevronLeft className="w-5 h-5" />
            Retour
          </Link>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Formulaire */}
          <div className="w-full lg:w-3/5 bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 overflow-hidden shadow-xl">
            <EventForm
              formData={formData}
              errors={errors}
              imagePreview={imagePreview}
              handleSubmit={handleSubmit}
              handleChange={handleChange}
              handleImageChange={handleImageChangeWithCrop}
              handleRemoveImage={() => {
                setFormData((prev) => ({
                  ...prev,
                  image: null,
                  currentImage: undefined,
                }));
                setImagePreview(null);
              }}
              handleCheckboxChange={handleCheckboxChange}
              isEditMode={isEditMode}
            />
          </div>

          {/* Prévisualisation en direct */}
          <div className="w-full lg:w-2/5">
            <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
              <span className="w-8 h-8 bg-purple-500/20 text-purple-400 flex items-center justify-center rounded-lg mr-2">
                <Eye className="w-4 h-4" />
              </span>
              Aperçu en direct
            </h3>
            <div className="relative mb-4">
              {imagePreview ? (
                <div
                  className="rounded-lg border border-gray-600 overflow-hidden"
                  style={{ aspectRatio: '16/9' }}
                >
                  <img
                    src={imagePreview}
                    alt="Prévisualisation"
                    className="w-full h-full object-cover"
                    style={{ objectPosition: '50% 25%' }}
                  />
                  <div className="absolute top-2 right-2 flex space-x-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={handleRecropButtonClick}
                      className="bg-black/60 hover:bg-black/80 text-white rounded-full"
                    >
                      <CropIcon className="w-5 h-5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setFormData((prev) => ({
                          ...prev,
                          image: null,
                          currentImage: undefined,
                          originalImage: undefined,
                        }));
                        setImagePreview(null);
                        if (croppedImageUrl) {
                          URL.revokeObjectURL(croppedImageUrl);
                          setCroppedImageUrl(null);
                        }
                      }}
                      className="bg-black/60 hover:bg-black/80 text-white rounded-full"
                    >
                      <Trash2 className="w-5 h-5" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div
                  className="bg-gray-800/30 rounded-lg border border-dashed border-gray-600 flex flex-col items-center justify-center p-8"
                  style={{ aspectRatio: '16/9' }}
                >
                  <Image className="w-12 h-12 text-gray-500 mb-4" />
                  <p className="text-gray-400 text-center">Aucune image sélectionnée</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal de recadrage */}
        {showCropModal && imagePreview && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg p-6 max-w-4xl w-full">
              <h3 className="text-xl font-semibold text-white mb-4">Recadrer l'image</h3>
              <p className="text-gray-300 mb-3">
                L'image sera affichée avec un ratio 16:9 dans la présentation finale.
              </p>
              <div className="mb-6 overflow-hidden">
                <ReactCrop
                  crop={crop}
                  onChange={(newCrop) => setCrop(newCrop)}
                  onComplete={(c) => setCompletedCrop(c)}
                  aspect={16 / 9}
                  locked={true}
                >
                  <img
                    src={imagePreview}
                    alt="Prévisualisation pour recadrage"
                    ref={imgRef}
                    style={{ maxHeight: '70vh', maxWidth: '100%' }}
                    onLoad={(e) => onImageLoaded(e.currentTarget)}
                  />
                </ReactCrop>
              </div>
              <div className="flex justify-between space-x-3">
                <div className="text-gray-300 text-sm">
                  Conseil: Recadrez l'image pour mettre en valeur le sujet principal. La zone
                  visible respectera exactement le ratio 16:9.
                </div>
                <div className="flex space-x-3">
                  <Button type="button" variant="outline" onClick={cancelCrop}>
                    Annuler
                  </Button>
                  <Button
                    type="button"
                    onClick={applyCrop}
                    disabled={!completedCrop?.width || !completedCrop?.height}
                  >
                    Appliquer
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
