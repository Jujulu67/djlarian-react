'use client';

import { useState, useEffect } from 'react';
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
  image?: string;
  status: string;
  isPublished: boolean;
  tickets?: {
    price?: number;
    currency: string;
    buyUrl?: string;
  };
  creator?: {
    name: string;
  };
  featured: boolean;
};

export default function AdminEventsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date-asc');
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
        setEvents(data);
      } catch (err) {
        setError('Erreur lors du chargement des événements');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  // Filtrer et trier les événements
  const filteredEvents = events
    .filter((event) => {
      // Filtre de recherche
      const matchesSearch =
        event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.description.toLowerCase().includes(searchTerm.toLowerCase());

      // Filtre de statut
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'published' && event.isPublished) ||
        (statusFilter === 'draft' && !event.isPublished) ||
        (statusFilter === 'upcoming' && event.status === 'UPCOMING') ||
        (statusFilter === 'completed' && event.status === 'COMPLETED') ||
        (statusFilter === 'cancelled' && event.status === 'CANCELLED');

      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      // D'abord trier par featured (les événements mis en avant en premier)
      if (a.featured && !b.featured) return -1;
      if (!a.featured && b.featured) return 1;

      // Ensuite, trier selon le critère sélectionné
      switch (sortBy) {
        case 'date-asc':
          return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
        case 'date-desc':
          return new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
        case 'title-asc':
          return a.title.localeCompare(b.title);
        case 'title-desc':
          return b.title.localeCompare(a.title);
        default:
          return 0;
      }
    });

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
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black p-8 pt-32">
      <div className="container mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-white flex items-center gap-2">
            <Calendar className="w-8 h-8 text-purple-500" />
            Gestion des Événements
          </h1>
          <Link
            href="/admin/events/new"
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Nouvel Événement
          </Link>
        </div>

        {/* Zone de recherche et filtres */}
        <div className="flex gap-4 mb-8">
          <div className="flex-1 relative">
            <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input
              type="text"
              placeholder="Rechercher un événement..."
              className="w-full bg-gray-800/50 text-white rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
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
                className="bg-gray-800/30 backdrop-blur-sm rounded-lg overflow-hidden border border-gray-700 hover:border-purple-500/50 transition-all group"
              >
                <div className="flex flex-col">
                  {/* Image de l'événement */}
                  <div className="relative overflow-hidden mb-4" style={{ aspectRatio: '16/9' }}>
                    {event.image ? (
                      <img
                        src={event.image}
                        alt={event.title}
                        className="w-full h-full object-cover object-center rounded-lg"
                        style={{ objectPosition: '50% 25%' }}
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-700 rounded-lg flex items-center justify-center">
                        <ImageIcon className="w-12 h-12 text-gray-500" />
                      </div>
                    )}

                    {/* Badge statut */}
                    <div className="absolute top-2 left-2">
                      {event.status === 'UPCOMING' && (
                        <span className="bg-blue-500/80 backdrop-blur-sm text-white px-2 py-1 rounded-full text-xs font-medium">
                          À venir
                        </span>
                      )}
                      {event.status === 'COMPLETED' && (
                        <span className="bg-gray-500/80 backdrop-blur-sm text-white px-2 py-1 rounded-full text-xs font-medium">
                          Terminé
                        </span>
                      )}
                      {event.status === 'CANCELLED' && (
                        <span className="bg-red-500/80 backdrop-blur-sm text-white px-2 py-1 rounded-full text-xs font-medium">
                          Annulé
                        </span>
                      )}
                    </div>

                    {/* Badge featured */}
                    {event.featured && (
                      <div className="absolute top-2 right-2">
                        <span className="bg-yellow-500/80 backdrop-blur-sm text-white px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                          <Star className="w-3 h-3" />
                          En avant
                        </span>
                      </div>
                    )}
                  </div>

                  <h3 className="text-lg font-semibold text-white mb-1">{event.title}</h3>

                  <div className="flex items-center text-gray-400 mb-4">
                    <Calendar className="w-4 h-4 mr-2" />
                    <span>
                      {format(new Date(event.startDate), 'dd MMMM yyyy à HH:mm', { locale: fr })}
                    </span>
                  </div>

                  <p className="text-gray-300 mb-4 line-clamp-2">
                    {event.description || 'Aucune description disponible.'}
                  </p>

                  <div className="flex flex-wrap gap-2 mb-6">
                    <span className="bg-gray-700 text-gray-300 px-3 py-1 rounded-full text-xs">
                      {event.location}
                    </span>

                    {event.tickets?.price && (
                      <span className="bg-purple-900/50 text-purple-300 px-3 py-1 rounded-full text-xs">
                        {event.tickets.price} {event.tickets.currency}
                      </span>
                    )}
                  </div>

                  <div className="flex justify-between items-center mt-4">
                    <Link
                      href={`/admin/events/${event.id}`}
                      className="text-purple-400 hover:text-purple-300 transition-colors"
                    >
                      Voir les détails
                    </Link>

                    <div className="flex gap-2">
                      <button
                        onClick={() => togglePublishStatus(event.id, event.isPublished)}
                        className={`p-2 rounded-full transition-colors ${
                          event.isPublished
                            ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                            : 'bg-green-600 hover:bg-green-500 text-white'
                        }`}
                        title={event.isPublished ? 'Dépublier' : 'Publier'}
                      >
                        {event.isPublished ? (
                          <EyeOff className="w-5 h-5" />
                        ) : (
                          <Eye className="w-5 h-5" />
                        )}
                      </button>

                      <Link
                        href={`/admin/events/${event.id}/edit`}
                        className="p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-full transition-colors"
                        title="Modifier"
                      >
                        <Edit className="w-5 h-5" />
                      </Link>

                      <button
                        onClick={() => {
                          setEventToDelete(event.id);
                          setShowDeleteModal(true);
                        }}
                        className="p-2 bg-red-600 hover:bg-red-500 text-white rounded-full transition-colors"
                        title="Supprimer"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Actions en bas de page */}
        <div className="mt-8 flex justify-end">
          <div className="flex gap-4">
            {showDeleteModal && (
              <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full">
                  <h3 className="text-xl font-bold text-white mb-4">Confirmer la suppression</h3>
                  <p className="text-gray-300 mb-6">
                    Êtes-vous sûr de vouloir supprimer cet événement ? Cette action est
                    irréversible.
                  </p>
                  <div className="flex justify-end gap-4">
                    <button
                      onClick={() => setShowDeleteModal(false)}
                      className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
                    >
                      Annuler
                    </button>
                    <button
                      onClick={handleDeleteEvent}
                      className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
                    >
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
