'use client';

import { Music, Search } from 'lucide-react';

import { logger } from '@/lib/logger';
import type { Track } from '@/lib/utils/types';

import type { useTracks } from '../hooks/useTracks';

import { EditingTrackCard } from './EditingTrackCard';
import { TrackList } from './TrackList';

interface TrackListPanelProps {
  tracks: ReturnType<typeof useTracks>;
  successTrackId: string | null | undefined;
  editingTrack: Track | null | undefined;
  handleEdit: (t: Track) => void;
}

/** Colonne de droite de l'onglet Morceaux : recherche et liste des tracks. */
export function TrackListPanel({
  tracks,
  successTrackId,
  editingTrack,
  handleEdit,
}: TrackListPanelProps) {
  return (
    <div className="lg:col-span-2">
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700/50 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
          <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
            <Music className="w-4 h-4 sm:w-5 sm:h-5" /> Morceaux ({tracks.filteredTracks.length})
          </h2>
          <div className="relative w-full sm:w-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              placeholder="Rechercher…"
              value={tracks.searchTerm}
              onChange={(e) => tracks.setSearchTerm(e.target.value)}
              className="w-full sm:w-auto pl-9 pr-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:ring-purple-500 text-sm"
            />
          </div>
        </div>

        {/* Bloc flottant En édition */}
        {editingTrack && (
          <EditingTrackCard editingTrack={editingTrack} tracks={tracks} handleEdit={handleEdit} />
        )}

        {/* Track en succès affichée en haut avec effet visuel */}
        {successTrackId &&
          (() => {
            // Utiliser tracks.tracks directement au lieu de filteredTracks pour être sûr de trouver la track
            // même si le filtre n'est pas encore appliqué
            const successTrack = tracks.tracks.find((t) => t.id === successTrackId);
            logger.debug('[Admin Music] Rendering success track:', {
              successTrackId: successTrackId,
              trackFound: !!successTrack,
              trackTitle: successTrack?.title,
              totalTracks: tracks.tracks.length,
            });
            return successTrack ? (
              <div className="mb-4">
                <TrackList
                  tracks={[successTrack]}
                  searchTerm={tracks.searchTerm}
                  refreshingCoverId={tracks.refreshingCoverId}
                  highlightedTrackId={null}
                  successTrackId={successTrackId}
                  onEdit={handleEdit}
                  onDelete={tracks.deleteTrack}
                  onToggleFeatured={tracks.toggleFeatured}
                  onRefreshCover={tracks.refreshCover}
                  onTogglePublish={tracks.togglePublish}
                />
              </div>
            ) : (
              <div className="mb-4 p-4 bg-yellow-600/20 border border-yellow-600/50 rounded-lg text-yellow-300 text-sm">
                ⚠️ Track en succès (ID: {successTrackId}) non trouvée dans la liste. Total tracks:{' '}
                {tracks.tracks.length}
                <div className="mt-2 text-xs">
                  IDs disponibles:{' '}
                  {tracks.tracks
                    .slice(0, 5)
                    .map((t) => t.id)
                    .join(', ')}
                  ...
                </div>
              </div>
            );
          })()}

        {/* Liste avec TrackList */}
        <TrackList
          tracks={tracks.filteredTracks.filter(
            (t) => t.id !== tracks.highlightedTrackId && t.id !== successTrackId
          )}
          searchTerm={tracks.searchTerm}
          refreshingCoverId={tracks.refreshingCoverId}
          highlightedTrackId={tracks.highlightedTrackId}
          onEdit={handleEdit}
          onDelete={tracks.deleteTrack}
          onToggleFeatured={tracks.toggleFeatured}
          onRefreshCover={tracks.refreshCover}
          onTogglePublish={tracks.togglePublish}
        />
      </div>
    </div>
  );
}
