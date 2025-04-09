'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

interface Event {
  id: string;
  title: string;
  location: string;
  address?: string;
  startDate: string;
  endDate?: string;
  image?: string;
  status: string;
  isPublished: boolean;
  tickets?: {
    price: number;
    currency: string;
    buyUrl: string;
    availableFrom?: string;
    availableTo?: string;
  };
}

const UpcomingEvents = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await fetch('/api/events');
        if (!response.ok) {
          throw new Error('Erreur lors de la récupération des événements');
        }
        const data = await response.json();

        // Vérifier si les données sont dans le format attendu
        // La réponse contient { events: [...] } et non directement un tableau
        if (data.events && Array.isArray(data.events)) {
          setEvents(data.events);
        } else if (Array.isArray(data)) {
          // Si la réponse est directement un tableau
          setEvents(data);
        } else {
          // Format inattendu, utiliser un tableau vide
          console.error('Format de données inattendu:', data);
          setEvents([]);
        }
      } catch (err) {
        console.error('Erreur lors du chargement des événements:', err);
        setError(err instanceof Error ? err.message : 'Une erreur est survenue');
        setEvents([]);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  if (loading) {
    return (
      <section className="py-20 bg-gradient-to-b from-black to-purple-900/20">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-gray-400">Chargement des événements...</p>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="py-20 bg-gradient-to-b from-black to-purple-900/20">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-red-400">{error}</p>
        </div>
      </section>
    );
  }

  // S'assurer que events est un tableau avant d'appeler map
  const eventsToDisplay = Array.isArray(events) ? events : [];

  return (
    <section className="py-20 bg-gradient-to-b from-black to-purple-900/20">
      <div className="max-w-7xl mx-auto px-4">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-4xl md:text-5xl font-audiowide mb-12 text-center"
        >
          Prochains Événements
        </motion.h2>

        <div className="grid gap-6">
          {eventsToDisplay.length > 0 ? (
            eventsToDisplay.map((event) => (
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
            ))
          ) : (
            <div className="text-center text-gray-400 py-8">
              Aucun événement à venir pour le moment.
            </div>
          )}
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
};

export default UpcomingEvents;
