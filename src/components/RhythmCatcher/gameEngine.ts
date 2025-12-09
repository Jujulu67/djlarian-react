// Types de bases pour notre jeu
export interface Point {
  x: number;
  y: number;
}

export type GameMode = 'FREE' | 'DEATH';

export enum PowerUpType {
  FIREBALL = 'FIREBALL', // Nettoie l'écran
  MAGNET = 'MAGNET', // Attire les boules
  SLOW_MO = 'SLOW_MO', // Ralentit le temps
  LIFE = 'LIFE', // Donne une vie (Death mode uniquement)
  SHIELD = 'SHIELD', // Protège contre un miss
}

export interface PowerUp {
  id: string;
  type: PowerUpType;
  position: Point;
  radius: number;
  speed: number;
  active: boolean;
  creation: number;
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
  position: Point; // Position ACTUELLE du curseur (mise à jour via events)
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
  lives: number; // Pour le Death Mode
  maxLives: number; // Pour le Death Mode
}

export interface GameDifficulty {
  spawnInterval: number; // Temps entre les spawns
  maxPatterns: number; // Nombre max de patterns simultanés
  baseSpeed: number; // Vitesse de base
  speedMultiplier: number; // Multiplicateur de vitesse progressive
}

export interface GameState {
  mode: GameMode;
  isActive: boolean;
  isGameOver: boolean;
  startTime: number;
  lastUpdateTime: number;
  patterns: Pattern[];
  powerUps: PowerUp[];
  player: Player;
  difficulty: GameDifficulty;
  activePowerUps: {
    magnet: boolean;
    slowMo: boolean;
    shield: boolean;
    magnetEndTime?: number;
    slowMoEndTime?: number;
  };
  audioData?: Float32Array;
  bpm: number;
  audioContext?: AudioContext;
  analyser?: AnalyserNode;
  frequencyData?: Uint8Array;
}

export type HitQuality = 'PERFECT' | 'GOOD' | 'OK' | 'MISS' | 'POWERUP';

export interface CollisionResult {
  collided: boolean;
  patternId?: string;
  powerUpId?: string;
  quality?: HitQuality;
  points?: number;
  patternPosition?: Point; // Position du pattern au moment de la collision
  patternRadius?: number; // Rayon effectif du pattern au moment de la collision
  patternColor?: string; // Couleur du pattern pour l'animation
  powerUpType?: PowerUpType;
}

// Constantes pour les paramètres du jeu
const PERFECT_WINDOW = 100;
const GOOD_WINDOW = 180;
const OK_WINDOW = 300;
const CLICK_TOLERANCE = 15; // Un peu plus tolerant
const BASE_POINTS = 100;
const COMBO_MULTIPLIER = 0.1;
const DEFAULT_BPM = 128;

// Config des modes
const DEATH_MODE_LIVES = 10;
const INITIAL_MAX_PATTERNS = 6; // Augmenté pour plus d'action au début
const INITIAL_SPAWN_INTERVAL = 1000; // Plus rapide au début

// Initialisation du jeu
export function initializeGame(
  canvasWidth: number,
  canvasHeight: number,
  mode: GameMode = 'FREE'
): GameState {
  const now = Date.now();

  // Créer quelques patterns initiaux pour que le jeu ne soit pas vide au lancement
  const initialPatterns: Pattern[] = [];
  for (let i = 0; i < 3; i++) {
    // Ajoute des patterns "pre-spawned" pour l'action immédiate
    initialPatterns.push({
      id: `initial-pattern-${i}`,
      position: {
        x: Math.random() * (canvasWidth - 100) + 50,
        y: i * 100 - 200, // Echelonnés au dessus
      },
      radius: 30,
      color: getRandomColor(),
      speed: 2.5,
      points: BASE_POINTS,
      active: true,
      beatOffset: 0,
      targetTime: now + 2000,
      hitWindow: OK_WINDOW,
      wasHit: false,
      creation: now,
      opacity: 1,
      scale: 1,
    });
  }

  return {
    mode,
    isActive: false,
    isGameOver: false,
    startTime: now,
    lastUpdateTime: now,
    patterns: initialPatterns,
    powerUps: [],
    player: {
      position: { x: canvasWidth / 2, y: canvasHeight / 2 },
      radius: 10,
      score: 0,
      combo: 0,
      highScore: 0,
      perfectHits: 0,
      goodHits: 0,
      okHits: 0,
      missHits: 0,
      missedPatterns: 0,
      totalNotes: 0,
      lives: mode === 'DEATH' ? DEATH_MODE_LIVES : Infinity,
      maxLives: mode === 'DEATH' ? DEATH_MODE_LIVES : Infinity,
    },
    difficulty: {
      spawnInterval: INITIAL_SPAWN_INTERVAL,
      maxPatterns: INITIAL_MAX_PATTERNS,
      baseSpeed: 2.5, // Un peu plus rapide de base
      speedMultiplier: 1.0,
    },
    activePowerUps: {
      magnet: false,
      slowMo: false,
      shield: false,
    },
    bpm: DEFAULT_BPM,
  };
}

