import React, { forwardRef, useEffect, useRef, useState } from 'react';

interface AudioPlayerProps {
  src: string;
  onPlay?: () => void;
  onPause?: () => void;
  onEnded?: () => void;
}

const AudioPlayer = forwardRef<HTMLAudioElement, AudioPlayerProps>(
  ({ src, onPlay, onPause, onEnded }, ref) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [volume, setVolume] = useState(0.8);
    const progressRef = useRef<HTMLDivElement>(null);
    const volumeRef = useRef<HTMLDivElement>(null);

    // Mettre à jour la durée quand la source change
    useEffect(() => {
      if (ref && 'current' in ref && ref.current) {
        const audio = ref.current;

        const handleLoadedMetadata = () => {
          setDuration(audio.duration);
        };

        const handleTimeUpdate = () => {
          setCurrentTime(audio.currentTime);
          setIsPlaying(!audio.paused);
        };

        const handleEnded = () => {
          setIsPlaying(false);
          if (onEnded) onEnded();
        };

        audio.addEventListener('loadedmetadata', handleLoadedMetadata);
        audio.addEventListener('timeupdate', handleTimeUpdate);
        audio.addEventListener('ended', handleEnded);
        audio.addEventListener('play', () => setIsPlaying(true));
        audio.addEventListener('pause', () => setIsPlaying(false));

        return () => {
          audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
          audio.removeEventListener('timeupdate', handleTimeUpdate);
          audio.removeEventListener('ended', handleEnded);
          audio.removeEventListener('play', () => setIsPlaying(true));
          audio.removeEventListener('pause', () => setIsPlaying(false));
        };
      }
    }, [ref, onEnded]);

    // Formatter le temps (secondes -> MM:SS)
    const formatTime = (time: number): string => {
      if (isNaN(time)) return '00:00';
      const minutes = Math.floor(time / 60);
      const seconds = Math.floor(time % 60);
      return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    };

    const handlePlayPause = () => {
      if (ref && 'current' in ref && ref.current) {
        if (isPlaying) {
          ref.current.pause();
          if (onPause) onPause();
        } else {
          ref.current.play().catch((error) => {
            console.error('Erreur de lecture:', error);
          });
          if (onPlay) onPlay();
        }
      }
    };

    const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
      if (ref && 'current' in ref && ref.current && progressRef.current) {
        const rect = progressRef.current.getBoundingClientRect();
        const clickPosition = (e.clientX - rect.left) / rect.width;
        const newTime = clickPosition * duration;

        ref.current.currentTime = newTime;
        setCurrentTime(newTime);
      }
    };

    const handleVolumeClick = (e: React.MouseEvent<HTMLDivElement>) => {
      if (ref && 'current' in ref && ref.current && volumeRef.current) {
        const rect = volumeRef.current.getBoundingClientRect();
        const clickPosition = (e.clientX - rect.left) / rect.width;
        const newVolume = Math.max(0, Math.min(1, clickPosition));

        ref.current.volume = newVolume;
        setVolume(newVolume);
      }
    };

    return (
      <div className="flex flex-col w-full text-white">
        <audio ref={ref} src={src} preload="metadata" />

        {/* Contrôles de lecture */}
        <div className="flex items-center space-x-4">
          {/* Bouton lecture/pause */}
          <button
            onClick={handlePlayPause}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-indigo-600 hover:bg-indigo-700 transition-colors"
          >
            {isPlaying ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                  clipRule="evenodd"
                />
              </svg>
            )}
          </button>

          {/* Temps actuel */}
          <div className="text-xs font-medium text-gray-300 w-10">{formatTime(currentTime)}</div>

          {/* Barre de progression */}
          <div
            ref={progressRef}
            className="flex-1 h-2 bg-gray-700 rounded cursor-pointer"
            onClick={handleProgressClick}
          >
            <div
              className="h-full bg-indigo-500 rounded"
              style={{ width: `${(currentTime / duration) * 100}%` }}
            />
          </div>

          {/* Durée totale */}
          <div className="text-xs font-medium text-gray-300 w-10">{formatTime(duration)}</div>

          {/* Contrôle du volume */}
          <div className="flex items-center space-x-1">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z"
                clipRule="evenodd"
              />
            </svg>
            <div
              ref={volumeRef}
              className="w-16 h-1.5 bg-gray-700 rounded cursor-pointer"
              onClick={handleVolumeClick}
            >
              <div className="h-full bg-gray-400 rounded" style={{ width: `${volume * 100}%` }} />
            </div>
          </div>
        </div>
      </div>
    );
  }
);

AudioPlayer.displayName = 'AudioPlayer';

export default AudioPlayer;
