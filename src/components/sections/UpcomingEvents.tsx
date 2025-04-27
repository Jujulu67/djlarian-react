'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import { Event } from '@/types';
import { Calendar, MapPin } from 'lucide-react';

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
    <section className="py-20 relative">
      <div className="max-w-7xl mx-auto px-4">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-4xl md:text-5xl font-audiowide mb-12 text-center"
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
              transition={{ duration: 0.6 }}
              className="bg-gray-900/50 backdrop-blur-lg rounded-lg p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
            >
              <div>
                <h3 className="text-xl font-bold mb-2">{event.title}</h3>
                <div className="flex flex-col md:flex-row gap-2 md:gap-6 text-gray-400">
                  {/* Date de l'événement */}
                  <div className="flex items-center text-sm text-purple-300 mb-2">
                    <Calendar className="w-4 h-4 mr-2" />
                    <span>
                      {new Date(event.date).toLocaleDateString('fr-FR', {
                        // Utiliser event.date
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                      {' - '}
                      {new Date(event.date).toLocaleTimeString('fr-FR', {
                        // Utiliser event.date
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  {/* Lieu de l'événement */}
                  <div className="flex items-center text-sm text-gray-400 mb-4">
                    <MapPin className="w-4 h-4 mr-2" />
                    <span>{event.location}</span>
                    {/* Supprimer la partie adresse qui n'existe pas dans le type Event */}
                    {/* {event.address && `, ${event.address}`} */}
                  </div>
                </div>
              </div>
              {event.ticketUrl && ( // Utiliser event.ticketUrl
                <motion.a
                  href={event.ticketUrl} // Utiliser event.ticketUrl
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-full transition-colors duration-200"
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
            className="text-purple-400 hover:text-purple-300 transition-colors duration-200"
          >
            Voir tous les événements →
          </a>
        </motion.div>
      </div>
    </section>
  );
}
