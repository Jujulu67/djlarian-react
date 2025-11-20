'use client';

import { format, parseISO, addDays, addMonths } from 'date-fns';
import { fr } from 'date-fns/locale';
import { motion } from 'framer-motion';
import {
  Calendar,
  Search,
  Clock,
  MapPin,
  Euro,
  Filter,
  ExternalLink,
  ChevronDown,
  CheckCircle,
  XCircle,
  Loader2,
  Star,
  Music,
  Calendar as CalendarIcon,
  Sparkles,
  Eye,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';

import { logger } from '@/lib/logger';

// Types
type RecurrenceConfig = {
  frequency: 'weekly' | 'monthly';
  day?: number;
  endDate?: string;
  excludedDates?: string[];
};

type Event = {
  id: string;
  title: string;
  description: string;
  location: string;
  address?: string;
  startDate: string;
  endDate?: string;
  status: string;
  isPublished: boolean;
  featured?: boolean;
  tickets?: {
    price?: number;
    currency: string;
    buyUrl?: string;
    quantity?: number;
  };
  isMasterEvent?: boolean;
  isRecurringMaster?: boolean;
  recurrenceConfig?: RecurrenceConfig;
  master?: { id: string };
  isVirtualOccurrence?: boolean;
  virtualStartDate?: string;
  masterId?: string;
  imageId?: string;
  updatedAt?: string;
};

export default function EventsPage() {
  const searchParams = useSearchParams();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string>(searchParams.get('status') || 'all');
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const itemsPerPageOptions = [20, 50, 100];

  // Générer des occurrences virtuelles pour les événements récurrents
  function generateVirtualOccurrences(events: Event[]): Event[] {
    const allEvents: Event[] = [];

    for (const event of events) {
      // Marquer l'événement maître comme récurrent pour l'affichage
      if (event.isMasterEvent && event.recurrenceConfig) {
        allEvents.push({
          ...event,
          // On préserve cette propriété pour le badge d'UI
          isRecurringMaster: true,
        });
      } else {
        // Ajouter l'événement d'origine non-récurrent tel quel
        allEvents.push(event);
      }

      // Générer des occurrences virtuelles si c'est un événement maître avec une config de récurrence
      if (event.isMasterEvent && event.recurrenceConfig) {
        const masterEvent = event;
        const recurrenceConfig = masterEvent.recurrenceConfig as RecurrenceConfig;
        const occurrences = generateRecurringDatesForEvent(
          masterEvent,
          recurrenceConfig,
          recurrenceConfig.excludedDates || []
        );

        // Ajouter chaque occurrence comme un événement virtuel
        for (const occurrence of occurrences) {
          // Générer un ID spécial pour les occurrences virtuelles en utilisant un format clair
          // Nous séparons l'ID et la date avec "___VIRTUAL___" pour éviter toute ambiguïté
          const occurrenceDate = occurrence.toISOString();
          const virtualEventId = `${masterEvent.id}___VIRTUAL___${occurrenceDate}`;
          logger.debug(`Generated virtual event ID: ${virtualEventId}`);

          const virtualEvent: Event = {
            ...masterEvent,
            id: virtualEventId,
            startDate: occurrenceDate,
            // Calculer la date de fin si l'événement original en a une
            endDate: masterEvent.endDate
              ? calculateEndDate(
                  occurrence,
                  new Date(masterEvent.startDate),
                  new Date(masterEvent.endDate)
                )
              : undefined,
            isVirtualOccurrence: true,
            virtualStartDate: occurrenceDate,
            masterId: masterEvent.id,
          };

          // Vérifier si cette occurrence est dans le futur et si la date n'est pas exclue
          if (new Date(virtualEvent.startDate) >= new Date()) {
            allEvents.push(virtualEvent);
          }
        }
      }
    }

    // Trier tous les événements par date
    return allEvents.sort(
      (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
    );
  }

  // Fonction pour calculer la date de fin d'une occurrence
  function calculateEndDate(occurrenceStart: Date, originalStart: Date, originalEnd: Date): string {
    // Calculer la durée de l'événement original
    const duration = originalEnd.getTime() - originalStart.getTime();

    // Ajouter cette durée à la date de début de l'occurrence
    const newEndDate = new Date(occurrenceStart.getTime() + duration);

    return newEndDate.toISOString();
  }

  // Fonction pour générer les dates récurrentes d'un événement
  function generateRecurringDatesForEvent(
    event: Event,
    recurrence: RecurrenceConfig,
    excludedDates: string[] = []
  ): Date[] {
    const dates: Date[] = [];
    const startDate = new Date(event.startDate);
    const endDate = recurrence.endDate ? new Date(recurrence.endDate) : null;

    // Date de début (on ignore la première occurrence car c'est l'événement maître)
    let currentDate = new Date(startDate);

    // Passer à la prochaine occurrence
    if (recurrence.frequency === 'weekly') {
      currentDate = addDays(currentDate, 7);
    } else if (recurrence.frequency === 'monthly') {
      currentDate = addMonths(currentDate, 1);
    }

    // Calculer la date limite maximum selon la fréquence:
    // - 6 semaines pour les événements hebdomadaires
    // - 6 mois pour les événements mensuels
    const maxDate = new Date();
    if (recurrence.frequency === 'weekly') {
      maxDate.setDate(maxDate.getDate() + 42); // 6 semaines = 42 jours
    } else {
      maxDate.setMonth(maxDate.getMonth() + 6); // 6 mois pour les mensuels
    }

    // Générer des dates en fonction de la fréquence
    while ((!endDate || currentDate <= endDate) && currentDate <= maxDate) {
      // Vérifier si cette date n'est pas exclue
      const dateString = currentDate.toISOString().split('T')[0];
      if (!excludedDates.includes(dateString)) {
        dates.push(new Date(currentDate));
      }

      // Passer à la prochaine date selon la fréquence
      if (recurrence.frequency === 'weekly') {
        currentDate = addDays(currentDate, 7);
      } else if (recurrence.frequency === 'monthly') {
        currentDate = addMonths(currentDate, 1);
      }
    }

    return dates;
  }

  // Récupérer les événements depuis l'API
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoading(true);

        // Construire l'URL avec les paramètres
        let url = '/api/events';
        const params = new URLSearchParams();

        // Toujours récupérer les événements publiés
        params.append('isPublished', 'true');

        // Filtrer par statut si différent de 'all'
        if (selectedStatus !== 'all') {
          params.append('status', selectedStatus);
        }

        // Ajouter les paramètres à l'URL
        if (params.toString()) {
          url += `?${params.toString()}`;
        }

        const response = await fetch(url);
        if (!response.ok) {
          throw new Error('Erreur lors du chargement des événements');
        }

        const result = await response.json();
        // La réponse API utilise createSuccessResponse qui retourne { data: { events: [...], pagination: {...} } }
        const fetchedEvents = result.data?.events || [];

        // Générer les occurrences virtuelles
        const eventsWithVirtualOccurrences = generateVirtualOccurrences(fetchedEvents);

        // Trier les événements pour mettre ceux en avant en premier
        const sortedEvents = eventsWithVirtualOccurrences.sort((a: Event, b: Event) => {
          // Événements mis en avant en premier (mais seulement les non-virtuels)
          if (a.featured && !b.featured && !a.isVirtualOccurrence) return -1;
          if (!a.featured && b.featured && !b.isVirtualOccurrence) return 1;

          // Puis par date (les prochains événements d'abord)
          return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
        });

        setEvents(sortedEvents);
      } catch (err) {
        logger.error('Erreur:', err);
        setError('Impossible de charger les événements. Veuillez réessayer plus tard.');
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStatus]);

  // Filtrer les événements par recherche
  const filteredEvents = events.filter((event) => {
    if (!searchTerm) return true;

    const searchTermLower = searchTerm.toLowerCase();
    return (
      event.title.toLowerCase().includes(searchTermLower) ||
      event.description?.toLowerCase().includes(searchTermLower) ||
      event.location.toLowerCase().includes(searchTermLower)
    );
  });

  // Pagination des événements filtrés
  const indexOfLastEvent = currentPage * itemsPerPage;
  const indexOfFirstEvent = indexOfLastEvent - itemsPerPage;
  const currentEvents = filteredEvents.slice(indexOfFirstEvent, indexOfLastEvent);
  const totalPages = Math.ceil(filteredEvents.length / itemsPerPage);

  // Changer de page
  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  // Formater la date
  const formatEventDate = (dateString: string) => {
    const date = parseISO(dateString);
    return format(date, 'd MMMM yyyy', { locale: fr });
  };

  // Obtenir le libellé du statut
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'UPCOMING':
        return 'À venir';
      case 'CANCELLED':
        return 'Annulé';
      case 'COMPLETED':
        return 'Terminé';
      default:
        return status;
    }
  };

  // Obtenir la couleur du badge selon le statut
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

  // Gérer le changement de filtre de statut
  const handleStatusChange = (status: string) => {
    setSelectedStatus(status);
  };

  // Formater la date
  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'dd MMMM yyyy à HH:mm', { locale: fr });
  };

  // Vérifier si un événement est passé
  const isPastEvent = (dateString: string) => {
    return new Date(dateString) < new Date();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black p-8">
        <div className="container mx-auto max-w-6xl">
          <div className="flex justify-center items-center min-h-[60vh]">
            <div className="animate-pulse flex flex-col items-center">
              <div className="relative">
                <div className="absolute inset-0 bg-purple-500 blur-xl opacity-20 rounded-full"></div>
                <Loader2 className="w-16 h-16 text-purple-500 mb-4 animate-spin relative z-10" />
              </div>
              <h2 className="text-2xl font-semibold text-white mt-4">
                Chargement des événements...
              </h2>
              <p className="text-gray-400 mt-2">Préparez-vous à vivre des expériences uniques</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black p-8">
        <div className="container mx-auto max-w-6xl">
          <div className="flex justify-center items-center min-h-[60vh]">
            <div className="bg-gray-800/40 backdrop-blur-sm border border-red-500/30 p-8 rounded-xl text-center max-w-lg shadow-xl">
              <div className="w-20 h-20 mx-auto bg-red-500/10 rounded-full flex items-center justify-center mb-6">
                <XCircle className="w-10 h-10 text-red-500" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-3">Une erreur est survenue</h2>
              <p className="text-gray-300 mb-6">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-800 hover:from-purple-500 hover:to-purple-700 text-white rounded-lg transition-all duration-300 inline-flex items-center gap-2 shadow-lg shadow-purple-900/30"
              >
                Réessayer
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black p-8 pt-28 pb-20">
      <div className="container mx-auto max-w-6xl">
        {/* Titre avec animation et icône */}
        <div className="relative mb-4">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-4xl md:text-5xl font-bold text-center bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent"
          >
            Événements
          </motion.h1>
          <Sparkles className="absolute top-0 right-[calc(50%-150px)] md:right-[calc(50%-180px)] w-8 h-8 md:w-10 md:h-10 text-yellow-400 transform -translate-y-1 animate-pulse" />
        </div>

        {/* Sous-titre */}
        <p className="text-gray-400 text-center mb-10 max-w-2xl mx-auto">
          Découvrez les prochaines dates de DJ Larian et rejoignez-nous pour des soirées
          électroniques inoubliables.
        </p>

        {/* Filtres et recherche */}
        <div className="mb-12">
          <div className="bg-gray-800/30 backdrop-blur-md border border-gray-700/50 rounded-2xl p-6 shadow-xl">
            <div className="flex flex-col md:flex-row gap-5 justify-between items-start md:items-center">
              <div className="relative w-full md:w-1/2">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Rechercher un événement..."
                  className="bg-gray-900/70 text-white w-full pl-12 pr-4 py-3 rounded-xl border border-gray-700/70 focus:border-purple-500/70 focus:ring-1 focus:ring-purple-500/70 transition-all shadow-inner"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="flex flex-wrap gap-3 w-full md:w-auto justify-end">
                <div className="bg-gray-800/70 backdrop-blur-md rounded-xl p-1.5 flex items-center border border-gray-700/70 shadow-lg">
                  <button
                    onClick={() => handleStatusChange('all')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      selectedStatus === 'all'
                        ? 'bg-gradient-to-r from-purple-600 to-purple-800 text-white shadow-md'
                        : 'text-gray-300 hover:bg-gray-700/60'
                    }`}
                  >
                    Tous
                  </button>
                  <button
                    onClick={() => handleStatusChange('UPCOMING')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      selectedStatus === 'UPCOMING'
                        ? 'bg-gradient-to-r from-blue-600 to-blue-800 text-white shadow-md'
                        : 'text-gray-300 hover:bg-gray-700/60'
                    }`}
                  >
                    À venir
                  </button>
                  <button
                    onClick={() => handleStatusChange('COMPLETED')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      selectedStatus === 'COMPLETED'
                        ? 'bg-gradient-to-r from-gray-600 to-gray-800 text-white shadow-md'
                        : 'text-gray-300 hover:bg-gray-700/60'
                    }`}
                  >
                    Terminés
                  </button>
                  <button
                    onClick={() => handleStatusChange('CANCELLED')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      selectedStatus === 'CANCELLED'
                        ? 'bg-gradient-to-r from-red-600 to-red-800 text-white shadow-md'
                        : 'text-gray-300 hover:bg-gray-700/60'
                    }`}
                  >
                    Annulés
                  </button>
                </div>

                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`bg-gray-800/70 p-3 rounded-xl border transition-all ${
                    showFilters
                      ? 'border-purple-500/70 text-purple-400'
                      : 'border-gray-700/70 text-gray-300 hover:border-gray-500/70'
                  }`}
                  aria-label="Plus de filtres"
                >
                  <Filter className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Filtres additionnels */}
            {showFilters && (
              <div className="mt-6 pt-6 border-t border-gray-700/50 animate-fadeIn">
                <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                  <span className="w-8 h-8 bg-purple-500/10 rounded-full flex items-center justify-center">
                    <Filter className="w-4 h-4 text-purple-400" />
                  </span>
                  Filtres additionnels
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Lieu</label>
                    <select className="bg-gray-900/70 text-white w-full px-4 py-2.5 rounded-xl border border-gray-700/70 focus:border-purple-500/70 focus:ring-1 focus:ring-purple-500/70 transition-all shadow-inner">
                      <option value="">Tous les lieux</option>
                      <option value="Paris">Paris</option>
                      <option value="Lyon">Lyon</option>
                      <option value="Marseille">Marseille</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Date</label>
                    <select className="bg-gray-900/70 text-white w-full px-4 py-2.5 rounded-xl border border-gray-700/70 focus:border-purple-500/70 focus:ring-1 focus:ring-purple-500/70 transition-all shadow-inner">
                      <option value="">Toutes les dates</option>
                      <option value="this-week">Cette semaine</option>
                      <option value="this-month">Ce mois-ci</option>
                      <option value="next-month">Mois prochain</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Prix</label>
                    <select className="bg-gray-900/70 text-white w-full px-4 py-2.5 rounded-xl border border-gray-700/70 focus:border-purple-500/70 focus:ring-1 focus:ring-purple-500/70 transition-all shadow-inner">
                      <option value="">Tous les prix</option>
                      <option value="free">Gratuit</option>
                      <option value="paid">Payant</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Liste des événements */}
        {filteredEvents.length === 0 ? (
          <div className="bg-gray-800/30 backdrop-blur-sm rounded-xl p-10 border border-gray-700/50 text-center shadow-xl">
            <div className="w-24 h-24 mx-auto bg-gray-700/30 rounded-full flex items-center justify-center mb-6">
              <Calendar className="w-12 h-12 text-gray-500" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">Aucun événement trouvé</h2>
            <p className="text-gray-400 mb-6 max-w-md mx-auto">
              {searchTerm
                ? `Aucun résultat ne correspond à &quot;${searchTerm}&quot;`
                : selectedStatus === 'all'
                  ? 'Aucun événement disponible pour le moment'
                  : `Aucun événement ${selectedStatus === 'UPCOMING' ? 'à venir' : selectedStatus === 'COMPLETED' ? 'passé' : 'annulé'}`}
            </p>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="px-6 py-2.5 bg-purple-600/80 hover:bg-purple-500/80 text-white rounded-lg transition-colors inline-flex items-center gap-2"
              >
                Effacer la recherche
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Sélection du nombre d'éléments par page */}
            <div className="flex justify-between items-center mb-6">
              <div className="text-sm text-gray-400">
                Affichage de {indexOfFirstEvent + 1}-
                {Math.min(indexOfLastEvent, filteredEvents.length)} sur {filteredEvents.length}{' '}
                événements
              </div>
              <div className="flex items-center gap-3">
                <label htmlFor="itemsPerPage" className="text-sm text-gray-300">
                  Événements par page:
                </label>
                <select
                  id="itemsPerPage"
                  className="bg-gray-800/70 text-white rounded-lg px-3 py-1.5 border border-gray-700/50 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500"
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1); // Retour à la première page lors du changement
                  }}
                >
                  {itemsPerPageOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {currentEvents.map((event) => (
                <div
                  key={event.id}
                  className="group relative bg-gray-800/30 backdrop-blur-sm rounded-xl overflow-hidden border border-gray-700/50 hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-500/10 transition-all transform hover:-translate-y-1 duration-300"
                >
                  {/* Image avec effet de zoom au survol */}
                  <div
                    className="relative overflow-hidden rounded-t-2xl"
                    style={{ aspectRatio: '16/9' }}
                  >
                    {event.imageId ? (
                      <Image
                        src={`/uploads/${event.imageId}.jpg`}
                        alt={event.title}
                        fill
                        className="w-full h-full object-cover object-[50%_25%] group-hover:scale-105 transition-transform duration-500"
                        unoptimized
                        onError={(e) => {
                          // Éviter la boucle infinie en masquant l'image si elle n'existe pas
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-r from-gray-800 to-gray-700 flex items-center justify-center">
                        <Calendar className="w-16 h-16 text-gray-600" />
                      </div>
                    )}

                    {/* Overlay sombre pour mieux voir les badges */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent opacity-60 group-hover:opacity-70 transition-opacity"></div>

                    {/* Badge statut */}
                    <div className="absolute top-4 left-4">
                      {event.status === 'UPCOMING' && (
                        <span className="bg-blue-600/90 backdrop-blur-sm text-white px-3.5 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 shadow-lg">
                          <Clock className="w-3.5 h-3.5" />À venir
                        </span>
                      )}
                      {event.status === 'COMPLETED' && (
                        <span className="bg-gray-600/90 backdrop-blur-sm text-white px-3.5 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 shadow-lg">
                          <CheckCircle className="w-3.5 h-3.5" />
                          Terminé
                        </span>
                      )}
                      {event.status === 'CANCELLED' && (
                        <span className="bg-red-600/90 backdrop-blur-sm text-white px-3.5 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 shadow-lg">
                          <XCircle className="w-3.5 h-3.5" />
                          Annulé
                        </span>
                      )}
                    </div>

                    {/* Badges prix et featured */}
                    <div className="absolute top-4 right-4 flex gap-2">
                      {event.featured && (
                        <span className="bg-yellow-500/90 backdrop-blur-sm text-white px-3.5 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 shadow-lg">
                          <Star className="w-3.5 h-3.5" />
                          En avant
                        </span>
                      )}
                      {event.tickets?.price && (
                        <span className="bg-purple-600/90 backdrop-blur-sm text-white px-3.5 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 shadow-lg">
                          <Euro className="w-3.5 h-3.5" />
                          {event.tickets.price} {event.tickets.currency}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="p-6">
                    <h3 className="text-xl font-bold text-white mb-3 group-hover:text-purple-300 transition-colors line-clamp-1">
                      {event.title}
                    </h3>

                    <div className="flex items-center text-gray-400 mb-3 text-sm">
                      <CalendarIcon className="w-4 h-4 mr-2 flex-shrink-0" />
                      <span>{formatDate(event.startDate)}</span>
                    </div>

                    <div className="flex items-start text-gray-400 mb-4 text-sm">
                      <MapPin className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                      <span>{event.location}</span>
                    </div>

                    <p className="text-gray-300 mb-6 line-clamp-2 text-sm">
                      {event.description || 'Aucune description disponible.'}
                    </p>

                    <div className="flex justify-between items-center">
                      <span className="text-purple-400 group-hover:text-purple-300 transition-colors text-sm font-medium flex items-center">
                        <Eye className="w-4 h-4 mr-1.5" />
                        Voir l'événement
                      </span>

                      {event.tickets?.buyUrl && !isPastEvent(event.startDate) && (
                        <a
                          href={event.tickets.buyUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-gradient-to-r from-purple-600 to-purple-800 hover:from-purple-500 hover:to-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-all hover:scale-105 shadow-md shadow-purple-900/20"
                        >
                          Billets
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Effet de brillance au survol */}
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-500/0 via-purple-500/5 to-purple-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>

                  {/* Lien qui couvre toute la carte, sauf pour le bouton d'achat de billets */}
                  <Link
                    href={
                      event.isVirtualOccurrence && event.virtualStartDate
                        ? `/events/${event.masterId}?date=${encodeURIComponent(event.virtualStartDate)}` // URL propre avec paramètre de requête
                        : `/events/${event.id}`
                    }
                    className="absolute inset-0 z-10"
                    aria-label={`Voir les détails de l'événement: ${event.title}`}
                    onClick={(e) => {
                      // Empêcher la navigation si l'utilisateur clique sur le bouton d'achat de billets
                      if ((e.target as HTMLElement).closest('a[href^="http"]')) {
                        e.preventDefault();
                      }
                    }}
                  >
                    <span className="sr-only">Voir les détails</span>
                  </Link>

                  {/* Add badge for virtual occurrence */}
                  {event.isVirtualOccurrence && (
                    <div className="absolute top-2 right-2 z-10">
                      <span className="bg-purple-500/80 text-white text-xs px-2 py-1 rounded-full backdrop-blur-sm">
                        Récurrent
                      </span>
                    </div>
                  )}

                  {/* Badge for recurring events (both master and virtual occurrences) */}
                  {(event.isVirtualOccurrence || event.isRecurringMaster) && (
                    <div className="absolute top-4 right-4 z-10 flex gap-2">
                      <span className="bg-purple-500/80 text-white text-xs px-3 py-1.5 rounded-full backdrop-blur-sm flex items-center gap-1.5 shadow-lg">
                        <CalendarIcon className="w-3.5 h-3.5" />
                        Récurrent{' '}
                        {event.recurrenceConfig?.frequency === 'weekly' ? '(hebdo)' : '(mensuel)'}
                      </span>
                      {/* ... other badges ... */}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-10 flex justify-center">
                <div className="flex flex-wrap justify-center gap-2">
                  {/* Bouton précédent */}
                  <button
                    onClick={() => paginate(currentPage - 1)}
                    disabled={currentPage === 1}
                    className={`px-3 py-2 rounded-lg text-sm ${
                      currentPage === 1
                        ? 'bg-gray-800/50 text-gray-500 cursor-not-allowed'
                        : 'bg-gray-800/80 text-white hover:bg-purple-600/70'
                    }`}
                  >
                    Précédent
                  </button>

                  {/* Numéros de page */}
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNumber) => {
                    // Afficher uniquement les 3 premières pages, les 3 dernières et la page courante ± 1
                    if (
                      pageNumber <= 3 ||
                      pageNumber > totalPages - 3 ||
                      Math.abs(pageNumber - currentPage) <= 1
                    ) {
                      return (
                        <button
                          key={pageNumber}
                          onClick={() => paginate(pageNumber)}
                          className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm ${
                            currentPage === pageNumber
                              ? 'bg-gradient-to-r from-purple-600 to-purple-800 text-white font-semibold'
                              : 'bg-gray-800/80 text-white hover:bg-gray-700/80'
                          }`}
                        >
                          {pageNumber}
                        </button>
                      );
                    } else if (
                      (pageNumber === 4 && currentPage < 4) ||
                      (pageNumber === totalPages - 3 && currentPage > totalPages - 3)
                    ) {
                      // Afficher des points de suspension pour indiquer des pages manquantes
                      return (
                        <span
                          key={pageNumber}
                          className="w-10 h-10 flex items-center justify-center text-gray-400"
                        >
                          ...
                        </span>
                      );
                    }
                    return null;
                  })}

                  {/* Bouton suivant */}
                  <button
                    onClick={() => paginate(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className={`px-3 py-2 rounded-lg text-sm ${
                      currentPage === totalPages
                        ? 'bg-gray-800/50 text-gray-500 cursor-not-allowed'
                        : 'bg-gray-800/80 text-white hover:bg-purple-600/70'
                    }`}
                  >
                    Suivant
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Section CTA en bas de page */}
        <div className="mt-16 py-10 px-8 bg-gradient-to-r from-purple-900/20 to-blue-900/20 backdrop-blur-md rounded-2xl border border-purple-500/20 text-center shadow-xl">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
            Vous organisez un événement ?
          </h2>
          <p className="text-gray-300 mb-8 max-w-2xl mx-auto">
            DJ Larian est disponible pour animer vos soirées, clubs et festivals. Contactez-nous
            pour discuter de votre projet et obtenir un devis personnalisé.
          </p>
          <a
            href="/contact"
            className="inline-flex items-center gap-2 px-8 py-3.5 bg-gradient-to-r from-purple-600 to-purple-800 hover:from-purple-500 hover:to-purple-700 text-white rounded-xl font-medium transition-all duration-300 shadow-lg shadow-purple-700/30 hover:shadow-purple-700/50 transform hover:-translate-y-1"
          >
            Nous contacter
            <ChevronDown className="w-5 h-5 transform -rotate-90" />
          </a>
        </div>
      </div>
    </div>
  );
}