// Création d'un nouveau pattern
export function addPattern(
  state: GameState,
  canvasWidth: number,
  canvasHeight: number,
  audioData?: Float32Array,
  frequencyData?: Uint8Array
): Pattern {
  const now = Date.now();

  // Position aléatoire basique
  let x = Math.random() * (canvasWidth - 100) + 50;

  // Vitesse de base modifiée par la difficulté et le slow mo
  let speed = state.difficulty.baseSpeed * state.difficulty.speedMultiplier;

  // Appliquer Slow Mo
  if (state.activePowerUps.slowMo) {
    speed *= 0.5;
  }

  let radius = 25 + Math.random() * 15;
  const points = Math.round(BASE_POINTS * (1 + Math.random() * 0.5));

  // Influence Audio
  if (audioData && audioData.length > 0) {
    const energySum = audioData.reduce((sum, val) => sum + Math.abs(val), 0);
    const avgEnergy = energySum / audioData.length;

    // Boost de vitesse/taille avec la musique
    speed += avgEnergy * 3;
    radius += avgEnergy * 15;

    if (frequencyData && frequencyData.length > 0) {
      const topFrequencies = findTopFrequencies(frequencyData, 3);
      if (topFrequencies.length > 0) {
        let weightedSum = 0;
        let totalWeight = 0;
        for (const { index, value } of topFrequencies) {
          const normalizedIndex = index / frequencyData.length;
          weightedSum += normalizedIndex * canvasWidth * (value / 255);
          totalWeight += value / 255;
        }

        const audioX = totalWeight > 0 ? weightedSum / totalWeight : canvasWidth / 2;
        // Mix 60% random, 40% audio pour garder de l'imprévisible
        x = x * 0.6 + audioX * 0.4;
        x = Math.max(50, Math.min(x, canvasWidth - 50));
      }
    }
  }

  // Bornes de sécurité
  speed = Math.min(Math.max(speed, 1.0), 8.0);
  radius = Math.min(Math.max(radius, 20), 60);

  const distanceToTravel = canvasHeight - 100;
  const travelTime = distanceToTravel / (speed * 60);
  const targetTime = now + travelTime * 1000;

  const beatLength = 60000 / state.bpm;
  const beatOffset = ((targetTime - state.startTime) % beatLength) / beatLength;

  return {
    id: `pattern-${now}-${Math.random().toString(36).substring(2, 9)}`,
    position: { x, y: -50 }, // Commence hors écran
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
    opacity: 0,
    scale: 0.5,
  };
}

// Création d'un PowerUp
function spawnPowerUp(canvasWidth: number, mode: GameMode): PowerUp {
  const types = Object.values(PowerUpType);

  let type = PowerUpType.FIREBALL;
  const rand = Math.random();

  if (mode === 'FREE') {
    // FREE MODE: Pas de Life ni Shield
    if (rand < 0.4) type = PowerUpType.FIREBALL;
    else if (rand < 0.7) type = PowerUpType.MAGNET;
    else type = PowerUpType.SLOW_MO;
  } else {
    // DEATH MODE: Tous les bonus
    if (rand < 0.3) type = PowerUpType.FIREBALL;
    else if (rand < 0.55) type = PowerUpType.MAGNET;
    else if (rand < 0.7) type = PowerUpType.SHIELD;
    else if (rand < 0.85) type = PowerUpType.SLOW_MO;
    else type = PowerUpType.LIFE;
  }

  return {
    id: `powerup-${Date.now()}-${Math.random()}`,
    type,
    position: {
      x: Math.random() * (canvasWidth - 100) + 50,
      y: -50,
    },
    radius: 30, // Un peu plus gros
    speed: 3,
    active: true,
    creation: Date.now(),
  };
}

