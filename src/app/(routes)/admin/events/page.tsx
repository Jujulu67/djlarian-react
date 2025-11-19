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
import { Event as PrismaEvent, TicketInfo as PrismaTicketInfo } from '@prisma/client';
import { logger } from '@/lib/logger';

// Créer un type local pour inclure les relations si nécessaire
// (Alternative: utiliser Prisma.EventGetPayload avec include)
type EventWithRelations = PrismaEvent & {
  TicketInfo?: PrismaTicketInfo | null;
  // Ajouter d'autres relations si besoin (User, master, occurrences)
};

export default function AdminEventsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Utiliser le type EventWithRelations pour l'état
  const [events, setEvents] = useState<EventWithRelations[]>([]);
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
  const [currentEvent, setCurrentEvent] = useState<EventWithRelations | null>(null);
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
        logger.error(err);
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

      // Filtre de statut (utiliser event.status)
      const matchesStatus = statusFilter === 'ALL' || event.status === statusFilter;

      // Filtre de publication (utiliser event.isPublished)
      const matchesPublish =
        publishFilter === 'ALL' ||
        (publishFilter === 'PUBLISHED' && event.isPublished) ||
        (publishFilter === 'DRAFT' && !event.isPublished);

      // Filtre featured (utiliser event.featured)
      const matchesFeatured =
        featuredFilter === 'ALL' ||
        (featuredFilter === 'FEATURED' && event.featured) ||
        (featuredFilter === 'REGULAR' && !event.featured);

      // Filtre événements récurrents (utiliser event.isMasterEvent)
      const matchesRecurrence =
        recurrenceFilter === 'ALL' ||
        (recurrenceFilter === 'RECURRING' && event.isMasterEvent) ||
        (recurrenceFilter === 'SINGLE' && !event.isMasterEvent);

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
      logger.error('Erreur lors de la suppression:', err);
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
          publishAt: !currentStatus ? new Date() : null, // Mettre à jour publishAt logiquement
        }),
      });

      if (!response.ok) {
        throw new Error(`Erreur ${response.status}: ${response.statusText}`);
      }

      const updatedEvent: EventWithRelations = await response.json(); // Utiliser le type correct

      // Mettre à jour la liste des événements
      setEvents(
        (
          prevEvents // Utiliser une fonction pour garantir l'état précédent
        ) =>
          prevEvents.map((event) =>
            event.id === eventId
              ? {
                  ...event,
                  isPublished: updatedEvent.isPublished,
                  publishAt: updatedEvent.publishAt,
                }
              : event
          )
      );
    } catch (err) {
      logger.error('Erreur lors de la mise à jour:', err);
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
          featured: !currentStatus, // Utiliser featured
        }),
      });

      if (!response.ok) {
        throw new Error(`Erreur ${response.status}: ${response.statusText}`);
      }

      const updatedEvent: EventWithRelations = await response.json(); // Utiliser le type correct

      // Mettre à jour la liste des événements
      setEvents(
        (
          prevEvents // Utiliser une fonction pour garantir l'état précédent
        ) =>
          prevEvents.map(
            (event) =>
              event.id === eventId ? { ...event, featured: updatedEvent.featured } : event // Utiliser featured
          )
      );
    } catch (err) {
      logger.error('Erreur lors de la mise à jour:', err);
      setError("Erreur lors de la mise à jour de l'événement");
    }
  };

  // Gérer la création/modification d'un événement
  const handleAddEditEvent = (event: EventWithRelations | null, mode: 'create' | 'edit') => {
    setCurrentEvent(event);
    setFormMode(mode);
    setShowModal(true);
  };

  // Formatter la date
  const formatEventDate = (dateString: string | Date | null) => {
    // Accepter Date ou null
    if (!dateString) return 'Date inconnue';
    try {
      const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;
      return format(date, 'dd MMMM yyyy à HH:mm', { locale: fr });
    } catch (error) {
      logger.warn(`Date invalide: ${dateString}`);
      return 'Date invalide';
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
          <div className="mt-8 flow-root">
            <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
              <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
                <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
                  <table className="min-w-full divide-y divide-gray-700">
                    <thead className="bg-gray-800/50">
                      <tr>
                        <th
                          scope="col"
                          className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-300 sm:pl-6"
                        >
                          Événement
                        </th>
                        <th
                          scope="col"
                          className="px-3 py-3.5 text-left text-sm font-semibold text-gray-300"
                        >
                          Date
                        </th>
                        <th
                          scope="col"
                          className="px-3 py-3.5 text-left text-sm font-semibold text-gray-300"
                        >
                          Statut
                        </th>
                        <th
                          scope="col"
                          className="px-3 py-3.5 text-center text-sm font-semibold text-gray-300"
                        >
                          En avant
                        </th>
                        <th
                          scope="col"
                          className="px-3 py-3.5 text-center text-sm font-semibold text-gray-300"
                        >
                          Publié
                        </th>
                        <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                          <span className="sr-only">Actions</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800 bg-gray-900/70">
                      {filteredEvents.map((event) => (
                        <tr key={event.id} className="hover:bg-gray-800/40 transition-colors">
                          <td className="py-4 pl-4 pr-3 text-sm sm:pl-6">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10 mr-3 relative">
                                {event.imageId ? (
                                  <Image
                                    src={`/uploads/${event.imageId}_crop.jpg`}
                                    onError={(e) => {
                                      const target = e.target as HTMLImageElement;
                                      target.style.display = 'none';
                                    }}
                                    alt={event.title}
                                    width={40}
                                    height={40}
                                    className="rounded-md object-cover"
                                  />
                                ) : (
                                  <div className="h-10 w-10 rounded-md bg-gray-700 flex items-center justify-center">
                                    <MapPin className="h-5 w-5 text-gray-400" />
                                  </div>
                                )}
                              </div>
                              <div>
                                <div className="font-medium text-white">{event.title}</div>
                                <div className="text-gray-400">
                                  {event.location} {event.address ? `(${event.address})` : ''}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-4 text-sm text-gray-300">
                            {formatEventDate(event.startDate)}
                          </td>
                          <td className="px-3 py-4 whitespace-nowrap">
                            <span
                              className={`px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(
                                event.status
                              )}`}
                            >
                              {getStatusLabel(event.status)}
                            </span>
                          </td>
                          <td className="px-3 py-4 text-center">
                            <div className="flex items-center justify-center">
                              {event.featured ? (
                                <Star className="h-5 w-5 text-yellow-400" />
                              ) : (
                                <Star className="h-5 w-5 text-gray-600" />
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-4 text-center">
                            <button
                              onClick={() => togglePublishStatus(event.id, event.isPublished)}
                              className={`p-1.5 rounded-full transition-colors ${event.isPublished ? 'bg-green-500/20 hover:bg-green-500/30' : 'bg-gray-500/20 hover:bg-gray-500/30'}`}
                              aria-label={
                                event.isPublished ? "Dépublier l'événement" : "Publier l'événement"
                              }
                            >
                              {event.isPublished ? (
                                <Eye className="h-4 w-4 text-green-400" />
                              ) : (
                                <EyeOff className="h-4 w-4 text-gray-400" />
                              )}
                            </button>
                            {event.publishAt && (
                              <div className="text-xs text-gray-500 mt-1">
                                {format(parseISO(event.publishAt.toString()), 'dd/MM HH:mm')}
                              </div>
                            )}
                          </td>
                          <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                            <div className="flex items-center justify-end space-x-2">
                              {/* Actions: Modifier, Supprimer, Mettre en avant */}
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  toggleFeaturedStatus(event.id, event.featured);
                                }}
                                className={`p-2 rounded-lg transition-colors ${
                                  event.featured
                                    ? 'bg-yellow-500/20 hover:bg-yellow-500/30'
                                    : 'bg-gray-600/20 hover:bg-gray-500/30'
                                }`}
                                aria-label={
                                  event.featured ? 'Retirer de la mise en avant' : 'Mettre en avant'
                                }
                              >
                                <Star
                                  className={`h-4 w-4 ${
                                    event.featured ? 'text-yellow-400' : 'text-gray-400'
                                  }`}
                                />
                              </button>
                              <button
                                onClick={() => handleAddEditEvent(event, 'edit')}
                                className="p-2 rounded-lg transition-colors text-blue-400 hover:bg-blue-500/20"
                                aria-label="Modifier l'événement"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => {
                                  setEventToDelete(event.id);
                                  setShowDeleteModal(true);
                                }}
                                className="p-2 rounded-lg transition-colors text-red-400 hover:bg-red-500/20"
                                aria-label="Supprimer l'événement"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
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
