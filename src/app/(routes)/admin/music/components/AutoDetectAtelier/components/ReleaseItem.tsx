import { Check, ExternalLink, Plus } from 'lucide-react';
import Image from 'next/image';
import React from 'react';

import { MUSIC_TYPES } from '@/lib/utils/music-helpers';
import type { DetectedRelease } from '@/lib/services/types';

interface ReleaseItemProps {
  release: DetectedRelease;
  isSelected: boolean;
  onToggle: (id: string) => void;
}

export function ReleaseItem({ release, isSelected, onToggle }: ReleaseItemProps) {
  return (
    <div
      onClick={() => {
        if (!release.exists) onToggle(release.id);
      }}
      onKeyDown={(e) => {
        if (!release.exists && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onToggle(release.id);
        }
      }}
      tabIndex={0}
      aria-label={
        release.exists
          ? `Release déjà importée : ${release.title}`
          : isSelected
            ? `Désélectionner : ${release.title}`
            : `Sélectionner : ${release.title}`
      }
      className={`flex items-center gap-4 p-4 rounded-lg border transition-colors ${
        release.exists
          ? 'bg-green-900/20 border-green-700/50 text-green-200'
          : isSelected
            ? 'bg-purple-900/30 border-purple-700/50'
            : 'bg-gray-800/40 border-gray-700/30'
      }
        cursor-pointer
        hover:ring-2 hover:ring-purple-500`}
    >
      {!release.exists && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggle(release.id);
          }}
          className={`p-2 rounded-md ${isSelected ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
          aria-label={isSelected ? 'Désélectionner' : 'Sélectionner'}
          tabIndex={0}
        >
          {isSelected ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
        </button>
      )}
      {release.imageUrl && (
        <div className="relative w-20 h-20 flex-shrink-0 rounded-md overflow-hidden">
          <Image
            src={release.imageUrl}
            alt={release.title}
            fill
            className="w-full h-full object-cover"
            unoptimized
          />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <h4 className="font-medium truncate text-white">{release.title}</h4>
        <p className="text-sm text-gray-400 truncate">{release.artist}</p>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <span className="text-xs px-2 py-0.5 rounded-full bg-purple-600/30 text-purple-200 whitespace-nowrap">
            {MUSIC_TYPES.find((t) => t.value === release.type)?.label || release.type}
          </span>
          <span className="text-xs text-gray-400 whitespace-nowrap">
            {new Date(release.releaseDate).toLocaleDateString('fr-FR', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
            })}
          </span>
          {release.isScheduled && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-700/50 text-blue-200 whitespace-nowrap">
              Pré-release
            </span>
          )}
          {release.exists && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-green-700/50 text-green-200 whitespace-nowrap">
              Déjà importé
            </span>
          )}
        </div>
      </div>
      {(release.spotifyUrl || release.soundcloudUrl || release.youtubeUrl) && (
        <a
          href={release.spotifyUrl || release.soundcloudUrl || release.youtubeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg flex-shrink-0"
          title={
            release.spotifyUrl
              ? 'Voir sur Spotify'
              : release.soundcloudUrl
                ? 'Voir sur SoundCloud'
                : 'Voir sur YouTube'
          }
          onClick={(e) => e.stopPropagation()}
        >
          <ExternalLink className="w-5 h-5" />
        </a>
      )}
    </div>
  );
}
