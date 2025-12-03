'use client';

import { motion } from 'framer-motion';
import { useState, useRef, useCallback, useEffect } from 'react';
import Image from 'next/image';
import { Play, Pause, Volume2, VolumeX, Download, X, RotateCcw, Gauge, User } from 'lucide-react';
import { useAdminLivePlayerContext } from '../context/AdminLivePlayerContext';
import { getImageUrl } from '@/lib/utils/getImageUrl';

export function AdminLivePlayer() {
  const {
    selectedSubmission,
    audioAnalysis,
    isPlaying,
    currentTime,
    duration,
    volume,
    playbackRate,
    audioRef,
    handlePlayPause,
    handleSeek,
    handleVolumeChange,
    handleVolumeToggle,
    handlePlaybackRateToggle,
    handleClose,
    formatDuration,
  } = useAdminLivePlayerContext();

  // État local pour le slider pendant le drag (évite les re-renders)
  const [localVolume, setLocalVolume] = useState(volume);
  const isDraggingRef = useRef(false);
  const rafRef = useRef<number | null>(null);

  // Synchroniser le volume local avec le volume global quand on ne drag pas
  useEffect(() => {
    if (!isDraggingRef.current && localVolume !== volume) {
      setLocalVolume(volume);
    }
  }, [volume, localVolume]);

  const handleVolumeInput = useCallback(
    (e: React.FormEvent<HTMLInputElement>) => {
      const target = e.target as HTMLInputElement;
      const newVolume = parseFloat(target.value);
      setLocalVolume(newVolume);

      // Utiliser requestAnimationFrame pour des mises à jour fluides
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }

      rafRef.current = requestAnimationFrame(() => {
        handleVolumeChange(newVolume);
      });
    },
    [handleVolumeChange]
  );

  const handleVolumeMouseDown = useCallback(() => {
    isDraggingRef.current = true;
  }, []);

  const handleVolumeMouseUp = useCallback(() => {
    isDraggingRef.current = false;
    // S'assurer que la valeur finale est synchronisée
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }
    handleVolumeChange(localVolume);
  }, [localVolume, handleVolumeChange]);

  if (!selectedSubmission) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="glass-modern glass-modern-hover rounded-2xl p-6 text-center text-gray-400"
      >
        <p>Sélectionnez une soumission pour afficher l'audio</p>
      </motion.div>
    );
  }

  const handleWaveformClick = async (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioAnalysis || !audioRef.current) return;

    const waveformContainer = e.currentTarget;
    const rect = waveformContainer.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, clickX / rect.width));
    const newTime = percentage * audioAnalysis.duration;

    try {
      // Mettre à jour la position directement (comme dans /live)
      audioRef.current.currentTime = newTime;
      handleSeek(newTime); // Pour mettre à jour le state aussi

      // Si on est en pause, lancer la lecture directement
      if (!isPlaying) {
        try {
          await audioRef.current.play();
          // setIsPlaying sera mis à jour par l'event listener 'play'
        } catch (playError: unknown) {
          // Ignorer les erreurs d'interruption (AbortError)
          const error = playError as { name?: string };
          if (error.name !== 'AbortError' && error.name !== 'NotAllowedError') {
            console.error('Erreur lecture audio:', playError);
          }
        }
      }
    } catch (error) {
      console.error('Erreur lors du clic sur la waveform:', error);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.1 }}
      className="glass-modern glass-modern-hover rounded-2xl p-4 sm:p-6 lg:p-6"
    >
      <div className="flex justify-between items-start mb-4 relative">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            {selectedSubmission.User.image ? (
              <div className="relative w-16 h-16 rounded-full overflow-hidden flex-shrink-0">
                <Image
                  src={getImageUrl(selectedSubmission.User.image) || ''}
                  alt={selectedSubmission.User.name || 'Avatar'}
                  fill
                  sizes="64px"
                  className="object-cover"
                  unoptimized
                />
              </div>
            ) : (
              <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center text-white flex-shrink-0">
                <User className="w-8 h-8" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-white truncate">{selectedSubmission.title}</div>
              <div className="text-sm text-gray-400 truncate">
                {selectedSubmission.User.name || 'Unknown'} • {selectedSubmission.fileName}
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Tag genre en haut à droite (placeholder pour l'instant) */}
          <div className="text-xs text-gray-400 bg-white/5 px-2 py-1 rounded">Genre Tag</div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {audioAnalysis ? (
        <>
          {/* Waveform */}
          <div
            className="w-full h-20 rounded-lg relative group overflow-hidden mb-4 cursor-pointer"
            onClick={handleWaveformClick}
            style={{ backgroundColor: 'rgba(30, 30, 35, 0.9)' }}
          >
            {/* Waveform bars - style Mofalk */}
            <div
              className="w-full h-full flex items-center"
              style={{ padding: '6px 4px', gap: '1px' }}
            >
              {audioAnalysis.waveform.map((value, index) => {
                const normalizedHeight = Math.max(3, Math.min(98, value));
                const progress = currentTime / audioAnalysis.duration;
                const barPosition = index / audioAnalysis.waveform.length;
                const isPlayed = barPosition <= progress;

                return (
                  <div
                    key={index}
                    className="relative h-full flex items-center justify-center"
                    style={{ flex: '1 1 0%' }}
                  >
                    <div
                      style={{
                        width: '100%',
                        height: `${normalizedHeight}%`,
                        background: isPlayed ? '#a855f7' : 'rgba(140, 140, 145, 0.85)',
                        borderRadius: '1px',
                        transition: 'background-color 0.03s linear',
                      }}
                    />
                  </div>
                );
              })}
            </div>

            {/* Timestamp combiné en bas à gauche */}
            <div
              className="absolute bottom-1.5 left-3 font-mono pointer-events-none select-none"
              style={{
                fontSize: '11px',
                letterSpacing: '0.5px',
                color: 'rgba(180, 180, 185, 0.9)',
                textShadow: '0 1px 2px rgba(0,0,0,0.5)',
              }}
            >
              {formatDuration(currentTime)} / {formatDuration(duration || audioAnalysis.duration)}
            </div>
          </div>

          {/* Description ou "No Description" */}
          <div className="text-sm text-gray-400 mb-4">
            {selectedSubmission.description || 'No Description'}
          </div>

          {/* Contrôles */}
          <div className="flex items-center gap-3 sm:gap-4">
            <button
              onClick={handlePlayPause}
              className="w-10 h-10 rounded-full bg-purple-500 hover:bg-purple-600 flex items-center justify-center transition-colors"
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 text-white" />
              ) : (
                <Play className="w-5 h-5 text-white ml-0.5" />
              )}
            </button>

            {/* Contrôle de volume */}
            <div className="flex items-center gap-2 min-w-[120px]">
              <button
                onClick={handleVolumeToggle}
                className="p-1 hover:bg-white/10 rounded transition-colors"
                title={volume > 0 ? 'Mute' : 'Unmute'}
              >
                {volume > 0 ? (
                  <Volume2 className="w-4 h-4 text-gray-400" />
                ) : (
                  <VolumeX className="w-4 h-4 text-gray-400" />
                )}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.005"
                value={localVolume}
                onInput={handleVolumeInput}
                onMouseDown={handleVolumeMouseDown}
                onMouseUp={handleVolumeMouseUp}
                onTouchStart={handleVolumeMouseDown}
                onTouchEnd={handleVolumeMouseUp}
                className="flex-1 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500 hover:accent-purple-400 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-purple-500 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:transition-none [&::-webkit-slider-thumb]:hover:bg-purple-400 [&::-webkit-slider-thumb]:hover:scale-110 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-purple-500 [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:transition-none [&::-moz-range-thumb]:hover:bg-purple-400 [&::-moz-range-thumb]:hover:scale-110"
                style={{
                  background: `linear-gradient(to right, #a855f7 0%, #a855f7 ${localVolume * 100}%, rgba(55, 65, 81, 1) ${localVolume * 100}%, rgba(55, 65, 81, 1) 100%)`,
                  transition: 'none',
                  willChange: 'auto',
                }}
              />
              <span className="text-sm text-purple-400 min-w-[40px] text-right tabular-nums">
                {Math.round(localVolume * 100)}%
              </span>
            </div>

            {/* Bouton vitesse de playback */}
            <button
              onClick={handlePlaybackRateToggle}
              className="px-3 py-2 hover:bg-white/10 rounded-lg transition-colors flex items-center gap-2"
              title="Change playback speed"
            >
              <Gauge className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-300">x{playbackRate}</span>
            </button>

            <div className="flex-1" />

            <button
              onClick={() => {
                if (audioRef.current) {
                  audioRef.current.currentTime = 0;
                  handleSeek(0);
                }
              }}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              title="Reset"
            >
              <RotateCcw className="w-4 h-4 text-gray-400" />
            </button>
            <button
              onClick={async () => {
                try {
                  const response = await fetch(selectedSubmission.fileUrl);
                  const blob = await response.blob();
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = selectedSubmission.fileName;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  window.URL.revokeObjectURL(url);
                } catch (error) {
                  console.error('Erreur lors du téléchargement:', error);
                }
              }}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              title="Download"
            >
              <Download className="w-4 h-4 text-gray-400" />
            </button>
          </div>

          {/* Audio element caché */}
          <audio
            ref={audioRef}
            src={selectedSubmission.fileUrl}
            preload="metadata"
            className="hidden"
          />
        </>
      ) : (
        <div className="text-center py-8 text-gray-400">
          <p>Chargement de l'audio...</p>
        </div>
      )}
    </motion.div>
  );
}
