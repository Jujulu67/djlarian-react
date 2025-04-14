'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import { Event } from '@/types';

export interface UpcomingEventsProps {
  title?: string;
  count?: number;
  events: Event[];
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
                  <div className="flex items-center gap-2">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    <span>
                      {new Date(event.startDate).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                    <span>
                      {event.location}
                      {event.address && `, ${event.address}`}
                    </span>
                  </div>
                </div>
              </div>
              {event.tickets?.buyUrl && (
                <a
                  href={event.tickets.buyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-full transition-colors duration-200"
                >
                  Acheter des billets
                </a>
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
