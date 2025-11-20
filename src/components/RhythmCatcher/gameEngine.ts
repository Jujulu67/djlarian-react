// Types de bases pour notre jeu
export interface Point {
  x: number;
  y: number;
}

export interface Pattern {
  id: string;
  position: Point;
  radius: number;
  color: string;
  speed: number;
  points: number;
  active: boolean;
  beatOffset: number; // Position rythmique du pattern
  targetTime: number; // Moment idéal pour la frappe
  hitWindow: number; // Fenêtre de temps pour frapper (ms)
  wasHit: boolean; // Si le pattern a déjà été frappé
  creation: number; // Horodatage de création
  opacity: number; // Pour l'animation de fondu
  scale: number; // Pour l'animation de taille
}

export interface Player {
  position: Point;
  radius: number;
  score: number;
  combo: number;
  highScore: number;
  perfectHits: number;
  goodHits: number;
  okHits: number;
  totalNotes: number;
}

export interface GameState {
  isActive: boolean;
  startTime: number;
  lastUpdateTime: number;
  patterns: Pattern[];
  player: Player;
  audioData?: Float32Array;
  bpm: number;
  audioContext?: AudioContext;
  analyser?: AnalyserNode;
  frequencyData?: Uint8Array;
}

export type HitQuality = 'PERFECT' | 'GOOD' | 'OK' | 'MISS';

export interface CollisionResult {
  collided: boolean;
  patternId?: string;
  quality?: HitQuality;
  points?: number;
}

// Constantes pour les paramètres du jeu
const PERFECT_WINDOW = 80; // Fenêtre parfaite en ms
const GOOD_WINDOW = 150; // Fenêtre bonne en ms
const OK_WINDOW = 250; // Fenêtre OK en ms
const BASE_POINTS = 100; // Points de base
const COMBO_MULTIPLIER = 0.1; // Multiplicateur combo
const MAX_PATTERNS = 15; // Maximum de patterns à l'écran
const MIN_PATTERN_INTERVAL = 200; // Intervalle minimum entre les patterns (ms) - réduit pour plus de patterns
const DEFAULT_BPM = 128; // BPM par défaut si non détecté

// Initialisation du jeu
export function initializeGame(canvasWidth: number, canvasHeight: number): GameState {
  const now = Date.now();

  // Créer quelques patterns initiaux pour éviter l'écran vide
  const initialPatterns: Pattern[] = [];
  for (let i = 0; i < 5; i++) {
    initialPatterns.push({
      id: `initial-pattern-${i}`,
      position: {
        x: Math.random() * (canvasWidth - 100) + 50,
        y: 50 + i * 40,
      },
      radius: 25 + Math.random() * 15,
      color: getRandomColor(),
      speed: 2 + Math.random() * 2,
      points: Math.round(BASE_POINTS * (1 + Math.random() * 0.5)),
      active: true,
      beatOffset: Math.random(),
      targetTime: now + 2000 + i * 500,
      hitWindow: OK_WINDOW,
      wasHit: false,
      creation: now,
      opacity: 0.5,
      scale: 0.8,
    });
  }

  return {
    isActive: false,
    startTime: now,
    lastUpdateTime: now,
    patterns: initialPatterns, // Utiliser les patterns initiaux
    player: {
      position: { x: canvasWidth / 2, y: canvasHeight - 50 },
      radius: 20,
      score: 0,
      combo: 0,
      highScore: 0,
      perfectHits: 0,
      goodHits: 0,
      okHits: 0,
      totalNotes: 0,
    },
    bpm: DEFAULT_BPM,
  };
}

