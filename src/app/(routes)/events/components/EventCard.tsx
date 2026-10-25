'use client';

import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { motion } from 'framer-motion';
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

import { buttonVariants } from '@/components/ui/Button';
import { useSpotlight } from '@/hooks/useSpotlight';
import { useUiVersion } from '@/hooks/useUiVersion';
import { fadeUp } from '@/lib/motion';
import { cn } from '@/lib/utils/cn';
import { formatDateTimeFr } from '@/lib/utils/format';
import { getImageUrl } from '@/lib/utils/getImageUrl';

import { type Event, isPastEvent } from '../utils';

interface EventCardProps {
  event: Event;
}

function getEventHref(event: Event): string {
  return event.isVirtualOccurrence && event.virtualStartDate
    ? `/events/${event.masterId}?date=${encodeURIComponent(event.virtualStartDate)}`
    : `/events/${event.id}`;
}

const V2_BADGE =
  'inline-flex items-center gap-1 rounded-full bg-black/40 px-2.5 py-1 text-[11px] font-medium text-white/85 ring-1 ring-inset ring-white/10 backdrop-blur-md';

export function EventCard({ event }: EventCardProps) {
  const isV2 = useUiVersion() === 'v2';
  if (isV2) return <EventCardV2 event={event} />;

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
            href={getEventHref(event)}
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

/**
 * Carte v2 : surface-1 + spotlight, date en pastille de verre, lieu discret.
 * Toute la carte est cliquable (lien étiré sur le titre), le lien billetterie passe au-dessus.
 * Participe à la cascade d'un <RevealGroup> parent.
 */
function EventCardV2({ event }: EventCardProps) {
  const spotlight = useSpotlight<HTMLElement>();
  const date = new Date(event.startDate);
  const validDate = !Number.isNaN(date.getTime());
  const past = isPastEvent(event.startDate);
  const isRecurring = event.isVirtualOccurrence || event.isRecurringMaster;

  return (
    <motion.article
      variants={fadeUp}
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-2xl p-3 surface-1 spotlight',
        'transition-[translate,border-color] duration-[400ms] ease-[cubic-bezier(0.16,1,0.3,1)]',
        'hover:-translate-y-0.5 hover:border-white/15'
      )}
      {...spotlight}
    >
      <div className="relative aspect-[16/9] overflow-hidden rounded-xl bg-white/[0.03]">
        {event.imageId ? (
          <Image
            src={getImageUrl(event.imageId) || ''}
            alt=""
            fill
            sizes="(min-width: 1024px) 380px, (min-width: 768px) 50vw, 100vw"
            className={cn(
              'object-cover object-[50%_25%] transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.03]',
              past && 'opacity-70 grayscale-[35%]'
            )}
            unoptimized
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Calendar className="h-10 w-10 text-white/20" aria-hidden="true" />
          </div>
        )}

        {/* Date mise en avant */}
        {validDate && (
          <div className="absolute left-3 top-3 flex min-w-[3.25rem] flex-col items-center rounded-xl bg-black/45 px-2.5 py-2 text-white ring-1 ring-inset ring-white/15 backdrop-blur-md">
            <span className="text-xl font-semibold leading-none tabular-nums">
              {format(date, 'd', { locale: fr })}
            </span>
            <span className="mt-1 text-[10px] font-semibold uppercase leading-none tracking-[0.18em] text-white/70">
              {format(date, 'MMM', { locale: fr }).replace('.', '')}
            </span>
          </div>
        )}

        {/* Badges sobres */}
        <div className="absolute right-3 top-3 flex flex-wrap justify-end gap-1.5">
          {event.featured && (
            <span className={V2_BADGE}>
              <Star className="h-3 w-3" fill="currentColor" strokeWidth={0} aria-hidden="true" />À
              la une
            </span>
          )}
          {isRecurring && (
            <span className={V2_BADGE}>
              {event.recurrenceConfig?.frequency === 'weekly' ? 'Hebdo' : 'Mensuel'}
            </span>
          )}
          {event.status === 'COMPLETED' && (
            <span className={V2_BADGE}>
              <CheckCircle className="h-3 w-3" aria-hidden="true" />
              Terminé
            </span>
          )}
          {event.status === 'CANCELLED' && (
            <span className={cn(V2_BADGE, 'text-red-300')}>
              <XCircle className="h-3 w-3" aria-hidden="true" />
              Annulé
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col px-1.5 pb-1 pt-4">
        <h3 className="line-clamp-1 text-lg font-semibold text-white">
          <Link
            href={getEventHref(event)}
            className="after:absolute after:inset-0 after:z-0 after:content-[''] focus-visible:outline-none"
          >
            {event.title}
          </Link>
        </h3>

        <div className="mt-1.5 flex flex-col gap-1 text-sm text-white/60">
          {validDate && (
            <span className="inline-flex items-center gap-2">
              <Clock className="h-3.5 w-3.5 shrink-0 text-white/40" aria-hidden="true" />
              <span className="first-letter:uppercase">
                {format(date, "EEEE d MMMM 'à' HH'h'mm", { locale: fr })}
              </span>
            </span>
          )}
          <span className="inline-flex min-w-0 items-center gap-2">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-white/40" aria-hidden="true" />
            <span className="truncate">{event.location}</span>
          </span>
        </div>

        {event.description && (
          <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-white/50">
            {event.description}
          </p>
        )}

        <div className="mt-auto flex items-center justify-between gap-3 pt-5">
          <span className="text-sm text-white/70">
            {event.tickets?.price ? (
              <>
                {event.tickets.price} {event.tickets.currency}
              </>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-white/60 transition-colors group-hover:text-white">
                <Eye className="h-4 w-4" aria-hidden="true" />
                Voir l&apos;événement
              </span>
            )}
          </span>

          {event.tickets?.buyUrl && !past && (
            <a
              href={event.tickets.buyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(buttonVariants({ size: 'sm' }), 'relative z-10')}
            >
              Billets
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
          )}
        </div>
      </div>
    </motion.article>
  );
}
