'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Track, MusicType } from '@/lib/utils/types';
import { getDemoTracks } from '@/lib/utils/music-service';
import MusicCard from '@/components/ui/MusicCard';
import MusicPlayer from '@/components/ui/MusicPlayer';
import { Filter, Search, Zap, ChevronDown, Music } from 'lucide-react';

// Types de musique disponibles
const MUSIC_TYPES: { label: string; value: MusicType | 'all' }[] = [
  { label: 'Tous', value: 'all' },
  { label: 'Singles', value: 'single' },
  { label: 'EPs & Albums', value: 'ep' },
  { label: 'Remixes', value: 'remix' },
  { label: 'DJ Sets', value: 'djset' },
  { label: 'Live', value: 'live' },
];

export default function MusicPage() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [filteredTracks, setFilteredTracks] = useState<Track[]>([]);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<MusicType | 'all'>('all');
  const [showFilters, setShowFilters] = useState(false);

  // Charger les morceaux
  useEffect(() => {
    // À terme, ce sera un appel API
    const fetchedTracks = getDemoTracks();
    setTracks(fetchedTracks);
  }, []);

  // Appliquer les filtres
  useEffect(() => {
    let filtered = [...tracks];

    // Filtre par type
    if (selectedType !== 'all') {
      filtered = filtered.filter((track) => track.type === selectedType);
    }

    // Filtre par recherche
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (track) =>
          track.title.toLowerCase().includes(term) ||
          track.artist.toLowerCase().includes(term) ||
          track.genre.some((g) => g.toLowerCase().includes(term))
      );
    }

    // Trier: d'abord les featured, puis par date (du plus récent au plus ancien)
    filtered.sort((a, b) => {
      if (a.featured && !b.featured) return -1;
      if (!a.featured && b.featured) return 1;

      const dateA = new Date(a.releaseDate);
      const dateB = new Date(b.releaseDate);
      return dateB.getTime() - dateA.getTime();
    });

    setFilteredTracks(filtered);
  }, [tracks, selectedType, searchTerm]);

  // Gérer la lecture d'un morceau
  const playTrack = (track: Track) => {
    if (currentTrack?.id === track.id) {
      setIsPlaying(!isPlaying);
    } else {
      setCurrentTrack(track);
      setIsPlaying(true);
    }
  };

  // Fermer le lecteur
  const closePlayer = () => {
    setCurrentTrack(null);
    setIsPlaying(false);
  };

  return (
    <div className="min-h-screen pt-24 pb-28 px-4 relative">
      <div className="max-w-7xl mx-auto">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-4xl md:text-5xl font-bold mb-4 text-center text-white"
        >
          Ma Musique
        </motion.h1>

        <p className="text-gray-400 text-center mb-10 max-w-2xl mx-auto">
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

        {/* Affichage des résultats */}
        {filteredTracks.length === 0 ? (
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
            {selectedType === 'all' && filteredTracks.some((t) => t.featured) && (
              <div className="mb-12">
                <div className="flex items-center gap-2 mb-4">
                  <Zap className="w-5 h-5 text-yellow-500" />
                  <h2 className="text-2xl font-bold text-white">En vedette</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {filteredTracks
                    .filter((track) => track.featured)
                    .map((track) => (
                      <MusicCard
                        key={track.id}
                        track={track}
                        onPlay={playTrack}
                        isPlaying={isPlaying}
                        isActive={currentTrack?.id === track.id}
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

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredTracks
                  .filter((track) => (selectedType === 'all' ? !track.featured : true))
                  .map((track) => (
                    <MusicCard
                      key={track.id}
                      track={track}
                      onPlay={playTrack}
                      isPlaying={isPlaying}
                      isActive={currentTrack?.id === track.id}
                    />
                  ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Lecteur de musique */}
      {currentTrack && (
        <MusicPlayer
          track={currentTrack}
          isPlaying={isPlaying}
          onClose={closePlayer}
          onTogglePlay={() => setIsPlaying(!isPlaying)}
        />
      )}
    </div>
  );
}