// Création d'un nouveau pattern en fonction des données audio
export function addPattern(
  state: GameState,
  canvasWidth: number,
  canvasHeight: number,
  audioData?: Float32Array,
  frequencyData?: Uint8Array
): Pattern {
  const now = Date.now();

  // Utilisation des données audio pour positionner le pattern
  let x = Math.random() * (canvasWidth - 100) + 50;
  let speed = 2 + Math.random() * 2;
  let radius = 25 + Math.random() * 15;
  const points = Math.round(BASE_POINTS * (1 + Math.random() * 0.5));

  // Si des données audio sont disponibles, on les utilise pour influencer le pattern
  if (audioData && audioData.length > 0) {
    // Calcule l'énergie audio pour adapter la vitesse et le rayon
    const energySum = audioData.reduce((sum, val) => sum + Math.abs(val), 0);
    const avgEnergy = energySum / audioData.length;

    // Ajuste la vitesse et le rayon en fonction de l'énergie audio
    speed = 2 + avgEnergy * 4;
    radius = 25 + avgEnergy * 20;

    // Utilise les fréquences pour positionner le pattern
    if (frequencyData && frequencyData.length > 0) {
      // Trouve la fréquence dominante pour positionner horizontalement
      const dominantFreq = findDominantFrequency(frequencyData);
      x = (dominantFreq / 255) * canvasWidth;
    }
  }

  // Limite les valeurs à des plages raisonnables
  speed = Math.min(Math.max(speed, 1.5), 5);
  radius = Math.min(Math.max(radius, 20), 50);

  // Calcul du moment optimal pour frapper
  const distanceToTravel = canvasHeight - 50 - 50; // Distance du haut au joueur
  const travelTime = distanceToTravel / (speed * 60); // Temps en secondes
  const targetTime = now + travelTime * 1000; // Conversion en millisecondes

  // Calcul de la position rythmique
  const beatLength = 60000 / state.bpm; // Durée d'un beat en ms
  const beatOffset = ((targetTime - state.startTime) % beatLength) / beatLength;

  return {
    id: `pattern-${now}-${Math.random().toString(36).substring(2, 9)}`,
    position: { x, y: 50 }, // Commence en haut
    radius,
    color: getRandomColor(),
    speed,
    points,
    active: true,
    beatOffset,
    targetTime,
    hitWindow: OK_WINDOW,
    wasHit: false,
    creation: now,
    opacity: 0, // Commence invisible pour un effet de fondu
    scale: 0.5, // Commence plus petit pour un effet de grossissement
  };
}

// Mise à jour de l'état du jeu
export function updateGame(
  state: GameState,
  deltaTime: number,
  canvasWidth: number,
  canvasHeight: number,
  audioData?: Float32Array,
  frequencyData?: Uint8Array
): GameState {
  const now = Date.now();
  const updatedState = { ...state };

  if (!updatedState.isActive) {
    // Si le jeu n'est pas actif, on fait bouger les patterns plus lentement
    updatedState.patterns = updatedState.patterns.map((pattern) => {
      if (pattern.active) {
        return {
          ...pattern,
          position: {
            ...pattern.position,
            y: pattern.position.y + pattern.speed * 0.5, // Vitesse réduite
          },
          opacity: Math.min(pattern.opacity + 0.05, 1),
          scale: Math.min(pattern.scale + 0.02, 1),
        };
      }
      return pattern;
    });

    // Supprime les patterns qui sortent de l'écran
    updatedState.patterns = updatedState.patterns.filter(
      (pattern) => pattern.position.y < canvasHeight + pattern.radius
    );

    return updatedState;
  }

  // Mise à jour des patterns existants
  updatedState.patterns = updatedState.patterns
    .map((pattern) => {
      if (pattern.active) {
        // Calcule la nouvelle position
        const newY = pattern.position.y + pattern.speed * (deltaTime / 16);

        // Animation de fondu et d'échelle
        let opacity = pattern.opacity;
        let scale = pattern.scale;

        // Si le pattern vient d'être créé, on l'anime en fondu
        if (now - pattern.creation < 500) {
          opacity = Math.min(opacity + 0.1, 1);
          scale = Math.min(scale + 0.05, 1);
        }

        // Détermine si le pattern est encore actif (n'est pas sorti de l'écran)
        const stillActive = newY < canvasHeight + pattern.radius;

        // Si le pattern sort de l'écran et n'a pas été frappé, c'est un MISS
        if (!stillActive && !pattern.wasHit) {
          updatedState.player.combo = 0; // Reset combo
          updatedState.player.totalNotes++; // Compte comme une note ratée
        }

        return {
          ...pattern,
          position: { ...pattern.position, y: newY },
          active: stillActive,
          opacity,
          scale,
        };
      }
      return pattern;
    })
    .filter((pattern) => pattern.active || now - pattern.creation < 1000); // Garde les patterns récemment désactivés pour animation

  // Ajoute de nouveaux patterns si nécessaire
  const shouldAddPattern =
    updatedState.patterns.length < MAX_PATTERNS &&
    (updatedState.patterns.length === 0 ||
      now - Math.max(...updatedState.patterns.map((p) => p.creation)) > MIN_PATTERN_INTERVAL);

  if (shouldAddPattern) {
    const newPattern = addPattern(
      updatedState,
      canvasWidth,
      canvasHeight,
      audioData,
      frequencyData
    );
    updatedState.patterns.push(newPattern);
  }

  updatedState.lastUpdateTime = now;
  return updatedState;
}

