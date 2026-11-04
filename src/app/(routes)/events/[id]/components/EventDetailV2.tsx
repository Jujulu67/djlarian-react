'use client';

import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  Check,
  Copy,
  ExternalLink,
  MapPin,
  Share2,
  Ticket,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { FaFacebook, FaTwitter } from 'react-icons/fa';

import { Button } from '@/components/ui/Button';
import { Reveal } from '@/components/ui/Reveal';
import { cn } from '@/lib/utils/cn';
import { getImageUrl } from '@/lib/utils/getImageUrl';

export const EVENT_DETAIL_PAGE_CLASS =
  'v2:bg-transparent v2:px-4 v2:pb-24 v2:pt-28 sm:v2:px-6 md:v2:pt-36';
export const EVENT_DETAIL_CONTAINER_CLASS = 'mx-auto w-full max-w-[1180px]';

export interface EventDetailV2Data {
  title: string;
  description: string;
  location: string;
  address?: string;
  imageId?: string;
  status: string;
  tickets?: { price?: number; currency: string; buyUrl?: string };
  user?: { name: string };
}

interface EventDetailV2Props {
  event: EventDetailV2Data;
  dateLabel: string;
  endDateLabel?: string;
  isPast: boolean;
  showShareOptions: boolean;
  onToggleShare: () => void;
  onShare: (platform: 'facebook' | 'twitter' | 'copy') => void;
  copySuccess: boolean;
}

const STATUS_LABEL: Record<string, string> = {
  UPCOMING: 'À venir',
  COMPLETED: 'Terminé',
  CANCELLED: 'Annulé',
};

/** Lien de retour vers la liste, partagé par la page et ses états v2 */
export function BackToEventsLink() {
  return (
    <Link
      href="/events"
      className="inline-flex items-center gap-2 text-sm text-white/60 transition-colors hover:text-white"
    >
      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
      Tous les événements
    </Link>
  );
}

function InfoRow({
  icon,
  label,
  children,
}: {
  icon: ReactNode;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/[0.04] text-white/60 ring-1 ring-inset ring-white/10">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-[0.15em] text-white/40">{label}</p>
        <div className="mt-1 text-sm text-white/80">{children}</div>
      </div>
    </div>
  );
}

