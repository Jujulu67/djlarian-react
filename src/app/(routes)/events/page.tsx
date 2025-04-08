'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { FaCalendarAlt, FaMapMarkerAlt } from 'react-icons/fa';
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
} from 'lucide-react';

// Types
type Event = {
  id: string;
  title: string;
  description: string;
  location: string;
  address?: string;
  startDate: string;
  endDate?: string;
  image?: string;
  status: string;
  isPublished: boolean;
  featured?: boolean;
  tickets?: {
    price?: number;
    currency: string;
    buyUrl?: string;
    quantity?: number;
  };
};

export default function EventsPage() {
  const searchParams = useSearchParams();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string>(searchParams.get('status') || 'all');
  const [showFilters, setShowFilters] = useState(false);

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

        const data = await response.json();

        // Trier les événements pour mettre ceux en avant en premier
        const sortedEvents = data.sort((a: Event, b: Event) => {
          // Événements mis en avant en premier
          if (a.featured && !b.featured) return -1;
          if (!a.featured && b.featured) return 1;

          // Puis par date (les prochains événements d'abord)
          return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
        });

        setEvents(sortedEvents);
      } catch (err) {
        console.error('Erreur:', err);
        setError('Impossible de charger les événements. Veuillez réessayer plus tard.');
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, [selectedStatus]);

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
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black p-8 pt-32">
        <div className="container mx-auto">
          <div className="flex justify-center items-center min-h-[40vh]">
            <div className="animate-pulse flex flex-col items-center">
              <Loader2 className="w-12 h-12 text-purple-500 mb-4 animate-spin" />
              <h2 className="text-2xl font-semibold text-white">Chargement des événements...</h2>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black p-8 pt-32">
        <div className="container mx-auto">
          <div className="flex justify-center items-center min-h-[40vh]">
            <div className="bg-red-500/10 border border-red-500/50 p-8 rounded-lg text-center max-w-lg">
              <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-2xl font-semibold text-white mb-2">Une erreur est survenue</h2>
              <p className="text-gray-300 mb-6">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors inline-flex items-center gap-2"
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
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black p-8 pt-32">
      <div className="container mx-auto">
        {/* En-tête */}
        <div className="mb-12 text-center">
          <h1 className="text-5xl font-bold text-white mb-4 font-audiowide bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-blue-400">
            Événements
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Découvrez les prochaines dates de DJ Larian et rejoignez-nous pour des soirées
            électroniques inoubliables.
          </p>
        </div>

        {/* Filtres et recherche */}
        <div className="mb-12">
          <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
            <div className="relative w-full md:w-1/2">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher un événement..."
                className="bg-gray-800/50 backdrop-blur-sm text-white w-full pl-12 pr-4 py-3 rounded-full border border-gray-700 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
              />
            </div>

            <div className="flex gap-4 w-full md:w-auto">
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-full p-1 flex items-center border border-gray-700">
                <button
                  onClick={() => handleStatusChange('all')}
                  className={`px-4 py-2 rounded-full text-sm font-medium ${
                    selectedStatus === 'all'
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Tous
                </button>
                <button
                  onClick={() => handleStatusChange('UPCOMING')}
                  className={`px-4 py-2 rounded-full text-sm font-medium ${
                    selectedStatus === 'UPCOMING'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  À venir
                </button>
                <button
                  onClick={() => handleStatusChange('COMPLETED')}
                  className={`px-4 py-2 rounded-full text-sm font-medium ${
                    selectedStatus === 'COMPLETED'
                      ? 'bg-gray-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Terminés
                </button>
                <button
                  onClick={() => handleStatusChange('CANCELLED')}
                  className={`px-4 py-2 rounded-full text-sm font-medium ${
                    selectedStatus === 'CANCELLED'
                      ? 'bg-red-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Annulés
                </button>
              </div>

              <button
                onClick={() => setShowFilters(!showFilters)}
                className="bg-gray-800/50 backdrop-blur-sm p-3 rounded-full border border-gray-700 hover:border-purple-500 transition-all"
                aria-label="Plus de filtres"
              >
                <Filter className="w-5 h-5 text-gray-300" />
              </button>
            </div>
          </div>

          {/* Filtres additionnels */}
          {showFilters && (
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 mt-4 border border-gray-700 animate-fadeIn">
              <h3 className="text-lg font-medium text-white mb-4">Filtres additionnels</h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Lieu</label>
                  <select className="bg-gray-900 text-white w-full px-4 py-2 rounded-lg border border-gray-700 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all">
                    <option value="">Tous les lieux</option>
                    {/* Options dynamiques basées sur les lieux disponibles */}
                    <option value="Paris">Paris</option>
                    <option value="Lyon">Lyon</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Date</label>
                  <select className="bg-gray-900 text-white w-full px-4 py-2 rounded-lg border border-gray-700 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all">
                    <option value="">Toutes les dates</option>
                    <option value="this-week">Cette semaine</option>
                    <option value="this-month">Ce mois-ci</option>
                    <option value="next-month">Mois prochain</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Prix</label>
                  <select className="bg-gray-900 text-white w-full px-4 py-2 rounded-lg border border-gray-700 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all">
                    <option value="">Tous les prix</option>
                    <option value="free">Gratuit</option>
                    <option value="paid">Payant</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Liste des événements */}
        {events.length === 0 ? (
          <div className="bg-gray-800/30 backdrop-blur-sm rounded-lg p-8 border border-gray-700 text-center">
            <Calendar className="w-16 h-16 text-gray-500 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-white mb-2">Aucun événement trouvé</h2>
            <p className="text-gray-400 mb-6">
              {selectedStatus === 'all'
                ? 'Aucun événement disponible pour le moment'
                : `Aucun événement ${selectedStatus === 'UPCOMING' ? 'à venir' : selectedStatus === 'COMPLETED' ? 'passé' : 'trouvé'}`}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {events.map((event) => (
              <Link
                key={event.id}
                href={`/events/${event.id}`}
                className="bg-gray-800/30 backdrop-blur-sm rounded-lg overflow-hidden border border-gray-700 hover:border-purple-500/50 transition-all group"
              >
                <div className="relative overflow-hidden" style={{ aspectRatio: '16/9' }}>
                  {event.image ? (
                    <img
                      src={event.image}
                      alt={event.title}
                      className="w-full h-full object-cover object-center"
                      style={{ objectPosition: '50% 25%' }}
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-r from-purple-900/30 to-blue-900/30 flex items-center justify-center">
                      <Calendar className="w-16 h-16 text-gray-600" />
                    </div>
                  )}

                  {/* Badge statut */}
                  <div className="absolute top-4 left-4">
                    {event.status === 'UPCOMING' && (
                      <span className="bg-blue-500/80 backdrop-blur-sm text-white px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                        <Clock className="w-3 h-3" />À venir
                      </span>
                    )}
                    {event.status === 'COMPLETED' && (
                      <span className="bg-green-500/80 backdrop-blur-sm text-white px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        Terminé
                      </span>
                    )}
                    {event.status === 'CANCELLED' && (
                      <span className="bg-red-500/80 backdrop-blur-sm text-white px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                        <XCircle className="w-3 h-3" />
                        Annulé
                      </span>
                    )}
                  </div>

                  {/* Badges prix et featured */}
                  <div className="absolute top-4 right-4 flex gap-2">
                    {event.featured && (
                      <span className="bg-yellow-500/80 backdrop-blur-sm text-white px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                        <Star className="w-3 h-3" />
                        En avant
                      </span>
                    )}
                    {event.tickets?.price && (
                      <span className="bg-purple-500/80 backdrop-blur-sm text-white px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                        <Euro className="w-3 h-3" />
                        {event.tickets.price} {event.tickets.currency}
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-6">
                  <h3 className="text-xl font-bold text-white mb-2 group-hover:text-purple-400 transition-colors">
                    {event.title}
                  </h3>

                  <div className="flex items-center text-gray-400 mb-3">
                    <Calendar className="w-4 h-4 mr-2" />
                    <span>{formatDate(event.startDate)}</span>
                  </div>

                  <div className="flex items-center text-gray-400 mb-3">
                    <MapPin className="w-4 h-4 mr-2" />
                    <span>{event.location}</span>
                  </div>

                  <p className="text-gray-300 mb-4 line-clamp-2">
                    {event.description || 'Aucune description disponible.'}
                  </p>

                  <div className="flex justify-between items-center mt-4">
                    <span className="text-purple-400 group-hover:text-purple-300 transition-colors text-sm font-medium flex items-center gap-1">
                      Voir les détails
                      <ChevronDown className="w-4 h-4 transform -rotate-90" />
                    </span>

                    {event.tickets?.buyUrl && !isPastEvent(event.startDate) && (
                      <a
                        href={event.tickets.buyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-3 py-1 rounded-lg text-sm font-medium flex items-center gap-1 transition-all hover:scale-105"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Billets
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
