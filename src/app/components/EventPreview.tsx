import { Calendar, Clock, Euro, Eye, MapPin, Ticket, Star, Repeat } from 'lucide-react';
import { EventFormData } from './EventForm';

interface EventPreviewProps {
  event: EventFormData & { currentImage?: string };
}

export default function EventPreview({ event }: EventPreviewProps) {
  // Utiliser l'image preview stockée dans formData, ou current image si disponible
  const imageToShow = event.currentImage || null;

  return (
    <div>
      <div
        className="relative bg-gradient-to-r from-purple-900/30 to-blue-900/30 flex items-center justify-center overflow-hidden"
        style={{ aspectRatio: '16/9' }}
      >
        {imageToShow ? (
          <img
            src={imageToShow}
            alt={event.title}
            className="w-full h-full object-cover object-center"
            style={{ objectPosition: '50% 25%' }}
          />
        ) : (
          <Calendar className="w-16 h-16 text-gray-600" />
        )}
        <div className="absolute top-4 left-4 flex gap-2">
          <span className="bg-blue-500/80 backdrop-blur-sm text-white px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {event.status === 'UPCOMING'
              ? 'À venir'
              : event.status === 'COMPLETED'
                ? 'Terminé'
                : 'Annulé'}
          </span>

          {event.recurrence?.isRecurring && (
            <span className="bg-purple-500/80 backdrop-blur-sm text-white px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1">
              <Repeat className="w-3 h-3" />
              {event.recurrence?.frequency === 'weekly' ? 'Hebdomadaire' : 'Mensuel'}
            </span>
          )}
        </div>
        <div className="absolute top-4 right-4 flex gap-2">
          {event.featured && (
            <span className="bg-yellow-500/80 backdrop-blur-sm text-white px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1">
              <Star className="w-3 h-3" />
              En avant
            </span>
          )}
          {event.isPublished ? (
            <span className="bg-green-500/80 backdrop-blur-sm text-white px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1">
              <Eye className="w-3 h-3" />
              Publié
            </span>
          ) : (
            <span className="bg-gray-500/80 backdrop-blur-sm text-white px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1">
              <Eye className="w-3 h-3" />
              Brouillon
            </span>
          )}
        </div>

        {/* Logo DJ Larian */}
        <div className="absolute bottom-3 right-3">
          <div className="bg-black/40 backdrop-blur-sm text-white px-2 py-1 rounded-lg text-xs font-bold flex items-center">
            <span className="text-purple-400 mr-1">DJ</span>
            <span className="text-white">LARIAN</span>
          </div>
        </div>
      </div>

      <div className="p-6">
        <h3 className="text-xl font-bold text-white mb-2">
          {event.title || "Titre de l'événement"}
        </h3>

        <div className="flex items-center text-gray-400 mb-4">
          <Calendar className="w-4 h-4 mr-2" />
          <span>
            {event.startDate || event.date
              ? new Date(event.startDate || event.date || '').toLocaleDateString('fr-FR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : 'Date non définie'}
          </span>
        </div>

        <p className="text-gray-300 mb-4">
          {event.description || 'Aucune description disponible.'}
        </p>

        <div className="flex flex-wrap gap-2 mb-6">
          <span className="bg-gray-700 text-gray-300 px-3 py-1 rounded-full text-xs flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            {event.location || 'Lieu non défini'}
          </span>

          {event.hasTickets && event.tickets?.price !== undefined && (
            <span className="bg-purple-900/50 text-purple-300 px-3 py-1 rounded-full text-xs flex items-center gap-1">
              <Euro className="w-3 h-3" />
              {event.tickets.price} {event.tickets.currency}
            </span>
          )}

          {event.hasTickets &&
            event.tickets?.quantity !== undefined &&
            event.tickets.quantity > 0 && (
              <span className="bg-indigo-900/50 text-indigo-300 px-3 py-1 rounded-full text-xs flex items-center gap-1">
                <Ticket className="w-3 h-3" />
                {event.tickets.quantity} billets disponibles
              </span>
            )}
        </div>
      </div>
    </div>
  );
}
