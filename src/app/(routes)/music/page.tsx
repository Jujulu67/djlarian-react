'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Track } from '@/lib/utils/types';
import Image from 'next/image';

const tracks: Track[] = [
  {
    id: '1',
    title: 'Neon Dreams',
    artist: 'DJ Larian',
    coverUrl: '/images/releases/neon-dreams.jpg',
    audioUrl: '/audio/neon-dreams-preview.mp3',
    duration: 215,
    releaseDate: '2024-02-15',
    genre: ['House', 'Electronic'],
  },
  {
    id: '2',
    title: 'Digital Horizon',
    artist: 'DJ Larian',
    coverUrl: '/images/releases/digital-horizon.jpg',
    audioUrl: '/audio/digital-horizon-preview.mp3',
    duration: 198,
    releaseDate: '2024-01-20',
    genre: ['Techno', 'Progressive'],
  },
  {
    id: '3',
    title: 'Midnight Protocol',
    artist: 'DJ Larian',
    coverUrl: '/images/releases/midnight-protocol.jpg',
    audioUrl: '/audio/midnight-protocol-preview.mp3',
    duration: 225,
    releaseDate: '2023-12-10',
    genre: ['Deep House', 'Melodic Techno'],
  },
];

export default function MusicPage() {
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const playTrack = (track: Track) => {
    if (currentTrack?.id === track.id) {
      setIsPlaying(!isPlaying);
    } else {
      setCurrentTrack(track);
      setIsPlaying(true);
    }
  };

  return (
    <div className="min-h-screen py-24 px-4">
      <div className="max-w-7xl mx-auto">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-4xl md:text-5xl font-audiowide mb-12 text-center"
        >
          Ma Musique
        </motion.h1>

        {/* Current Track Player */}
        {currentTrack && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-purple-900/20 backdrop-blur-lg rounded-lg p-6 mb-12"
          >
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="w-48 h-48 relative rounded-lg overflow-hidden">
                <Image
                  src={currentTrack.coverUrl}
                  alt={currentTrack.title}
                  width={192}
                  height={192}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-audiowide mb-2">{currentTrack.title}</h2>
                <p className="text-gray-300 mb-4">{currentTrack.genre.join(' • ')}</p>
                <audio
                  src={currentTrack.audioUrl}
                  controls
                  autoPlay={isPlaying}
                  className="w-full"
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                />
              </div>
            </div>
          </motion.div>
        )}

        {/* Tracks Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {tracks.map((track, index) => (
            <motion.div
              key={track.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className={`group relative cursor-pointer ${
                currentTrack?.id === track.id ? 'ring-2 ring-purple-500' : ''
              }`}
              onClick={() => playTrack(track)}
            >
              <div className="aspect-square overflow-hidden rounded-lg bg-purple-900/20">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  transition={{ duration: 0.3 }}
                  className="w-full h-full relative"
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10" />
                  <img
                    src={track.coverUrl}
                    alt={track.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-0 left-0 right-0 p-4 z-20">
                    <h3 className="text-xl font-audiowide mb-1">{track.title}</h3>
                    <p className="text-sm text-gray-300">{track.genre.join(' • ')}</p>
                  </div>
                  <motion.div
                    initial={{ opacity: 0 }}
                    whileHover={{ opacity: 1 }}
                    className="absolute inset-0 flex items-center justify-center bg-black/60 z-30"
                  >
                    <button className="bg-purple-600 hover:bg-purple-700 text-white rounded-full p-4 transform transition-transform duration-200 hover:scale-110">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-8 w-8"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        {currentTrack?.id === track.id && isPlaying ? (
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M10 9v6m4-6v6m-9-6h14"
                          />
                        ) : (
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                          />
                        )}
                      </svg>
                    </button>
                  </motion.div>
                </motion.div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