export function updateGame(
  state: GameState,
  deltaTime: number,
  canvasWidth: number,
  canvasHeight: number,
  cursorPosition: Point | null, // Nouvelle entrée pour le curseur
  audioData?: Float32Array,
  frequencyData?: Uint8Array
): GameState {
  if (state.isGameOver) {
    if (state.mode === 'DEATH' && state.patterns.some((p) => p.active)) {
      // Clear patterns if game over in death mode
      return {
        ...state,
        patterns: state.patterns.map((p) => ({ ...p, active: false })),
      };
    }
    return state;
  }

  const now = Date.now();
  const updatedState = { ...state };

  // Mise à jour de la position du joueur (curseur)
  if (cursorPosition) {
    updatedState.player.position = cursorPosition;
  }

  // Gestion des PowerUps actifs (timers)
  if (
    updatedState.activePowerUps.magnet &&
    updatedState.activePowerUps.magnetEndTime &&
    now > updatedState.activePowerUps.magnetEndTime
  ) {
    updatedState.activePowerUps.magnet = false;
  }
  if (
    updatedState.activePowerUps.slowMo &&
    updatedState.activePowerUps.slowMoEndTime &&
    now > updatedState.activePowerUps.slowMoEndTime
  ) {
    updatedState.activePowerUps.slowMo = false;
  }

  if (!updatedState.isActive) {
    return updatedState;
  }

  // ----- PROGRESSIVE DIFFICULTY -----
  const timeElapsed = (now - state.startTime) / 1000;

  // Palier tous les 20s
  const level = Math.floor(timeElapsed / 20);
  const maxLevel = 10;
  const currentLevel = Math.min(level, maxLevel);

  updatedState.difficulty = {
    // intervalle diminue : 1000 -> 900 -> ... -> 500
    spawnInterval: Math.max(400, INITIAL_SPAWN_INTERVAL - currentLevel * 60),
    // maxPatterns augmente : 6 -> 8 -> ... -> 26
    maxPatterns: Math.min(30, INITIAL_MAX_PATTERNS + currentLevel * 2),
    baseSpeed: 2.5 + currentLevel * 0.2,
    speedMultiplier: 1.0,
  };

  // ----- SPAWN LOGIC -----

  // Spawn Patterns
  const lastSpawnTime = Math.max(...state.patterns.map((p) => p.creation), state.startTime);
  if (
    state.patterns.filter((p) => p.active).length < state.difficulty.maxPatterns &&
    now - lastSpawnTime > state.difficulty.spawnInterval
  ) {
    updatedState.patterns.push(
      addPattern(updatedState, canvasWidth, canvasHeight, audioData, frequencyData)
    );
  }

  // Spawn PowerUps (Plus Rare)
  // 0.1% de chance par frame (à 60fps = ~1 powerup toutes les 16 secondes environ)
  if (state.powerUps.length < 2 && Math.random() < 0.001) {
    updatedState.powerUps.push(spawnPowerUp(canvasWidth, state.mode));
  }

  // ----- UPDATE ENTITIES -----

  // Update Patterns
  updatedState.patterns = updatedState.patterns
    .map((pattern) => {
      if (!pattern.active) return pattern;

      let { x, y } = pattern.position;
      let { speed } = pattern;

      // Slow Mo Effect
      if (updatedState.activePowerUps.slowMo) {
        speed *= 0.5;
      }

      // Magnet Effect
      if (
        updatedState.activePowerUps.magnet &&
        cursorPosition &&
        pattern.active &&
        !pattern.wasHit
      ) {
        const dx = cursorPosition.x - x;
        const dy = cursorPosition.y - y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Rayon d'attraction
        if (dist < 400 && y > 0) {
          x += (dx / dist) * 7; // Attraction latérale
          y += (dy / dist) * 7; // Attraction verticale
        }
      }

      // Mouvement normal vers le bas
      y += speed * (deltaTime / 16);

      // Fade in intro
      let opacity = pattern.opacity;
      let scale = pattern.scale;
      if (now - pattern.creation < 500) {
        opacity = Math.min(opacity + 0.1, 1);
        scale = Math.min(scale + 0.05, 1);
      }

      const stillActive = y < canvasHeight + pattern.radius;

      if (!stillActive && !pattern.wasHit) {
        // Pattern manqué (sorti de l'écran)

        // Si on a un Shield, on le consomme et on ignore le miss
        if (updatedState.activePowerUps.shield) {
          updatedState.activePowerUps.shield = false;
          // On le marque comme 'hit' pour qu'il disparaisse sans pénalité
          return { ...pattern, active: false, wasHit: true };
        }

        updatedState.player.combo = 0;
        updatedState.player.missedPatterns++;
        updatedState.player.totalNotes++;

        if (state.mode === 'DEATH') {
          updatedState.player.lives--;
          if (updatedState.player.lives <= 0) {
            updatedState.isGameOver = true;
            updatedState.isActive = false;
          }
        }
      }

      return {
        ...pattern,
        position: { x, y },
        active: stillActive,
        opacity,
        scale,
      };
    })
    .filter((p) => p.active || now - p.creation < 1000); // Keep visuals for a bit

  // Update PowerUps
  updatedState.powerUps = updatedState.powerUps
    .map((pu) => {
      return {
        ...pu,
        position: {
          x: pu.position.x,
          y: pu.position.y + pu.speed * (deltaTime / 16),
        },
        active: pu.position.y < canvasHeight + 50, // Despawn if out of bounds
      };
    })
    .filter((pu) => pu.active);

  updatedState.lastUpdateTime = now;
  return updatedState;
}