/** Détail d'un événement, UI v2 : héros arrondi, infos et billetterie dans des cartes surface-1 */
export function EventDetailV2({
  event,
  dateLabel,
  endDateLabel,
  isPast,
  showShareOptions,
  onToggleShare,
  onShare,
  copySuccess,
}: EventDetailV2Props) {
  const imageSrc = event.imageId ? getImageUrl(event.imageId) : null;
  const statusLabel = STATUS_LABEL[event.status] ?? 'À venir';
  const canBuy = !!event.tickets?.buyUrl && !isPast;

  return (
    <div className={EVENT_DETAIL_PAGE_CLASS}>
      <div className={EVENT_DETAIL_CONTAINER_CLASS}>
        <div className="mb-6">
          <BackToEventsLink />
        </div>

        {/* Héros */}
        <Reveal>
          <div className="relative aspect-[4/3] overflow-hidden rounded-[2rem] surface-1 sm:aspect-[16/9] lg:aspect-[21/9]">
            {imageSrc ? (
              <Image
                src={imageSrc}
                alt={`Image de couverture pour l'événement ${event.title}`}
                fill
                sizes="(min-width: 1180px) 1180px, 100vw"
                className="object-cover object-[50%_25%]"
                priority
                unoptimized
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <Calendar className="h-16 w-16 text-white/15" aria-hidden="true" />
              </div>
            )}
            <span
              className={cn(
                'absolute left-4 top-4 inline-flex items-center rounded-full bg-black/40 px-3 py-1.5 text-xs font-medium text-white/90 ring-1 ring-inset ring-white/10 backdrop-blur-md md:left-6 md:top-6',
                event.status === 'CANCELLED' && 'text-red-300'
              )}
            >
              {statusLabel}
            </span>
          </div>
        </Reveal>

        {/* Titre + partage */}
        <div className="mt-8 flex items-start justify-between gap-4 md:mt-12">
          <div className="min-w-0">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-brand">
              Événement
            </p>
            <h1 className="text-display break-words text-3xl text-white md:text-5xl">
              {event.title}
            </h1>
          </div>

          <div className="relative shrink-0">
            <button
              type="button"
              onClick={onToggleShare}
              aria-expanded={showShareOptions}
              aria-haspopup="menu"
              aria-label="Partager l'événement"
              className="flex h-11 w-11 items-center justify-center rounded-full bg-white/[0.04] text-white/70 ring-1 ring-inset ring-white/10 transition-colors hover:text-white active:scale-[0.98]"
            >
              <Share2 className="h-4 w-4" aria-hidden="true" />
            </button>

            {showShareOptions && (
              <div
                role="menu"
                className="absolute right-0 z-20 mt-2 flex w-48 flex-col rounded-xl p-1.5 surface-2"
              >
                {(
                  [
                    ['facebook', <FaFacebook key="fb" className="h-4 w-4" />, 'Facebook'],
                    ['twitter', <FaTwitter key="tw" className="h-4 w-4" />, 'Twitter'],
                    [
                      'copy',
                      copySuccess ? (
                        <Check key="ok" className="h-4 w-4" />
                      ) : (
                        <Copy key="cp" className="h-4 w-4" />
                      ),
                      copySuccess ? 'Copié !' : 'Copier le lien',
                    ],
                  ] as const
                ).map(([platform, icon, label]) => (
                  <button
                    key={platform}
                    type="button"
                    role="menuitem"
                    onClick={() => onShare(platform)}
                    className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-white/80 transition-colors hover:bg-white/[0.06] hover:text-white"
                  >
                    <span className="text-white/50">{icon}</span>
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Description */}
          <div className="rounded-2xl p-6 surface-1 md:p-8 lg:col-span-2">
            <h2 className="text-lg font-semibold text-white">À propos de cet événement</h2>
            <div className="mt-4 space-y-3 text-[15px] leading-relaxed text-white/70">
              {event.description.split('\n').map((paragraph, i) => (
                <p key={i}>{paragraph}</p>
              ))}
            </div>
            {event.user && (
              <p className="mt-8 border-t border-white/[0.08] pt-5 text-sm text-white/50">
                Organisé par <span className="text-white/80">{event.user.name}</span>
              </p>
            )}
          </div>

          {/* Infos pratiques + billetterie */}
          <aside className="flex flex-col gap-4 lg:sticky lg:top-28 lg:self-start">
            <div className="flex flex-col gap-5 rounded-2xl p-6 surface-1">
              <InfoRow icon={<Calendar className="h-4 w-4" />} label="Date et heure">
                <p className="first-letter:uppercase">{dateLabel}</p>
                {endDateLabel && (
                  <p className="mt-0.5 text-white/50">Jusqu&apos;au {endDateLabel}</p>
                )}
              </InfoRow>
              <InfoRow icon={<MapPin className="h-4 w-4" />} label="Lieu">
                <p>{event.location}</p>
                {event.address && <p className="mt-0.5 text-white/50">{event.address}</p>}
              </InfoRow>
              {event.tickets && (
                <InfoRow icon={<Ticket className="h-4 w-4" />} label="Prix">
                  <p>
                    {event.tickets.price
                      ? `${event.tickets.price} ${event.tickets.currency}`
                      : 'Gratuit'}
                  </p>
                </InfoRow>
              )}

              {canBuy && (
                <Button asChild size="lg" className="w-full">
                  <a href={event.tickets?.buyUrl} target="_blank" rel="noopener noreferrer">
                    Acheter des billets
                    <ExternalLink className="h-4 w-4" aria-hidden="true" />
                  </a>
                </Button>
              )}
            </div>

            <Link
              href="/events"
              className="group flex items-center justify-between rounded-2xl px-6 py-4 text-sm text-white/70 surface-1 transition-colors hover:border-white/15 hover:text-white"
            >
              Voir tous les événements
              <ArrowRight
                className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </Link>
          </aside>
        </div>
      </div>
    </div>
  );
}
