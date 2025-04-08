'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import Image from 'next/image';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Calendar,
  ChevronLeft,
  Clock,
  Edit,
  MapPin,
  Trash2,
  ExternalLink,
  Euro,
  Eye,
  EyeOff,
  Share2,
  CheckCircle,
  XCircle,
  ArrowLeft,
  ArrowRight,
  Users,
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
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  creator: {
    name: string;
  };
  tickets?: {
    id: string;
    price?: number;
    currency: string;
    buyUrl?: string;
    availableFrom?: string;
    availableTo?: string;
  };
};

export default function EventDetailsPage() {
  const { data: session, status } = useSession();
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;

  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Rediriger si l'utilisateur n'est pas un admin
  useEffect(() => {
    if (
      status === 'unauthenticated' ||
      (status === 'authenticated' && session?.user?.role !== 'ADMIN')
    ) {
      router.push('/');
    }
  }, [session, status, router]);

  // Charger les détails de l'événement
  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const response = await fetch(`/api/events/${eventId}`);

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Événement non trouvé');
          }
          throw new Error(`Erreur ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        setEvent(data);
      } catch (err) {
        console.error("Erreur lors du chargement de l'événement:", err);
        setError(err instanceof Error ? err.message : 'Erreur inconnue');
      } finally {
        setLoading(false);
      }
    };

    if (eventId) {
      fetchEvent();
    }
  }, [eventId]);

  // Supprimer l'événement
  const handleDeleteEvent = async () => {
    try {
      const response = await fetch(`/api/events/${eventId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`Erreur ${response.status}: ${response.statusText}`);
      }

      // Rediriger vers la liste des événements
      router.push('/admin/events');
    } catch (err) {
      console.error('Erreur lors de la suppression:', err);
      setError("Erreur lors de la suppression de l'événement");
      setShowDeleteModal(false);
    }
  };

  // Changer le statut de publication
  const togglePublishStatus = async () => {
    if (!event) return;

    try {
      const response = await fetch(`/api/events/${eventId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isPublished: !event.isPublished,
        }),
      });

      if (!response.ok) {
        throw new Error(`Erreur ${response.status}: ${response.statusText}`);
      }

      const updatedEvent = await response.json();
      setEvent(updatedEvent);
    } catch (err) {
      console.error('Erreur lors de la mise à jour:', err);
      setError("Erreur lors de la mise à jour de l'événement");
    }
  };

  // Formater la date
  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    return format(new Date(dateString), 'dd MMMM yyyy à HH:mm', { locale: fr });
  };

  // Afficher un état de chargement
  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black p-8">
        <div className="container mx-auto">
          <div className="flex justify-center items-center min-h-[60vh]">
            <div className="animate-pulse flex flex-col items-center">
              <Calendar className="w-12 h-12 text-purple-500 mb-4" />
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
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black p-8">
        <div className="container mx-auto">
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <div className="bg-red-500/10 border border-red-500/50 p-8 rounded-lg text-center max-w-lg">
              <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-2xl font-semibold text-white mb-2">Une erreur est survenue</h2>
              <p className="text-gray-300 mb-6">{error}</p>
              <Link
                href="/admin/events"
                className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors inline-flex items-center gap-2"
              >
                <ChevronLeft className="w-5 h-5" />
                Retour aux événements
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Afficher le message si l'événement n'est pas trouvé
  if (!event) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black p-8">
        <div className="container mx-auto">
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <div className="bg-gray-800/30 backdrop-blur-sm p-8 rounded-lg text-center max-w-lg border border-gray-700">
              <Calendar className="w-12 h-12 text-gray-500 mx-auto mb-4" />
              <h2 className="text-2xl font-semibold text-white mb-2">Événement non trouvé</h2>
              <p className="text-gray-300 mb-6">
                L'événement que vous recherchez n'existe pas ou a été supprimé.
              </p>
              <Link
                href="/admin/events"
                className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors inline-flex items-center gap-2"
              >
                <ChevronLeft className="w-5 h-5" />
                Retour aux événements
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black p-8">
      <div className="container mx-auto">
        {/* En-tête */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div className="flex items-center gap-2">
            <Link
              href="/admin/events"
              className="bg-gray-800 hover:bg-gray-700 text-white p-2 rounded-full transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-3xl font-bold text-white">Détails de l'événement</h1>
          </div>
        </div>

        {/* Contenu principal */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Informations principales */}
          <div className="lg:col-span-2 space-y-8">
            {/* Carte de l'événement */}
            <div className="bg-gray-800/30 backdrop-blur-sm rounded-lg overflow-hidden border border-gray-700">
              <div className="relative h-64 bg-gradient-to-r from-purple-900/30 to-blue-900/30 flex items-center justify-center">
                {event.image ? (
                  <Image src={event.image} alt={event.title} fill className="object-cover" />
                ) : (
                  <Calendar className="w-16 h-16 text-gray-600" />
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

                {/* Badge publication */}
                <div className="absolute top-4 right-4">
                  {event.isPublished ? (
                    <span className="bg-green-500/80 backdrop-blur-sm text-white px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      Publié
                    </span>
                  ) : (
                    <span className="bg-gray-500/80 backdrop-blur-sm text-white px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                      <EyeOff className="w-3 h-3" />
                      Brouillon
                    </span>
                  )}
                </div>
              </div>

              <div className="p-6">
                <h2 className="text-2xl font-bold text-white mb-4">{event.title}</h2>

                <div className="flex items-center text-gray-400 mb-6">
                  <Calendar className="w-5 h-5 mr-2" />
                  <span>
                    {formatDate(event.startDate)}
                    {event.endDate && ` - ${formatDate(event.endDate)}`}
                  </span>
                </div>

                <div className="bg-gray-900/50 rounded-lg p-4 mb-6">
                  <p className="text-gray-300 whitespace-pre-line">
                    {event.description || 'Aucune description disponible.'}
                  </p>
                </div>

                <div className="flex flex-wrap gap-4 mb-6">
                  <div className="bg-gray-900/50 rounded-lg p-3 flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-purple-400 mt-0.5" />
                    <div>
                      <h3 className="text-white font-medium">Lieu</h3>
                      <p className="text-gray-300">{event.location}</p>
                      {event.address && <p className="text-gray-400 text-sm">{event.address}</p>}
                    </div>
                  </div>

                  {event.tickets && (
                    <div className="bg-gray-900/50 rounded-lg p-3 flex items-start gap-3">
                      <Euro className="w-5 h-5 text-purple-400 mt-0.5" />
                      <div>
                        <h3 className="text-white font-medium">Billetterie</h3>
                        {event.tickets.price ? (
                          <p className="text-gray-300">
                            {event.tickets.price} {event.tickets.currency}
                          </p>
                        ) : (
                          <p className="text-gray-300">Entrée gratuite ou prix non spécifié</p>
                        )}
                        {event.tickets.buyUrl && (
                          <a
                            href={event.tickets.buyUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-purple-400 hover:text-purple-300 text-sm flex items-center gap-1 mt-1"
                          >
                            <ExternalLink className="w-3 h-3" />
                            Lien d'achat
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="border-t border-gray-700 pt-6">
                  <h3 className="text-white font-medium mb-2">Partager cet événement</h3>
                  <div className="flex gap-2">
                    <button className="p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-full transition-colors">
                      <Share2 className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(
                          `${window.location.origin}/events/${event.id}`
                        );
                        alert('Lien copié dans le presse-papier !');
                      }}
                      className="text-gray-300 hover:text-white transition-colors"
                    >
                      Copier le lien public
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <div className="flex justify-between">
              <Link
                href="/admin/events"
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors flex items-center gap-2"
              >
                <ArrowLeft className="w-5 h-5" />
                Retour à la liste
              </Link>
            </div>
          </div>

          {/* Informations secondaires */}
          <div className="space-y-6">
            {/* Métadonnées */}
            <div className="bg-gray-800/30 backdrop-blur-sm rounded-lg p-6 border border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-4">Informations</h3>

              <div className="space-y-4">
                <div>
                  <p className="text-gray-400 text-sm">ID de l'événement</p>
                  <p className="text-gray-300 font-mono">{event.id}</p>
                </div>

                <div>
                  <p className="text-gray-400 text-sm">Créé par</p>
                  <p className="text-gray-300">{event.creator?.name || 'Inconnu'}</p>
                </div>

                <div>
                  <p className="text-gray-400 text-sm">Créé le</p>
                  <p className="text-gray-300">{formatDate(event.createdAt)}</p>
                </div>

                <div>
                  <p className="text-gray-400 text-sm">Dernière mise à jour</p>
                  <p className="text-gray-300">{formatDate(event.updatedAt)}</p>
                </div>

                <div>
                  <p className="text-gray-400 text-sm">État de publication</p>
                  <div className="flex items-center gap-2 mt-1">
                    <div
                      className={`w-3 h-3 rounded-full ${event.isPublished ? 'bg-green-500' : 'bg-gray-500'}`}
                    ></div>
                    <p className="text-gray-300">{event.isPublished ? 'Publié' : 'Brouillon'}</p>
                  </div>
                </div>

                <div>
                  <p className="text-gray-400 text-sm">Statut</p>
                  <div className="flex items-center gap-2 mt-1">
                    <div
                      className={`w-3 h-3 rounded-full ${
                        event.status === 'UPCOMING'
                          ? 'bg-blue-500'
                          : event.status === 'COMPLETED'
                            ? 'bg-green-500'
                            : 'bg-red-500'
                      }`}
                    ></div>
                    <p className="text-gray-300">
                      {event.status === 'UPCOMING'
                        ? 'À venir'
                        : event.status === 'COMPLETED'
                          ? 'Terminé'
                          : 'Annulé'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions rapides */}
            <div className="bg-gray-800/30 backdrop-blur-sm rounded-lg p-6 border border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-4">Actions rapides</h3>

              <div className="space-y-3">
                <button
                  onClick={togglePublishStatus}
                  className={`w-full px-4 py-2 rounded-lg transition-colors flex items-center justify-between ${
                    event.isPublished
                      ? 'bg-gray-700 hover:bg-gray-600 text-white'
                      : 'bg-green-600 hover:bg-green-500 text-white'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    {event.isPublished ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                    {event.isPublished ? 'Dépublier' : 'Publier'}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <Link
                  href={`/admin/events/${eventId}/edit`}
                  className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors flex items-center justify-between"
                >
                  <span className="flex items-center gap-2">
                    <Edit className="w-5 h-5" />
                    Modifier
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </Link>

                <button
                  onClick={() => setShowDeleteModal(true)}
                  className="w-full px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors flex items-center justify-between"
                >
                  <span className="flex items-center gap-2">
                    <Trash2 className="w-5 h-5" />
                    Supprimer
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <Link
                  href={`/events/${eventId}`}
                  target="_blank"
                  className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors flex items-center justify-between"
                >
                  <span className="flex items-center gap-2">
                    <ExternalLink className="w-5 h-5" />
                    Voir la page publique
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Modale de confirmation de suppression */}
        {showDeleteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="bg-gray-800 rounded-lg p-6 shadow-xl max-w-md w-full border border-gray-700 animate-fadeIn">
              <h3 className="text-xl font-bold text-white mb-4">Confirmer la suppression</h3>
              <p className="text-gray-300 mb-2">
                Êtes-vous sûr de vouloir supprimer cet événement ?
              </p>
              <p className="text-red-400 mb-6 text-sm">
                Cette action est irréversible et supprimera définitivement toutes les données liées
                à cet événement.
              </p>
              <div className="flex justify-end gap-4">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleDeleteEvent}
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors"
                >
                  Supprimer
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
