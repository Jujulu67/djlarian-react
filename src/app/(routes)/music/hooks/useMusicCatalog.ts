import { useEffect, useMemo, useState } from 'react';

import { useFilteredTracks } from '@/hooks/useFilteredTracks';
import { logger } from '@/lib/logger';
import { Track, MusicType } from '@/lib/utils/types';

export const ITEMS_PER_PAGE_OPTIONS = [20, 50, 100];

/** Mis en avant d'abord, puis le critère de tri choisi */
function compareTracks(a: Track, b: Track, sortBy: string): number {
  if (sortBy !== 'recent' && sortBy !== 'oldest' && sortBy !== 'title') return 0;
  if (a.featured && !b.featured) return -1;
  if (!a.featured && b.featured) return 1;
  if (sortBy === 'title') return a.title.localeCompare(b.title, 'fr', { sensitivity: 'base' });
  const diff = new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime();
  return sortBy === 'recent' ? diff : -diff;
}

function matchesPlatform(track: Track, platformFilter: string): boolean {
  const platform = platformFilter.toLowerCase();
  if (platform === 'youtube') return !!track.platforms.youtube;
  if (platform === 'soundcloud') return !!track.platforms.soundcloud;
  if (platform === 'spotify') return !!track.platforms.spotify;
  if (platform === 'apple') return !!track.platforms.apple;
  if (platform === 'deezer') return !!track.platforms.deezer;
  return true;
}

/**
 * Catalogue de la page Musique : chargement, recherche, filtres, tri et pagination.
 * En vue « Tous », les morceaux mis en avant sont toujours affichés et seule la suite est paginée.
 */
export function useMusicCatalog() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<MusicType | 'all'>('all');
  const [platformFilter, setPlatformFilter] = useState<string>('');
  const [featuredFilter, setFeaturedFilter] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('recent');

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  const baseFilteredTracks = useFilteredTracks({ tracks, searchTerm, selectedType });

  const filteredTracks = useMemo(() => {
    let filtered = [...baseFilteredTracks];
    if (platformFilter) {
      filtered = filtered.filter((track) => matchesPlatform(track, platformFilter));
    }
    if (featuredFilter === 'featured') {
      filtered = filtered.filter((track) => track.featured);
    }
    filtered.sort((a, b) => compareTracks(a, b, sortBy));
    return filtered;
  }, [baseFilteredTracks, platformFilter, featuredFilter, sortBy]);

  const featuredTracks = useMemo(
    () => filteredTracks.filter((track) => track.featured),
    [filteredTracks]
  );
  const nonFeaturedTracks = useMemo(
    () => filteredTracks.filter((track) => !track.featured),
    [filteredTracks]
  );

  const tracksToPaginate = selectedType === 'all' ? nonFeaturedTracks : filteredTracks;
  const indexOfLastTrack = currentPage * itemsPerPage;
  const indexOfFirstTrack = indexOfLastTrack - itemsPerPage;
  const currentTracks = tracksToPaginate.slice(indexOfFirstTrack, indexOfLastTrack);
  const totalTracks = tracksToPaginate.length;
  const totalPages = Math.ceil(totalTracks / itemsPerPage);

  // Retour à la première page quand les filtres changent
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedType, searchTerm, platformFilter, featuredFilter, sortBy]);

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

  const changeItemsPerPage = (value: number) => {
    setItemsPerPage(value);
    setCurrentPage(1);
  };

  const resetAdditionalFilters = () => {
    setPlatformFilter('');
    setFeaturedFilter('');
    setSortBy('recent');
  };

  return {
    isLoading,
    error,
    filters: {
      searchTerm,
      setSearchTerm,
      selectedType,
      setSelectedType,
      platformFilter,
      setPlatformFilter,
      featuredFilter,
      setFeaturedFilter,
      sortBy,
      setSortBy,
      resetAdditionalFilters,
    },
    filteredTracks,
    featuredTracks,
    currentTracks,
    pagination: {
      currentPage,
      setCurrentPage,
      itemsPerPage,
      changeItemsPerPage,
      indexOfFirstTrack,
      indexOfLastTrack,
      totalTracks,
      totalPages,
    },
  };
}

export type MusicFiltersState = ReturnType<typeof useMusicCatalog>['filters'];