// Vérification des collisions avec le joueur
export function checkCollisions(
  state: GameState,
  clickPosition: Point,
  clickTime: number,
  excludePatternIds?: Set<string>
): CollisionResult {
  // 1. Check PowerUps First (Priorité au fun)
  const hitPowerUp = state.powerUps.find((pu) => {
    const dist = Math.sqrt(
      Math.pow(clickPosition.x - pu.position.x, 2) + Math.pow(clickPosition.y - pu.position.y, 2)
    );
    return dist <= pu.radius + CLICK_TOLERANCE;
  });

  if (hitPowerUp) {
    return {
      collided: true,
      powerUpId: hitPowerUp.id,
      powerUpType: hitPowerUp.type,
      quality: 'POWERUP',
      points: 500, // Points bonus pour powerup
      patternPosition: hitPowerUp.position,
      patternRadius: hitPowerUp.radius,
      patternColor: '#FFD700', // Gold
    };
  }

  // 2. Check Patterns
  const hitPatterns = state.patterns
    .filter((pattern) => {
      if (!pattern.active || pattern.wasHit) return false;
      if (excludePatternIds && excludePatternIds.has(pattern.id)) return false;
      return true;
    })
    .map((pattern) => {
      const distance = Math.sqrt(
        Math.pow(clickPosition.x - pattern.position.x, 2) +
          Math.pow(clickPosition.y - pattern.position.y, 2)
      );
      const effectiveRadius = pattern.radius * pattern.scale;
      const hitRadius = effectiveRadius + CLICK_TOLERANCE;

      return { pattern, distance, hitRadius, effectiveRadius };
    })
    .filter(({ distance, hitRadius }) => distance <= hitRadius);

  if (hitPatterns.length > 0) {
    // Prioritize closest to click center, then lowest Y
    hitPatterns.sort((a, b) => {
      const distDiff = a.distance - b.distance;
      if (Math.abs(distDiff) > 10) return distDiff;
      return b.pattern.position.y - a.pattern.position.y;
    });

    const { pattern, distance, effectiveRadius } = hitPatterns[0];

    const distanceFromCenter = Math.max(0, distance);
    const perfectZone = effectiveRadius * 0.4;
    const goodZone = effectiveRadius * 0.7;
    const okZone = effectiveRadius * 1.0 + CLICK_TOLERANCE;

    let quality: HitQuality;
    let points: number;

    if (distanceFromCenter <= perfectZone) {
      quality = 'PERFECT';
      points = pattern.points * 2;
    } else if (distanceFromCenter <= goodZone) {
      quality = 'GOOD';
      points = Math.round(pattern.points * 1.5);
    } else {
      quality = 'OK';
      points = pattern.points;
    }

    points = Math.round(points * (1 + state.player.combo * COMBO_MULTIPLIER));

    return {
      collided: true,
      patternId: pattern.id,
      quality,
      points,
      patternPosition: pattern.position,
      patternRadius: effectiveRadius,
      patternColor: pattern.color,
    };
  }

  return { collided: false };
}

