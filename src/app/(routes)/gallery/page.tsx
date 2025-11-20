'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import { useState } from 'react';

import { GalleryItem } from '@/lib/utils/types';

const galleryItems: GalleryItem[] = [
  {
    id: '1',
    title: 'Electric Dreams Festival 2024',
    imageUrl: '/images/gallery/electric-dreams-1.jpg',
    type: 'image',
    date: '2024-03-15',
    description: 'Performance live au Electric Dreams Festival',
  },
  {
    id: '2',
    title: 'Studio Session',
    imageUrl: '/images/gallery/studio-session.jpg',
    type: 'video',
    date: '2024-02-20',
    description: 'Session de production en studio',
  },
  {
    id: '3',
    title: 'Club Nexus Night',
    imageUrl: '/images/gallery/club-nexus.jpg',
    type: 'image',
    date: '2024-01-15',
    description: 'Une nuit mémorable au Club Nexus',
  },
  {
    id: '4',
    title: 'Behind the Scenes',
    imageUrl: '/images/gallery/behind-scenes.jpg',
    type: 'video',
    date: '2024-01-10',
    description: 'Préparation avant le show',
  },
];

export default function GalleryPage() {
  const [selectedItem, setSelectedItem] = useState<GalleryItem | null>(null);
  const [filter, setFilter] = useState<'all' | 'images' | 'videos'>('all');

  const filteredItems = galleryItems.filter((item) => {
    if (filter === 'all') return true;
    if (filter === 'images') return item.type === 'image';
    if (filter === 'videos') return item.type === 'video';
    return true;
  });

  return (
    <div className="min-h-screen py-24 px-4">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl md:text-5xl font-audiowide mb-6">Galerie</h1>
          <p className="text-xl text-gray-300 font-montserrat max-w-2xl mx-auto">
            Découvrez les moments forts de mes performances et sessions en studio.
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
            Tout
          </button>
          <button
            onClick={() => setFilter('images')}
            className={`px-6 py-2 rounded-full font-montserrat transition-colors duration-200 ${
              filter === 'images'
                ? 'bg-purple-600 text-white'
                : 'bg-transparent border border-purple-600 text-purple-400 hover:bg-purple-600/10'
            }`}
          >
            Photos
          </button>
          <button
            onClick={() => setFilter('videos')}
            className={`px-6 py-2 rounded-full font-montserrat transition-colors duration-200 ${
              filter === 'videos'
                ? 'bg-purple-600 text-white'
                : 'bg-transparent border border-purple-600 text-purple-400 hover:bg-purple-600/10'
            }`}
          >
            Vidéos
          </button>
        </motion.div>

        {/* Grille de la galerie */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredItems.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="group relative cursor-pointer"
              onClick={() => setSelectedItem(item)}
            >
              <div className="aspect-square overflow-hidden rounded-lg bg-purple-900/20">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  transition={{ duration: 0.3 }}
                  className="w-full h-full relative"
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10" />
                  <Image
                    src={item.imageUrl}
                    alt={item.title}
                    width={800}
                    height={600}
                    className="w-full h-full object-cover"
                  />
                  {item.type === 'video' && (
                    <div className="absolute inset-0 flex items-center justify-center z-20">
                      <div className="w-16 h-16 bg-purple-600/80 rounded-full flex items-center justify-center">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-8 w-8 text-white"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                    </div>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 p-4 z-30">
                    <h3 className="text-xl font-audiowide mb-1">{item.title}</h3>
                    <p className="text-sm text-gray-300">{item.description}</p>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Modal pour l'aperçu */}
        {selectedItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedItem(null)}
          >
            <div className="max-w-4xl w-full">
              <div className="relative aspect-video rounded-lg overflow-hidden">
                {selectedItem.type === 'video' ? (
                  <video
                    src={selectedItem.imageUrl}
                    controls
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Image
                    src={selectedItem.imageUrl}
                    alt={selectedItem.title}
                    width={800}
                    height={600}
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
              <div className="mt-4 text-center">
                <h3 className="text-2xl font-audiowide mb-2">{selectedItem.title}</h3>
                <p className="text-gray-300">{selectedItem.description}</p>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
