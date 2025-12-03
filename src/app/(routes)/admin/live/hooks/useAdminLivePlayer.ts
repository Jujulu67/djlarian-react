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
    console.log('[AdminLivePlayer] selectedSubmission changé', {
      selectedSubmission: selectedSubmission?.id,
      fileUrl: selectedSubmission?.fileUrl,
    });

    if (selectedSubmission) {
      loadAudioAnalysis(selectedSubmission.fileUrl);
      // Forcer le chargement de l'audio après un court délai pour s'assurer que le src est mis à jour
      setTimeout(() => {
        if (audioRef.current) {
          console.log('[AdminLivePlayer] Chargement audio forcé', {
            src: audioRef.current.src,
            readyState: audioRef.current.readyState,
          });
          audioRef.current.load();
        }
        // Note: audioRef peut être null si l'élément n'est pas encore rendu, c'est normal
      }, 0);
    } else {
      console.log('[AdminLivePlayer] Aucune soumission sélectionnée, reset');
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
      console.log('[AdminLivePlayer] useEffect audio: audioAnalysis pas encore chargé');
      return;
    }

    let cleanup: (() => void) | null = null;

    // Utiliser un petit délai pour s'assurer que React a fini de rendre l'élément audio
    const timeoutId = setTimeout(() => {
      const audio = audioRef.current;
      if (!audio) {
        console.log('[AdminLivePlayer] useEffect audio: audioRef.current est null après délai');
        return;
      }

      console.log('[AdminLivePlayer] useEffect audio: audio trouvé', {
        src: audio.src,
        readyState: audio.readyState,
        paused: audio.paused,
        currentTime: audio.currentTime,
        duration: audio.duration,
      });

      const handleTimeUpdate = () => {
        const time = audio.currentTime;
        setCurrentTime(time);
        if (audio.duration && !isNaN(audio.duration)) {
          setDuration(audio.duration);
        }
        console.log('[AdminLivePlayer] timeupdate:', { time, duration: audio.duration });
      };

      const handleLoadedMetadata = () => {
        if (audio.duration && !isNaN(audio.duration)) {
          setDuration(audio.duration);
          console.log('[AdminLivePlayer] loadedmetadata:', { duration: audio.duration });
        }
      };

      const handleEnded = () => {
        console.log('[AdminLivePlayer] ended');
        setIsPlaying(false);
        setCurrentTime(0);
      };

      const handlePlay = () => {
        console.log('[AdminLivePlayer] play event déclenché');
        setIsPlaying(true);
      };

      const handlePause = () => {
        console.log('[AdminLivePlayer] pause event déclenché');
        setIsPlaying(false);
      };

      audio.addEventListener('timeupdate', handleTimeUpdate);
      audio.addEventListener('loadedmetadata', handleLoadedMetadata);
      audio.addEventListener('ended', handleEnded);
      audio.addEventListener('play', handlePlay);
      audio.addEventListener('pause', handlePause);

      // Mettre à jour immédiatement si l'audio est déjà chargé
      if (audio.readyState >= 2) {
        console.log('[AdminLivePlayer] audio déjà chargé, mise à jour immédiate');
        handleTimeUpdate();
        handleLoadedMetadata();
      }

      // Cleanup function pour retirer les listeners
      cleanup = () => {
        console.log('[AdminLivePlayer] cleanup event listeners');
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
    console.log('[AdminLivePlayer] handlePlayPause appelé', {
      isPlaying,
      audioRefExists: !!audioRef.current,
      readyState: audioRef.current?.readyState,
      paused: audioRef.current?.paused,
      src: audioRef.current?.src,
    });

    if (!audioRef.current) {
      console.error('[AdminLivePlayer] handlePlayPause: audioRef.current est null');
      return;
    }

    try {
      if (isPlaying) {
        console.log('[AdminLivePlayer] Pause demandé');
        audioRef.current.pause();
        console.log('[AdminLivePlayer] pause() appelé, paused:', audioRef.current.paused);
      } else {
        console.log('[AdminLivePlayer] Play demandé');
        // S'assurer que l'audio est chargé avant de jouer
        if (audioRef.current.readyState < 2) {
          console.log('[AdminLivePlayer] Audio pas prêt, attente canplay...');
          await new Promise<void>((resolve, reject) => {
            const onCanPlay = () => {
              console.log('[AdminLivePlayer] canplay event reçu');
              audioRef.current?.removeEventListener('canplay', onCanPlay);
              audioRef.current?.removeEventListener('error', onError);
              resolve();
            };
            const onError = (e: Event) => {
              console.error('[AdminLivePlayer] error event reçu', e);
              audioRef.current?.removeEventListener('canplay', onCanPlay);
              audioRef.current?.removeEventListener('error', onError);
              reject(new Error('Erreur lors du chargement audio'));
            };
            audioRef.current.addEventListener('canplay', onCanPlay);
            audioRef.current.addEventListener('error', onError);
            audioRef.current.load();
          });
        }
        console.log('[AdminLivePlayer] Appel play()...');
        await audioRef.current.play();
        console.log('[AdminLivePlayer] play() réussi, paused:', audioRef.current.paused);
      }
    } catch (error) {
      console.error('[AdminLivePlayer] Erreur lecture audio:', error);
      toast.error('Erreur lors de la lecture audio');
    }
  }, [isPlaying]);

  const handleSeek = useCallback(
    (newTime: number) => {
      console.log('[AdminLivePlayer] handleSeek appelé', {
        newTime,
        audioRefExists: !!audioRef.current,
        audioAnalysisExists: !!audioAnalysis,
        duration: audioAnalysis?.duration,
      });

      if (!audioRef.current || !audioAnalysis) {
        console.error('[AdminLivePlayer] handleSeek: audioRef ou audioAnalysis manquant');
        return;
      }

      const clampedTime = Math.max(0, Math.min(newTime, audioAnalysis.duration));
      console.log('[AdminLivePlayer] Seek à', clampedTime);
      audioRef.current.currentTime = clampedTime;
      setCurrentTime(clampedTime);
      console.log('[AdminLivePlayer] currentTime après seek:', audioRef.current.currentTime);
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
