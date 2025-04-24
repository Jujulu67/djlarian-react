'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  Calendar,
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  ArrowUpDown,
  CheckCircle,
  Clock,
  XCircle,
  Star,
  Image as ImageIcon,
  MapPin,
  Euro,
  RefreshCcw,
  AlertTriangle,
} from 'lucide-react';
import Image from 'next/image';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { FaPlus, FaEdit, FaTrash, FaEye, FaCheckCircle, FaTimesCircle } from 'react-icons/fa';

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
  };
  user?: {
    name: string;
  };
  featured: boolean;
  // Propriétés pour les événements récurrents
  isMasterEvent?: boolean;
  masterId?: string;
  master?: { id: string };
  occurrences?: { id: string; startDate: string }[];
  recurrenceConfig?: {
    frequency: 'weekly' | 'monthly';
    day?: number;
    endDate?: string;
  };
  updatedAt?: string;
};

export default function AdminEventsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [publishFilter, setPublishFilter] = useState('ALL');
  const [featuredFilter, setFeaturedFilter] = useState('ALL');
  const [recurrenceFilter, setRecurrenceFilter] = useState('ALL');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [currentEvent, setCurrentEvent] = useState<Event | null>(null);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [formMessage, setFormMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<string | null>(null);

  // Rediriger si l'utilisateur n'est pas un admin
  useEffect(() => {
    if (
      status === 'unauthenticated' ||
      (status === 'authenticated' && session?.user?.role !== 'ADMIN')
    ) {
      router.push('/');
    }
  }, [session, status, router]);

  // Charger les événements
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await fetch('/api/events');

        if (!response.ok) {
          throw new Error(`Erreur ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        // Vérifier si data.events existe et est un tableau, sinon utiliser un tableau vide
        setEvents(Array.isArray(data.events) ? data.events : []);
      } catch (err) {
        setError('Erreur lors du chargement des événements');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  // Filtrer les événements en fonction des critères de recherche et des filtres
  const filteredEvents = useMemo(() => {
    // S'assurer que events est un tableau avant d'appliquer filter
    const eventsArray = Array.isArray(events) ? events : [];
    return eventsArray.filter((event) => {
      // Filtre de recherche sur le titre et la description
      const matchesSearch =
        searchTerm === '' ||
        event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (event.description && event.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (event.location && event.location.toLowerCase().includes(searchTerm.toLowerCase()));

      // Filtre de statut
      const matchesStatus = statusFilter === 'ALL' || event.status === statusFilter;

      // Filtre de publication
      const matchesPublish =
        publishFilter === 'ALL' ||
        (publishFilter === 'PUBLISHED' && event.isPublished) ||
        (publishFilter === 'DRAFT' && !event.isPublished);

      // Filtre featured
      const matchesFeatured =
        featuredFilter === 'ALL' ||
        (featuredFilter === 'FEATURED' && event.featured) ||
        (featuredFilter === 'REGULAR' && !event.featured);

      // Filtre événements récurrents
      const matchesRecurrence =
        recurrenceFilter === 'ALL' ||
        (recurrenceFilter === 'RECURRING' && event.isMasterEvent && event.recurrenceConfig) ||
        (recurrenceFilter === 'SINGLE' && (!event.isMasterEvent || !event.recurrenceConfig));

      return (
        matchesSearch && matchesStatus && matchesPublish && matchesFeatured && matchesRecurrence
      );
    });
  }, [events, searchTerm, statusFilter, publishFilter, featuredFilter, recurrenceFilter]);

  // Supprimer un événement
  const handleDeleteEvent = async () => {
    if (!eventToDelete) return;

    try {
      const response = await fetch(`/api/events/${eventToDelete}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`Erreur ${response.status}: ${response.statusText}`);
      }

      // Mettre à jour la liste des événements
      setEvents(events.filter((event) => event.id !== eventToDelete));
      setShowDeleteModal(false);
      setEventToDelete(null);
    } catch (err) {
      console.error('Erreur lors de la suppression:', err);
      setError("Erreur lors de la suppression de l'événement");
    }
  };

  // Changer le statut de publication
  const togglePublishStatus = async (eventId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/events/${eventId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isPublished: !currentStatus,
        }),
      });

      if (!response.ok) {
        throw new Error(`Erreur ${response.status}: ${response.statusText}`);
      }

      const updatedEvent = await response.json();

      // Mettre à jour la liste des événements
      setEvents(
        events.map((event) =>
          event.id === eventId ? { ...event, isPublished: updatedEvent.isPublished } : event
        )
      );
    } catch (err) {
      console.error('Erreur lors de la mise à jour:', err);
      setError("Erreur lors de la mise à jour de l'événement");
    }
  };

  // Changer le statut de mise en avant
  const toggleFeaturedStatus = async (eventId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/events/${eventId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          featured: !currentStatus,
        }),
      });

      if (!response.ok) {
        throw new Error(`Erreur ${response.status}: ${response.statusText}`);
      }

      const updatedEvent = await response.json();

      // Mettre à jour la liste des événements
      setEvents(
        events.map((event) =>
          event.id === eventId ? { ...event, featured: updatedEvent.featured } : event
        )
      );
    } catch (err) {
      console.error('Erreur lors de la mise à jour:', err);
      setError("Erreur lors de la mise à jour de l'événement");
    }
  };

  // Gérer la création/modification d'un événement
  const handleAddEditEvent = (event: Event | null, mode: 'create' | 'edit') => {
    setCurrentEvent(event);
    setFormMode(mode);
    setShowModal(true);
  };

  // Formatter la date
  const formatEventDate = (dateString: string) => {
    const date = parseISO(dateString);
    return format(date, 'd MMMM yyyy', { locale: fr });
  };

  // Obtenir la couleur du badge selon le statut
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'UPCOMING':
        return 'bg-blue-100 text-blue-800';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800';
      case 'COMPLETED':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
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

  // Réinitialiser les filtres
  const resetFilters = () => {
    setSearchTerm('');
    setStatusFilter('ALL');
    setPublishFilter('ALL');
    setFeaturedFilter('ALL');
    setRecurrenceFilter('ALL');
  };

  // Afficher un état de chargement
  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black p-8">
        <div className="container mx-auto">
          <div className="flex justify-center items-center min-h-[60vh]">
            <div className="animate-pulse flex flex-col items-center">
              <Calendar className="w-12 h-12 text-purple-500 mb-4" />
              <h2 className="text-2xl font-semibold text-white">Chargement des événements...</h2>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Afficher un message d'erreur
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black p-8">
        <div className="container mx-auto">
          <div className="flex justify-center items-center min-h-[60vh]">
            <div className="bg-red-500/10 border border-red-500/50 p-8 rounded-lg text-center">
              <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-2xl font-semibold text-white mb-2">Une erreur est survenue</h2>
              <p className="text-gray-300">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="mt-4 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors"
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
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black p-8 pt-12">
      <div className="container mx-auto max-w-6xl">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <h1 className="text-3xl font-bold text-white flex items-center gap-2">
            <Calendar className="w-8 h-8 text-purple-400" />
            Gestion des Événements
          </h1>

          <Link
            href="/admin/events/new"
            className="bg-gradient-to-r from-purple-600 to-purple-800 hover:from-purple-500 hover:to-purple-700 transition-all text-white font-medium py-2.5 px-5 rounded-full flex items-center gap-2 shadow-lg shadow-purple-700/20 hover:shadow-purple-700/30"
          >
            <Plus className="w-5 h-5" />
            Nouvel Événement
          </Link>
        </div>

        {/* Filtres et recherche */}
        <div className="mb-8 bg-gray-800/40 backdrop-blur-sm border border-gray-700/50 rounded-xl p-5 shadow-xl">
          <div className="flex flex-col gap-4">
            {/* Ligne 1: Recherche et bouton réinitialiser */}
            <div className="flex flex-col sm:flex-row gap-4 items-center">
              <div className="w-full sm:flex-1">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="Rechercher un événement..."
                    className="w-full bg-gray-900/50 text-white rounded-lg pl-10 pr-4 py-2.5 border border-gray-700/50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              <button
                onClick={resetFilters}
                className="px-4 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg flex items-center gap-2 transition-colors whitespace-nowrap"
                title="Réinitialiser tous les filtres"
              >
                <RefreshCcw className="w-4 h-4" />
                <span>Réinitialiser</span>
              </button>
            </div>

            {/* Ligne 2: Filtres */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Filtre par statut */}
              <select
                className="px-3 py-2 bg-gray-900/50 text-white rounded-lg border border-gray-700/50 focus:outline-none focus:ring-2 focus:ring-purple-500"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="ALL">Tous les statuts</option>
                <option value="UPCOMING">À venir</option>
                <option value="COMPLETED">Terminés</option>
                <option value="CANCELLED">Annulés</option>
              </select>

              {/* Filtre par publication */}
              <select
                className="px-3 py-2 bg-gray-900/50 text-white rounded-lg border border-gray-700/50 focus:outline-none focus:ring-2 focus:ring-purple-500"
                value={publishFilter}
                onChange={(e) => setPublishFilter(e.target.value)}
              >
                <option value="ALL">Tous (publiés/brouillons)</option>
                <option value="PUBLISHED">Publiés</option>
                <option value="DRAFT">Brouillons</option>
              </select>

              {/* Filtre par featured */}
              <select
                className="px-3 py-2 bg-gray-900/50 text-white rounded-lg border border-gray-700/50 focus:outline-none focus:ring-2 focus:ring-purple-500"
                value={featuredFilter}
                onChange={(e) => setFeaturedFilter(e.target.value)}
              >
                <option value="ALL">En avant (oui/non)</option>
                <option value="FEATURED">Mis en avant</option>
                <option value="REGULAR">Standards</option>
              </select>

              {/* Filtre événements récurrents */}
              <select
                className="px-3 py-2 bg-gray-900/50 text-white rounded-lg border border-gray-700/50 focus:outline-none focus:ring-2 focus:ring-purple-500"
                value={recurrenceFilter}
                onChange={(e) => setRecurrenceFilter(e.target.value)}
              >
                <option value="ALL">Récurrence (oui/non)</option>
                <option value="RECURRING">Événements récurrents</option>
                <option value="SINGLE">Événements uniques</option>
              </select>
            </div>
          </div>
        </div>

        {/* Affichage des événements ou message si aucun */}
        {events.length === 0 ? (
          <div className="bg-gray-800/30 rounded-lg p-8 text-center">
            <Calendar className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">Aucun événement trouvé</h2>
            <p className="text-gray-400 mb-6">
              Ajoutez votre premier événement ou modifiez vos filtres
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredEvents.map((event) => (
              <div
                key={event.id}
                className="group relative bg-gray-800/50 backdrop-blur-sm rounded-xl overflow-hidden border border-gray-700/70 hover:border-purple-500/70 hover:shadow-lg hover:shadow-purple-500/10 transition-all"
              >
                <div className="flex flex-col h-full">
                  {/* Image de l'événement */}
                  <div className="relative overflow-hidden" style={{ aspectRatio: '16/9' }}>
                    {event.imageId ? (
                      <img
                        src={`/uploads/${event.imageId}.jpg?t=${event.updatedAt ? new Date(event.updatedAt).getTime() : Date.now()}`}
                        alt={event.title}
                        className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                        style={{ objectPosition: '50% 25%' }}
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-r from-gray-800 to-gray-700 flex items-center justify-center">
                        <ImageIcon className="w-16 h-16 text-gray-600" />
                      </div>
                    )}

                    {/* Overlay sombre pour mieux voir les badges */}
                    <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-transparent"></div>

                    {/* Badge statut */}
                    <div className="absolute top-3 left-3">
                      {event.status === 'UPCOMING' && (
                        <span className="bg-blue-600/90 backdrop-blur-sm text-white px-3 py-1.5 rounded-full text-xs font-medium shadow-lg">
                          À venir
                        </span>
                      )}
                      {event.status === 'COMPLETED' && (
                        <span className="bg-gray-600/90 backdrop-blur-sm text-white px-3 py-1.5 rounded-full text-xs font-medium shadow-lg">
                          Terminé
                        </span>
                      )}
                      {event.status === 'CANCELLED' && (
                        <span className="bg-red-600/90 backdrop-blur-sm text-white px-3 py-1.5 rounded-full text-xs font-medium shadow-lg">
                          Annulé
                        </span>
                      )}
                    </div>

                    {/* Badge featured */}
                    {event.featured && (
                      <div className="absolute top-3 right-3">
                        <span className="bg-yellow-500/90 backdrop-blur-sm text-white px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 shadow-lg">
                          <Star className="w-3.5 h-3.5" />
                          En avant
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="p-5 flex flex-col flex-grow">
                    <h3 className="text-xl font-semibold text-white mb-2 group-hover:text-purple-300 transition-colors line-clamp-1">
                      {event.title}
                    </h3>

                    <div className="flex items-center text-gray-400 mb-3 text-sm">
                      <Calendar className="w-4 h-4 mr-2 flex-shrink-0" />
                      <span>
                        {format(new Date(event.startDate), 'dd MMMM yyyy à HH:mm', { locale: fr })}
                      </span>
                    </div>

                    <div className="flex items-start text-gray-400 mb-4 text-sm">
                      <MapPin className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                      <span>{event.location}</span>
                    </div>

                    <p className="text-gray-300 mb-5 line-clamp-2 text-sm flex-grow">
                      {event.description || 'Aucune description disponible.'}
                    </p>

                    <div className="flex flex-wrap gap-2 mb-5">
                      {event.isPublished ? (
                        <span className="bg-green-900/40 text-green-300 px-3 py-1 rounded-full text-xs border border-green-800/50">
                          Publié
                        </span>
                      ) : (
                        <span className="bg-yellow-900/40 text-yellow-300 px-3 py-1 rounded-full text-xs border border-yellow-800/50">
                          Brouillon
                        </span>
                      )}

                      {/* Badge pour les événements récurrents */}
                      {event.isMasterEvent && event.recurrenceConfig && (
                        <span className="bg-indigo-900/40 text-indigo-300 px-3 py-1 rounded-full text-xs border border-indigo-800/50 flex items-center">
                          <RefreshCcw className="w-3 h-3 mr-1" />
                          Récurrent{' '}
                          {event.recurrenceConfig.frequency === 'weekly' ? '(hebdo)' : '(mensuel)'}
                        </span>
                      )}

                      {event.tickets?.price && (
                        <span className="bg-purple-900/40 text-purple-300 px-3 py-1 rounded-full text-xs border border-purple-800/50 flex items-center">
                          <Euro className="w-3 h-3 mr-1" />
                          {event.tickets.price} {event.tickets.currency}
                        </span>
                      )}
                    </div>

                    <div className="flex justify-between items-center pt-3 border-t border-gray-700/50">
                      <span className="text-purple-400 group-hover:text-purple-300 transition-colors text-sm font-medium flex items-center">
                        <Eye className="w-4 h-4 mr-1.5" />
                        Voir l'événement
                      </span>

                      <div className="flex gap-1.5 relative z-20">
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            toggleFeaturedStatus(event.id, event.featured);
                          }}
                          className={`p-2 rounded-lg transition-colors ${
                            event.featured
                              ? 'bg-yellow-600/80 hover:bg-yellow-500/80 text-white'
                              : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                          }`}
                          title={event.featured ? 'Retirer de la mise en avant' : 'Mettre en avant'}
                        >
                          <Star className="w-4 h-4" />
                        </button>

                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            togglePublishStatus(event.id, event.isPublished);
                          }}
                          className={`p-2 rounded-lg transition-colors ${
                            event.isPublished
                              ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                              : 'bg-green-600/80 hover:bg-green-500/80 text-white'
                          }`}
                          title={event.isPublished ? 'Dépublier' : 'Publier'}
                        >
                          {event.isPublished ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>

                        <Link
                          href={`/admin/events/${event.id}/edit`}
                          className="p-2 bg-blue-600/80 hover:bg-blue-500/80 text-white rounded-lg transition-colors relative z-20"
                          title="Modifier"
                          onClick={(e) => {
                            e.stopPropagation();
                          }}
                        >
                          <Edit className="w-4 h-4" />
                        </Link>

                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setEventToDelete(event.id);
                            setShowDeleteModal(true);
                          }}
                          className="p-2 bg-red-600/80 hover:bg-red-500/80 text-white rounded-lg transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Lien qui couvre toute la carte et qui réagit au clic */}
                <Link
                  href={`/admin/events/${event.id}`}
                  className="absolute inset-0 z-10"
                  aria-label={`Voir les détails de l'événement: ${event.title}`}
                >
                  <span className="sr-only">Voir l'événement</span>
                </Link>
              </div>
            ))}
          </div>
        )}

        {/* Actions en bas de page */}
        <div className="mt-8 flex justify-end">
          <div className="flex gap-4">
            {showDeleteModal && (
              <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                <div className="bg-gray-800/90 border border-gray-700 rounded-2xl p-6 max-w-md w-full shadow-2xl transform transition-all animate-fadeIn">
                  <div className="flex items-center gap-4 mb-5">
                    <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                      <AlertTriangle className="w-6 h-6 text-red-400" />
                    </div>
                    <h3 className="text-xl font-bold text-white">Confirmer la suppression</h3>
                  </div>

                  <p className="text-gray-300 mb-6">
                    Êtes-vous sûr de vouloir supprimer cet événement ? Cette action est irréversible
                    et supprimera toutes les données associées.
                  </p>

                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => setShowDeleteModal(false)}
                      className="px-4 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                    >
                      Annuler
                    </button>
                    <button
                      onClick={handleDeleteEvent}
                      className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white px-4 py-2.5 rounded-lg transition-all shadow-lg shadow-red-700/20 flex items-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      Supprimer
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Message de confirmation/erreur */}
        {formMessage && (
          <div
            className={`${
              formMessage.type === 'success'
                ? 'bg-green-100 text-green-700'
                : 'bg-red-100 text-red-700'
            } px-4 py-3 rounded mb-6`}
            role="alert"
          >
            <span className="block sm:inline">{formMessage.text}</span>
          </div>
        )}
      </div>
    </div>
  );
}
