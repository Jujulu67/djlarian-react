import { useState, useRef, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import {
  analyzeAudioFile,
  formatDuration,
  type AudioAnalysisResult,
} from '@/lib/live/audio-analysis';
import type { SubmissionWithUser } from './useAdminLiveSubmissions';

export function useAdminLivePlayer() {
  const [selectedSubmission, setSelectedSubmission] = useState<SubmissionWithUser | null>(null);
  const [audioAnalysis, setAudioAnalysis] = useState<AudioAnalysisResult | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1); // 0 à 1 (0% à 100%)
  const [previousVolume, setPreviousVolume] = useState(1); // Volume avant mute
  const [playbackRate, setPlaybackRate] = useState(1); // 1, 1.5, 2, puis revient à 1
  const audioRef = useRef<HTMLAudioElement>(null);
  const volumeRef = useRef<number>(1); // Ref pour éviter les re-renders pendant le drag

  // Charger l'audio quand une soumission est sélectionnée
  useEffect(() => {
    if (selectedSubmission) {
      loadAudioAnalysis(selectedSubmission.fileUrl);
      // Forcer le chargement de l'audio après un court délai pour s'assurer que le src est mis à jour
      setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.load();
        }
        // Note: audioRef peut être null si l'élément n'est pas encore rendu, c'est normal
      }, 0);
    } else {
      setAudioAnalysis(null);
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSubmission]);

  // Mettre à jour currentTime depuis l'audio (comme dans /live)
  // Utiliser un useEffect qui se déclenche quand audioAnalysis existe (car l'audio est rendu à ce moment)
  useEffect(() => {
    // Attendre que l'audio soit rendu dans le DOM
    if (!audioAnalysis) {
      return;
    }

    let cleanup: (() => void) | null = null;

    // Utiliser un petit délai pour s'assurer que React a fini de rendre l'élément audio
    const timeoutId = setTimeout(() => {
      const audio = audioRef.current;
      if (!audio) {
        return;
      }

      const handleTimeUpdate = () => {
        const time = audio.currentTime;
        setCurrentTime(time);
        if (audio.duration && !isNaN(audio.duration)) {
          setDuration(audio.duration);
        }
      };

      const handleLoadedMetadata = () => {
        if (audio.duration && !isNaN(audio.duration)) {
          setDuration(audio.duration);
        }
      };

      const handleEnded = () => {
        setIsPlaying(false);
        setCurrentTime(0);
      };

      const handlePlay = () => {
        setIsPlaying(true);
      };

      const handlePause = () => {
        setIsPlaying(false);
      };

      audio.addEventListener('timeupdate', handleTimeUpdate);
      audio.addEventListener('loadedmetadata', handleLoadedMetadata);
      audio.addEventListener('ended', handleEnded);
      audio.addEventListener('play', handlePlay);
      audio.addEventListener('pause', handlePause);

      // Mettre à jour immédiatement si l'audio est déjà chargé
      if (audio.readyState >= 2) {
        handleTimeUpdate();
        handleLoadedMetadata();
      }

      // Cleanup function pour retirer les listeners
      cleanup = () => {
        audio.removeEventListener('timeupdate', handleTimeUpdate);
        audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
        audio.removeEventListener('ended', handleEnded);
        audio.removeEventListener('play', handlePlay);
        audio.removeEventListener('pause', handlePause);
      };
    }, 100); // Petit délai pour s'assurer que l'élément est monté

    return () => {
      clearTimeout(timeoutId);
      if (cleanup) {
        cleanup();
      }
    };
  }, [selectedSubmission, audioAnalysis]);

  // Synchroniser le volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  // Synchroniser le playbackRate
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  const loadAudioAnalysis = useCallback(
    async (fileUrl: string) => {
      try {
        const response = await fetch(fileUrl);
        const blob = await response.blob();
        const file = new File([blob], selectedSubmission?.fileName || 'audio.mp3', {
          type: blob.type,
        });
        const analysis = await analyzeAudioFile(file);
        setAudioAnalysis(analysis);
      } catch (error) {
        console.error('Erreur chargement audio:', error);
        toast.error("Erreur lors du chargement de l'audio");
      }
    },
    [selectedSubmission]
  );

  const handlePlayPause = useCallback(async () => {
    if (!audioRef.current) {
      return;
    }

    try {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        // S'assurer que l'audio est chargé avant de jouer
        if (audioRef.current.readyState < 2) {
          await new Promise<void>((resolve, reject) => {
            if (!audioRef.current) {
              reject(new Error('Audio ref is null'));
              return;
            }
            const audio = audioRef.current;
            const onCanPlay = () => {
              audio.removeEventListener('canplay', onCanPlay);
              audio.removeEventListener('error', onError);
              resolve();
            };
            const onError = () => {
              audio.removeEventListener('canplay', onCanPlay);
              audio.removeEventListener('error', onError);
              reject(new Error('Erreur lors du chargement audio'));
            };
            audio.addEventListener('canplay', onCanPlay);
            audio.addEventListener('error', onError);
            audio.load();
          });
        }
        if (audioRef.current) {
          await audioRef.current.play();
        }
      }
    } catch (error) {
      toast.error('Erreur lors de la lecture audio');
    }
  }, [isPlaying]);

  const handleSeek = useCallback(
    (newTime: number) => {
      if (!audioRef.current || !audioAnalysis) {
        return;
      }

      const clampedTime = Math.max(0, Math.min(newTime, audioAnalysis.duration));
      audioRef.current.currentTime = clampedTime;
      setCurrentTime(clampedTime);
    },
    [audioAnalysis]
  );

  const handleVolumeChange = useCallback((newVolume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, newVolume));
    volumeRef.current = clampedVolume;
    setVolume(clampedVolume);
    if (audioRef.current) {
      audioRef.current.volume = clampedVolume;
    }
  }, []);

  const handleVolumeToggle = useCallback(() => {
    if (volume > 0) {
      // Mute: sauvegarder la valeur actuelle
      setPreviousVolume(volume);
      const clampedVolume = 0;
      volumeRef.current = clampedVolume;
      setVolume(clampedVolume);
      if (audioRef.current) {
        audioRef.current.volume = clampedVolume;
      }
    } else {
      // Unmute: restaurer la valeur précédente
      const clampedVolume = Math.max(0, Math.min(1, previousVolume));
      volumeRef.current = clampedVolume;
      setVolume(clampedVolume);
      if (audioRef.current) {
        audioRef.current.volume = clampedVolume;
      }
    }
  }, [volume, previousVolume]);

  const handlePlaybackRateToggle = useCallback(() => {
    const rates = [1, 1.5, 2];
    const currentIndex = rates.indexOf(playbackRate);
    const nextIndex = (currentIndex + 1) % rates.length;
    const nextRate = rates[nextIndex];
    setPlaybackRate(nextRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextRate;
    }
  }, [playbackRate]);

  const handleClose = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setSelectedSubmission(null);
    setAudioAnalysis(null);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setVolume(1);
    setPlaybackRate(1);
    // Nettoyer le localStorage
    try {
      localStorage.removeItem('adminLiveSelectedSubmissionId');
    } catch (error) {
      console.warn('Erreur lors du nettoyage du localStorage:', error);
    }
  }, []);

  // Sauvegarder la soumission sélectionnée dans localStorage
  useEffect(() => {
    if (selectedSubmission) {
      try {
        localStorage.setItem('adminLiveSelectedSubmissionId', selectedSubmission.id);
      } catch (error) {
        console.warn('Erreur lors de la sauvegarde dans localStorage:', error);
      }
    }
  }, [selectedSubmission]);

  // Fonction pour restaurer la soumission depuis localStorage
  const restoreSelectedSubmission = useCallback(
    (submissions: SubmissionWithUser[]) => {
      try {
        const savedId = localStorage.getItem('adminLiveSelectedSubmissionId');
        if (savedId && !selectedSubmission) {
          const savedSubmission = submissions.find((s) => s.id === savedId);
          if (savedSubmission) {
            setSelectedSubmission(savedSubmission);
          } else {
            // Si la soumission n'existe plus, nettoyer le localStorage
            localStorage.removeItem('adminLiveSelectedSubmissionId');
          }
        }
      } catch (error) {
        console.warn('Erreur lors de la restauration depuis localStorage:', error);
      }
    },
    [selectedSubmission]
  );

  return {
    selectedSubmission,
    setSelectedSubmission,
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
    restoreSelectedSubmission,
    formatDuration,
  };
}
