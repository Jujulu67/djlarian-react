'use client';

import { Calendar, Edit, Music, RefreshCw, Star, Trash2 } from 'lucide-react';
import Image from 'next/image';

import { getImageUrl } from '@/lib/utils/getImageUrl';
import { MUSIC_TYPES } from '@/lib/utils/music-helpers';
import type { MusicPlatform, Track } from '@/lib/utils/types';

import { platformIcons, platformLabels } from '../constants';
import type { useTracks } from '../hooks/useTracks';
import { getTrackStatus } from '../utils/getTrackStatus';

interface EditingTrackCardProps {
  editingTrack: Track;
  tracks: ReturnType<typeof useTracks>;
  handleEdit: (t: Track) => void;
}

/** Valeur de cache-busting de la pochette : date de mise à jour, sinon maintenant. */
function getCoverCacheBust(updatedAt: Track['updatedAt'] | undefined): number {
  return updatedAt ? new Date(updatedAt).getTime() : Date.now();
}

/** Carte "En édition" affichée au-dessus de la liste des tracks. */
export function EditingTrackCard({ editingTrack, tracks, handleEdit }: EditingTrackCardProps) {
  return (
    <div className="mb-6">
      <div
        className={`relative bg-gray-900/80 rounded-xl border-2 border-purple-500/80 p-4 flex items-center gap-4 shadow-lg ${
          tracks.highlightedTrackId === editingTrack.id
            ? 'animate-highlight-ring ring-4 ring-purple-500/80'
            : ''
        }`}
      >
        <div className="absolute top-2 right-2 bg-purple-700/90 text-white text-xs px-3 py-1 rounded-full shadow-lg z-10 animate-pulse">
          En édition
        </div>
        <div className="relative w-16 h-16 rounded-md overflow-hidden flex-shrink-0">
          {editingTrack.imageId ? (
            <Image
              src={
                getImageUrl(editingTrack.imageId, {
                  cacheBust: getCoverCacheBust(editingTrack.updatedAt),
                }) || ''
              }
              alt={editingTrack.title}
              width={64}
              height={64}
              className="w-full h-full object-cover"
              unoptimized
            />
          ) : (
            <div className="w-full h-full bg-gray-700 flex items-center justify-center">
              <Music className="w-8 h-8 text-gray-500" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-white font-medium truncate">{editingTrack.title}</h3>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs px-2 py-0.5 rounded-full bg-purple-600/30 text-purple-300">
              {MUSIC_TYPES.find((x) => x.value === editingTrack.type)?.label || editingTrack.type}
            </span>
            <span className="text-gray-400 text-sm flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {new Date(editingTrack.releaseDate).toLocaleDateString()}
            </span>
            <span
              className={`px-2 py-0.5 rounded-full text-xs flex items-center gap-1 ml-2 ${getTrackStatus(editingTrack).className}`}
            >
              {getTrackStatus(editingTrack).label}
            </span>
          </div>
          <div className="flex gap-1 mt-2">
            {Object.entries(editingTrack.platforms || {}).map(
              ([p, v]) =>
                v?.url && (
                  <a
                    key={p}
                    href={v.url}
                    target="_blank"
                    onClick={(e) => e.stopPropagation()}
                    className="p-1.5 bg-gray-700/60 hover:bg-gray-600 rounded-full text-gray-300 hover:text-white"
                    title={platformLabels[p as MusicPlatform]}
                  >
                    {platformIcons[p as MusicPlatform]}
                  </a>
                )
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              tracks.toggleFeatured(editingTrack.id, editingTrack.featured || false);
            }}
            className={`p-2 rounded-lg ${
              editingTrack.featured
                ? 'bg-yellow-600/80 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            <Star className="w-5 h-5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              tracks.setHighlightedTrackId(editingTrack.id);
              handleEdit(editingTrack);
            }}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg"
          >
            <Edit className="w-5 h-5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              tracks.deleteTrack(editingTrack.id);
            }}
            className="p-2 text-gray-400 hover:text-red-500 hover:bg-gray-700 rounded-lg"
          >
            <Trash2 className="w-5 h-5" />
          </button>
          <button
            type="button"
            className={`p-2 rounded-lg hover:bg-purple-700/30 text-purple-400 hover:text-white transition-colors ${
              tracks.refreshingCoverId === editingTrack.id ? 'opacity-50 cursor-wait' : ''
            }`}
            title="Rafraîchir la cover"
            disabled={tracks.refreshingCoverId === editingTrack.id}
            onClick={async (e) => {
              e.stopPropagation();
              await tracks.refreshCover(editingTrack.id);
            }}
          >
            {tracks.refreshingCoverId === editingTrack.id ? (
              <RefreshCw className="w-5 h-5 animate-spin" />
            ) : (
              <RefreshCw className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
