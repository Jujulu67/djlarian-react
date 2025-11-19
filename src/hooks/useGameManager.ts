import { useRef, useState, useCallback, useEffect } from 'react';
import { GameState, AudioAnalyser, GamePattern, FrequencyBand } from '@/types/game';
import { logger } from '@/lib/logger';

// Constantes de jeu
const SCORE_INCREMENT = 25;
const GOLDEN_SCORE = 50;
const BLUE_SCORE = 15;
const COMBO_MULTIPLIER = 1.2;
const PATTERN_LIFETIME = 5000; // Durée de vie des patterns augmentée
const SCROLL_SPEED = 1.5; // Vitesse de défilement réduite pour plus de précision
const ENEMY_SPEED = 1.8;
const AUDIO_UPDATE_INTERVAL = 1000 / 60; // 60 FPS
const BEAT_DETECTION_THRESHOLD = 150; // Seuil pour la détection des beats
const MIN_BEAT_INTERVAL = 300; // Intervalle minimum entre deux beats (ms)
const PATTERN_BATCH_SIZE = 3;

// Définition des rails de fréquence
const FREQUENCY_LANES = [
  { name: 'bass', range: [0, 4], yPosition: 0.75 }, // Graves
  { name: 'mid', range: [5, 15], yPosition: 0.5 }, // Médiums
  { name: 'high', range: [16, 30], yPosition: 0.25 }, // Aigus
];

// Ajouter après les constantes existantes
const PRE_MAPPED_PATTERNS = [
  // Introduction - Patterns simples pour s'échauffer
  { time: 1000, lane: 'mid', type: 'collect', x: 1100, y: 300, size: 30, speed: 1.2 },
  { time: 2000, lane: 'bass', type: 'golden', x: 1100, y: 450, size: 35, speed: 1.2 },
  { time: 3000, lane: 'high', type: 'blue', x: 1100, y: 150, size: 30, speed: 1.2 },

  // Premier rythme - Patterns réguliers sur le beat
  { time: 4500, lane: 'mid', type: 'collect', x: 1100, y: 300, size: 30, speed: 1.3 },
  { time: 5500, lane: 'high', type: 'blue', x: 1100, y: 150, size: 30, speed: 1.3 },
  { time: 6500, lane: 'bass', type: 'golden', x: 1100, y: 450, size: 35, speed: 1.3 },
  { time: 7500, lane: 'mid', type: 'collect', x: 1100, y: 300, size: 30, speed: 1.3 },

  // Accélération - Patterns plus rapprochés
  { time: 8500, lane: 'high', type: 'blue', x: 1100, y: 150, size: 30, speed: 1.4 },
  { time: 9000, lane: 'mid', type: 'collect', x: 1100, y: 300, size: 30, speed: 1.4 },
  { time: 9500, lane: 'bass', type: 'golden', x: 1100, y: 450, size: 35, speed: 1.4 },
  { time: 10000, lane: 'high', type: 'blue', x: 1100, y: 150, size: 30, speed: 1.4 },

  // Séquence rythmique - Alternance rapide haut/bas
  { time: 11000, lane: 'high', type: 'blue', x: 1100, y: 150, size: 30, speed: 1.5 },
  { time: 11500, lane: 'bass', type: 'golden', x: 1100, y: 450, size: 35, speed: 1.5 },
  { time: 12000, lane: 'high', type: 'blue', x: 1100, y: 150, size: 30, speed: 1.5 },
  { time: 12500, lane: 'bass', type: 'golden', x: 1100, y: 450, size: 35, speed: 1.5 },

  // Break - Pause rythmique
  { time: 14000, lane: 'mid', type: 'collect', x: 1100, y: 300, size: 40, speed: 1.2 },

  // Drop - Séquence intense
  { time: 16000, lane: 'high', type: 'blue', x: 1100, y: 150, size: 30, speed: 1.6 },
  { time: 16500, lane: 'mid', type: 'collect', x: 1100, y: 300, size: 30, speed: 1.6 },
  { time: 17000, lane: 'bass', type: 'golden', x: 1100, y: 450, size: 35, speed: 1.6 },
  { time: 17500, lane: 'high', type: 'blue', x: 1100, y: 150, size: 30, speed: 1.6 },
  { time: 18000, lane: 'mid', type: 'collect', x: 1100, y: 300, size: 30, speed: 1.6 },
  { time: 18500, lane: 'bass', type: 'golden', x: 1100, y: 450, size: 35, speed: 1.6 },

  // Séquence diagonale
  { time: 20000, lane: 'high', type: 'blue', x: 1100, y: 150, size: 30, speed: 1.7 },
  { time: 20500, lane: 'mid', type: 'collect', x: 1100, y: 300, size: 30, speed: 1.7 },
  { time: 21000, lane: 'bass', type: 'golden', x: 1100, y: 450, size: 35, speed: 1.7 },

  // Séquence inverse
  { time: 22000, lane: 'bass', type: 'golden', x: 1100, y: 450, size: 35, speed: 1.7 },
  { time: 22500, lane: 'mid', type: 'collect', x: 1100, y: 300, size: 30, speed: 1.7 },
  { time: 23000, lane: 'high', type: 'blue', x: 1100, y: 150, size: 30, speed: 1.7 },

  // Finale - Patterns rapides et intenses
  { time: 24500, lane: 'high', type: 'blue', x: 1100, y: 150, size: 30, speed: 1.8 },
  { time: 25000, lane: 'mid', type: 'collect', x: 1100, y: 300, size: 30, speed: 1.8 },
  { time: 25500, lane: 'bass', type: 'golden', x: 1100, y: 450, size: 35, speed: 1.8 },
  { time: 26000, lane: 'high', type: 'blue', x: 1100, y: 150, size: 30, speed: 1.8 },
  { time: 26250, lane: 'mid', type: 'collect', x: 1100, y: 300, size: 30, speed: 1.8 },
  { time: 26500, lane: 'bass', type: 'golden', x: 1100, y: 450, size: 35, speed: 1.8 },
  { time: 26750, lane: 'high', type: 'blue', x: 1100, y: 150, size: 30, speed: 1.8 },
  { time: 27000, lane: 'mid', type: 'collect', x: 1100, y: 300, size: 40, speed: 1.8 },
];

