import Image from 'next/image';
import Link from 'next/link';
import {
  Calendar,
  CheckCircle,
  Clock,
  Euro,
  ExternalLink,
  Eye,
  MapPin,
  Star,
  XCircle,
  Calendar as CalendarIcon,
} from 'lucide-react';

import { formatDateTimeFr } from '@/lib/utils/format';
import { getImageUrl } from '@/lib/utils/getImageUrl';

import { type Event, isPastEvent } from '../utils';

interface EventCardProps {
  event: Event;
}

export function EventCard({ event }: EventCardProps) {
  return (
    <div className="group relative glass-modern glass-modern-hover rounded-xl overflow-hidden transition-all transform hover:-translate-y-1 duration-300">
      {/* Image avec effet de zoom au survol */}
      <div className="relative overflow-hidden rounded-t-2xl" style={{ aspectRatio: '16/9' }}>
        {event.imageId ? (
          <Image
            src={getImageUrl(event.imageId) || ''}
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
          <span>{formatDateTimeFr(event.startDate)}</span>
        </div>

        <div className="flex items-start text-gray-400 mb-4 text-sm">
          <MapPin className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
          <span>{event.location}</span>
        </div>

        <p className="text-gray-300 mb-6 line-clamp-2 text-sm">
          {event.description || 'Aucune description disponible.'}
        </p>

        <div className="flex justify-between items-center">
          <Link
            href={
              event.isVirtualOccurrence && event.virtualStartDate
                ? `/events/${event.masterId}?date=${encodeURIComponent(event.virtualStartDate)}`
                : `/events/${event.id}`
            }
            className="text-white group-hover:text-gray-300 transition-colors text-sm font-medium flex items-center"
            aria-label={`Voir les détails de l'événement: ${event.title}`}
          >
            <Eye className="w-4 h-4 mr-1.5" />
            Voir l'événement
          </Link>

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
      <div className="absolute inset-0 bg-gradient-to-r from-purple-500/0 via-purple-500/5 to-purple-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"></div>

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
            Récurrent {event.recurrenceConfig?.frequency === 'weekly' ? '(hebdo)' : '(mensuel)'}
          </span>
          {/* ... other badges ... */}
        </div>
      )}
    </div>
  );
}
