'use client';

import { motion } from 'framer-motion';
import { ArrowRight, Calendar, CalendarX, Clock, MapPin } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

import { Button } from '@/components/ui/Button';
import { SectionHeading } from '@/components/ui/PageHeader';
import { RevealGroup, RevealItem } from '@/components/ui/Reveal';
import { useSpotlight } from '@/hooks/useSpotlight';
import { useUiVersion } from '@/hooks/useUiVersion';
import { Event } from '@/types';

export interface UpcomingEventsProps {
  title?: string;
  count?: number;
  events: Event[];
}

// Interface ajustée pour correspondre aux données réelles (type Event de types.ts)
interface DisplayEvent {
  id: string;
  title: string;
  date: string; // Renommé de startDate
  location: string;
  description: string;
  imageId?: string | null;
  ticketUrl?: string; // Renommé de tickets.buyUrl
  isFeatured?: boolean;
}

/* -------------------------------------------------------------------------- */
/* UI v2                                                                      */
/* -------------------------------------------------------------------------- */

function EventCardV2({ event }: { event: Event }) {
  const spotlight = useSpotlight<HTMLElement>();
  const date = new Date(event.date);

  return (
    <article
      {...spotlight}
      aria-label={`Event: ${event.title}`}
      className="surface-1 spotlight flex h-full flex-col gap-5 rounded-2xl p-5 transition-[transform,border-color] duration-[400ms] ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 hover:border-white/15 sm:flex-row sm:items-center md:p-6"
    >
      <div className="flex min-w-0 flex-1 items-center gap-4 md:gap-5">
        {/* Pavé date */}
        <div className="flex w-16 shrink-0 flex-col items-center rounded-xl bg-white/[0.04] py-2.5 ring-1 ring-inset ring-white/10">
          <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand">
            {date.toLocaleDateString('en-US', { month: 'short' })}
          </span>
          <span className="text-2xl font-semibold leading-tight text-white tabular-nums">
            {date.toLocaleDateString('en-US', { day: '2-digit' })}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="truncate text-lg font-semibold text-white">{event.title}</h3>
          <div className="mt-1.5 flex flex-col gap-1 text-sm text-white/60">
            <span className="flex items-center gap-2">
              <Clock className="h-4 w-4 shrink-0 text-white/40" aria-hidden="true" />
              {date.toLocaleDateString('en-US', { weekday: 'long' })}
              {' · '}
              {date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
            </span>
            <span className="flex min-w-0 items-center gap-2">
              <MapPin className="h-4 w-4 shrink-0 text-white/40" aria-hidden="true" />
              <span className="truncate">{event.location}</span>
            </span>
          </div>
        </div>
      </div>

      {event.ticketUrl && (
        <Button asChild size="sm" className="h-10 shrink-0 px-5">
          <a
            href={event.ticketUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Buy tickets for ${event.title}`}
          >
            Buy Tickets
          </a>
        </Button>
      )}
    </article>
  );
}

function UpcomingEventsV2({ title, events }: { title: string; events: Event[] }) {
  return (
    <section className="relative py-16 md:py-24">
      <div className="mx-auto max-w-[1180px] px-4">
        <SectionHeading eyebrow="Prochaines dates" title={title}>
          <Link
            href="/events"
            className="group/link hidden shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-white/60 transition-colors duration-300 hover:text-white sm:inline-flex"
            aria-label="View all events"
          >
            View all
            <ArrowRight
              className="h-4 w-4 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover/link:translate-x-0.5"
              aria-hidden="true"
            />
          </Link>
        </SectionHeading>

        {events.length > 0 ? (
          <RevealGroup className="grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-6">
            {events.map((event) => (
              <RevealItem key={event.id} className="h-full">
                <EventCardV2 event={event} />
              </RevealItem>
            ))}
          </RevealGroup>
        ) : (
          <div className="surface-1 mx-auto flex max-w-md flex-col items-center gap-4 rounded-2xl px-6 py-10 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/[0.04]">
              <CalendarX className="h-5 w-5 text-white/60" aria-hidden="true" />
            </span>
            <p className="text-sm text-white/70">No upcoming events at the moment.</p>
            <Button asChild variant="outline" size="sm">
              <Link href="/events">View All Events</Link>
            </Button>
          </div>
        )}

        {events.length > 0 && (
          <div className="mt-8 flex justify-center sm:hidden">
            <Link
              href="/events"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-white/60 transition-colors hover:text-white"
            >
              View All Events
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}

export default function UpcomingEvents({
  title = 'Upcoming Events',
  count = 4,
  events,
}: UpcomingEventsProps) {
  // Filtrer les événements en fonction du nombre demandé
  const filteredEvents = events.slice(0, count);
  const isV2 = useUiVersion() === 'v2';

  if (isV2) return <UpcomingEventsV2 title={title} events={filteredEvents} />;

  return (
    <section className="py-20 relative overflow-hidden">
      {/* Animated Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-black via-purple-900/20 to-black">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-900/10 via-transparent to-blue-900/10 animate-gradient-pulse" />
      </div>

      <div className="max-w-7xl mx-auto px-4 relative z-10">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-4xl md:text-5xl font-audiowide mb-12 text-center text-gradient-animated py-2 overflow-visible"
        >
          {title}
        </motion.h2>

        {filteredEvents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {filteredEvents.map((event, index) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="glass-modern glass-modern-hover rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 group lift-3d focus-within:outline-2 focus-within:outline-purple-500 focus-within:outline-offset-2"
                tabIndex={0}
                role="article"
                aria-label={`Event: ${event.title}`}
              >
                <div className="flex-1">
                  <h3 className="text-xl font-bold mb-3 text-white group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-purple-400 group-hover:to-blue-400 transition-all duration-300">
                    {event.title}
                  </h3>
                  <div className="flex flex-col gap-3 text-gray-300">
                    <div className="flex items-center text-sm group-hover:text-purple-300 transition-colors duration-300">
                      <motion.div
                        whileHover={{ scale: 1.2, rotate: 5 }}
                        transition={{ type: 'spring', stiffness: 400 }}
                      >
                        <Calendar className="w-5 h-5 mr-2 text-purple-400" />
                      </motion.div>
                      <span>
                        {new Date(event.date).toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                        {' - '}
                        {new Date(event.date).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    <div className="flex items-center text-sm group-hover:text-blue-300 transition-colors duration-300">
                      <motion.div
                        whileHover={{ scale: 1.2, rotate: -5 }}
                        transition={{ type: 'spring', stiffness: 400 }}
                      >
                        <MapPin className="w-5 h-5 mr-2 text-blue-400" />
                      </motion.div>
                      <span>{event.location}</span>
                    </div>
                  </div>
                </div>
                {event.ticketUrl && (
                  <motion.a
                    href={event.ticketUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-modern px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white rounded-full font-semibold text-sm glow-purple animate-glow-pulse micro-bounce whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-black"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    aria-label={`Buy tickets for ${event.title}`}
                  >
                    Buy Tickets
                  </motion.a>
                )}
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-10">
            <p className="text-gray-400 text-lg">No upcoming events at the moment.</p>
          </div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-12 text-center"
        >
          <a
            href="/events"
            className="inline-flex items-center gap-2 text-white hover:text-gray-300 transition-all duration-300 group text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-black rounded px-2"
            aria-label="View all events"
          >
            <span>View All Events</span>
            <motion.span
              className="inline-block"
              animate={{ x: [0, 5, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
              aria-hidden="true"
            >
              →
            </motion.span>
          </a>
        </motion.div>
      </div>
    </section>
  );
}
