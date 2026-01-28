import { X } from 'lucide-react';
import React from 'react';

import { Track } from '@/lib/utils/types';

interface MusicCardPlayerProps {
  track: Track;
  platform: 'youtube' | 'soundcloud';
  videoId?: string | null;
  embedUrl?: string;
  currentTime?: number;
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
  isVisible: boolean;
  isLoaded: boolean;
  onLoad: () => void;
  onClose: (e?: React.MouseEvent) => void;
}

/**
 * Component to display YouTube or SoundCloud iframe player
 */
export const MusicCardPlayer: React.FC<MusicCardPlayerProps> = ({
  track,
  platform,
  videoId,
  embedUrl,
  currentTime = 0,
  iframeRef,
  isVisible,
  isLoaded,
  onLoad,
  onClose,
}) => {
  if (!isVisible && !isLoaded) {
    return null;
  }

  const isYouTube = platform === 'youtube';
  const bgColor = isYouTube
    ? 'bg-purple-600/70 hover:bg-purple-700/90'
    : 'bg-orange-500/70 hover:bg-orange-600/90';

  return (
    <div
      className={`w-full h-full bg-black pointer-events-auto transition-opacity duration-300 ${
        isVisible ? 'opacity-100' : 'opacity-0 absolute inset-0 pointer-events-none'
      }`}
      style={{ position: 'relative', zIndex: 10 }}
    >
      {isYouTube && videoId ? (
        <iframe
          id={`youtube-iframe-${track.id}`}
          src={`https://www.youtube.com/embed/${videoId}?enablejsapi=1&autoplay=1&start=${Math.floor(
            currentTime
          )}&modestbranding=1&rel=0&showinfo=0&color=white&playsinline=1&controls=1&origin=${encodeURIComponent(
            typeof window !== 'undefined' ? window.location.origin : ''
          )}`}
          width="100%"
          height="100%"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="w-full h-full"
          style={{ zIndex: 10 }}
          ref={iframeRef}
          onLoad={onLoad}
        />
      ) : embedUrl ? (
        <iframe
          id={`soundcloud-iframe-${track.id}`}
          src={embedUrl}
          width="100%"
          height="100%"
          frameBorder="0"
          allow="autoplay"
          className="w-full h-full"
          style={{ zIndex: 10 }}
          ref={iframeRef}
          onLoad={onLoad}
        />
      ) : null}

      <div className="absolute top-0 right-0" style={{ zIndex: 1000 }}>
        <button
          onClick={onClose}
          className={`flex items-center justify-center ${bgColor} text-white/90 rounded-bl-lg p-1.5 transition-colors shadow-lg`}
          aria-label="Fermer le lecteur"
          style={{ width: '28px', height: '28px' }}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
