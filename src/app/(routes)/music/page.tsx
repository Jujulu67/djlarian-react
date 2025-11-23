'use client';

import { motion } from 'framer-motion';
import { Filter, Search, Zap, ChevronDown, Music, Loader, Sparkles } from 'lucide-react';
import React, { useState, useEffect, useMemo, useCallback } from 'react';

import MusicCard from '@/components/ui/MusicCard';
import SimpleMusicPlayer from '@/components/ui/SimpleMusicPlayer';
import { MusicPlayerProvider } from '@/contexts/MusicPlayerContext';
import { useFilteredTracks } from '@/hooks/useFilteredTracks';
import { useMusicPlayer } from '@/hooks/useMusicPlayer';
import { logger } from '@/lib/logger';
import { Track, TrackAction, MusicType } from '@/lib/utils/types';

// Types de musique disponibles
const MUSIC_TYPES: { label: string; value: MusicType | 'all' }[] = [
  { label: 'Tous', value: 'all' },
  { label: 'Singles', value: 'single' },
  { label: 'EPs & Albums', value: 'ep' },
  { label: 'Remixes', value: 'remix' },
  { label: 'DJ Sets', value: 'djset' },
  { label: 'Live', value: 'live' },
];

/**
 * Music Page Component:
 * Displays tracks, allows filtering, searching, and playing music via embedded players.
 * Manages the overall playback state (current track, playing/paused) and coordinates
 * interactions between MusicCard components and the SimpleMusicPlayer footer.
 */
