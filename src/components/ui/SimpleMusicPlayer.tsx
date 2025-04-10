'use client';

import React, { useState, useEffect } from 'react';
import { Track } from '@/lib/utils/types';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { X, Music, Play, Pause, SkipBack, SkipForward, Volume, VolumeX } from 'lucide-react';

interface SimpleMusicPlayerProps {
  track: Track | null;
  isPlaying: boolean;
  onClose: () => void;
  onTogglePlay: () => void;
  onNextTrack?: () => void;
  onPrevTrack?: () => void;
}

// Variable globale pour stocker le niveau de volume
const getInitialVolume = () => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const savedVolume = localStorage.getItem('global-music-volume');
      if (savedVolume) {
        const volume = Number(savedVolume);
        console.log(`Retrieved initial volume from localStorage: ${volume}`);
        return volume;
      }
    }
  } catch (error) {
    console.error('Error reading volume from localStorage:', error);
  }

  // Valeur par défaut si localStorage n'est pas accessible ou si la valeur n'existe pas
  console.log('Using default initial volume: 0.8');
  return 0.8;
};

let globalVolume = getInitialVolume();

// Fonction pour obtenir et configurer le contexte audio global
const getOrCreateGlobalGainNode = () => {
  if (typeof window === 'undefined') return null;

  // Vérifier si le contexte audio existe déjà
  if (!(window as any).globalAudioContext) {
    try {
      (window as any).globalAudioContext = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
      (window as any).globalGainNode = (window as any).globalAudioContext.createGain();
      (window as any).globalGainNode.gain.value = globalVolume;
      (window as any).globalGainNode.connect((window as any).globalAudioContext.destination);
    } catch (error) {
      console.error('Erreur lors de la création du contexte audio global:', error);
      return null;
    }
  }

  return (window as any).globalGainNode;
};

// Fonction pour définir le volume global et l'appliquer à tous les éléments audio et iframes
export const setGlobalVolume = (newVolume: number): number => {
  try {
    // Limiter le volume entre 0 et 1
    const safeVolume = Math.max(0, Math.min(1, newVolume));

    // Mettre à jour la variable globale
    globalVolume = safeVolume;

    // Sauvegarder dans localStorage
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('global-music-volume', String(safeVolume));
      console.log(`Volume saved to localStorage: ${safeVolume}`);
    }

    // Appliquer à tous les éléments audio
    const audioElements = document.querySelectorAll('audio');
    audioElements.forEach((audio) => {
      audio.volume = safeVolume;
    });

    // Appliquer au nœud de gain du contexte audio
    const gainNode = getOrCreateGlobalGainNode();
    if (gainNode) {
      gainNode.gain.value = safeVolume;
    }

    // Appliquer aux iframes YouTube avec amplification
    const youtubeIframes = document.querySelectorAll('iframe[src*="youtube"]');
    youtubeIframes.forEach((iframe) => {
      if (iframe instanceof HTMLIFrameElement && iframe.contentWindow) {
        // Amplifier le volume YouTube (valeurs de 0 à 100)
        const youtubeVolume = Math.floor(safeVolume * 200);

        try {
          iframe.contentWindow.postMessage(
            JSON.stringify({
              event: 'command',
              func: 'setVolume',
              args: [youtubeVolume],
            }),
            '*'
          );
          console.log(`Applied volume ${youtubeVolume} to YouTube iframe`);
        } catch (error) {
          console.error('Error applying volume to YouTube iframe:', error);
        }
      }
    });

    // Appliquer aux iframes SoundCloud avec amplification
    const soundcloudIframes = document.querySelectorAll('iframe[src*="soundcloud"]');
    soundcloudIframes.forEach((iframe) => {
      if (iframe instanceof HTMLIFrameElement && iframe.contentWindow) {
        // Amplifier le volume SoundCloud - SoundCloud attend une valeur entre 0 et 100
        const soundcloudVolume = Math.min(100, Math.floor(safeVolume * 100));

        try {
          iframe.contentWindow.postMessage(
            `{"method":"setVolume","value":${soundcloudVolume}}`,
            '*'
          );
          console.log(`Applied volume ${soundcloudVolume} to SoundCloud iframe`);
        } catch (error) {
          console.error('Error applying volume to SoundCloud iframe:', error);
        }
      }
    });

    return safeVolume;
  } catch (error) {
    console.error('Error setting global volume:', error);
    return globalVolume; // Retourne la valeur actuelle en cas d'erreur
  }
};