// Vérification des collisions avec le joueur
export function checkCollisions(
  state: GameState,
  playerPosition: Point,
  clickTime: number
): CollisionResult {
  // Vérifie si un pattern a été cliqué
  for (const pattern of state.patterns) {
    if (!pattern.active || pattern.wasHit) continue;

    // Calcule la distance entre le joueur et le pattern
    const distance = Math.sqrt(
      Math.pow(playerPosition.x - pattern.position.x, 2) +
        Math.pow(playerPosition.y - pattern.position.y, 2)
    );

    if (distance <= pattern.radius + state.player.radius) {
      // Le joueur a cliqué sur un pattern, vérifie la précision temporelle
      const timeDiff = Math.abs(clickTime - pattern.targetTime);
      let quality: HitQuality = 'MISS';
      let points = 0;

      if (timeDiff <= PERFECT_WINDOW) {
        quality = 'PERFECT';
        points = pattern.points * 2;
      } else if (timeDiff <= GOOD_WINDOW) {
        quality = 'GOOD';
        points = pattern.points * 1.5;
      } else if (timeDiff <= OK_WINDOW) {
        quality = 'OK';
        points = pattern.points;
      }

      // Si c'est un succès, applique le combo
      if (quality !== 'MISS') {
        // Applique le multiplicateur de combo
        points = Math.round(points * (1 + state.player.combo * COMBO_MULTIPLIER));

        return {
          collided: true,
          patternId: pattern.id,
          quality,
          points,
        };
      }
    }
  }

  return { collided: false };
}

// Gestion des collisions détectées
export function handleCollision(state: GameState, collisionResult: CollisionResult): GameState {
  if (!collisionResult.collided || !collisionResult.patternId || !collisionResult.quality) {
    return state;
  }

  const updatedState = { ...state };

  // Trouve le pattern concerné
  const patternIndex = updatedState.patterns.findIndex((p) => p.id === collisionResult.patternId);
  if (patternIndex === -1) return state;

  // Marque le pattern comme frappé
  updatedState.patterns[patternIndex] = {
    ...updatedState.patterns[patternIndex],
    wasHit: true,
    active: false, // Désactive le pattern frappé
  };

  // Met à jour le score et les stats
  if (collisionResult.quality !== 'MISS') {
    updatedState.player.score += collisionResult.points || 0;
    updatedState.player.combo += 1;
    updatedState.player.highScore = Math.max(
      updatedState.player.highScore,
      updatedState.player.score
    );
    updatedState.player.totalNotes += 1;

    // Met à jour les compteurs selon la qualité
    switch (collisionResult.quality) {
      case 'PERFECT':
        updatedState.player.perfectHits += 1;
        break;
      case 'GOOD':
        updatedState.player.goodHits += 1;
        break;
      case 'OK':
        updatedState.player.okHits += 1;
        break;
    }
  } else {
    // Reset combo sur un MISS
    updatedState.player.combo = 0;
  }

  return updatedState;
}

// Fonctions utilitaires
function getRandomColor(): string {
  const colors = [
    '#ff3e6b', // Rose
    '#4287f5', // Bleu
    '#42f5e3', // Turquoise
    '#f542f2', // Magenta
    '#f5d742', // Jaune
    '#42f54e', // Vert
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

function findDominantFrequency(frequencyData: Uint8Array): number {
  let maxValue = 0;
  let maxIndex = 0;

  for (let i = 0; i < frequencyData.length; i++) {
    if (frequencyData[i] > maxValue) {
      maxValue = frequencyData[i];
      maxIndex = i;
    }
  }

  return maxIndex;
}

// Détecte le BPM à partir des données audio
export function detectBPM(audioData?: Float32Array): number {
  if (!audioData || audioData.length < 1024) {
    return DEFAULT_BPM;
  }

  // Méthode simplifiée de détection de BPM
  // Dans une vraie implémentation, on utiliserait un algorithme plus sophistiqué

  // Compte les pics dans les données audio
  let peaks = 0;
  let lastValue = 0;

  for (let i = 1; i < audioData.length; i++) {
    if (audioData[i] > 0.1 && audioData[i - 1] <= 0.1) {
      peaks++;
    }
    lastValue = audioData[i];
  }

  // Estime le BPM basé sur le nombre de pics
  // Supposons que l'échantillon audio représente environ 1 seconde
  const estimatedBPM = (peaks * 60) / (audioData.length / 44100);

  // Limite le BPM à une plage raisonnable
  return Math.min(Math.max(estimatedBPM, 60), 180) || DEFAULT_BPM;
}
