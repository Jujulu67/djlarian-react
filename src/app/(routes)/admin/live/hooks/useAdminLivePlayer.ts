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
    } else {
      setAudioAnalysis(null);
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
    }
  }, [selectedSubmission]);

  // Mettre à jour currentTime depuis l'audio et synchroniser volume/playbackRate
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // Synchroniser volume et playbackRate avec l'audio
    audio.volume = volume;
    audio.playbackRate = playbackRate;

    const updateTime = () => {
      setCurrentTime(audio.currentTime);
      setDuration(audio.duration || 0);
    };
    const updateMetadata = () => {
      setDuration(audio.duration || 0);
    };
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateMetadata);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateMetadata);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [selectedSubmission, volume, playbackRate]);

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

  const handlePlayPause = useCallback(() => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch((error) => {
        console.error('Erreur lecture audio:', error);
        toast.error('Erreur lors de la lecture audio');
      });
      setIsPlaying(true);
    }
  }, [isPlaying]);

  const handleSeek = useCallback(
    (newTime: number) => {
      if (!audioRef.current || !audioAnalysis) return;

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