export default function MusicPage() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<MusicType | 'all'>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Use filtered tracks hook
  const filteredTracks = useFilteredTracks({ tracks, searchTerm, selectedType });

  // Use music player hook
  const {
    currentTrack,
    isPlaying,
    playTrack,
    closePlayer,
    playNextTrack,
    playPrevTrack,
    togglePlay,
  } = useMusicPlayer({ filteredTracks });

  // Memoize playTrack callback to prevent unnecessary re-renders of MusicCard
  const memoizedPlayTrack = useCallback(
    (track: TrackAction) => {
      playTrack(track);
    },
    [playTrack]
  );

  // Memoize featured tracks
  const featuredTracks = useMemo(
    () => filteredTracks.filter((track) => track.featured),
    [filteredTracks]
  );

  // Memoize non-featured tracks
  const nonFeaturedTracks = useMemo(
    () => filteredTracks.filter((track) => !track.featured),
    [filteredTracks]
  );

  // Load tracks from API
  useEffect(() => {
    const fetchTracks = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/api/music');
        if (!response.ok) {
          throw new Error('Erreur lors de la récupération des morceaux');
        }
        const result = await response.json();
        setTracks(result.data || []);
        setError(null);
      } catch (err) {
        logger.error('Erreur:', err);
        setError('Impossible de charger les morceaux');
      } finally {
        setIsLoading(false);
      }
    };

    fetchTracks();
  }, []);

  // Create context value
  const playerContextValue = useMemo(
    () => ({
      currentTrack,
      isPlaying,
      playTrack: memoizedPlayTrack,
      closePlayer,
      playNextTrack,
      playPrevTrack,
      togglePlay,
    }),
    [
      currentTrack,
      isPlaying,
      memoizedPlayTrack,
      closePlayer,
      playNextTrack,
      playPrevTrack,
      togglePlay,
    ]
  );

  return (
    <MusicPlayerProvider value={playerContextValue}>
      <div className="min-h-screen pt-24 pb-36 px-4 relative">
        <div className="max-w-7xl mx-auto">
          {/* Titre avec dégradé et icône */}
          <div className="relative mb-4">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-4xl md:text-5xl font-bold text-center bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent"
            >
              Ma Musique
            </motion.h1>
            <Sparkles className="absolute top-0 right-[calc(50%-150px)] md:right-[calc(50%-180px)] w-8 h-8 md:w-10 md:h-10 text-yellow-400 transform -translate-y-1 animate-pulse" />
          </div>

          <p className="text-gray-400 text-center mb-10 max-w-2xl mx-auto mt-0">
            Découvrez ma discographie complète avec tous mes singles, EPs, remixes et DJ sets
            disponibles sur les plateformes de streaming.
          </p>

          {/* Barre de recherche et filtres */}
          <div className="mb-8">
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center mb-6">
              {/* Recherche */}
              <div className="relative w-full md:w-auto md:flex-1 max-w-lg">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Rechercher un titre, un genre..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-gray-800/70 border border-gray-700/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                />
              </div>

              {/* Filtres */}
              <div className="flex gap-2 w-full md:w-auto">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="px-4 py-3 bg-gray-800/70 border border-gray-700/50 rounded-lg text-white flex items-center gap-2 hover:bg-gray-700/80 transition-colors"
                >
                  <Filter className="w-5 h-5" />
                  Filtres
                  <ChevronDown
                    className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`}
                  />
                </button>

                {/* Afficher les filtres par type immédiatement sur desktop */}
                <div className="hidden md:flex gap-2">
                  {MUSIC_TYPES.map((type) => (
                    <button
                      key={type.value}
                      onClick={() => setSelectedType(type.value)}
                      className={`px-4 py-3 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors ${
                        selectedType === type.value
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-800/70 text-gray-300 hover:bg-gray-700/80'
                      }`}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Filtres mobiles (affichés conditionnellement) */}
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="md:hidden mb-4 flex flex-wrap gap-2 justify-center"
              >
                {MUSIC_TYPES.map((type) => (
                  <button
                    key={type.value}
                    onClick={() => setSelectedType(type.value)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors ${
                      selectedType === type.value
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-800/70 text-gray-300 hover:bg-gray-700/80'
                    }`}
                  >
                    {type.label}
                  </button>
                ))}
              </motion.div>
            )}
          </div>

          {/* Affichage des résultats - État de chargement */}
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-24">
              <Loader className="w-12 h-12 text-purple-500 animate-spin mb-4" />
              <p className="text-gray-400">Chargement de la musique...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Music className="w-16 h-16 text-gray-600 mb-4" />
              <h2 className="text-xl text-gray-300 mb-2">Erreur de chargement</h2>
              <p className="text-gray-500">{error}</p>
            </div>
          ) : filteredTracks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Music className="w-16 h-16 text-gray-600 mb-4" />
              <h2 className="text-xl text-gray-300 mb-2">Aucun résultat trouvé</h2>
              <p className="text-gray-500">
                {searchTerm
                  ? "Essayez d'autres termes de recherche"
                  : 'Aucun morceau disponible pour le moment'}
              </p>
            </div>
          ) : (
            <>
              {/* Section Featured (si présent et vue "Tous") */}
              {selectedType === 'all' && featuredTracks.length > 0 && (
                <div className="mb-12">
                  <div className="flex items-center gap-2 mb-4">
                    <Zap className="w-5 h-5 text-yellow-500" />
                    <h2 className="text-2xl font-bold text-white">En vedette</h2>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 auto-rows-auto">
                    {featuredTracks.map((track, index) => (
                      <MusicCard
                        key={track.id}
                        track={track}
                        onPlay={memoizedPlayTrack}
                        isPlaying={isPlaying}
                        isActive={currentTrack?.id === track.id}
                        priority={index === 0}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Tous les morceaux */}
              <div>
                <h2 className="text-2xl font-bold text-white mb-6">
                  {selectedType === 'all'
                    ? 'Tous les morceaux'
                    : MUSIC_TYPES.find((t) => t.value === selectedType)?.label || 'Morceaux'}
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 auto-rows-auto">
                  {(selectedType === 'all' ? nonFeaturedTracks : filteredTracks).map(
                    (track, index) => (
                      <MusicCard
                        key={track.id}
                        track={track}
                        onPlay={memoizedPlayTrack}
                        isPlaying={isPlaying}
                        isActive={currentTrack?.id === track.id}
                        priority={
                          index === 0 && selectedType === 'all' && featuredTracks.length === 0
                        }
                      />
                    )
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Lecteur de musique */}
        {currentTrack && (
          <SimpleMusicPlayer
            track={currentTrack}
            isPlaying={isPlaying}
            onClose={closePlayer}
            onFooterToggle={togglePlay}
            onNextTrack={filteredTracks.length > 1 ? playNextTrack : undefined}
            onPrevTrack={filteredTracks.length > 1 ? playPrevTrack : undefined}
          />
        )}
      </div>
    </MusicPlayerProvider>
  );
}
