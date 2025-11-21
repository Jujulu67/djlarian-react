'use client';

import { format, isPast, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Calendar,
  Clock,
  MapPin,
  Euro,
  ExternalLink,
  ArrowLeft,
  Share2,
  Calendar as CalendarIcon,
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';

import { getImageUrl } from '@/lib/utils/getImageUrl';
import { useState, useEffect, useRef } from 'react';
import {
  FaCalendarAlt,
  FaMapMarkerAlt,
  FaTicketAlt,
  FaShareAlt,
  FaFacebook,
  FaTwitter,
  FaCopy,
} from 'react-icons/fa';

import { logger } from '@/lib/logger';

// Types
type Event = {
  id: string;
  title: string;
  description: string;
  location: string;
  address?: string;
  startDate: string;
  endDate?: string;
  imageId?: string;
  status: string;
  isPublished: boolean;
  tickets?: {
    price?: number;
    currency: string;
    buyUrl?: string;
    availableFrom?: string;
    availableTo?: string;
    quantity?: number;
  };
  user?: {
    name: string;
  };
  // Propriétés pour les événements virtuels récurrents
  isVirtualOccurrence?: boolean;
  virtualStartDate?: string;
  masterId?: string;
  isRecurringMaster?: boolean;
  recurrenceConfig?: {
    frequency: 'weekly' | 'monthly';
    endDate?: string;
    excludedDates?: string[];
  };
  updatedAt?: string;
};

export default function EventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;

  // Récupérer le paramètre de date depuis l'URL
  const [searchParams, setSearchParams] = useState<URLSearchParams | null>(null);
  const [virtualDate, setVirtualDate] = useState<string | null>(null);

  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showShareOptions, setShowShareOptions] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  // Utiliser une référence pour suivre si un appel API est déjà en cours
  const isApiCallInProgress = useRef(false);

  // Combine les deux effets en un seul pour garantir l'ordre d'exécution
  useEffect(() => {
    // Récupérer les paramètres de l'URL d'abord
    const url = new URL(window.location.href);
    setSearchParams(url.searchParams);

    const dateParam = url.searchParams.get('date');
    let actualVirtualDate = null;

    if (dateParam) {
      actualVirtualDate = dateParam;
      setVirtualDate(dateParam);
      logger.debug(`Virtual date from URL: ${dateParam}`);
    }

    // Éviter les appels en double
    if (isApiCallInProgress.current) {
      return;
    }

    // Ensuite procéder avec l'appel API en utilisant directement dateParam
    const fetchEvent = async () => {
      try {
        isApiCallInProgress.current = true;
        setLoading(true);

        // Construire l'URL de l'API avec le paramètre de date récupéré directement
        let apiUrl = `/api/events/${eventId}`;
        if (actualVirtualDate) {
          apiUrl += `?date=${encodeURIComponent(actualVirtualDate)}`;
          logger.debug(`Fetching event with virtual date parameter: ${actualVirtualDate}`);
        } else {
          logger.debug(`Fetching event without virtual date parameter`);
        }

        const response = await fetch(apiUrl);

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Événement non trouvé');
          } else if (response.status === 403) {
            throw new Error('Vous n&apos;avez pas accès à cet événement');
          } else {
            throw new Error('Une erreur est survenue lors de la récupération des données');
          }
        }

        const data = await response.json();
        // Vérifier l'état des dates avant et après
        logger.debug(
          `Dates avant traitement - startDate: ${data.startDate}, virtualStartDate: ${data.virtualStartDate}`
        );

        // Si c'est un événement virtuel, on s'assure que la date est correctement utilisée
        if (data.isVirtualOccurrence && data.virtualStartDate) {
          logger.debug(`Événement virtuel avec date spécifique: ${data.virtualStartDate}`);
          // Forcer la date principale à être la date virtuelle
          data.startDate = data.virtualStartDate;
          logger.debug(`Date après remplacement: ${data.startDate}`);
        }

        setEvent(data);
        logger.debug('Événement final chargé:', {
          titre: data.title,
          startDate: data.startDate,
          isVirtualOccurrence: data.isVirtualOccurrence,
          virtualStartDate: data.virtualStartDate,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Une erreur est survenue');
      } finally {
        setLoading(false);
        isApiCallInProgress.current = false;
      }
    };

    if (eventId) {
      fetchEvent();
    }
  }, [eventId]); // L'effet ne dépend plus de virtualDate car nous utilisons directement dateParam

  const formatEventDate = (event: Event) => {
    // Ne plus vérifier isVirtualOccurrence, car nous avons déjà remplacé startDate
    // par virtualStartDate dans useEffect si nécessaire
    const dateString = event.startDate;

    logger.debug(
      `Formatting date from: ${dateString} (isVirtual: ${!!event.isVirtualOccurrence}, virtualDate: ${event.virtualStartDate})`
    );

    const date = parseISO(dateString);
    return format(date, "EEEE d MMMM yyyy 'à' HH'h'mm", { locale: fr });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'UPCOMING':
        return 'bg-blue-500';
      case 'CANCELLED':
        return 'bg-red-500';
      case 'COMPLETED':
        return 'bg-gray-500';
      default:
        return 'bg-blue-500';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'UPCOMING':
        return 'À venir';
      case 'CANCELLED':
        return 'Annulé';
      case 'COMPLETED':
        return 'Terminé';
      default:
        return 'À venir';
    }
  };

  const handleShare = (platform: string) => {
    const eventUrl = window.location.href;
    const eventTitle = event?.title || 'Événement DJ Larian';

    switch (platform) {
      case 'facebook':
        window.open(
          `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(eventUrl)}`,
          '_blank'
        );
        break;
      case 'twitter':
        window.open(
          `https://twitter.com/intent/tweet?url=${encodeURIComponent(eventUrl)}&text=${encodeURIComponent(`Découvrez cet événement : ${eventTitle}`)}`,
          '_blank'
        );
        break;
      case 'copy':
        navigator.clipboard.writeText(eventUrl).then(() => {
          setCopySuccess(true);
          setTimeout(() => setCopySuccess(false), 2000);
        });
        break;
    }

    setShowShareOptions(false);
  };

  // Formater la date
  const formatDate = (dateString: string) => {
    logger.debug(`formatDate called with: ${dateString}`);
    return format(parseISO(dateString), 'dd MMMM yyyy à HH:mm', { locale: fr });
  };

  // Afficher un état de chargement
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black p-8 pt-32">
        <div className="container mx-auto">
          <div className="flex justify-center items-center min-h-[40vh]">
            <div className="animate-pulse flex flex-col items-center">
              <Loader2 className="w-12 h-12 text-purple-500 mb-4 animate-spin" />
              <h2 className="text-2xl font-semibold text-white">Chargement de l'événement...</h2>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Afficher un message d'erreur
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black p-8 pt-32">
        <div className="container mx-auto">
          <div className="flex justify-center items-center min-h-[40vh]">
            <div className="bg-red-500/10 border border-red-500/50 p-8 rounded-lg text-center max-w-lg">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-2xl font-semibold text-white mb-2">
                {error === 'Événement non trouvé'
                  ? 'Événement non trouvé'
                  : 'Une erreur est survenue'}
              </h2>
              <p className="text-gray-300 mb-6">
                {error === 'Événement non trouvé'
                  ? 'L&apos;événement que vous recherchez n&apos;existe pas ou a été supprimé.'
                  : error}
              </p>
              <Link
                href="/events"
                className="px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors inline-flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Retour aux événements
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Si l'événement n'est pas trouvé
  if (!event) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black p-8 pt-32">
        <div className="container mx-auto">
          <div className="flex justify-center items-center min-h-[40vh]">
            <div className="bg-gray-800/30 backdrop-blur-sm rounded-lg p-8 text-center max-w-lg">
              <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
              <h2 className="text-2xl font-semibold text-white mb-2">Événement non disponible</h2>
              <p className="text-gray-300 mb-6">
                Désolé, cet événement n'est pas disponible pour le moment.
              </p>
              <Link
                href="/events"
                className="px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors inline-flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Retour aux événements
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const isEventPast = isPast(parseISO(event.startDate));

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black p-4 md:p-8 pt-32">
      <div className="container mx-auto max-w-7xl">
        {/* Bouton retour */}
        <div className="mb-8">
          <Link
            href="/events"
            className="text-gray-300 hover:text-white transition-colors inline-flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour aux événements
          </Link>
        </div>

        {/* Contenu principal */}
        <div className="bg-gray-800/30 backdrop-blur-sm rounded-lg overflow-hidden border border-gray-700">
          {/* Image de couverture */}
          <div className="relative overflow-hidden" style={{ aspectRatio: '16/9' }}>
            {event.imageId ? (
              <Image
                src={getImageUrl(event.imageId) || ''}
                alt={`Image de couverture pour l'événement ${event.title}`}
                fill
                className="w-full h-full object-cover object-[50%_25%]"
                priority
                unoptimized
                onError={(e) => {
                  // Éviter la boucle infinie en masquant l&apos;image si elle n&apos;existe pas
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                }}
              />
            ) : (
              <div className="bg-gradient-to-r from-purple-900/50 to-blue-900/50 w-full h-full flex items-center justify-center">
                <CalendarIcon className="w-24 h-24 text-gray-600" />
              </div>
            )}

            {/* Badge statut */}
            <div className="absolute top-6 left-6">
              <div
                className={`${getStatusColor(event.status)} text-white px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2`}
              >
                <Clock className="w-4 h-4" />
                {getStatusLabel(event.status)}
              </div>
            </div>
          </div>

          <div className="p-6 md:p-10">
            <div className="flex justify-between items-start">
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-6 font-audiowide bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-blue-400">
                {event.title}
              </h1>

              {/* Bouton de partage */}
              <div className="relative">
                <button
                  onClick={() => setShowShareOptions(!showShareOptions)}
                  className="bg-purple-100 text-purple-600 p-3 rounded-full hover:bg-purple-200"
                >
                  <FaShareAlt />
                </button>

                {showShareOptions && (
                  <div className="absolute right-0 mt-2 bg-white shadow-lg rounded-lg p-3 z-10 flex flex-col w-40">
                    <button
                      onClick={() => handleShare('facebook')}
                      className="flex items-center p-2 hover:bg-purple-100 rounded"
                    >
                      <FaFacebook className="mr-2 text-blue-600" /> Facebook
                    </button>
                    <button
                      onClick={() => handleShare('twitter')}
                      className="flex items-center p-2 hover:bg-purple-100 rounded"
                    >
                      <FaTwitter className="mr-2 text-blue-400" /> Twitter
                    </button>
                    <button
                      onClick={() => handleShare('copy')}
                      className="flex items-center p-2 hover:bg-purple-100 rounded"
                    >
                      <FaCopy className="mr-2 text-gray-600" />
                      {copySuccess ? 'Copié !' : 'Copier le lien'}
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
              {/* Informations principales */}
              <div className="lg:col-span-2">
                <div className="flex flex-wrap gap-6 mb-8">
                  <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-4 flex items-start gap-3 max-w-[300px]">
                    <FaCalendarAlt className="w-5 h-5 text-purple-400 mt-1 flex-shrink-0" />
                    <div>
                      <h3 className="text-white font-medium mb-1">Date et heure</h3>
                      <p className="text-gray-300 text-sm">{formatEventDate(event)}</p>
                      {event.endDate && (
                        <p className="text-gray-400 text-sm mt-1">
                          Jusqu'à {formatDate(event.endDate)}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-4 flex items-start gap-3 max-w-[300px]">
                    <FaMapMarkerAlt className="w-5 h-5 text-purple-400 mt-1 flex-shrink-0" />
                    <div>
                      <h3 className="text-white font-medium mb-1">Lieu</h3>
                      <p className="text-gray-300 text-sm">{event.location}</p>
                      {event.address && (
                        <p className="text-gray-400 text-sm mt-1">{event.address}</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mb-8">
                  <h2 className="text-xl font-semibold text-white mb-4">
                    À propos de cet événement
                  </h2>
                  <div className="text-gray-300 prose prose-invert max-w-none">
                    {event.description.split('\n').map((paragraph, i) => (
                      <p key={i} className="mb-3">
                        {paragraph}
                      </p>
                    ))}
                  </div>
                </div>

                {event.user && (
                  <div className="mt-10 pt-6 border-t border-gray-700/50">
                    <p className="text-gray-400 text-sm mb-4">
                      Organisé par <span className="text-purple-400">{event.user.name}</span>
                    </p>
                  </div>
                )}
              </div>

              {/* Actions et informations supplémentaires */}
              <div className="space-y-6">
                {/* Carte récapitulative */}
                <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 border border-gray-700">
                  <h3 className="text-xl font-semibold text-white mb-4">Informations</h3>

                  {/* Informations sur les billets */}
                  {event.tickets && (
                    <div className="mb-6">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-gray-300">Prix</span>
                        <span className="text-white font-medium flex items-center gap-1">
                          {event.tickets.price ? (
                            <>
                              {event.tickets.price} {event.tickets.currency}
                              <Euro className="w-4 h-4 text-purple-400" />
                            </>
                          ) : (
                            'Gratuit'
                          )}
                        </span>
                      </div>

                      {/* Lien pour acheter des billets */}
                      {event.tickets.buyUrl && !isEventPast && (
                        <a
                          href={event.tickets.buyUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-gradient-to-r from-purple-600 to-purple-800 hover:from-purple-500 hover:to-purple-700 text-white w-full py-3 rounded-lg text-center font-medium flex items-center justify-center gap-2 transition-all hover:scale-105 shadow-md shadow-purple-900/20"
                        >
                          Acheter des billets
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  )}

                  {/* Status de l'événement */}
                  <div className="mb-6">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-gray-300">Statut</span>
                      <span
                        className={`font-medium ${
                          event.status === 'UPCOMING'
                            ? 'text-blue-400'
                            : event.status === 'COMPLETED'
                              ? 'text-green-400'
                              : 'text-red-400'
                        }`}
                      >
                        {event.status === 'UPCOMING'
                          ? 'À venir'
                          : event.status === 'COMPLETED'
                            ? 'Terminé'
                            : 'Annulé'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Autres événements */}
                <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 border border-gray-700">
                  <h3 className="text-lg font-semibold text-white mb-4">Autres événements</h3>

                  <Link
                    href="/events"
                    className="text-purple-400 hover:text-purple-300 transition-colors flex items-center gap-2"
                  >
                    Voir tous les événements
                    <ArrowLeft className="w-4 h-4 transform rotate-180" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