export const useGameManager = (audioElement: HTMLAudioElement | null) => {
  const [gameState, setGameState] = useState<GameState>(() => {
    // Charger le meilleur score depuis localStorage
    let savedHighScore = 0;
    if (typeof window !== 'undefined') {
      const savedScore = localStorage.getItem('highScore');
      if (savedScore) {
        savedHighScore = parseInt(savedScore, 10);
      }
    }

    return {
      isActive: false,
      score: 0,
      combo: 0,
      highScore: savedHighScore,
      perfectHits: 0,
      goodHits: 0,
      okHits: 0,
      totalNotes: 0,
    };
  });

  const [patterns, setPatterns] = useState<GamePattern[]>([]);
  const patternsRef = useRef<GamePattern[]>([]);
  const audioAnalyser = useRef<AudioAnalyser | null>(null);
  const audioContext = useRef<AudioContext | null>(null);
  const sourceNode = useRef<MediaElementAudioSourceNode | null>(null);
  const animationFrame = useRef<number>();
  const lastBeatTime = useRef<number>(0);
  const lastPatternTime = useRef<number>(0);
  const isActive = useRef(false);
  const audioDataRef = useRef<Uint8Array | null>(null);
  const gameProgress = useRef(0);
  const playerPosition = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 3;
  const lastAudioUpdate = useRef(0);
  const processedPatterns = useRef<Set<number>>(new Set());

  // Historique des beats pour l'estimation du BPM
  const beatHistory = useRef<number[]>([]);
  const bpm = useRef<number>(120); // BPM par défaut
  const nextBeatPrediction = useRef<number>(0);
  const beatConfidence = useRef<number>(0);

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
      analyser.fftSize = 512; // Augmenté pour améliorer la résolution des fréquences
      analyser.smoothingTimeConstant = 0.7; // Légèrement réduit pour une meilleure détection des transitoires

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

  // Nettoyer les ressources audio quand l'élément audio change
  useEffect(() => {
    const cleanup = () => {
      isActive.current = false;
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
      if (animationFrame.current) {
        cancelAnimationFrame(animationFrame.current);
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
      analyser.fftSize = 512; // Augmenté pour améliorer la résolution
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

  // Nouvelle fonction pour analyser les bandes de fréquence
  const analyzeFrequencyBands = useCallback(
    (audioData: Uint8Array): Record<FrequencyBand, number> => {
      if (!audioData || audioData.length === 0) {
        return { bass: 0, mid: 0, high: 0 };
      }

      // Analyser les différentes bandes de fréquence
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

  // Nouvelle fonction de détection de beat
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
          beatHistory.current.shift(); // Garder seulement les 10 derniers beats

          // Calculer le BPM moyen
          const intervals: number[] = [];
          for (let i = 1; i < beatHistory.current.length; i++) {
            intervals.push(beatHistory.current[i] - beatHistory.current[i - 1]);
          }

          const avgInterval = intervals.reduce((acc, val) => acc + val, 0) / intervals.length;
          const calculatedBPM = 60000 / avgInterval; // 60000 ms = 1 minute

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
        const beatWindow = 50; // fenêtre de 50ms autour du temps prédit
        if (
          Math.abs(timestamp - nextBeatPrediction.current) < beatWindow &&
          timeSinceLastBeat > MIN_BEAT_INTERVAL
        ) {
          // C'est un beat prédit
          lastBeatTime.current = timestamp;
          nextBeatPrediction.current = timestamp + 60000 / bpm.current;
          return true;
        }
      }

      return false;
    },
    [analyzeFrequencyBands]
  );

  // Nouvelle fonction pour générer un pattern basé sur l'analyse de fréquence
  const generatePattern = useCallback(
    (
      timestamp: number,
      audioData: Uint8Array,
      canvas: HTMLCanvasElement | { width: number; height: number },
      lane: (typeof FREQUENCY_LANES)[number]
    ): GamePattern | null => {
      // Utiliser une approche plus sûre pour obtenir les dimensions
      let width = 0;
      let height = 0;

      if ('getBoundingClientRect' in canvas) {
        const rect = canvas.getBoundingClientRect();
        width = rect.width;
        height = rect.height;
      } else {
        width = canvas.width;
        height = canvas.height;
      }

      // Analyser les bandes de fréquence
      const freqBands = analyzeFrequencyBands(audioData);
      const bandValue = freqBands[lane.name as FrequencyBand];

      // Ne générer un pattern que si la valeur de fréquence est assez élevée
      if (bandValue < 50) return null;

      // Déterminer le type de pattern en fonction de la lane
      let type: GamePattern['type'] = 'collect'; // Type par défaut
      let size = 20;

      switch (lane.name) {
        case 'bass':
          type = 'golden'; // Les basses génèrent des notes dorées (plus de points)
          size = 25;
          break;
        case 'high':
          type = 'blue'; // Les aigus génèrent des notes bleues (bonus combo)
          size = 18;
          break;
        case 'mid':
          type = 'collect'; // Les médiums génèrent des notes violettes (standard)
          size = 22;
          break;
      }

      // Calculer la position Y en fonction de la lane (avec un peu de variation)
      const yVariation = Math.random() * height * 0.2;
      const yPosition = height * lane.yPosition + yVariation;

      return {
        timestamp,
        type,
        position: {
          x: width,
          y: yPosition,
        },
        lane: lane.name as FrequencyBand,
        size,
        speed: SCROLL_SPEED, // Utiliser toujours SCROLL_SPEED pour éviter l'erreur de comparaison
        targetTime: timestamp + 2000, // Le moment idéal pour collecter (2 secondes après création)
        createdOnBeat: true,
      };
    },
    [analyzeFrequencyBands]
  );

  // Fonction de génération principale
  const generateObstacles = useCallback(
    (timestamp: number, audioData: Uint8Array) => {
      // Essayer plusieurs sélecteurs pour trouver le canvas
      let canvas = document.querySelector('.game-visualizer canvas') as HTMLCanvasElement;

      // Si le premier sélecteur échoue, essayer des alternatives
      if (!canvas) {
        logger.debug('Premier sélecteur de canvas échoué, essai de sélecteurs alternatifs');
        canvas = document.querySelector('.music-visualizer canvas, canvas') as HTMLCanvasElement;
      }

      if (!canvas) {
        logger.warn(
          'Canvas non trouvé pour la génération des patterns, utilisant des dimensions par défaut'
        );
        // Utiliser des dimensions par défaut si aucun canvas n'est trouvé
        const rect = { width: 800, height: 400 };

        // Générer un pattern de secours
        setPatterns((prev) => {
          const newPattern: GamePattern = {
            timestamp,
            type: 'collect',
            position: {
              x: rect.width,
              y: rect.height * 0.5, // Au milieu
            },
            lane: 'mid',
            size: 20,
            speed: SCROLL_SPEED,
            targetTime: timestamp + 2000,
          };

          return [...prev, newPattern];
        });

        lastPatternTime.current = timestamp;
        return;
      }

      // Détecter un beat
      const isBeat = detectBeat(timestamp, audioData);

      if (isBeat) {
        logger.debug(
          `Beat détecté! BPM estimé: ${bpm.current.toFixed(1)}, Confiance: ${(beatConfidence.current * 100).toFixed(1)}%`
        );

        // Générer des patterns sur les différentes lanes en fonction de l'intensité des fréquences
        const newPatterns: GamePattern[] = [];

        // Essayer de générer un pattern pour chaque lane
        FREQUENCY_LANES.forEach((lane) => {
          const pattern = generatePattern(timestamp, audioData, canvas, lane);
          if (pattern) newPatterns.push(pattern);
        });

        if (newPatterns.length > 0) {
          setPatterns((prev) => [...prev, ...newPatterns]);

          // Mettre à jour les statistiques du jeu
          setGameState((prev) => ({
            ...prev,
            totalNotes: prev.totalNotes + newPatterns.length,
          }));

          lastPatternTime.current = timestamp;
        }
      } else if (timestamp - lastPatternTime.current > 1000) {
        // Parfois générer des patterns même sans beat détecté (pour éviter les longues périodes sans action)
        const freqBands = analyzeFrequencyBands(audioData);
        const maxBand = Object.entries(freqBands).reduce(
          (max, [band, value]) => (value > max.value ? { band, value } : max),
          { band: '', value: 0 }
        );

        if (maxBand.value > 100) {
          const lane = FREQUENCY_LANES.find((l) => l.name === maxBand.band);
          if (lane) {
            const pattern = generatePattern(timestamp, audioData, canvas, lane);
            if (pattern) {
              setPatterns((prev) => [...prev, pattern]);
              lastPatternTime.current = timestamp;
            }
          }
        }
      }
    },
    [detectBeat, generatePattern, analyzeFrequencyBands]
  );

  const updateGame = useCallback(() => {
    if (!audioAnalyser.current) {
      logger.warn('Analyseur audio non disponible');
      return;
    }

    if (!isActive.current) {
      logger.debug('Jeu non actif, arrêt de la boucle de jeu');
      if (animationFrame.current) {
        cancelAnimationFrame(animationFrame.current);
        animationFrame.current = undefined;
      }
      return;
    }

    try {
      const now = Date.now();
      const timeSinceLastAudioUpdate = now - lastAudioUpdate.current;

      // Optimisation : Mettre à jour l'audio seulement à intervalle fixe
      if (timeSinceLastAudioUpdate >= AUDIO_UPDATE_INTERVAL) {
        const { analyser, dataArray } = audioAnalyser.current;

        try {
          analyser.getByteFrequencyData(dataArray);
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

      // Générer des patterns en lien avec l'audio
      if (audioDataRef.current) {
        generateObstacles(now, audioDataRef.current);
      }

      // Mise à jour des positions et filtrage des patterns obsolètes
      setPatterns((prev) => {
        if (!isActive.current) return prev;

        return prev
          .map((pattern) => {
            // Si le pattern est en cours de décomposition, ne pas le déplacer
            if (pattern.isDisintegrating) {
              return pattern;
            }

            // Si c'est un pattern très ancien, le supprimer
            if (now - pattern.timestamp > PATTERN_LIFETIME) {
              return null as unknown as GamePattern;
            }

            // Déplacer le pattern de droite à gauche
            return {
              ...pattern,
              position: {
                x: pattern.position.x - (pattern.speed || SCROLL_SPEED),
                y: pattern.position.y,
              },
            };
          })
          .filter((pattern): pattern is GamePattern => pattern !== null);
      });

      // Nettoyage des patterns en décomposition
      setPatterns((prev) => {
        return prev.filter((pattern) => {
          // Garder les patterns en cours de décomposition qui n'ont pas terminé
          if (pattern.isDisintegrating) {
            const disintegrateAge = now - (pattern.disintegrateStartTime || now);
            return disintegrateAge < (pattern.disintegrateDuration || 500);
          }

          // Supprimer les patterns sortis de l'écran
          return pattern.position.x > -50;
        });
      });

      // Incrémenter le compteur de progression du jeu
      gameProgress.current += 1;

      animationFrame.current = requestAnimationFrame(updateGame);
    } catch (error) {
      logger.error('Erreur dans la boucle de jeu:', error);
      if (isActive.current) {
        animationFrame.current = requestAnimationFrame(updateGame);
      }
    }
  }, [generateObstacles, reconnectAudio]);

  const calculateHitAccuracy = useCallback(
    (
      pattern: GamePattern,
      now: number
    ): { type: 'perfect' | 'good' | 'ok' | 'miss'; points: number } => {
      if (!pattern.targetTime) return { type: 'ok', points: SCORE_INCREMENT };

      const timeDiff = Math.abs(now - pattern.targetTime);

      if (timeDiff < 100) {
        // Timing parfait (<100ms)
        return { type: 'perfect', points: SCORE_INCREMENT * 2 };
      } else if (timeDiff < 250) {
        // Bon timing (<250ms)
        return { type: 'good', points: SCORE_INCREMENT * 1.5 };
      } else {
        // Timing basique (<500ms)
        return { type: 'ok', points: SCORE_INCREMENT };
      }
    },
    []
  );

  const handleCollision = useCallback(
    (type: GamePattern['type'], pattern: GamePattern) => {
      if (!gameState.isActive) return;

      // Vérifier la précision du hit
      const now = Date.now();
      const { type: accuracyType, points } = calculateHitAccuracy(pattern, now);

      // Mettre à jour les statistiques de précision
      setGameState((prev) => {
        const newState = { ...prev };

        switch (accuracyType) {
          case 'perfect':
            newState.perfectHits++;
            break;
          case 'good':
            newState.goodHits++;
            break;
          case 'ok':
            newState.okHits++;
            break;
        }

        return newState;
      });

      // Jouer un son de collecte adapté au type de note et à la précision
      try {
        if (typeof window !== 'undefined' && window.AudioContext) {
          const audioCtx = new AudioContext();
          const oscillator = audioCtx.createOscillator();
          const gainNode = audioCtx.createGain();

          // Configurer le son en fonction du type de note et de la précision
          switch (type) {
            case 'golden':
              oscillator.type = 'sine';
              oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // La4
              oscillator.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 0.2);
              gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
              gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
              break;
            case 'blue':
              oscillator.type = 'sine';
              oscillator.frequency.setValueAtTime(784, audioCtx.currentTime); // Sol4
              gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime);
              gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
              break;
            case 'collect':
              oscillator.type = 'sine';
              oscillator.frequency.setValueAtTime(659.25, audioCtx.currentTime); // Mi4
              gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
              gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
              break;
          }

          // Ajouter un second oscillateur pour les hits parfaits
          if (accuracyType === 'perfect') {
            const perfectOsc = audioCtx.createOscillator();
            perfectOsc.type = 'sine';
            perfectOsc.frequency.setValueAtTime(
              oscillator.frequency.value * 1.5,
              audioCtx.currentTime
            );
            perfectOsc.connect(gainNode);
            perfectOsc.start();
            perfectOsc.stop(audioCtx.currentTime + 0.15);
          }

          oscillator.connect(gainNode);
          gainNode.connect(audioCtx.destination);

          oscillator.start();
          oscillator.stop(audioCtx.currentTime + (type === 'golden' ? 0.3 : 0.2));

          setTimeout(() => audioCtx.close(), type === 'golden' ? 300 : 200);
        }
      } catch (error) {
        logger.warn('Erreur lors de la lecture du son:', error);
      }

      // Marquer le pattern pour décomposition
      setPatterns((prevPatterns) =>
        prevPatterns.map((p) => {
          if (p.timestamp === pattern.timestamp) {
            return {
              ...p,
              isDisintegrating: true,
              disintegrateStartTime: now,
              disintegrateDuration: type === 'golden' ? 800 : 500,
              accuracyType, // Stocker le type de précision pour l'animation
            };
          }
          return p;
        })
      );

      // Mettre à jour le score en fonction du type de note et de la précision
      switch (type) {
        case 'collect':
          setGameState((prev) => {
            const newScore = prev.score + points;
            const newCombo = prev.combo + 1;
            const newHighScore = Math.max(newScore, prev.highScore);

            if (newHighScore > prev.highScore && typeof window !== 'undefined') {
              localStorage.setItem('highScore', newHighScore.toString());
            }

            return {
              ...prev,
              score: newScore,
              combo: newCombo,
              highScore: newHighScore,
              lastHitAccuracy: accuracyType,
              lastHitPoints: points,
            };
          });
          break;

        case 'golden':
          setGameState((prev) => {
            const newScore = prev.score + points * 1.5; // Bonus pour les notes dorées
            const newCombo = prev.combo + 2;
            const newHighScore = Math.max(newScore, prev.highScore);

            if (newHighScore > prev.highScore && typeof window !== 'undefined') {
              localStorage.setItem('highScore', newHighScore.toString());
            }

            return {
              ...prev,
              score: newScore,
              combo: newCombo,
              highScore: newHighScore,
              lastHitAccuracy: accuracyType,
              lastHitPoints: points * 1.5,
            };
          });
          break;

        case 'blue':
          setGameState((prev) => {
            // Les notes bleues donnent un petit bonus de score mais un gros bonus de combo
            const newScore = prev.score + points;
            const newCombo = prev.combo + 3; // Bonus de combo plus important
            const newHighScore = Math.max(newScore, prev.highScore);

            if (newHighScore > prev.highScore && typeof window !== 'undefined') {
              localStorage.setItem('highScore', newHighScore.toString());
            }

            return {
              ...prev,
              score: newScore,
              combo: newCombo,
              highScore: newHighScore,
              lastHitAccuracy: accuracyType,
              lastHitPoints: points,
            };
          });
          break;

        case 'avoid':
        case 'enemy':
          // Sauvegarder le meilleur score avant de terminer le jeu
          if (gameState.score > gameState.highScore && typeof window !== 'undefined') {
            localStorage.setItem('highScore', gameState.score.toString());
            setGameState((prev) => ({
              ...prev,
              highScore: gameState.score,
            }));
          }
          // Arrêter le jeu (équivalent à endGame)
          isActive.current = false;
          setGameState((prev) => ({
            ...prev,
            isActive: false,
          }));
          if (animationFrame.current) {
            cancelAnimationFrame(animationFrame.current);
            animationFrame.current = undefined;
          }
          break;
      }
    },
    [gameState.isActive, gameState.score, gameState.highScore, calculateHitAccuracy]
  );

  // === Définition de simpleUpdateGame AVANT son utilisation dans useEffect ===
  const simpleUpdateGame = useCallback((): void => {
    // Type explicite ajouté
    const now = Date.now();

    // Vérifier si nous avons des patterns à mettre à jour
    if (patterns.length === 0 && patternsRef.current.length === 0) {
      logger.debug("Aucun pattern trouvé - Génération d'urgence");

      // Toujours générer des patterns d'urgence, même si le jeu n'est pas actif
      const emergencyPatterns = PRE_MAPPED_PATTERNS.slice(0, 15).map((pattern, index) => {
        const x = Math.min(pattern.x, 800);
        const timestamp = now + pattern.time;
        const targetTime = timestamp + (pattern.speed ? 5000 / pattern.speed : 5000);

        return {
          id: `emergency-pattern-${timestamp}-${index}`,
          timestamp,
          type: pattern.type as GamePattern['type'],
          position: { x, y: pattern.y },
          lane: pattern.lane as FrequencyBand,
          size: pattern.size || 30,
          speed: pattern.speed || 1.5,
          targetTime,
          createdOnBeat: true,
        };
      });

      // Mettre à jour l'état ET la référence immédiatement
      setPatterns(emergencyPatterns);
      patternsRef.current = emergencyPatterns;
      logger.debug(`${emergencyPatterns.length} patterns d'urgence générés`);

      // IMPORTANT: Utiliser setTimeout(0) pour permettre à React de mettre à jour le DOM
      // avant de continuer l'animation, ce qui aide à résoudre les problèmes de synchronisation
      setTimeout(() => {
        logger.debug(
          'Après génération - vérification:',
          patternsRef.current.length,
          'patterns disponibles'
        );
        requestAnimationFrame(simpleUpdateGame);
      }, 0);
      return;
    }

    // Si le jeu est inactif mais qu'on a des patterns, continuer à les animer lentement
    if (!isActive.current && patterns.length > 0) {
      const slowUpdatePatterns = patterns
        .map((pattern) => {
          // Déplacer les patterns plus lentement quand le jeu est inactif
          const newX = pattern.position.x - (pattern.speed || SCROLL_SPEED) * 0.2;

          return {
            ...pattern,
            position: {
              ...pattern.position,
              x: newX,
            },
          };
        })
        .filter((pattern) => pattern.position.x > -50);

      setPatterns(slowUpdatePatterns);

      // Continuer l'animation même si le jeu n'est pas actif
      requestAnimationFrame(simpleUpdateGame);
      return;
    }

    // Code existant pour le jeu actif
    if (!isActive.current) return;

    const existingPatterns = patterns.length > 0;

    if (!existingPatterns) {
      logger.debug("Aucun pattern trouvé dans l'état, vérification de patternsRef...");
      const refPatterns = patternsRef.current.length > 0;
      logger.debug(`patternsRef contient ${patternsRef.current.length} patterns`);

      if (!refPatterns && isActive.current) {
        logger.debug('Tentative de régénération des patterns depuis simpleUpdateGame');
        // Utiliser les patterns prémappés comme solution de secours
        const emergencyPatterns = PRE_MAPPED_PATTERNS.map((pattern, index) => {
          const x = Math.min(pattern.x, 800);
          const timestamp = now + pattern.time;
          const targetTime = timestamp + (pattern.speed ? 5000 / pattern.speed : 5000);

          return {
            id: `emergency-pattern-${timestamp}-${index}`,
            timestamp,
            type: pattern.type as GamePattern['type'],
            position: { x, y: pattern.y },
            lane: pattern.lane as FrequencyBand,
            size: pattern.size || 30,
            speed: pattern.speed || 1.5,
            targetTime,
            createdOnBeat: true,
          };
        });

        // Mettre à jour l'état ET la référence immédiatement
        setPatterns(emergencyPatterns);
        patternsRef.current = emergencyPatterns; // Mise à jour immédiate de la référence
        logger.debug(`${emergencyPatterns.length} patterns d'urgence générés`);
      }
    } else {
      logger.debug(`Mise à jour de ${patterns.length} patterns existants`);
    }

    // Mettre à jour les patterns existants
    const updatedPatterns = patterns
      .map((pattern) => {
        // Déplacer les patterns de droite à gauche
        const newX = pattern.position.x - (pattern.speed || SCROLL_SPEED);

        return {
          ...pattern,
          position: {
            ...pattern.position,
            x: newX,
          },
        };
      })
      .filter((pattern) => pattern.position.x > -50); // Suppression hors écran

    // Mettre à jour l'état uniquement - patternsRef sera mis à jour via l'effet
    setPatterns(updatedPatterns);

    // Vérifier si nous avons besoin de générer de nouveaux patterns
    if (updatedPatterns.length < 5 && isActive.current) {
      logger.debug('Peu de patterns restants, génération de patterns supplémentaires');
      // Créer des patterns supplémentaires
      const additionalPatterns = PRE_MAPPED_PATTERNS.slice(0, 5).map((pattern, index) => {
        const x = 1100; // Placer hors écran à droite
        const timestamp = now + pattern.time + 3000; // Ajouter un délai pour ne pas les faire apparaître tout de suite
        const targetTime = timestamp + (pattern.speed ? 5000 / pattern.speed : 5000);

        return {
          id: `additional-pattern-${timestamp}-${index}`,
          timestamp,
          type: pattern.type as GamePattern['type'],
          position: { x, y: pattern.y },
          lane: pattern.lane as FrequencyBand,
          size: pattern.size || 30,
          speed: pattern.speed || 1.5,
          targetTime,
          createdOnBeat: true,
        };
      });

      setPatterns((prev) => [...prev, ...additionalPatterns]);
    }

    // Continuer la boucle d'animation si le jeu est toujours actif
    if (isActive.current) {
      animationFrame.current = requestAnimationFrame(simpleUpdateGame);
    } else {
      // Même si le jeu n'est pas actif, continuer à animer si nous avons des patterns
      if (updatedPatterns.length > 0) {
        requestAnimationFrame(simpleUpdateGame);
      }
    }
  }, [patterns, setPatterns, patternsRef, isActive]);

  // NOUVEAU: Initialiser les patterns au chargement du composant (maintenant APRÈS simpleUpdateGame)
  useEffect(() => {
    if (patterns.length === 0 && !isActive.current) {
      logger.debug('Initialisation proactive des patterns au chargement');

      // Créer des patterns initiaux avec un délai pour qu'ils apparaissent progressivement
      const now = Date.now();
      const initialPatterns = PRE_MAPPED_PATTERNS.slice(0, 15).map((pattern, index) => {
        const x = Math.min(pattern.x, 800);
        const timestamp = now + pattern.time;
        const targetTime = timestamp + (pattern.speed ? 5000 / pattern.speed : 5000);

        return {
          id: `initial-pattern-${timestamp}-${index}`,
          timestamp,
          type: pattern.type as GamePattern['type'],
          position: { x, y: pattern.y },
          lane: pattern.lane as FrequencyBand,
          size: pattern.size || 30,
          speed: pattern.speed || 1.5,
          targetTime,
          createdOnBeat: true,
        };
      });

      logger.debug(`${initialPatterns.length} patterns initiaux générés proactivement`);

      // Mettre à jour l'état et la référence immédiatement
      setPatterns(initialPatterns);
      patternsRef.current = initialPatterns;

      // Démarrer immédiatement la boucle d'animation pour que les patterns soient visibles
      requestAnimationFrame(() => {
        logger.debug('Démarrage immédiat de simpleUpdateGame pour rendre les patterns visibles');
        requestAnimationFrame(() => simpleUpdateGame()); // Appel correct maintenant
      });
    }
  }, [patterns.length, simpleUpdateGame]);

  // Implémentation des fonctions startGame et endGame (peut rester après)
  const startGame = useCallback(() => {
    try {
      logger.debug('Démarrage du jeu avec patterns prémappés');

      // S'assurer que la boucle d'animation précédente est arrêtée
      if (animationFrame.current) {
        cancelAnimationFrame(animationFrame.current);
        animationFrame.current = undefined;
      }

      // Forcer l'état du jeu à actif
      setGameState((prev) => ({
        ...prev,
        isActive: true,
        score: 0,
        combo: 0,
        perfectHits: 0,
        goodHits: 0,
        okHits: 0,
        totalNotes: 0,
        lastHitAccuracy: undefined,
        lastHitPoints: undefined,
      }));

      // Mettre à jour la référence isActive immédiatement
      isActive.current = true;

      // Générer les patterns prémappés avec des positions visibles à l'écran
      const now = Date.now();
      const preMappedPatterns = PRE_MAPPED_PATTERNS.map((pattern, index) => {
        // Ajuster les positions pour s'assurer qu'elles sont visibles
        // Utiliser des valeurs plus petites pour x pour que les patterns apparaissent à l'écran
        const x = Math.min(pattern.x, 800); // Limiter x à 800 pour s'assurer que les patterns sont visibles

        const timestamp = now + pattern.time;
        const targetTime = timestamp + (pattern.speed ? 5000 / pattern.speed : 5000);

        logger.debug(
          `Création du pattern #${index + 1}: ${pattern.type} sur la lane ${pattern.lane} à ${pattern.time}ms`
        );

        return {
          id: `pattern-${timestamp}-${index}`,
          timestamp,
          type: pattern.type as GamePattern['type'],
          position: { x, y: pattern.y },
          lane: pattern.lane as FrequencyBand,
          size: pattern.size || 30,
          speed: pattern.speed || 1.5,
          targetTime,
          createdOnBeat: true,
        };
      });

      logger.debug(`${preMappedPatterns.length} patterns prémappés générés`);

      // Mettre à jour l'état ET la référence immédiatement
      setPatterns(preMappedPatterns);
      patternsRef.current = preMappedPatterns; // Mise à jour immédiate de la référence

      // Vérification post-initialisation
      logger.debug('Vérification post-initialisation:', {
        patternsLength: preMappedPatterns.length,
        patternsRefLength: patternsRef.current.length,
        isActive: isActive.current,
        gameStateIsActive: gameState.isActive,
      });

      // Démarrer la boucle de mise à jour immédiatement
      logger.debug('Le jeu est actif - Vérification de la génération de patterns...');
      animationFrame.current = requestAnimationFrame(simpleUpdateGame);
    } catch (error) {
      logger.error('Erreur lors du démarrage du jeu:', error);
    }
  }, []);

  const endGame = useCallback(() => {
    logger.debug('Fin du jeu');
    // Mettre à jour l'état du jeu
    setGameState((prev) => {
      // Sauvegarder le meilleur score si nécessaire
      let newHighScore = prev.highScore;
      if (prev.score > prev.highScore && typeof window !== 'undefined') {
        localStorage.setItem('highScore', prev.score.toString());
        newHighScore = prev.score;
      }

      return {
        ...prev,
        isActive: false,
        highScore: newHighScore,
      };
    });

    // Arrêter la boucle de jeu
    isActive.current = false;

    if (animationFrame.current) {
      cancelAnimationFrame(animationFrame.current);
      animationFrame.current = undefined;
    }
  }, [setGameState, gameState.isActive, simpleUpdateGame]);

  // Mettre à jour la référence patternsRef lorsque patterns change
  useEffect(() => {
    patternsRef.current = patterns;
    logger.debug(`Synchronisation de patternsRef avec patterns: ${patterns.length} patterns`);
  }, [patterns]);

  // Export des méthodes et états mis à jour
  return {
    gameState,
    patterns,
    startGame,
    endGame,
    handleCollision,
    audioData: audioDataRef.current,
    setPlayerPosition: (x: number, y: number) => {
      playerPosition.current = { x, y };
    },
    currentBpm: bpm.current,
    beatConfidence: beatConfidence.current,
    simpleUpdateGame,
  };
};
