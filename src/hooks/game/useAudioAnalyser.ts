import { useRef, useCallback, useEffect } from 'react';

import { logger } from '@/lib/logger';
import type { AudioAnalyser, FrequencyBand } from '@/types/game';

import {
  FREQUENCY_LANES,
  BEAT_DETECTION_THRESHOLD,
  MIN_BEAT_INTERVAL,
  AUDIO_UPDATE_INTERVAL,
} from './constants';

export interface UseAudioAnalyserReturn {
  audioAnalyser: React.MutableRefObject<AudioAnalyser | null>;
  audioData: React.MutableRefObject<Uint8Array | null>;
  setupAudioAnalyser: () => Promise<boolean>;
  reconnectAudio: () => Promise<boolean>;
  analyzeFrequencyBands: (audioData: Uint8Array) => Record<FrequencyBand, number>;
  detectBeat: (timestamp: number, audioData: Uint8Array) => boolean;
  getAudioData: () => Uint8Array | null;
  updateAudioData: () => void;
  bpm: React.MutableRefObject<number>;
  beatConfidence: React.MutableRefObject<number>;
}

export function useAudioAnalyser(audioElement: HTMLAudioElement | null): UseAudioAnalyserReturn {
  const audioAnalyser = useRef<AudioAnalyser | null>(null);
  const audioContext = useRef<AudioContext | null>(null);
  const sourceNode = useRef<MediaElementAudioSourceNode | null>(null);
  const audioDataRef = useRef<Uint8Array | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 3;
  const lastAudioUpdate = useRef(0);

  // Historique des beats pour l'estimation du BPM
  const beatHistory = useRef<number[]>([]);
  const bpm = useRef<number>(120); // BPM par défaut
  const nextBeatPrediction = useRef<number>(0);
  const beatConfidence = useRef<number>(0);
  const lastBeatTime = useRef<number>(0);

  // Fonction pour reconnecter l'audio en cas de problème
  const reconnectAudio = useCallback(async () => {
    if (!audioElement || reconnectAttempts.current >= maxReconnectAttempts) {
      logger.error('Max reconnection attempts reached or no audio element');
      return false;
    }

    try {
      reconnectAttempts.current++;
      logger.debug(`Attempting to reconnect audio (attempt ${reconnectAttempts.current})`);

      // Nettoyer les anciennes connexions
      if (sourceNode.current) {
        sourceNode.current.disconnect();
      }

      // Créer un nouveau contexte si nécessaire
      if (!audioContext.current || audioContext.current.state === 'closed') {
        audioContext.current = new AudioContext();
      } else if (audioContext.current.state === 'suspended') {
        await audioContext.current.resume();
      }

      // Créer un nouveau noeud source
      sourceNode.current = audioContext.current.createMediaElementSource(audioElement);
      const analyser = audioContext.current.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.7;

      sourceNode.current.connect(analyser);
      analyser.connect(audioContext.current.destination);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      audioAnalyser.current = {
        analyser,
        dataArray,
        bufferLength,
      };

      logger.debug('Audio reconnected successfully');
      reconnectAttempts.current = 0;
      return true;
    } catch (error) {
      logger.error('Error reconnecting audio:', error);
      return false;
    }
  }, [audioElement]);

  const setupAudioAnalyser = useCallback(async () => {
    if (!audioElement) {
      logger.error("Pas d'élément audio fourni");
      return false;
    }

    try {
      // Nettoyage complet des anciennes connexions
      if (sourceNode.current) {
        try {
          sourceNode.current.disconnect();
        } catch (e) {
          logger.warn('Erreur lors de la déconnexion du nœud source:', e);
        }
        sourceNode.current = null;
      }

      if (audioAnalyser.current?.analyser) {
        try {
          audioAnalyser.current.analyser.disconnect();
        } catch (e) {
          logger.warn("Erreur lors de la déconnexion de l'analyseur:", e);
        }
      }

      if (audioContext.current) {
        try {
          if (audioContext.current.state !== 'closed') {
            await audioContext.current.close();
          }
        } catch (e) {
          logger.warn('Erreur lors de la fermeture du contexte audio:', e);
        }
        audioContext.current = null;
      }

      // Attendre un peu pour s'assurer que tout est bien nettoyé
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Créer un nouveau contexte
      audioContext.current = new AudioContext();
      logger.debug('Nouveau contexte audio créé');

      // Créer un nouveau nœud source
      sourceNode.current = audioContext.current.createMediaElementSource(audioElement);
      const analyser = audioContext.current.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.7;

      sourceNode.current.connect(analyser);
      analyser.connect(audioContext.current.destination);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      audioAnalyser.current = {
        analyser,
        dataArray,
        bufferLength,
      };

      logger.debug('Audio initialisé avec succès');
      reconnectAttempts.current = 0;

      // Réinitialiser l'historique des beats et BPM
      beatHistory.current = [];
      bpm.current = 120;
      nextBeatPrediction.current = 0;
      beatConfidence.current = 0;

      return true;
    } catch (error) {
      logger.error("Erreur lors de l'initialisation de l'audio:", error);
      return false;
    }
  }, [audioElement]);

  // Fonction pour analyser les bandes de fréquence
  const analyzeFrequencyBands = useCallback(
    (audioData: Uint8Array): Record<FrequencyBand, number> => {
      if (!audioData || audioData.length === 0) {
        return { bass: 0, mid: 0, high: 0 };
      }

      const bass = FREQUENCY_LANES.find((lane) => lane.name === 'bass');
      const mid = FREQUENCY_LANES.find((lane) => lane.name === 'mid');
      const high = FREQUENCY_LANES.find((lane) => lane.name === 'high');

      if (!bass || !mid || !high) {
        return { bass: 0, mid: 0, high: 0 };
      }

      const bassAvg =
        audioData.slice(bass.range[0], bass.range[1] + 1).reduce((acc, val) => acc + val, 0) /
        (bass.range[1] - bass.range[0] + 1);

      const midAvg =
        audioData.slice(mid.range[0], mid.range[1] + 1).reduce((acc, val) => acc + val, 0) /
        (mid.range[1] - mid.range[0] + 1);

      const highAvg =
        audioData.slice(high.range[0], high.range[1] + 1).reduce((acc, val) => acc + val, 0) /
        (high.range[1] - high.range[0] + 1);

      return { bass: bassAvg, mid: midAvg, high: highAvg };
    },
    []
  );

  // Fonction de détection de beat
  const detectBeat = useCallback(
    (timestamp: number, audioData: Uint8Array): boolean => {
      if (!audioData) return false;

      const freqBands = analyzeFrequencyBands(audioData);
      const bassValue = freqBands.bass;

      // Vérifier si on est sur un beat basé sur les basses fréquences
      const isBeatByVolume = bassValue > BEAT_DETECTION_THRESHOLD;

      // Vérifier l'intervalle minimum entre deux beats
      const timeSinceLastBeat = timestamp - lastBeatTime.current;
      if (isBeatByVolume && timeSinceLastBeat > MIN_BEAT_INTERVAL) {
        // Stocker le beat pour l'analyse BPM
        beatHistory.current.push(timestamp);
        if (beatHistory.current.length > 10) {
          beatHistory.current.shift();

          // Calculer le BPM moyen
          const intervals: number[] = [];
          for (let i = 1; i < beatHistory.current.length; i++) {
            intervals.push(beatHistory.current[i] - beatHistory.current[i - 1]);
          }

          const avgInterval = intervals.reduce((acc, val) => acc + val, 0) / intervals.length;
          const calculatedBPM = 60000 / avgInterval;

          // Vérifier si le BPM calculé est dans une plage raisonnable (60-180 BPM)
          if (calculatedBPM >= 60 && calculatedBPM <= 180) {
            bpm.current = calculatedBPM;

            // Calculer une mesure de confiance basée sur la cohérence des intervalles
            const intervalVariance =
              intervals.reduce((acc, val) => acc + Math.pow(val - avgInterval, 2), 0) /
              intervals.length;
            const stdDev = Math.sqrt(intervalVariance);
            beatConfidence.current = 1 - Math.min(1, stdDev / avgInterval);
          }
        }

        // Prédire le prochain beat
        nextBeatPrediction.current = timestamp + 60000 / bpm.current;

        lastBeatTime.current = timestamp;
        return true;
      }

      // Si nous avons assez confiance et que le temps estimé pour le prochain beat est arrivé
      if (beatConfidence.current > 0.6) {
        const beatWindow = 50;
        if (
          Math.abs(timestamp - nextBeatPrediction.current) < beatWindow &&
          timeSinceLastBeat > MIN_BEAT_INTERVAL
        ) {
          lastBeatTime.current = timestamp;
          nextBeatPrediction.current = timestamp + 60000 / bpm.current;
          return true;
        }
      }

      return false;
    },
    [analyzeFrequencyBands]
  );

  // Mettre à jour les données audio
  const updateAudioData = useCallback(() => {
    if (!audioAnalyser.current) return;

    const now = Date.now();
    const timeSinceLastAudioUpdate = now - lastAudioUpdate.current;

    if (timeSinceLastAudioUpdate >= AUDIO_UPDATE_INTERVAL) {
      const { analyser, dataArray } = audioAnalyser.current;
      try {
        analyser.getByteFrequencyData(dataArray as Uint8Array<ArrayBuffer>);
        audioDataRef.current = dataArray;
        lastAudioUpdate.current = now;
      } catch (error) {
        logger.warn("Problème avec l'analyse audio, tentative de reconnexion...");
        reconnectAudio().then((success) => {
          if (!success && reconnectAttempts.current < maxReconnectAttempts) {
            logger.error("Impossible de reconnecter l'audio");
          }
        });
      }
    }
  }, [reconnectAudio]);

  const getAudioData = useCallback(() => audioDataRef.current, []);

  // Nettoyer les ressources audio quand l'élément audio change
  useEffect(() => {
    const cleanup = () => {
      if (sourceNode.current) {
        try {
          sourceNode.current.disconnect();
        } catch (error) {
          logger.warn('Error disconnecting source node:', error);
        }
      }
      if (audioContext.current && audioContext.current.state !== 'closed') {
        try {
          audioContext.current.close();
        } catch (error) {
          logger.warn('Error closing audio context:', error);
        }
      }
      audioAnalyser.current = null;
      sourceNode.current = null;
      audioContext.current = null;
      audioDataRef.current = null;
      reconnectAttempts.current = 0;
    };

    cleanup();
    return cleanup;
  }, [audioElement]);

  return {
    audioAnalyser,
    audioData: audioDataRef,
    setupAudioAnalyser,
    reconnectAudio,
    analyzeFrequencyBands,
    detectBeat,
    getAudioData,
    updateAudioData,
    bpm,
    beatConfidence,
  };
}
