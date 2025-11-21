'use client';

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
  Calendar as CalendarIcon,
  AlertTriangle,
  Loader2,
  Star,
  User,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';

import { getImageUrl } from '@/lib/utils/getImageUrl';
import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';

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
  createdAt: string;
  updatedAt: string;
  user?: {
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
  publishAt?: string;
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

        const result = await response.json();
        // La réponse API utilise createSuccessResponse qui retourne { data: Event }
        setEvent(result.data);
      } catch (err) {
        logger.error("Erreur lors du chargement de l'événement:", err);
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
      logger.error('Erreur lors de la suppression:', err);
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
          publishAt: null,
        }),
      });

      if (!response.ok) {
        throw new Error(`Erreur ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      // La réponse API utilise createSuccessResponse qui retourne { data: Event }
      const updatedEvent = result.data;
      setEvent(updatedEvent);
    } catch (err) {
      logger.error('Erreur lors de la mise à jour:', err);
      setError("Erreur lors de la mise à jour de l'événement");
    }
  };

  // Changer le statut "featured"
  const toggleFeaturedStatus = async () => {
    if (!event) return;

    try {
      const response = await fetch(`/api/events/${eventId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          featured: !event.featured,
        }),
      });

      if (!response.ok) {
        throw new Error(`Erreur ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      // La réponse API utilise createSuccessResponse qui retourne { data: Event }
      const updatedEvent = result.data;
      setEvent(updatedEvent);
    } catch (err) {
      logger.error('Erreur lors de la mise à jour:', err);
      setError("Erreur lors de la mise à jour de l'événement");
    }
  };

  // Formater la date
  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    return format(new Date(dateString), 'dd MMMM yyyy à HH:mm', { locale: fr });
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
        return 'bg-blue-600/90';
      case 'CANCELLED':
        return 'bg-red-600/90';
      case 'COMPLETED':
        return 'bg-gray-600/90';
      default:
        return 'bg-blue-600/90';
    }
  };

  // Afficher un état de chargement
  if (status === 'loading' || loading) {
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
                Chargement de l&apos;événement...
              </h2>
              <p className="text-gray-400 mt-2">Préparation des détails administratifs</p>
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
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <div className="bg-gray-800/40 backdrop-blur-sm border border-red-500/30 p-8 rounded-xl text-center max-w-lg shadow-xl">
              <div className="w-20 h-20 mx-auto bg-red-500/10 rounded-full flex items-center justify-center mb-6">
                <XCircle className="w-10 h-10 text-red-500" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-3">Une erreur est survenue</h2>
              <p className="text-gray-300 mb-6">{error}</p>
              <Link
                href="/admin/events"
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-800 hover:from-purple-500 hover:to-purple-700 text-white rounded-lg transition-all duration-300 inline-flex items-center gap-2 shadow-lg shadow-purple-900/30"
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
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <div className="bg-gray-800/30 backdrop-blur-sm p-8 rounded-xl text-center max-w-lg border border-gray-700 shadow-xl">
              <div className="w-24 h-24 mx-auto bg-gray-700/30 rounded-full flex items-center justify-center mb-6">
                <AlertTriangle className="w-12 h-12 text-yellow-500" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-3">Événement non trouvé</h2>
              <p className="text-gray-300 mb-6">
                L&apos;événement que vous recherchez n&apos;existe pas ou a été supprimé.
              </p>
              <Link
                href="/admin/events"
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-800 hover:from-purple-500 hover:to-purple-700 text-white rounded-lg transition-all duration-300 inline-flex items-center gap-2 shadow-lg shadow-purple-900/30"
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
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black p-8 pt-8 pb-16">
      <div className="container mx-auto max-w-6xl">
        {/* En-tête avec titre et retour */}
        <div className="mb-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
          <div className="flex items-center gap-3">
            <Link
              href="/admin/events"
              className="bg-gray-800/70 hover:bg-gray-700/70 text-white p-2 rounded-full transition-colors flex items-center justify-center shadow-md"
            >
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-3xl font-bold text-white font-audiowide bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-blue-400">
              {event.title}
            </h1>
          </div>

          {/* Quick actions dans l'en-tête */}
          <div className="flex gap-2">
            <button
              onClick={toggleFeaturedStatus}
              className={`p-2 rounded-lg transition-colors flex items-center gap-1.5 ${
                event.featured
                  ? 'bg-yellow-600/80 hover:bg-yellow-500/80 text-white'
                  : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
              }`}
              title={event.featured ? 'Retirer de la mise en avant' : 'Mettre en avant'}
            >
              <Star className="w-4 h-4" />
            </button>

            <button
              onClick={togglePublishStatus}
              className={`p-2 rounded-lg transition-colors border-none outline-none ring-0 focus:ring-0 focus:outline-none shadow-none focus:shadow-none ${
                event.isPublished
                  ? 'bg-green-600/80 hover:bg-green-500/80 text-white'
                  : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
              }`}
              title={event.isPublished ? 'Dépublier' : 'Publier'}
            >
              {event.isPublished ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </button>

            <Link
              href={`/admin/events/${eventId}/edit`}
              className="p-2 bg-blue-600/80 hover:bg-blue-500/80 text-white rounded-lg transition-colors flex items-center"
              title="Modifier"
            >
              <Edit className="w-4 h-4" />
            </Link>

            <button
              onClick={() => setShowDeleteModal(true)}
              className="p-2 bg-red-600/80 hover:bg-red-500/80 text-white rounded-lg transition-colors flex items-center"
              title="Supprimer"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            <Link
              href={`/events/${eventId}`}
              target="_blank"
              className="p-2 bg-purple-600/80 hover:bg-purple-500/80 text-white rounded-lg transition-colors flex items-center"
              title="Voir page publique"
            >
              <ExternalLink className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Contenu principal */}
        <div className="bg-gray-800/30 backdrop-blur-sm rounded-xl overflow-hidden border border-gray-700 shadow-xl">
          {/* Image de couverture */}
          <div className="relative overflow-hidden" style={{ aspectRatio: '16/9' }}>
            {event.imageId ? (
              <Image
                src={
                  getImageUrl(event.imageId, {
                    cacheBust: event.updatedAt ? new Date(event.updatedAt).getTime() : Date.now(),
                  }) || ''
                }
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                }}
                alt={event.title}
                fill
                className="w-full h-full object-cover object-[50%_25%]"
                unoptimized
              />
            ) : (
              <div className="bg-gradient-to-r from-purple-900/50 to-blue-900/50 w-full h-full flex items-center justify-center">
                <CalendarIcon className="w-24 h-24 text-gray-600" />
              </div>
            )}

            {/* Overlay sombre pour mieux voir les badges */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent opacity-60"></div>

            {/* Badge statut */}
            <div className="absolute top-6 left-6">
              <div
                className={`${getStatusColor(event.status)} backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 shadow-lg`}
              >
                <Clock className="w-4 h-4" />
                {getStatusLabel(event.status)}
              </div>
            </div>

            {/* Badge mise en avant */}
            {event.featured && (
              <div className="absolute top-6 right-6">
                <span className="bg-yellow-600/90 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 shadow-lg">
                  <Star className="w-4 h-4" />
                  Mise en avant
                </span>
              </div>
            )}
          </div>

          <div className="p-6 md:p-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Colonne principale - Informations */}
              <div className="lg:col-span-2">
                {/* Infos principales compactes */}
                <div className="flex flex-wrap gap-4 mb-6">
                  <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 flex items-start gap-3">
                    <CalendarIcon className="w-5 h-5 text-purple-400 mt-1 flex-shrink-0" />
                    <div>
                      <h3 className="text-white font-medium mb-1">Date et heure</h3>
                      <p className="text-gray-300 text-sm">{formatDate(event.startDate)}</p>
                      {event.endDate && (
                        <p className="text-gray-400 text-sm mt-1">
                          Jusqu'à {formatDate(event.endDate)}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-purple-400 mt-1 flex-shrink-0" />
                    <div>
                      <h3 className="text-white font-medium mb-1">Lieu</h3>
                      <p className="text-gray-300 text-sm">{event.location}</p>
                      {event.address && (
                        <p className="text-gray-400 text-sm mt-1">{event.address}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* À propos de l'événement */}
                <div className="mb-6">
                  <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                    <span className="w-6 h-6 bg-purple-500/20 rounded-full flex items-center justify-center">
                      <CalendarIcon className="w-3.5 h-3.5 text-purple-400" />
                    </span>
                    À propos de cet événement
                  </h2>
                  <div className="text-gray-300 prose prose-invert max-w-none bg-gray-800/30 backdrop-blur-sm rounded-xl p-5 border border-gray-700/50">
                    {event.description.split('\n').map((paragraph, i) => (
                      <p key={i} className="mb-3 text-sm">
                        {paragraph || 'Aucune description disponible.'}
                      </p>
                    ))}
                  </div>
                </div>

                {/* Informations billetterie et créateur */}
                <div className="grid grid-cols-1 md:grid-cols-1 gap-4 mb-6">
                  {event.tickets && (
                    <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 flex items-start gap-3">
                      <Euro className="w-5 h-5 text-purple-400 mt-1 flex-shrink-0" />
                      <div>
                        <h3 className="text-white font-medium mb-1">Billetterie</h3>
                        {event.tickets.price ? (
                          <p className="text-gray-300 text-sm">
                            {event.tickets.price} {event.tickets.currency}
                          </p>
                        ) : (
                          <p className="text-gray-300 text-sm">
                            Entrée gratuite ou prix non spécifié
                          </p>
                        )}
                        {event.tickets.buyUrl && (
                          <a
                            href={event.tickets.buyUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-purple-400 hover:text-purple-300 text-sm flex items-center gap-1 mt-2"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            Lien d'achat
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Dernière mise à jour */}
                <div className="pt-4 border-t border-gray-700/50">
                  <div className="flex justify-between items-center">
                    <p className="text-gray-400 text-sm">
                      Dernière mise à jour :{' '}
                      <span className="text-purple-400">{formatDate(event.updatedAt)}</span>
                    </p>
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-3 h-3 rounded-full ${event.isPublished ? 'bg-green-500' : 'bg-yellow-500'}`}
                      ></div>
                      <p className="text-gray-300 text-sm">
                        {event.isPublished ? 'Événement public' : 'Mode brouillon'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Colonne secondaire - Actions et résumé */}
              <div className="space-y-3">
                {/* Actions supplémentaires */}
                <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 shadow-lg overflow-hidden">
                  <div className="p-3 border-b border-gray-700/50">
                    <h3 className="font-medium text-white">Actions supplémentaires</h3>
                  </div>

                  <div className="p-3">
                    {/* Bouton copier lien */}
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(
                          `${window.location.origin}/events/${event.id}`
                        );
                        alert('Lien public copié dans le presse-papier !');
                      }}
                      className="w-full p-2 bg-gray-700/50 hover:bg-gray-600/50 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      <Share2 className="w-4 h-4" />
                      <span className="text-sm">Copier le lien public</span>
                    </button>
                  </div>
                </div>

                {/* Récapitulatif compact */}
                <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 shadow-lg overflow-hidden">
                  <div className="p-3 border-b border-gray-700/50">
                    <h3 className="font-medium text-white">Récapitulatif</h3>
                  </div>

                  <div className="p-3">
                    <div className="space-y-2.5">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400 text-sm">ID</span>
                        <span
                          className="text-purple-300 font-mono text-xs overflow-hidden"
                          title={event.id}
                        >
                          {event.id}
                        </span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-gray-400 text-sm">Créateur</span>
                        <div className="text-gray-500 text-sm mt-1 flex items-center">
                          <User className="w-4 h-4 mr-1" />
                          {event.user?.name || 'Inconnu'}
                        </div>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-gray-400 text-sm">Statut</span>
                        <span
                          className={`text-sm font-medium ${
                            event.status === 'UPCOMING'
                              ? 'text-blue-400'
                              : event.status === 'COMPLETED'
                                ? 'text-green-400'
                                : 'text-red-400'
                          }`}
                        >
                          {getStatusLabel(event.status)}
                        </span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-gray-400 text-sm">Publication</span>
                        <span
                          className={`text-sm font-medium ${
                            event.isPublished ? 'text-green-400' : 'text-yellow-400'
                          } flex items-center gap-1`}
                        >
                          {event.isPublished ? (
                            <>
                              <Calendar className="w-4 h-4 mr-1 text-green-400" />
                              Publié
                            </>
                          ) : (
                            <>
                              <Clock className="w-4 h-4 mr-1 text-yellow-400" />
                              Brouillon
                            </>
                          )}
                        </span>
                      </div>
                      {/* Date de publication planifiée ou réelle */}
                      {event.publishAt && (
                        <div className="flex justify-between items-center">
                          <span className="text-gray-400 text-sm">
                            {event.isPublished ? 'Publié le' : 'Publication prévue'}
                          </span>
                          <span
                            className={`text-xs font-medium ${event.isPublished ? 'text-green-300' : 'text-yellow-300'} flex items-center gap-1`}
                          >
                            {event.isPublished ? (
                              <Calendar className="w-3.5 h-3.5 mr-1" />
                            ) : (
                              <Clock className="w-3.5 h-3.5 mr-1" />
                            )}
                            {format(new Date(event.publishAt), 'dd MMMM yyyy à HH:mm', {
                              locale: fr,
                            })}
                          </span>
                        </div>
                      )}

                      {event.tickets?.price && (
                        <div className="flex justify-between items-center">
                          <span className="text-gray-400 text-sm">Prix</span>
                          <span className="text-white text-sm font-medium flex items-center gap-1">
                            {event.tickets.price} {event.tickets.currency}
                            <Euro className="w-3.5 h-3.5 text-purple-400" />
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Lien retour */}
                <Link
                  href="/admin/events"
                  className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-3 border border-gray-700/50 flex items-center justify-center gap-2 text-white hover:bg-gray-700/50 transition-all duration-200 shadow-md"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span className="text-sm">Retour à la liste</span>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Modale de confirmation de suppression */}
        {showDeleteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="bg-gray-800 rounded-xl p-6 shadow-xl max-w-md w-full border border-gray-700/50 animate-fadeIn">
              <div className="flex items-center gap-4 mb-5">
                <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-red-400" />
                </div>
                <h3 className="text-xl font-bold text-white">Confirmer la suppression</h3>
              </div>
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
                  className="px-4 py-2 bg-gradient-to-r from-red-600 to-red-800 hover:from-red-500 hover:to-red-700 text-white rounded-lg transition-all shadow-lg"
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
