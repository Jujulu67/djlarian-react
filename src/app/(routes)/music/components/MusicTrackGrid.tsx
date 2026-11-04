'use client';

import { Zap } from 'lucide-react';

import MusicCard from '@/components/ui/MusicCard';
import { RevealGroup } from '@/components/ui/Reveal';
import { Track, TrackAction } from '@/lib/utils/types';

interface MusicTrackGridProps {
  title: string;
  tracks: Track[];
  onPlay: (track: TrackAction) => void;
  isPlaying: boolean;
  currentTrackId?: string;
  /** Section « En vedette » (icône éclair en legacy) */
  featured?: boolean;
  /** Index de la carte dont l'image est prioritaire (LCP), ou -1 */
  priorityIndex?: number;
  className?: string;
}

/**
 * Section de morceaux : titre + grille de MusicCard.
 * En v2 la grille est un RevealGroup et chaque carte (motion) apparaît en cascade ;
 * en legacy RevealGroup rend la même <div> que l'ancienne grille.
 */
export function MusicTrackGrid({
  title,
  tracks,
  onPlay,
  isPlaying,
  currentTrackId,
  featured = false,
  priorityIndex = -1,
  className,
}: MusicTrackGridProps) {
  return (
    <div className={className}>
      {featured ? (
        <div className="flex items-center gap-2 mb-4 v2:mb-6">
          <Zap className="w-5 h-5 text-yellow-500 v2:hidden" />
          <h2 className="text-2xl font-bold text-white v2:text-display v2:text-xl v2:font-normal md:v2:text-2xl">
            {title}
          </h2>
        </div>
      ) : (
        <h2 className="text-2xl font-bold text-white mb-6 v2:text-display v2:text-xl v2:font-normal md:v2:text-2xl">
          {title}
        </h2>
      )}

      <RevealGroup className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 auto-rows-auto">
        {tracks.map((track, index) => (
          <MusicCard
            key={track.id}
            track={track}
            onPlay={onPlay}
            isPlaying={isPlaying}
            isActive={currentTrackId === track.id}
            priority={index === priorityIndex}
          />
        ))}
      </RevealGroup>
    </div>
  );
}
