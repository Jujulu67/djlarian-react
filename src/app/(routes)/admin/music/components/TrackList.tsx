'use client';

import { Music, Calendar, Star, RefreshCw, Edit, Trash2, Eye, EyeOff } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import React from 'react';

import { getImageUrl } from '@/lib/utils/getImageUrl';
import { MUSIC_TYPES } from '@/lib/utils/music-helpers';
import type { Track } from '@/lib/utils/types';
import type { MusicPlatform } from '@/lib/utils/types';

import { platformLabels, platformIcons } from '../constants';
import { getTrackStatus } from '../utils/getTrackStatus';

interface TrackListProps {
  tracks: Track[];
  searchTerm: string;
  refreshingCoverId: string | null;
  highlightedTrackId: string | null;
  successTrackId?: string | null;
  onEdit: (track: Track) => void;
  onDelete: (id: string) => void;
  onToggleFeatured: (id: string, currentStatus: boolean) => void;
  onRefreshCover: (id: string) => Promise<void>;
  onTogglePublish: (id: string, currentStatus: boolean) => Promise<void>;
}

export const TrackList: React.FC<TrackListProps> = ({
  tracks,
  searchTerm,
  refreshingCoverId,
  highlightedTrackId,
  successTrackId,
  onEdit,
  onDelete,
  onToggleFeatured,
  onRefreshCover,
  onTogglePublish,
}) => {
  const router = useRouter();
  if (tracks.length === 0) {
    return (
      <div className="text-center py-12">
        <Music className="w-12 h-12 mx-auto text-gray-600 mb-3" />
        <p className="text-gray-400">
          {searchTerm ? 'Aucun résultat trouvé' : 'Aucun morceau disponible'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {tracks.map((track) => (
        <div
          key={track.id}
          data-track-id={track.id}
          className={`flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-gray-800/40 hover:bg-gray-800/60 rounded-lg border border-gray-700/30 transition-all duration-300 cursor-pointer ${
            highlightedTrackId === track.id ? 'ring-2 ring-purple-500' : ''
          } ${
            successTrackId === track.id
              ? 'ring-4 ring-green-500/90 animate-success-glow shadow-2xl shadow-green-500/60 bg-gray-800/70 border-green-500/50'
              : ''
          }`}
          style={
            successTrackId === track.id
              ? {
                  animation: 'success-glow 2s cubic-bezier(0.4, 0, 0.2, 1) infinite',
                }
              : undefined
          }
          onClick={() => {
            if (track.id && typeof window !== 'undefined') {
              router.push(`/admin/music/${track.id}/detail`);
            }
          }}
        >
          {/* Première ligne sur mobile : Image + Info principale */}
          <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
            {/* Image */}
            <div className="w-12 h-12 sm:w-16 sm:h-16 flex-shrink-0 rounded-md overflow-hidden relative">
              {track.imageId ? (
                <Image
                  src={
                    getImageUrl(track.imageId, {
                      cacheBust: track.updatedAt ? new Date(track.updatedAt).getTime() : 0,
                    }) || ''
                  }
                  alt={track.title}
                  fill
                  className="w-full h-full object-cover"
                  unoptimized
                />
              ) : (
                <div className="w-full h-full bg-gray-700 flex items-center justify-center">
                  <Music className="w-6 h-6 sm:w-8 sm:h-8 text-gray-500" />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <h3 className="text-white font-medium truncate text-sm sm:text-base">
                {track.title}
              </h3>
              {track.artist && (
                <p className="text-xs sm:text-sm text-gray-400 truncate mt-0.5">{track.artist}</p>
              )}
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-1">
                <span className="text-xs px-2 py-0.5 rounded-full bg-purple-600/30 text-purple-300">
                  {MUSIC_TYPES.find((t) => t.value === track.type)?.label || track.type}
                </span>
                <span className="text-gray-400 text-xs sm:text-sm flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {new Date(track.releaseDate).toLocaleDateString()}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs flex items-center gap-1 ${getTrackStatus(track).className}`}
                >
                  {getTrackStatus(track).label}
                </span>
              </div>

              {/* Plateformes disponibles - visible sur toutes les tailles */}
              <div className="flex gap-1 mt-2">
                {Object.entries(track.platforms).map(
                  ([platform, data]) =>
                    data?.url && (
                      <a
                        key={platform}
                        href={data.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 sm:p-1.5 bg-gray-700/60 hover:bg-gray-600 rounded-full text-gray-300 hover:text-white transition-colors"
                        title={`Voir sur ${platformLabels[platform as MusicPlatform]}`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span className="text-sm sm:text-base">
                          {platformIcons[platform as MusicPlatform]}
                        </span>
                      </a>
                    )
                )}
              </div>
            </div>
          </div>

          {/* Actions - Sur une ligne séparée sur mobile, à droite sur desktop */}
          <div className="flex items-center gap-1.5 sm:gap-2 sm:flex-shrink-0 border-t border-gray-700/50 sm:border-t-0 pt-3 sm:pt-0">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleFeatured(track.id, track.featured || false);
              }}
              className={`p-2 rounded-lg transition-colors flex-shrink-0 ${
                track.featured
                  ? 'bg-yellow-600/80 hover:bg-yellow-500/80 text-white'
                  : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
              }`}
              title={track.featured ? 'Retirer de la mise en avant' : 'Mettre en avant'}
            >
              <Star className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <button
              onClick={async (e) => {
                e.stopPropagation();
                await onRefreshCover(track.id);
              }}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors flex-shrink-0"
              title="Rafraîchir la couverture"
              disabled={refreshingCoverId === track.id}
            >
              {refreshingCoverId === track.id ? (
                <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5" />
              )}
            </button>
            <button
              onClick={async (e) => {
                e.stopPropagation();
                await onTogglePublish(track.id, track.isPublished ?? false);
              }}
              className={`p-2 rounded-lg transition-colors border-none outline-none ring-0 focus:ring-0 focus:outline-none shadow-none focus:shadow-none flex-shrink-0 ${
                track.isPublished
                  ? 'bg-green-600/80 hover:bg-green-500/80 text-white'
                  : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
              }`}
              title={track.isPublished ? 'Dépublier' : 'Publier'}
              tabIndex={0}
              aria-label={track.isPublished ? 'Dépublier' : 'Publier'}
            >
              {track.isPublished ? (
                <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              ) : (
                <EyeOff className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              )}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit(track);
              }}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors flex-shrink-0"
              title="Modifier"
            >
              <Edit className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(track.id);
              }}
              className="p-2 text-gray-400 hover:text-red-500 hover:bg-gray-700 rounded-lg transition-colors flex-shrink-0"
              title="Supprimer"
            >
              <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};
