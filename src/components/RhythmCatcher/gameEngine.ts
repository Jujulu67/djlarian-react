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
  missHits: number; // Clics qui ne touchent aucun pattern
  missedPatterns: number; // Patterns qui sortent de l'écran sans être frappés
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
  patternPosition?: Point; // Position du pattern au moment de la collision
  patternRadius?: number; // Rayon effectif du pattern au moment de la collision
  patternColor?: string; // Couleur du pattern pour l'animation
}

// Constantes pour les paramètres du jeu
const PERFECT_WINDOW = 100; // Fenêtre parfaite en ms (augmentée pour plus de tolérance)
const GOOD_WINDOW = 180; // Fenêtre bonne en ms (augmentée pour plus de tolérance)
const OK_WINDOW = 300; // Fenêtre OK en ms (augmentée pour plus de tolérance)
const CLICK_TOLERANCE = 8; // Tolérance supplémentaire en pixels pour les clics (réduite car on n'a plus le timing)
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
      radius: 5, // Réduit encore plus pour plus de difficulté
      score: 0,
      combo: 0,
      highScore: 0,
      perfectHits: 0,
      goodHits: 0,
      okHits: 0,
      missHits: 0,
      missedPatterns: 0,
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
  // Commence avec une position aléatoire équilibrée
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

    // Utilise les fréquences pour influencer (pas remplacer) la position
    if (frequencyData && frequencyData.length > 0) {
      // Trouve plusieurs fréquences dominantes pour une distribution plus équilibrée
      const topFrequencies = findTopFrequencies(frequencyData, 3);

      // Calcule une position moyenne pondérée par l'intensité des fréquences
      let weightedSum = 0;
      let totalWeight = 0;

      for (const { index, value } of topFrequencies) {
        // Normalise l'index de fréquence pour mapper sur toute la largeur
        const normalizedIndex = index / frequencyData.length;
        const position = normalizedIndex * canvasWidth;
        const weight = value / 255; // Poids basé sur l'intensité

        weightedSum += position * weight;
        totalWeight += weight;
      }

      // Mélange la position audio avec une position aléatoire pour éviter le biais
      const audioInfluencedX = totalWeight > 0 ? weightedSum / totalWeight : canvasWidth / 2;
      const randomX = Math.random() * (canvasWidth - 100) + 50;

      // Combine les deux positions (70% aléatoire, 30% audio) pour une distribution équilibrée
      x = randomX * 0.7 + audioInfluencedX * 0.3;

      // Assure que la position reste dans les limites du canvas
      x = Math.max(50, Math.min(x, canvasWidth - 50));
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
        let { opacity, scale } = pattern;

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
          updatedState.player.missedPatterns++; // Compte les patterns manqués
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
  clickTime: number,
  excludePatternIds?: Set<string>
): CollisionResult {
  // Trouve tous les patterns qui sont dans la portée du clic
  // IMPORTANT: Filtre les patterns déjà frappés et ceux en cours de traitement pour éviter les doubles kills
  const hitPatterns = state.patterns
    .filter((pattern) => {
      // Exclut les patterns déjà frappés ou désactivés
      if (!pattern.active || pattern.wasHit) return false;
      // Exclut les patterns en cours de traitement si la liste est fournie
      if (excludePatternIds && excludePatternIds.has(pattern.id)) return false;
      return true;
    })
    .map((pattern) => {
      const distance = Math.sqrt(
        Math.pow(playerPosition.x - pattern.position.x, 2) +
          Math.pow(playerPosition.y - pattern.position.y, 2)
      );
      const effectiveRadius = pattern.radius * pattern.scale;
      // IMPORTANT: playerPosition est la position du CLIC, pas du joueur
      // Donc on n'ajoute PAS le rayon du joueur, seulement la tolérance de clic
      const hitRadius = effectiveRadius + CLICK_TOLERANCE;

      return { pattern, distance, hitRadius, effectiveRadius };
    })
    .filter(({ distance, hitRadius }) => distance <= hitRadius);

  // Si plusieurs patterns se chevauchent, sélectionne celui avec le Y le plus bas (le plus proche du joueur)
  // Si plusieurs ont le même Y, prend celui avec la distance euclidienne la plus petite
  // Si Y et distance sont identiques, trie par ID pour garantir la cohérence
  if (hitPatterns.length > 0) {
    // Trie par Y décroissant (plus bas = plus proche du joueur), puis par distance croissante, puis par ID
    hitPatterns.sort((a, b) => {
      const yDiff = b.pattern.position.y - a.pattern.position.y; // Y plus bas en premier
      if (Math.abs(yDiff) > 1) {
        // Si la différence de Y est significative (> 1px), priorise le Y le plus bas
        return yDiff;
      }
      // Si Y est similaire, priorise la distance euclidienne la plus petite
      const distanceDiff = a.distance - b.distance;
      if (Math.abs(distanceDiff) > 0.1) {
        return distanceDiff;
      }
      // Si Y et distance sont identiques, trie par ID pour garantir la cohérence
      // Cela garantit que le même pattern est toujours sélectionné pour un même clic
      return a.pattern.id.localeCompare(b.pattern.id);
    });

    const { pattern, distance, effectiveRadius } = hitPatterns[0];

    // Calcule la qualité basée sur la distance au centre du pattern
    // Plus le clic est proche du centre, meilleure est la qualité
    // IMPORTANT: playerPosition est la position du CLIC, donc on n'utilise pas player.radius
    const distanceFromCenter = Math.max(0, distance - CLICK_TOLERANCE);

    // Zones de qualité basées sur le rayon effectif du pattern
    const perfectZone = effectiveRadius * 0.3; // 30% du rayon = centre
    const goodZone = effectiveRadius * 0.6; // 60% du rayon
    const okZone = effectiveRadius * 0.9; // 90% du rayon

    let quality: HitQuality;
    let points: number;

    if (distanceFromCenter <= perfectZone) {
      quality = 'PERFECT';
      points = pattern.points * 2;
    } else if (distanceFromCenter <= goodZone) {
      quality = 'GOOD';
      points = Math.round(pattern.points * 1.5);
    } else if (distanceFromCenter <= okZone) {
      quality = 'OK';
      points = pattern.points;
    } else {
      // Même si on est dans le hitRadius, si on est très loin du centre, c'est un MISS
      // Mais on accepte quand même avec des points réduits
      quality = 'OK';
      points = Math.round(pattern.points * 0.7);
    }

    // Applique le multiplicateur de combo
    points = Math.round(points * (1 + state.player.combo * COMBO_MULTIPLIER));

    return {
      collided: true,
      patternId: pattern.id,
      quality,
      points,
      patternPosition: pattern.position, // Position du pattern au moment de la collision
      patternRadius: effectiveRadius, // Rayon effectif du pattern (avec scale)
      patternColor: pattern.color, // Couleur du pattern pour l'animation
    };
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
    updatedState.player.missedPatterns++;
    updatedState.player.totalNotes++;
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

// Trouve les N fréquences les plus intenses pour une meilleure distribution
function findTopFrequencies(
  frequencyData: Uint8Array,
  count: number
): Array<{ index: number; value: number }> {
  const frequencies: Array<{ index: number; value: number }> = [];

  for (let i = 0; i < frequencyData.length; i++) {
    if (frequencyData[i] > 10) {
      // Ignore les valeurs trop faibles
      frequencies.push({ index: i, value: frequencyData[i] });
    }
  }

  // Trie par valeur décroissante et prend les N premières
  frequencies.sort((a, b) => b.value - a.value);
  return frequencies.slice(0, count);
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