// Gestion des collisions détectées (Apply State Changes)
export function handleCollision(state: GameState, collisionResult: CollisionResult): GameState {
  if (!collisionResult.collided) {
    return state;
  }

  const updatedState = { ...state };

  // Handle PowerUp Hit
  if (collisionResult.powerUpId && collisionResult.powerUpType) {
    updatedState.powerUps = updatedState.powerUps.filter((p) => p.id !== collisionResult.powerUpId);
    updatedState.player.score += collisionResult.points || 0;

    // Apply Effect
    switch (collisionResult.powerUpType) {
      case PowerUpType.FIREBALL:
        // Détruit tous les patterns à l'écran et donne les points
        const activePatterns = updatedState.patterns.filter((p) => p.active);
        let fireballPoints = 0;
        activePatterns.forEach((p) => {
          fireballPoints += p.points;
        });
        updatedState.player.score += fireballPoints;
        updatedState.patterns = updatedState.patterns.map((p) => ({
          ...p,
          active: false,
          wasHit: true,
        }));
        break;
      case PowerUpType.MAGNET:
        updatedState.activePowerUps.magnet = true;
        updatedState.activePowerUps.magnetEndTime = Date.now() + 5000; // 5 secondes
        break;
      case PowerUpType.SLOW_MO:
        updatedState.activePowerUps.slowMo = true;
        updatedState.activePowerUps.slowMoEndTime = Date.now() + 8000; // 8 secondes
        break;
      case PowerUpType.LIFE:
        if (state.mode === 'DEATH') {
          updatedState.player.lives = Math.min(
            updatedState.player.lives + 1,
            updatedState.player.maxLives
          );
        } else {
          updatedState.player.score += 1000; // Bonus points si pas en Death Mode
        }
        break;
      case PowerUpType.SHIELD:
        updatedState.activePowerUps.shield = true;
        break;
    }
    return updatedState;
  }

  // Handle Pattern Hit
  if (collisionResult.patternId && collisionResult.quality) {
    const patternIndex = updatedState.patterns.findIndex((p) => p.id === collisionResult.patternId);
    if (patternIndex === -1) return state;

    updatedState.patterns[patternIndex] = {
      ...updatedState.patterns[patternIndex],
      wasHit: true,
      active: false,
    };

    if (collisionResult.quality !== 'MISS') {
      updatedState.player.score += collisionResult.points || 0;
      updatedState.player.combo += 1;
      updatedState.player.highScore = Math.max(
        updatedState.player.highScore,
        updatedState.player.score
      );
      updatedState.player.totalNotes += 1;

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
      updatedState.player.combo = 0;
      updatedState.player.missedPatterns++;
      updatedState.player.totalNotes++;

      if (state.mode === 'DEATH') {
        updatedState.player.lives--;
        if (updatedState.player.lives <= 0) {
          updatedState.isGameOver = true;
          updatedState.isActive = false;
        }
      }
    }
  }

  return updatedState;
}

// Fonctions utilitaires
function getRandomColor(): string {
  const colors = ['#ff3e6b', '#4287f5', '#42f5e3', '#f542f2', '#f5d742', '#42f54e'];
  return colors[Math.floor(Math.random() * colors.length)];
}

function findTopFrequencies(
  frequencyData: Uint8Array,
  count: number
): Array<{ index: number; value: number }> {
  const frequencies: Array<{ index: number; value: number }> = [];

  for (let i = 0; i < frequencyData.length; i++) {
    if (frequencyData[i] > 10) {
      frequencies.push({ index: i, value: frequencyData[i] });
    }
  }

  frequencies.sort((a, b) => b.value - a.value);
  return frequencies.slice(0, count);
}

export function detectBPM(audioData?: Float32Array): number {
  if (!audioData || audioData.length < 1024) return DEFAULT_BPM;

  let peaks = 0;
  for (let i = 1; i < audioData.length; i++) {
    if (audioData[i] > 0.1 && audioData[i - 1] <= 0.1) peaks++;
  }

  const estimatedBPM = (peaks * 60) / (audioData.length / 44100);
  return Math.min(Math.max(estimatedBPM, 60), 180) || DEFAULT_BPM;
}
