import type { FrequencyBand } from '@/types/game';

// Constantes de score
export const SCORE_INCREMENT = 25;
export const GOLDEN_SCORE = 50;
export const BLUE_SCORE = 15;
export const COMBO_MULTIPLIER = 1.2;

// Constantes de jeu
export const PATTERN_LIFETIME = 5000; // Durée de vie des patterns augmentée
export const SCROLL_SPEED = 1.5; // Vitesse de défilement réduite pour plus de précision
export const ENEMY_SPEED = 1.8;
export const AUDIO_UPDATE_INTERVAL = 1000 / 60; // 60 FPS
export const BEAT_DETECTION_THRESHOLD = 150; // Seuil pour la détection des beats
export const MIN_BEAT_INTERVAL = 300; // Intervalle minimum entre deux beats (ms)
export const PATTERN_BATCH_SIZE = 3;

// Définition des rails de fréquence
export const FREQUENCY_LANES = [
  { name: 'bass', range: [0, 4], yPosition: 0.75 }, // Graves
  { name: 'mid', range: [5, 15], yPosition: 0.5 }, // Médiums
  { name: 'high', range: [16, 30], yPosition: 0.25 }, // Aigus
] as const;

// Patterns prémappés
export const PRE_MAPPED_PATTERNS = [
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
] as const;