const SimpleMusicPlayer: React.FC<SimpleMusicPlayerProps> = ({
  track,
  isPlaying,
  onClose,
  onTogglePlay,
  onNextTrack,
  onPrevTrack,
}) => {
  const [imageError, setImageError] = useState(false);
  const [volume, setVolume] = useState(globalVolume * 100);
  const [isMuted, setIsMuted] = useState(globalVolume === 0);

  // Synchroniser le volume avec localStorage au démarrage
  useEffect(() => {
    try {
      console.log('Initialisation du lecteur musical et chargement du volume...');

      // Récupérer le volume actuel depuis localStorage
      const savedVolume = getInitialVolume();
      console.log(`Volume chargé depuis localStorage: ${savedVolume * 100}%`);

      // Mettre à jour la variable globale
      globalVolume = savedVolume;

      // Mettre à jour l'état local du composant
      setVolume(globalVolume * 100);
      setIsMuted(globalVolume === 0);

      // Initialiser le contexte audio
      getOrCreateGlobalGainNode();

      // Appliquer le volume à tous les lecteurs actifs avec un délai
      // pour s'assurer que l'interface est complètement chargée
      const applyVolumeInterval = setInterval(() => {
        setGlobalVolume(savedVolume);
        console.log(`Volume initial appliqué à tous les lecteurs: ${savedVolume * 100}%`);
      }, 500);

      // Nettoyer l'intervalle après quelques applications pour garantir que le volume est bien appliqué
      setTimeout(() => {
        clearInterval(applyVolumeInterval);
      }, 2000);

      return () => {
        clearInterval(applyVolumeInterval);
      };
    } catch (error) {
      console.error("Erreur lors de l'initialisation du volume:", error);
    }
  }, []);

  // Gérer les changements de volume
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const newVolume = parseInt(e.target.value) / 100;
      console.log(`Volume slider changed to ${newVolume * 100}%`);

      // Mettre à jour l'état local
      setVolume(newVolume * 100);
      setIsMuted(newVolume === 0);

      // Appliquer le volume globalement avec un petit délai
      // pour permettre à l'interface de se mettre à jour d'abord
      setTimeout(() => {
        const appliedVolume = setGlobalVolume(newVolume);
        console.log(`Volume appliqué à tous les lecteurs: ${appliedVolume * 100}%`);
      }, 50);
    } catch (error) {
      console.error('Erreur lors du changement de volume:', error);
    }
  };

  // Gérer le mute/unmute
  const toggleMute = () => {
    try {
      const newMuted = !isMuted;
      console.log(newMuted ? 'Désactivation du son' : 'Réactivation du son');
      setIsMuted(newMuted);

      if (newMuted) {
        // Sauvegarder le volume actuel avant de mute
        const currentVolume = globalVolume;
        console.log(`Sauvegarde du volume actuel: ${currentVolume * 100}%`);
        localStorage.setItem('prev-volume', currentVolume.toString());

        // Mettre le volume à zéro avec un délai
        setTimeout(() => {
          setVolume(0);
          setGlobalVolume(0);
          console.log('Volume mis à zéro et appliqué à tous les lecteurs');
        }, 50);
      } else {
        // Restaurer le volume précédent
        const prevVolume = Number(localStorage.getItem('prev-volume') || '0.5');
        console.log(`Restauration du volume précédent: ${prevVolume * 100}%`);

        // Restaurer le volume avec un délai
        setTimeout(() => {
          setVolume(prevVolume * 100);
          setGlobalVolume(prevVolume);
          console.log(`Volume restauré à ${prevVolume * 100}% et appliqué à tous les lecteurs`);
        }, 50);
      }
    } catch (error) {
      console.error("Erreur lors du changement de l'état muet:", error);
    }
  };

  if (!track) return null;

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      transition={{ type: 'spring', damping: 20 }}
      className="fixed bottom-0 left-0 right-0 bg-gradient-to-r from-gray-900/95 to-gray-800/95 backdrop-blur-md border-t border-purple-500/30 shadow-[0_-4px_20px_rgba(139,92,246,0.15)] z-50"
      data-footer-player="true"
    >
      <div className="max-w-7xl mx-auto p-3">
        <div className="grid grid-cols-3 items-center">
          {/* Info du morceau (à gauche) */}
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-12 h-12 relative rounded-md overflow-hidden bg-gray-800 flex-shrink-0 ring-1 ring-purple-500/20">
              {track.coverUrl && !imageError ? (
                <Image
                  src={track.coverUrl}
                  alt={track.title}
                  width={48}
                  height={48}
                  className="w-full h-full object-cover"
                  onError={() => setImageError(true)}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Music className="w-6 h-6 text-gray-600" />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-white font-bold text-sm truncate">{track.title}</h3>
              <p className="text-gray-400 text-xs truncate">{track.artist}</p>
            </div>
          </div>

          {/* Contrôles (centrés) */}
          <div className="flex items-center justify-center space-x-4">
            {/* Précédent */}
            {onPrevTrack && (
              <button
                onClick={onPrevTrack}
                className="p-2 text-gray-400 hover:text-white transition-colors rounded-full hover:bg-gray-800"
                aria-label="Morceau précédent"
                data-footer-control="true"
              >
                <SkipBack className="w-5 h-5" />
              </button>
            )}

            {/* Lecture/Pause */}
            <button
              onClick={onTogglePlay}
              className="p-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-full transition-all transform hover:scale-105 shadow-md shadow-purple-700/20"
              aria-label={isPlaying ? 'Pause' : 'Lecture'}
              data-footer-control="true"
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
            </button>

            {/* Suivant */}
            {onNextTrack && (
              <button
                onClick={onNextTrack}
                className="p-2 text-gray-400 hover:text-white transition-colors rounded-full hover:bg-gray-800"
                aria-label="Morceau suivant"
                data-footer-control="true"
              >
                <SkipForward className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Volume et bouton de fermeture (à droite) */}
          <div className="flex justify-end items-center space-x-3">
            {/* Contrôle du volume */}
            <div className="flex items-center space-x-2 group">
              <button
                onClick={toggleMute}
                className="p-1.5 text-gray-400 hover:text-white transition-colors rounded-full hover:bg-gray-800"
                aria-label={isMuted ? 'Réactiver le son' : 'Couper le son'}
                data-footer-control="true"
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume className="w-4 h-4" />}
              </button>

              {/* Conteneur de volume qui s'étend sur hover */}
              <div className="relative h-8 flex items-center">
                {/* Slider de volume visible en permanence sur desktop, au hover sur mobile */}
                <div className="w-0 md:w-20 group-hover:w-20 transition-all duration-200 overflow-hidden h-6 flex items-center">
                  {/* Barre de volume */}
                  <div className="w-20 h-1.5 bg-gray-800 rounded-full overflow-hidden relative mx-1">
                    <div
                      className="h-full bg-gradient-to-r from-purple-600 to-purple-400"
                      style={{ width: `${volume}%` }}
                    ></div>

                    {/* Petit rond sur le slider */}
                    <div
                      className="absolute top-1/2 transform -translate-y-1/2 w-2.5 h-2.5 bg-white rounded-full shadow-sm"
                      style={{
                        left: `calc(${volume}% - ${volume > 0 ? '4px' : '0px'})`,
                        opacity: volume > 0 ? 1 : 0,
                      }}
                    ></div>

                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="1"
                      value={volume}
                      onChange={handleVolumeChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      aria-label="Volume"
                      data-footer-control="true"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Bouton de fermeture */}
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white transition-colors rounded-full hover:bg-gray-800"
              aria-label="Fermer le lecteur"
              data-footer-control="true"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default SimpleMusicPlayer;
