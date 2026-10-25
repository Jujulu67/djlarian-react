'use client';

import React, { useMemo, useCallback } from 'react';

import SimpleMusicPlayer from '@/components/ui/SimpleMusicPlayer';
import { MusicPlayerProvider } from '@/contexts/MusicPlayerContext';
import { useMusicPlayer } from '@/hooks/useMusicPlayer';
import { TrackAction } from '@/lib/utils/types';

import { MusicFilters } from './components/MusicFilters';
import { MusicHeader } from './components/MusicHeader';
import { MusicListToolbar } from './components/MusicListToolbar';
import { MusicPagination } from './components/MusicPagination';
import {
  MUSIC_CONTAINER_CLASS,
  MUSIC_PAGE_CLASS,
  MusicEmptyState,
  MusicErrorState,
  MusicLoadingState,
} from './components/MusicStates';
import { MusicTrackGrid } from './components/MusicTrackGrid';
import { getMusicTypeLabel } from './constants';
import { useMusicCatalog } from './hooks/useMusicCatalog';

/**
 * Music Page Component:
 * Displays tracks, allows filtering, searching, and playing music via embedded players.
 * Manages the overall playback state (current track, playing/paused) and coordinates
 * interactions between MusicCard components and the SimpleMusicPlayer footer.
 */
export default function MusicPage() {
  const { isLoading, error, filters, filteredTracks, featuredTracks, currentTracks, pagination } =
    useMusicCatalog();
  const { selectedType, searchTerm } = filters;

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
    return <MusicLoadingState />;
  }

  if (error) {
    return <MusicErrorState error={error} />;
  }

  const typeLabel = selectedType === 'all' ? undefined : getMusicTypeLabel(selectedType);
  const showFeatured = selectedType === 'all' && featuredTracks.length > 0;

  return (
    <MusicPlayerProvider value={playerContextValue}>
      <div className={MUSIC_PAGE_CLASS}>
        <div className={MUSIC_CONTAINER_CLASS}>
          <MusicHeader />

          {/* Filtres et recherche */}
          <MusicFilters {...filters} />

          {/* Liste des morceaux */}
          {filteredTracks.length === 0 ? (
            <MusicEmptyState
              searchTerm={searchTerm}
              typeLabel={typeLabel}
              onClearSearch={() => filters.setSearchTerm('')}
            />
          ) : (
            <>
              {/* Sélection du nombre d'éléments par page */}
              <MusicListToolbar
                first={pagination.indexOfFirstTrack + 1}
                last={Math.min(pagination.indexOfLastTrack, pagination.totalTracks)}
                total={pagination.totalTracks}
                itemsPerPage={pagination.itemsPerPage}
                onItemsPerPageChange={pagination.changeItemsPerPage}
              />

              {/* Section Featured (si présent et vue "Tous") - toujours affichée, non paginée */}
              {showFeatured && (
                <MusicTrackGrid
                  featured
                  title="En vedette"
                  className="mb-12 v2:mb-16"
                  tracks={featuredTracks}
                  onPlay={memoizedPlayTrack}
                  isPlaying={isPlaying}
                  currentTrackId={currentTrack?.id}
                  priorityIndex={0}
                />
              )}

              {/* Tous les morceaux (paginés) */}
              {currentTracks.length > 0 && (
                <MusicTrackGrid
                  title={selectedType === 'all' ? 'Tous les morceaux' : typeLabel || 'Morceaux'}
                  tracks={currentTracks}
                  onPlay={memoizedPlayTrack}
                  isPlaying={isPlaying}
                  currentTrackId={currentTrack?.id}
                  priorityIndex={selectedType === 'all' && featuredTracks.length === 0 ? 0 : -1}
                />
              )}

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <MusicPagination
                  currentPage={pagination.currentPage}
                  totalPages={pagination.totalPages}
                  paginate={pagination.setCurrentPage}
                />
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
