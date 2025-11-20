'use client';

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
} from 'lucide-react';
import Link from 'next/link';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useState, useEffect, useRef } from 'react';
import type { Crop as CropType } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { v4 as uuidv4 } from 'uuid';

import EventForm, { EventFormData } from '@/app/components/EventForm';
import EventPreview from '@/app/components/EventPreview';
import { logger } from '@/lib/logger';

// Déplacer la fonction helper ici pour qu'elle soit accessible partout
const formatDateForInput = (dateString: string | null | undefined): string => {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    // Vérifier si la date est valide
    if (isNaN(date.getTime())) {
      return '';
    }
    // Format ISO avec timezone locale
    return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  } catch (e) {
    logger.error('Erreur de formatage de date:', e);
    return '';
  }
};

export default function EventFormPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const routeParams = useParams();
  const searchParams = useSearchParams();

  // Récupérer l'ID via useEffect pour éviter les problèmes d'hydratation
  const [eventId, setEventId] = useState<string | undefined>(undefined);
  const isEditMode = !!eventId;

  useEffect(() => {
    // Récupérer l'ID de l'événement à partir des paramètres de route ou de requête
    const idFromParams = routeParams?.id as string;
    const idFromQuery = searchParams.get('id');

    // Préférer l'ID des paramètres d'URL, puis des paramètres de requête
    const id = idFromParams || idFromQuery || undefined;

    if (id) {
      setEventId(id);
    }
  }, [routeParams, searchParams]);

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
    publishAt: '',
    imageId: null,
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
    recurrence: {
      isRecurring: false,
      frequency: 'weekly' as 'weekly' | 'monthly',
      day: new Date().getDay(),
      excludedDates: [],
    },
  };

  const [formData, setFormData] = useState<EventFormData>(initialFormData);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [previewMode, setPreviewMode] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const [originalImageFile, setOriginalImageFile] = useState<File | null>(null);
  const [croppedImageFile, setCroppedImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

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
      if (!isEditMode || !eventId) {
        setLoading(false);
        return;
      }
      try {
        const response = await fetch(`/api/events/${eventId}`);
        if (!response.ok) {
          throw new Error("Erreur lors du chargement des données de l'événement");
        }
        const result = await response.json();
        // La réponse API utilise createSuccessResponse qui retourne { data: Event }
        const event = result.data;
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
          publishAt: event.publishAt ? formatDateForInput(event.publishAt) : '',
          imageId: event.imageId || null,
          tickets: event.tickets
            ? {
                price: event.tickets.price ?? 0,
                currency: event.tickets.currency || 'EUR',
                buyUrl: event.tickets.buyUrl || '',
                quantity: event.tickets.quantity ?? 0,
              }
            : {
                price: 0,
                currency: 'EUR',
                buyUrl: '',
                quantity: 0,
              },
          hasTickets: !!event.tickets,
          featured: event.featured || false,
          recurrence: {
            isRecurring: !!event.recurrenceConfig,
            frequency: event.recurrenceConfig?.frequency || 'weekly',
            day:
              event.recurrenceConfig?.day !== undefined
                ? event.recurrenceConfig.day
                : new Date().getDay(),
            endDate: event.recurrenceConfig?.endDate
              ? formatDateForInput(event.recurrenceConfig.endDate)
              : '',
            excludedDates: event.recurrenceConfig?.excludedDates || [],
          },
        });
        logger.debug('[DEBUG EventFormPage] formData après chargement:', {
          imageId: event.imageId,
          event,
        });
        if (isEditMode && event.imageId) {
          setImagePreview(`/uploads/${event.imageId}.jpg?t=${Date.now()}`);
        }
      } catch (error) {
        setErrors({ submit: 'Erreur lors du chargement des données' });
      } finally {
        setLoading(false);
      }
    };
    fetchEvent();
  }, [isEditMode, eventId]);

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
    // Référence au conteneur d'espace réservé
    const placeholderRef = document.getElementById('preview-placeholder');

    const handleScroll = () => {
      if (previewRef.current && placeholderRef) {
        const scrollY = window.scrollY;
        const headerOffset = 100; // Offset pour tenir compte du header
        const initialTop = placeholderRef.offsetTop;

        if (scrollY > initialTop - headerOffset) {
          // Passer en position fixe quand on dépasse le point initial - headerOffset
          previewRef.current.style.position = 'fixed';
          previewRef.current.style.top = `${headerOffset}px`;
          previewRef.current.style.width = '400px';
        } else {
          // Position normale avant de défiler
          previewRef.current.style.position = 'relative';
          previewRef.current.style.top = '0';
          previewRef.current.style.width = '100%';
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    // Appel initial pour positionner correctement
    setTimeout(handleScroll, 100);

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Fonction utilitaire pour générer un crop 16/9 centré
  const centerAspectCrop = (mediaWidth: number, mediaHeight: number, aspect: number) => {
    const width = mediaWidth;
    const height = width / aspect;
    const x = 0;
    const y = (mediaHeight - height) / 2;
    return {
      unit: 'px',
      x,
      y: Math.max(0, y),
      width,
      height: Math.min(height, mediaHeight),
    };
  };

  // Fonction pour générer le blob recadré (16/9)
  const getCroppedBlob = async (
    image: HTMLImageElement,
    crop: CropType,
    fileName: string,
    imageFileSource: File | null
  ): Promise<{ croppedBlob: Blob | null; originalFileToSend: File | null }> => {
    const originalFileToSend = imageFileSource;
    const imageWidth = image.naturalWidth || image.width;
    const imageHeight = image.naturalHeight || image.height;
    const canvas = document.createElement('canvas');
    canvas.width = crop.width;
    canvas.height = crop.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('No 2d context');
    ctx.drawImage(image, crop.x, crop.y, crop.width, crop.height, 0, 0, crop.width, crop.height);
    return new Promise((resolve) => {
      canvas.toBlob(
        (blob) => {
          resolve({ croppedBlob: blob, originalFileToSend });
        },
        'image/jpeg',
        0.9
      );
    });
  };

  // Nouvelle fonction pour gérer la sélection/recadrage d'image depuis EventForm
  const handleImageSelected = (file: File) => {
    // Générer un nouvel imageId à chaque nouvelle sélection
    const newImageId = uuidv4();
    setFormData((prev) => ({
      ...prev,
      imageId: newImageId,
    }));
  };

  // Supprimer l'image
  const handleRemoveImage = () => {
    setFormData((prev) => ({
      ...prev,
      imageId: null,
    }));
    setOriginalImageFile(null);
    setCroppedImageFile(null);
    setImagePreview(null);
  };

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
      if (!formData.tickets?.price || parseFloat(String(formData.tickets.price)) <= 0) {
        errors['tickets.price'] = 'Le prix du billet doit être supérieur à 0';
      }
      if (!formData.tickets?.buyUrl) {
        errors['tickets.buyUrl'] = "L'URL de la billetterie est requise";
      }
    }

    setErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Soumettre le formulaire
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    if (!validateForm()) {
      return;
    }
    setLoading(true);
    try {
      let imageId = formData.imageId;
      // Générer un nouvel imageId si besoin
      if (!imageId && (originalImageFile || croppedImageFile)) {
        imageId = uuidv4();
        setFormData((prev) => ({ ...prev, imageId }));
      }
      // Upload DRY des deux fichiers si présents
      if (croppedImageFile && originalImageFile && imageId) {
        const formDataUpload = new FormData();
        formDataUpload.append('imageId', imageId);
        formDataUpload.append('croppedImage', croppedImageFile, 'event-crop.jpg');
        formDataUpload.append('originalImage', originalImageFile, originalImageFile.name);
        const uploadResponse = await fetch('/api/upload', {
          method: 'POST',
          body: formDataUpload,
        });
        if (!uploadResponse.ok) {
          throw new Error("Erreur lors de l'upload de l'image");
        }
      }
      // Préparer les données avec gestion explicite des valeurs optionnelles
      const addressValue: string = formData.address ?? '';

      const dataToSend: {
        title: string;
        description: string;
        location: string;
        address: string;
        startDate: string;
        endDate?: string | null;
        imageId?: string | null;
        status?: string;
        isPublished?: boolean;
        featured?: boolean;
        tickets?: {
          price: number;
          currency: string;
          buyUrl: string;
          quantity: number;
          availableFrom?: string | null;
          availableTo?: string | null;
        };
        recurrence?: {
          isRecurring: boolean;
          frequency?: string;
          day?: number;
          endDate?: string | null;
          excludedDates?: string[];
        };
        publishAt?: string | null;
      } = {
        title: formData.title,
        description: formData.description,
        location: formData.location,
        address: addressValue,
        startDate: formData.date ?? '',
        endDate: formData.endDate || null,
        status: formData.status,
        isPublished: formData.isPublished,
        publishAt: formData.publishAt || null,
        featured: formData.featured || false,
        imageId: imageId,
        tickets: formData.hasTickets
          ? {
              price:
                formData.tickets?.price !== undefined
                  ? parseFloat(String(formData.tickets.price)) || 0
                  : 0,
              currency: formData.tickets?.currency || 'EUR',
              buyUrl: formData.tickets?.buyUrl || '',
              quantity:
                formData.tickets?.quantity !== undefined
                  ? parseInt(String(formData.tickets.quantity), 10) || 0
                  : 0,
              availableFrom: formData.tickets?.availableFrom || null,
              availableTo: formData.tickets?.availableTo || null,
            }
          : undefined,
        recurrence: isEditMode
          ? {
              ...formData.recurrence,
              isRecurring: !!formData.recurrence?.isRecurring,
            }
          : formData.recurrence,
      };
      // Protection anti-bug : supprimer tout champ id du payload lors d'un POST (création)
      if (!isEditMode && 'id' in dataToSend) {
        delete dataToSend.id;
      }
      // Vérifier si l'ID est défini avant de faire une requête PATCH
      if (isEditMode && !eventId) {
        setLoading(false);
        throw new Error("ID de l'événement non défini pour la mise à jour");
      }
      const apiUrl = isEditMode ? `/api/events/${eventId}` : '/api/events';
      const method = isEditMode ? 'PATCH' : 'POST';
      const response = await fetch(apiUrl, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSend),
      });
      if (!response.ok) {
        throw new Error("Erreur lors de la sauvegarde de l'evenement");
      }
      router.push('/admin/events');
    } catch (error) {
      setErrors({ submit: 'Erreur lors de la sauvegarde' });
    } finally {
      setLoading(false);
    }
  };

  if (loading && isEditMode) {
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

        {errors.submit && (
          <div className="mb-6 p-4 bg-red-900/30 border border-red-700 text-red-300 rounded-lg flex items-center gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{errors.submit}</span>
          </div>
        )}

        {!previewMode ? (
          <div className="flex flex-col lg:flex-row gap-8">
            <div className="flex-1 lg:max-w-[calc(100%-450px)]">
              <EventForm
                formData={formData}
                errors={errors}
                handleSubmit={handleSubmit}
                handleChange={handleChange}
                handleCheckboxChange={handleCheckboxChange}
                handleRemoveImage={handleRemoveImage}
                onImageSelected={handleImageSelected}
                isEditMode={isEditMode}
                setFormData={setFormData}
                onImageFilesChange={(original, crop) => {
                  setOriginalImageFile(original);
                  setCroppedImageFile(crop);
                  if (crop) {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      setImagePreview(reader.result as string);
                    };
                    reader.readAsDataURL(crop);
                  } else if (formData.imageId) {
                    setImagePreview(`/uploads/${formData.imageId}.jpg?t=${Date.now()}`);
                  } else {
                    setImagePreview(null);
                  }
                }}
                imagePreview={imagePreview ?? undefined}
              />
            </div>
            {/* Conteneur d'espace réservé pour l'aperçu */}
            <div id="preview-placeholder" className="lg:w-[400px] flex-shrink-0">
              <div ref={previewRef} className="w-full">
                <div className="bg-gray-800/30 backdrop-blur-sm border border-gray-700/50 rounded-xl overflow-hidden shadow-lg">
                  <h3 className="text-lg font-bold p-4">Aperçu</h3>
                  <EventPreview event={{ ...formData, currentImage: imagePreview ?? undefined }} />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-[800px] mx-auto">
            <EventPreview event={{ ...formData, currentImage: imagePreview ?? undefined }} />
          </div>
        )}
      </div>
    </div>
  );
}
