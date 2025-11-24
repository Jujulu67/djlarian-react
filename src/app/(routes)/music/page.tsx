'use client';

import { motion } from 'framer-motion';
import { Filter, Search, Zap, ChevronDown, Music, Sparkles, XCircle, Loader2 } from 'lucide-react';
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

  // Additional filters
  const [platformFilter, setPlatformFilter] = useState<string>('');
  const [featuredFilter, setFeaturedFilter] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('recent');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const itemsPerPageOptions = [20, 50, 100];

  // Use filtered tracks hook
  const baseFilteredTracks = useFilteredTracks({ tracks, searchTerm, selectedType });

  // Apply additional filters and sorting
  const filteredTracks = useMemo(() => {
    let filtered = [...baseFilteredTracks];

    // Filter by platform
    if (platformFilter) {
      filtered = filtered.filter((track) => {
        const platform = platformFilter.toLowerCase();
        if (platform === 'youtube') return !!track.platforms.youtube;
        if (platform === 'soundcloud') return !!track.platforms.soundcloud;
        if (platform === 'spotify') return !!track.platforms.spotify;
        if (platform === 'apple') return !!track.platforms.apple;
        if (platform === 'deezer') return !!track.platforms.deezer;
        return true;
      });
    }

    // Filter by featured
    if (featuredFilter === 'featured') {
      filtered = filtered.filter((track) => track.featured);
    }

    // Sort tracks
    filtered.sort((a, b) => {
      if (sortBy === 'recent') {
        // Featured first, then by date (newest to oldest)
        if (a.featured && !b.featured) return -1;
        if (!a.featured && b.featured) return 1;
        const dateA = new Date(a.releaseDate);
        const dateB = new Date(b.releaseDate);
        return dateB.getTime() - dateA.getTime();
      } else if (sortBy === 'oldest') {
        // Featured first, then by date (oldest to newest)
        if (a.featured && !b.featured) return -1;
        if (!a.featured && b.featured) return 1;
        const dateA = new Date(a.releaseDate);
        const dateB = new Date(b.releaseDate);
        return dateA.getTime() - dateB.getTime();
      } else if (sortBy === 'title') {
        // Featured first, then by title (A-Z)
        if (a.featured && !b.featured) return -1;
        if (!a.featured && b.featured) return 1;
        return a.title.localeCompare(b.title, 'fr', { sensitivity: 'base' });
      }
      return 0;
    });

    return filtered;
  }, [baseFilteredTracks, platformFilter, featuredFilter, sortBy]);

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

  // Pagination logic
  // For "all" view: featured tracks are always shown, pagination applies only to non-featured
  // For specific type view: pagination applies to all filtered tracks
  const tracksToPaginate = useMemo(() => {
    if (selectedType === 'all') {
      return nonFeaturedTracks;
    }
    return filteredTracks;
  }, [selectedType, nonFeaturedTracks, filteredTracks]);

  const indexOfLastTrack = currentPage * itemsPerPage;
  const indexOfFirstTrack = indexOfLastTrack - itemsPerPage;
  const currentTracks = tracksToPaginate.slice(indexOfFirstTrack, indexOfLastTrack);
  const totalTracks = tracksToPaginate.length;
  const totalPages = Math.ceil(totalTracks / itemsPerPage);

  // Change page
  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedType, searchTerm, platformFilter, featuredFilter, sortBy]);

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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black p-8">
        <div className="container mx-auto max-w-6xl">
          <div className="flex justify-center items-center min-h-[60vh]">
            <div className="animate-pulse flex flex-col items-center">
              <div className="relative">
                <div className="absolute inset-0 bg-purple-500 blur-xl opacity-20 rounded-full"></div>
                <Loader2 className="w-16 h-16 text-purple-500 mb-4 animate-spin relative z-10" />
              </div>
              <h2 className="text-2xl font-semibold text-white mt-4">
                Chargement de la musique...
              </h2>
              <p className="text-gray-400 mt-2">Préparez-vous à découvrir mes morceaux</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black p-8">
        <div className="container mx-auto max-w-6xl">
          <div className="flex justify-center items-center min-h-[60vh]">
            <div className="bg-gray-800/40 backdrop-blur-sm border border-red-500/30 p-8 rounded-xl text-center max-w-lg shadow-xl">
              <div className="w-20 h-20 mx-auto bg-red-500/10 rounded-full flex items-center justify-center mb-6">
                <XCircle className="w-10 h-10 text-red-500" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-3">Une erreur est survenue</h2>
              <p className="text-gray-300 mb-6">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-800 hover:from-purple-500 hover:to-purple-700 text-white rounded-lg transition-all duration-300 inline-flex items-center gap-2 shadow-lg shadow-purple-900/30"
              >
                Réessayer
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <MusicPlayerProvider value={playerContextValue}>
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black p-8 pt-28 pb-20">
        <div className="container mx-auto max-w-6xl">
          {/* Titre avec animation et icône */}
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

          {/* Sous-titre */}
          <p className="text-gray-400 text-center mb-10 max-w-2xl mx-auto">
            Découvrez ma discographie complète avec tous mes singles, EPs, remixes et DJ sets
            disponibles sur les plateformes de streaming.
          </p>

          {/* Filtres et recherche */}
          <div className="mb-12">
            <div className="bg-gray-800/30 backdrop-blur-md border border-gray-700/50 rounded-2xl p-4 sm:p-6 shadow-xl">
              <div className="flex flex-col gap-4">
                {/* Ligne 1: Recherche */}
                <div className="relative w-full">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="Rechercher un titre, un genre..."
                    className="bg-gray-900/70 text-white w-full pl-12 pr-4 py-3 rounded-xl border border-gray-700/70 focus:border-purple-500/70 focus:ring-1 focus:ring-purple-500/70 transition-all shadow-inner"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>

                {/* Ligne 2: Filtres par type et bouton filtre */}
                <div className="flex gap-3 items-center">
                  {/* Filtres par type - scrollables sur mobile */}
                  <div className="bg-gray-800/70 backdrop-blur-md rounded-xl p-1.5 flex items-center border border-gray-700/70 shadow-lg overflow-x-auto flex-1 min-w-0">
                    <div className="flex gap-1 min-w-max">
                      {MUSIC_TYPES.map((type) => (
                        <button
                          key={type.value}
                          onClick={() => setSelectedType(type.value)}
                          className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                            selectedType === type.value
                              ? 'bg-gradient-to-r from-purple-600 to-purple-800 text-white shadow-md'
                              : 'text-gray-300 hover:bg-gray-700/60'
                          }`}
                        >
                          {type.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`bg-gray-800/70 p-3 rounded-xl border transition-all flex-shrink-0 ${
                      showFilters
                        ? 'border-purple-500/70 text-purple-400 bg-purple-500/10'
                        : 'border-gray-700/70 text-gray-300 hover:border-gray-500/70'
                    }`}
                    aria-label="Plus de filtres"
                    title="Filtres additionnels"
                  >
                    <Filter className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Filtres additionnels */}
              {showFilters && (
                <div className="mt-6 pt-6 border-t border-gray-700/50 animate-fadeIn">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-white flex items-center gap-2">
                      <span className="w-8 h-8 bg-purple-500/10 rounded-full flex items-center justify-center">
                        <Filter className="w-4 h-4 text-purple-400" />
                      </span>
                      Filtres additionnels
                    </h3>
                    {(platformFilter || featuredFilter || sortBy !== 'recent') && (
                      <button
                        onClick={() => {
                          setPlatformFilter('');
                          setFeaturedFilter('');
                          setSortBy('recent');
                        }}
                        className="text-sm text-gray-400 hover:text-purple-400 transition-colors flex items-center gap-1"
                      >
                        <span>Réinitialiser</span>
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Plateforme
                      </label>
                      <select
                        value={platformFilter}
                        onChange={(e) => setPlatformFilter(e.target.value)}
                        className="bg-gray-900/70 text-white w-full px-4 py-2.5 rounded-xl border border-gray-700/70 focus:border-purple-500/70 focus:ring-1 focus:ring-purple-500/70 transition-all shadow-inner"
                      >
                        <option value="">Toutes les plateformes</option>
                        <option value="youtube">YouTube</option>
                        <option value="soundcloud">SoundCloud</option>
                        <option value="spotify">Spotify</option>
                        <option value="apple">Apple Music</option>
                        <option value="deezer">Deezer</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        En vedette
                      </label>
                      <select
                        value={featuredFilter}
                        onChange={(e) => setFeaturedFilter(e.target.value)}
                        className="bg-gray-900/70 text-white w-full px-4 py-2.5 rounded-xl border border-gray-700/70 focus:border-purple-500/70 focus:ring-1 focus:ring-purple-500/70 transition-all shadow-inner"
                      >
                        <option value="">Tous</option>
                        <option value="featured">En vedette uniquement</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Trier par
                      </label>
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="bg-gray-900/70 text-white w-full px-4 py-2.5 rounded-xl border border-gray-700/70 focus:border-purple-500/70 focus:ring-1 focus:ring-purple-500/70 transition-all shadow-inner"
                      >
                        <option value="recent">Plus récent</option>
                        <option value="oldest">Plus ancien</option>
                        <option value="title">Titre (A-Z)</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Liste des morceaux */}
          {filteredTracks.length === 0 ? (
            <div className="bg-gray-800/30 backdrop-blur-sm rounded-xl p-10 border border-gray-700/50 text-center shadow-xl">
              <div className="w-24 h-24 mx-auto bg-gray-700/30 rounded-full flex items-center justify-center mb-6">
                <Music className="w-12 h-12 text-gray-500" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-3">Aucun morceau trouvé</h2>
              <p className="text-gray-400 mb-6 max-w-md mx-auto">
                {searchTerm
                  ? `Aucun résultat ne correspond à &quot;${searchTerm}&quot;`
                  : selectedType === 'all'
                    ? 'Aucun morceau disponible pour le moment'
                    : `Aucun morceau de type &quot;${MUSIC_TYPES.find((t) => t.value === selectedType)?.label}&quot;`}
              </p>
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="px-6 py-2.5 bg-purple-600/80 hover:bg-purple-500/80 text-white rounded-lg transition-colors inline-flex items-center gap-2"
                >
                  Effacer la recherche
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Sélection du nombre d'éléments par page */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
                <div className="text-xs sm:text-sm text-gray-400">
                  Affichage de {indexOfFirstTrack + 1}-{Math.min(indexOfLastTrack, totalTracks)} sur{' '}
                  {totalTracks} morceaux
                </div>
                <div className="flex items-center gap-2 sm:gap-3">
                  <label
                    htmlFor="itemsPerPage"
                    className="text-xs sm:text-sm text-gray-300 whitespace-nowrap"
                  >
                    Par page:
                  </label>
                  <select
                    id="itemsPerPage"
                    className="bg-gray-800/70 text-white rounded-lg px-2 sm:px-3 py-1.5 border border-gray-700/50 text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-purple-500"
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value));
                      setCurrentPage(1); // Retour à la première page lors du changement
                    }}
                  >
                    {itemsPerPageOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Section Featured (si présent et vue "Tous") - toujours affichée, non paginée */}
              {selectedType === 'all' && featuredTracks.length > 0 && (
                <div className="mb-12">
                  <div className="flex items-center gap-2 mb-4">
                    <Zap className="w-5 h-5 text-yellow-500" />
                    <h2 className="text-2xl font-bold text-white">En vedette</h2>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 auto-rows-auto">
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

              {/* Tous les morceaux (paginés) */}
              {currentTracks.length > 0 && (
                <div>
                  <h2 className="text-2xl font-bold text-white mb-6">
                    {selectedType === 'all'
                      ? 'Tous les morceaux'
                      : MUSIC_TYPES.find((t) => t.value === selectedType)?.label || 'Morceaux'}
                  </h2>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 auto-rows-auto">
                    {currentTracks.map((track, index) => (
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
                    ))}
                  </div>
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-8 sm:mt-10 flex justify-center">
                  <div className="flex flex-wrap justify-center gap-1.5 sm:gap-2">
                    {/* Bouton précédent */}
                    <button
                      onClick={() => paginate(currentPage - 1)}
                      disabled={currentPage === 1}
                      className={`px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm ${
                        currentPage === 1
                          ? 'bg-gray-800/50 text-gray-500 cursor-not-allowed'
                          : 'bg-gray-800/80 text-white hover:bg-purple-600/70'
                      }`}
                    >
                      <span className="hidden sm:inline">Précédent</span>
                      <span className="sm:hidden">Préc.</span>
                    </button>

                    {/* Numéros de page */}
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNumber) => {
                      // Afficher uniquement les 3 premières pages, les 3 dernières et la page courante ± 1
                      if (
                        pageNumber <= 3 ||
                        pageNumber > totalPages - 3 ||
                        Math.abs(pageNumber - currentPage) <= 1
                      ) {
                        return (
                          <button
                            key={pageNumber}
                            onClick={() => paginate(pageNumber)}
                            className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center text-xs sm:text-sm ${
                              currentPage === pageNumber
                                ? 'bg-gradient-to-r from-purple-600 to-purple-800 text-white font-semibold'
                                : 'bg-gray-800/80 text-white hover:bg-gray-700/80'
                            }`}
                          >
                            {pageNumber}
                          </button>
                        );
                      } else if (
                        (pageNumber === 4 && currentPage < 4) ||
                        (pageNumber === totalPages - 3 && currentPage > totalPages - 3)
                      ) {
                        // Afficher des points de suspension pour indiquer des pages manquantes
                        return (
                          <span
                            key={pageNumber}
                            className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center text-gray-400 text-xs sm:text-sm"
                          >
                            ...
                          </span>
                        );
                      }
                      return null;
                    })}

                    {/* Bouton suivant */}
                    <button
                      onClick={() => paginate(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className={`px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm ${
                        currentPage === totalPages
                          ? 'bg-gray-800/50 text-gray-500 cursor-not-allowed'
                          : 'bg-gray-800/80 text-white hover:bg-purple-600/70'
                      }`}
                    >
                      Suivant
                    </button>
                  </div>
                </div>
              )}
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
