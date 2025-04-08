export interface GameState {
  isActive: boolean;
  score: number;
  combo: number;
  highScore: number;

  // Statistiques de précision rythmique
  perfectHits: number;
  goodHits: number;
  okHits: number;
  totalNotes: number;

  // Pour l'affichage de feedback
  lastHitAccuracy?: 'perfect' | 'good' | 'ok' | 'miss';
  lastHitPoints?: number;
}

export interface AudioAnalyser {
  analyser: AnalyserNode;
  dataArray: Uint8Array;
  bufferLength: number;
}

export type FrequencyBand = 'bass' | 'mid' | 'high';

export type PatternType = 'collect' | 'golden' | 'blue' | 'avoid' | 'enemy';

export interface GamePattern {
  timestamp: number;
  type: PatternType;
  position: {
    x: number;
    y: number;
  };
  size: number;
  speed?: number;
  id?: string;

  // Propriétés pour le suivi d'un ennemi (legacy)
  targetX?: number;
  targetY?: number;

  // Nouvelles propriétés pour le jeu musical
  lane?: FrequencyBand;
  targetTime?: number; // Moment idéal pour collecter (timing parfait)
  createdOnBeat?: boolean;

  // Propriétés de décomposition
  isDisintegrating?: boolean;
  disintegrateStartTime?: number;
  disintegrateDuration?: number;

  // Type de précision pour l'animation
  accuracyType?: 'perfect' | 'good' | 'ok' | 'miss';

  // Valeur associée au pattern (typiquement l'intensité de la fréquence)
  value?: number;
  createdAt?: number;
}

export type CollisionType = 'collect' | 'avoid' | 'golden' | 'enemy' | null;

export interface PreloadedImages {
  [key: string]: HTMLImageElement;
}
