'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Event } from '@/lib/utils/types';
import Image from 'next/image';

const events: Event[] = [
  {
    id: '1',
    title: 'Electric Dreams Festival',
    date: '2024-03-15',
    location: 'Metropolis Arena, Paris',
    description:
      'Une nuit de musique électronique immersive avec des performances visuelles époustouflantes.',
    imageUrl: '/images/events/electric-dreams.jpg',
    ticketUrl: 'https://tickets.com/electric-dreams',
    isFeatured: true,
  },
  {
    id: '2',
    title: 'Club Nexus Showcase',
    date: '2024-03-22',
    location: 'Club Nexus, Lyon',
    description: 'Une soirée intime avec un set exclusif de nouvelles productions.',
    imageUrl: '/images/events/club-nexus.jpg',
    ticketUrl: 'https://tickets.com/club-nexus',
  },
  {
    id: '3',
    title: 'Techno Underground',
    date: '2024-04-05',
    location: 'Le Tunnel, Marseille',
    description: 'Une expérience techno pure dans un lieu historique.',
    imageUrl: '/images/events/techno-underground.jpg',
    ticketUrl: 'https://tickets.com/techno-underground',
  },
  {
    id: '4',
    title: 'Summer Beats Festival',
    date: '2024-07-15',
    location: 'Plage des Catalans, Marseille',
    description: 'Festival en plein air avec une vue imprenable sur la Méditerranée.',
    imageUrl: '/images/events/summer-beats.jpg',
    ticketUrl: 'https://tickets.com/summer-beats',
    isFeatured: true,
  },
];

export default function EventsPage() {
  const [filter, setFilter] = useState<'all' | 'featured'>('all');

  const filteredEvents = filter === 'all' ? events : events.filter((event) => event.isFeatured);

  return (
    <div className="min-h-screen py-24 px-4">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl md:text-5xl font-audiowide mb-6">Événements</h1>
          <p className="text-xl text-gray-300 font-montserrat max-w-2xl mx-auto">
            Retrouvez-moi lors de ces événements exceptionnels pour des performances uniques.
          </p>
        </motion.div>

        {/* Filtres */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="flex justify-center gap-4 mb-12"
        >
          <button
            onClick={() => setFilter('all')}
            className={`px-6 py-2 rounded-full font-montserrat transition-colors duration-200 ${
              filter === 'all'
                ? 'bg-purple-600 text-white'
                : 'bg-transparent border border-purple-600 text-purple-400 hover:bg-purple-600/10'
            }`}
          >
            Tous les événements
          </button>
          <button
            onClick={() => setFilter('featured')}
            className={`px-6 py-2 rounded-full font-montserrat transition-colors duration-200 ${
              filter === 'featured'
                ? 'bg-purple-600 text-white'
                : 'bg-transparent border border-purple-600 text-purple-400 hover:bg-purple-600/10'
            }`}
          >
            Événements à la une
          </button>
        </motion.div>

        {/* Liste des événements */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {filteredEvents.map((event, index) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="group relative"
            >
              <div className="relative overflow-hidden rounded-lg bg-purple-900/20">
                <div className="aspect-[16/9]">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent z-10" />
                  <Image
                    src={event.imageUrl}
                    alt={event.title}
                    width={800}
                    height={450}
                    className="w-full h-full object-cover"
                  />
                  {event.isFeatured && (
                    <div className="absolute top-4 right-4 z-20 bg-purple-600 px-3 py-1 rounded-full text-sm font-montserrat">
                      À la une
                    </div>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 p-6 z-20">
                    <h3 className="text-2xl font-audiowide mb-2">{event.title}</h3>
                    <p className="text-gray-300 mb-2">{event.location}</p>
                    <time className="text-purple-400 block mb-4">
                      {new Date(event.date).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </time>
                    <p className="text-gray-300 mb-6">{event.description}</p>
                    <a
                      href={event.ticketUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-full text-sm transition-colors duration-200"
                    >
                      Réserver
                    </a>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
