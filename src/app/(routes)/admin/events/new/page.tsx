'use client';

import { useState, useEffect, useRef } from 'react';
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
} from 'lucide-react';
import EventPreview from '@/app/components/EventPreview';
import EventForm, { EventFormData } from '@/app/components/EventForm';
import type { Crop as CropType } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

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
    console.error('Erreur de formatage de date:', e);
    return '';
  }
};

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
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);

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

      setLoading(true);
      try {
        const response = await fetch(`/api/events/${eventId}`);
        if (!response.ok) {
          throw new Error("Erreur lors du chargement des données de l'événement");
        }

        const event = await response.json();

        // Mettre à jour l'état du formulaire avec les données chargées
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
          image: null, // Ne pas pré-remplir le champ File
          currentImage: event.image, // Utiliser image (champ dans la base de données)
          tickets: event.tickets
            ? {
                // Pré-remplir les détails des tickets
                price: event.tickets.price ?? 0,
                currency: event.tickets.currency || 'EUR',
                buyUrl: event.tickets.buyUrl || '',
                quantity: event.tickets.quantity ?? 0,
                // Ajouter availableFrom/To si nécessaire
              }
            : {
                // Fournir un objet par défaut si pas de tickets
                price: 0,
                currency: 'EUR',
                buyUrl: '',
                quantity: 0,
              },
          hasTickets: !!event.tickets,
          featured: event.featured || false,
          // Charger l'image originale depuis le backend
          originalImage: event.originalImageUrl,
          recurrence: event.recurrence || {
            isRecurring: false,
            frequency: 'weekly' as 'weekly' | 'monthly',
            day: new Date().getDay(),
            excludedDates: [],
          },
        });

        // Mettre à jour l'aperçu de l'image
        if (event.image) {
          setImagePreview(event.image);
        }
      } catch (error) {
        // ASCII log
        console.error('Error loading event data:', error);
        setErrors({ submit: 'Erreur lors du chargement des données' });
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    // Référence au conteneur d'espace réservé
    const placeholderRef = document.getElementById('preview-placeholder');

    const handleScroll = () => {
      if (previewRef.current && placeholderRef) {
        const scrollY = window.scrollY;
        const headerOffset = 100; // Offset pour tenir compte du header
        const containerRect = placeholderRef.getBoundingClientRect();
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

  // Nouvelle fonction pour gérer la sélection/recadrage d'image depuis EventForm
  const handleImageSelected = (
    file: File, // Fichier (recadré ou original)
    previewUrl: string, // Data URL pour l'aperçu (recadré ou original)
    originalImageUrl?: string // Data URL de l'originale (peut être undefined si original)
  ) => {
    // Toujours mettre à jour l'aperçu avec la previewUrl fournie
    setImagePreview(previewUrl);

    // Déterminer l'URL de l'originale à sauvegarder
    // Si originalImageUrl est fourni (cas recadrage), l'utiliser.
    // Sinon (cas original), utiliser previewUrl qui est l'originale.
    const originalToSave = originalImageUrl || previewUrl;

    setFormData((prev) => ({
      ...prev,
      image: file, // Fichier recadré ou original
      originalImage: originalToSave, // Sauvegarder l'originale
      currentImage: previewUrl, // Mettre à jour l'image courante affichée
    }));
  };

  // Supprimer l'image
  const handleRemoveImage = () => {
    setFormData((prev) => ({
      ...prev,
      image: null,
      currentImage: undefined,
      originalImage: undefined,
    }));
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
      console.log('Validation errors:', errors);
      return;
    }

    setLoading(true);
    try {
      let imageUrl = formData.currentImage;
      let imageToUpload = formData.image;
      let originalImageUrlToSave = formData.originalImage;

      if (imageToUpload instanceof File) {
        console.log('Uploading image file...');
        const imageFormData = new FormData();
        imageFormData.append('file', imageToUpload);

        const uploadResponse = await fetch('/api/upload', {
          method: 'POST',
          body: imageFormData,
        });

        if (!uploadResponse.ok) {
          const errorText = await uploadResponse.text();
          console.error('Upload failed:', errorText);
          throw new Error(`Erreur lors de l'upload de l'image: ${uploadResponse.statusText}`);
        }

        const uploadResult = await uploadResponse.json();
        imageUrl = uploadResult.url;
        console.log('Upload successful, final imageUrl:', imageUrl);
      } else if (imageUrl && !imageUrl.startsWith('data:image')) {
        console.log('No new image file to upload, using existing image URL:', imageUrl);
        originalImageUrlToSave = formData.originalImage;
      } else {
        console.log('Image removed or never set. Variables will be undefined.');
        imageUrl = undefined;
        originalImageUrlToSave = undefined;
      }

      const dataToSend: any = {
        title: formData.title,
        description: formData.description,
        location: formData.location,
        address: formData.address || '',
        startDate: formData.date,
        endDate: formData.endDate || null,
        status: formData.status,
        isPublished: formData.isPublished,
        featured: formData.featured || false,
        imageUrl: imageUrl,
        originalImageUrl: originalImageUrlToSave,
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
            }
          : null, // Important: on envoie null et non undefined pour que le backend comprenne qu'il faut supprimer les tickets
        recurrence: formData.recurrence,
      };

      if (dataToSend.imageUrl === undefined) {
        dataToSend.imageUrl = null;
      }
      if (dataToSend.originalImageUrl === undefined) {
        dataToSend.originalImageUrl = null;
      }

      console.log(
        'Data to send to /events (undefined replaced with null):',
        JSON.stringify(dataToSend, null, 2)
      );

      const response = await fetch(isEditMode ? `/api/events/${eventId}` : '/api/events', {
        method: isEditMode ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSend),
      });

      // Log la réponse brute pour le débogage
      console.log(`Response status: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        let errorMessage = response.statusText;
        try {
          const errorData = await response.json();
          console.error('API Error Response:', errorData);
          errorMessage =
            errorData.error || errorData.message || errorData.details || response.statusText;
        } catch (parseError) {
          console.error('Error parsing error response:', parseError);
          errorMessage = `${response.status}: ${response.statusText} (Couldn't parse error)`;
        }

        setLoading(false);
        throw new Error(`API Error ${response.status}: ${errorMessage}`);
      }

      const result = await response.json();
      console.log('API /events Success! Redirecting...', result);

      router.push('/admin/events');
    } catch (error: any) {
      console.error('Error during event creation/update:', error);
      setErrors({
        submit: `Une erreur est survenue: ${error.message || 'Erreur inconnue'}`,
      });
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
                imagePreview={imagePreview}
                handleSubmit={handleSubmit}
                handleChange={handleChange}
                handleCheckboxChange={handleCheckboxChange}
                handleRemoveImage={handleRemoveImage}
                onImageSelected={handleImageSelected}
                isEditMode={isEditMode}
                setFormData={setFormData}
              />
            </div>
            {/* Conteneur d'espace réservé pour l'aperçu */}
            <div id="preview-placeholder" className="lg:w-[400px] flex-shrink-0">
              <div ref={previewRef} className="w-full">
                <div className="bg-gray-800/30 backdrop-blur-sm border border-gray-700/50 rounded-xl overflow-hidden shadow-lg">
                  <h3 className="text-lg font-bold p-4">Aperçu</h3>
                  <EventPreview event={formData} />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-[800px] mx-auto">
            <EventPreview event={formData} />
          </div>
        )}
      </div>
    </div>
  );
}
