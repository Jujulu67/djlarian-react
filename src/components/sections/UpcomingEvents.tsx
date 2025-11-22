'use client';

import { motion } from 'framer-motion';
import { Calendar, MapPin } from 'lucide-react';
import Image from 'next/image';

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

export default function UpcomingEvents({
  title = 'Upcoming Events',
  count = 4,
  events,
}: UpcomingEventsProps) {
  // Filtrer les événements en fonction du nombre demandé
  const filteredEvents = events.slice(0, count);

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
          className="text-4xl md:text-5xl font-audiowide mb-12 text-center text-gradient-animated"
        >
          {title}
        </motion.h2>

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
              aria-label={`Événement: ${event.title}`}
            >
              <div className="flex-1">
                <h3 className="text-xl font-bold mb-3 text-white group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-purple-400 group-hover:to-blue-400 transition-all duration-300">
                  {event.title}
                </h3>
                <div className="flex flex-col gap-3 text-gray-300">
                  {/* Date de l'événement avec icône animée */}
                  <div className="flex items-center text-sm group-hover:text-purple-300 transition-colors duration-300">
                    <motion.div
                      whileHover={{ scale: 1.2, rotate: 5 }}
                      transition={{ type: 'spring', stiffness: 400 }}
                    >
                      <Calendar className="w-5 h-5 mr-2 text-purple-400" />
                    </motion.div>
                    <span>
                      {new Date(event.date).toLocaleDateString('fr-FR', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                      {' - '}
                      {new Date(event.date).toLocaleTimeString('fr-FR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  {/* Lieu de l'événement avec icône animée */}
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
                  aria-label={`Acheter des billets pour ${event.title}`}
                >
                  Acheter des billets
                </motion.a>
              )}
            </motion.div>
          ))}
        </div>

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
            aria-label="Voir tous les événements"
          >
            <span>Voir tous les événements</span>
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
