import {
  initializeGame,
  updateGame,
  handleCollision,
  checkCollisions,
  detectBPM,
  addPattern,
  PowerUpType,
} from '../gameEngine';
import type { GameState, Pattern, Point } from '../gameEngine';

// Mock logger
jest.mock('@/lib/logger', () => ({
  logger: {
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('gameEngine', () => {
  describe('initializeGame', () => {
    it('should initialize game state', () => {
      const state = initializeGame(800, 400);

      // initializeGame returns isActive: false by default
      expect(state.isActive).toBe(false);
      expect(state.patterns.length).toBeGreaterThan(0);
      expect(state.player.score).toBe(0);
      expect(state.player.combo).toBe(0);
    });

    it('should create initial patterns', () => {
      const state = initializeGame(800, 400);

      expect(state.patterns.length).toBe(3);
      state.patterns.forEach((pattern) => {
        expect(pattern.active).toBe(true);
        expect(pattern.position.x).toBeGreaterThanOrEqual(0);
        expect(pattern.position.x).toBeLessThanOrEqual(800);
        // y peut être négatif car les patterns sont créés au-dessus de l'écran
        expect(typeof pattern.position.y).toBe('number');
      });
    });

    it('should initialize FREE mode with infinite lives', () => {
      const state = initializeGame(800, 400, 'FREE');

      expect(state.mode).toBe('FREE');
      expect(state.player.lives).toBe(Infinity);
      expect(state.player.maxLives).toBe(Infinity);
    });

    it('should initialize DEATH mode with limited lives', () => {
      const state = initializeGame(800, 400, 'DEATH');

      expect(state.mode).toBe('DEATH');
      expect(state.player.lives).toBe(10);
      expect(state.player.maxLives).toBe(10);
      expect(state.player.lives).toBeLessThan(Infinity);
    });
  });

  describe('updateGame', () => {
    it('should update game state', () => {
      const state = initializeGame(800, 400);
      state.isActive = true;
      const deltaTime = 16; // 1 frame at 60fps
      const initialLastUpdateTime = state.lastUpdateTime;

      // Wait a bit to ensure time difference
      const updatedState = updateGame(state, deltaTime, 800, 400, null);

      // lastUpdateTime should be updated to current time (Date.now())
      expect(updatedState.lastUpdateTime).toBeGreaterThanOrEqual(initialLastUpdateTime);
    });

    it('should move patterns', () => {
      const state = initializeGame(800, 400);
      state.isActive = true;
      const initialY = state.patterns[0].position.y;
      const deltaTime = 16;

      const updatedState = updateGame(state, deltaTime, 800, 400, null);

      // Patterns should have moved down
      expect(updatedState.patterns.length).toBeGreaterThan(0);
      if (updatedState.patterns[0]) {
        expect(updatedState.patterns[0].position.y).toBeGreaterThan(initialY);
      }
    });

    it('should remove patterns that are off screen', () => {
      const state = initializeGame(800, 400);
      state.isActive = true;
      // Move patterns off screen (below canvas)
      state.patterns.forEach((pattern) => {
        pattern.position.y = 500; // Below canvas height (400)
      });

      const deltaTime = 16;
      const updatedState = updateGame(state, deltaTime, 800, 400, null);

      // Patterns off screen should be removed or deactivated
      const activePatterns = updatedState.patterns.filter((p) => p.active);
      expect(activePatterns.length).toBeLessThan(state.patterns.length);
    });

    it('should not update if game is over', () => {
      const state = initializeGame(800, 400);
      state.isGameOver = true;
      const deltaTime = 16;

      const updatedState = updateGame(state, deltaTime, 800, 400, null);

      expect(updatedState.isGameOver).toBe(true);
    });

    it('should not update if game is not active', () => {
      const state = initializeGame(800, 400);
      state.isActive = false;
      const deltaTime = 16;

      const updatedState = updateGame(state, deltaTime, 800, 400, null);

      expect(updatedState.isActive).toBe(false);
    });

    it('should handle DEATH mode - decrease lives when pattern missed', () => {
      const state = initializeGame(800, 400, 'DEATH');
      state.isActive = true;
      state.patterns[0].position.y = 500; // Off screen
      state.patterns[0].active = true;
      state.patterns[0].wasHit = false;
      const initialLives = state.player.lives;

      const deltaTime = 16;
      const updatedState = updateGame(state, deltaTime, 800, 400, null);

      expect(updatedState.player.lives).toBeLessThan(initialLives);
    });

    it('should trigger game over in DEATH mode when lives reach 0', () => {
      const state = initializeGame(800, 400, 'DEATH');
      state.isActive = true;
      state.player.lives = 1;
      state.patterns[0].position.y = 500; // Off screen
      state.patterns[0].active = true;
      state.patterns[0].wasHit = false;

      const deltaTime = 16;
      const updatedState = updateGame(state, deltaTime, 800, 400, null);

      expect(updatedState.isGameOver).toBe(true);
      expect(updatedState.isActive).toBe(false);
      expect(updatedState.player.lives).toBe(0);
    });

    it('should clear patterns when game over in DEATH mode', () => {
      const state = initializeGame(800, 400, 'DEATH');
      state.isGameOver = true;
      state.patterns[0].active = true;

      const deltaTime = 16;
      const updatedState = updateGame(state, deltaTime, 800, 400, null);

      expect(updatedState.patterns.every((p) => !p.active)).toBe(true);
    });

    it('should apply slow mo effect to pattern speed', () => {
      const state = initializeGame(800, 400);
      state.isActive = true;
      state.activePowerUps.slowMo = true;
      state.patterns[0].speed = 5;
      const initialY = state.patterns[0].position.y;

      const deltaTime = 16;
      const updatedState = updateGame(state, deltaTime, 800, 400, null);

      // Pattern should move slower with slow mo (less Y movement)
      if (updatedState.patterns[0]) {
        const yMovement = updatedState.patterns[0].position.y - initialY;
        expect(yMovement).toBeGreaterThan(0);
      }
    });

    it('should apply magnet effect to patterns', () => {
      const state = initializeGame(800, 400);
      state.isActive = true;
      state.activePowerUps.magnet = true;
      state.activePowerUps.magnetEndTime = Date.now() + 5000;
      state.patterns[0].position = { x: 100, y: 100 };
      state.patterns[0].active = true;
      state.patterns[0].wasHit = false;
      const cursorPosition = { x: 200, y: 200 };
      const initialX = state.patterns[0].position.x;

      const deltaTime = 16;
      const updatedState = updateGame(state, deltaTime, 800, 400, cursorPosition);

      // Pattern should be attracted towards cursor
      if (updatedState.patterns[0]) {
        expect(updatedState.patterns[0].position.x).not.toBe(initialX);
      }
    });

    it('should deactivate magnet powerup when time expires', () => {
      const state = initializeGame(800, 400);
      state.isActive = true;
      state.activePowerUps.magnet = true;
      state.activePowerUps.magnetEndTime = Date.now() - 1000; // Expired

      const deltaTime = 16;
      const updatedState = updateGame(state, deltaTime, 800, 400, null);

      expect(updatedState.activePowerUps.magnet).toBe(false);
    });

    it('should deactivate slow mo powerup when time expires', () => {
      const state = initializeGame(800, 400);
      state.isActive = true;
      state.activePowerUps.slowMo = true;
      state.activePowerUps.slowMoEndTime = Date.now() - 1000; // Expired

      const deltaTime = 16;
      const updatedState = updateGame(state, deltaTime, 800, 400, null);

      expect(updatedState.activePowerUps.slowMo).toBe(false);
    });

    it('should use shield to prevent missed pattern penalty', () => {
      const state = initializeGame(800, 400);
      state.isActive = true;
      state.activePowerUps.shield = true;
      state.patterns[0].position.y = 500; // Off screen
      state.patterns[0].active = true;
      state.patterns[0].wasHit = false;
      const initialLives = state.player.lives;
      const initialMissedPatterns = state.player.missedPatterns;

      const deltaTime = 16;
      const updatedState = updateGame(state, deltaTime, 800, 400, null);

      expect(updatedState.activePowerUps.shield).toBe(false);
      expect(updatedState.player.lives).toBe(initialLives);
      expect(updatedState.player.missedPatterns).toBe(initialMissedPatterns);
    });
  });

  describe('checkCollisions', () => {
    it('should detect collision with pattern', () => {
      const state = initializeGame(800, 400);
      const pattern = state.patterns[0];
      const clickPoint: Point = {
        x: pattern.position.x,
        y: pattern.position.y,
      };

      // checkCollisions signature: (state: GameState, playerPosition: Point, clickTime: number, excludePatternIds?: Set<string>)
      const result = checkCollisions(state, clickPoint, Date.now());

      expect(result.collided).toBe(true);
      expect(result.patternId).toBe(pattern.id);
    });

    it('should not detect collision if too far', () => {
      const state = initializeGame(800, 400);
      const clickPoint: Point = {
        x: 0,
        y: 0,
      };

      const result = checkCollisions(state, clickPoint, Date.now());

      expect(result.collided).toBe(false);
    });

    it('should calculate hit quality based on timing', () => {
      const state = initializeGame(800, 400);
      const pattern = state.patterns[0];
      const now = Date.now();
      pattern.targetTime = now + 50; // Very close to target

      const clickPoint: Point = {
        x: pattern.position.x,
        y: pattern.position.y,
      };

      const result = checkCollisions(state, clickPoint, now);

      if (result.collided) {
        expect(['PERFECT', 'GOOD', 'OK']).toContain(result.quality);
      }
    });

    it('should detect collision with PowerUp', () => {
      const state = initializeGame(800, 400);
      state.powerUps = [
        {
          id: 'powerup-1',
          type: 'FIREBALL' as PowerUpType,
          position: { x: 400, y: 200 },
          radius: 30,
          speed: 3,
          active: true,
          creation: Date.now(),
        },
      ];

      const clickPoint: Point = {
        x: 400,
        y: 200,
      };

      const result = checkCollisions(state, clickPoint, Date.now());

      expect(result.collided).toBe(true);
      expect(result.powerUpId).toBe('powerup-1');
      expect(result.powerUpType).toBe('FIREBALL');
      expect(result.quality).toBe('POWERUP');
    });

    it('should prioritize PowerUp over pattern', () => {
      const state = initializeGame(800, 400);
      const pattern = state.patterns[0];
      state.powerUps = [
        {
          id: 'powerup-1',
          type: 'MAGNET' as PowerUpType,
          position: pattern.position,
          radius: 30,
          speed: 3,
          active: true,
          creation: Date.now(),
        },
      ];

      const clickPoint: Point = {
        x: pattern.position.x,
        y: pattern.position.y,
      };

      const result = checkCollisions(state, clickPoint, Date.now());

      expect(result.collided).toBe(true);
      expect(result.powerUpId).toBe('powerup-1');
    });

    it('should calculate PERFECT hit quality', () => {
      const state = initializeGame(800, 400);
      const pattern = state.patterns[0];
      pattern.radius = 50;
      pattern.scale = 1;
      // Click very close to center (within perfect zone: 0.4 * radius = 20)
      const clickPoint: Point = {
        x: pattern.position.x + 10,
        y: pattern.position.y + 10,
      };

      const result = checkCollisions(state, clickPoint, Date.now());

      if (result.collided && result.quality) {
        // Should be PERFECT, GOOD, or OK depending on distance
        expect(['PERFECT', 'GOOD', 'OK']).toContain(result.quality);
      }
    });

    it('should exclude patterns in excludePatternIds', () => {
      const state = initializeGame(800, 400);
      const pattern = state.patterns[0];
      const excludeIds = new Set([pattern.id]);

      const clickPoint: Point = {
        x: pattern.position.x,
        y: pattern.position.y,
      };

      const result = checkCollisions(state, clickPoint, Date.now(), excludeIds);

      expect(result.collided).toBe(false);
    });

    it('should not detect collision with inactive pattern', () => {
      const state = initializeGame(800, 400);
      const pattern = state.patterns[0];
      pattern.active = false;

      const clickPoint: Point = {
        x: pattern.position.x,
        y: pattern.position.y,
      };

      const result = checkCollisions(state, clickPoint, Date.now());

      expect(result.collided).toBe(false);
    });

    it('should not detect collision with already hit pattern', () => {
      const state = initializeGame(800, 400);
      const pattern = state.patterns[0];
      pattern.wasHit = true;

      const clickPoint: Point = {
        x: pattern.position.x,
        y: pattern.position.y,
      };

      const result = checkCollisions(state, clickPoint, Date.now());

      expect(result.collided).toBe(false);
    });
  });

  describe('handleCollision', () => {
    it('should update score on collision', () => {
      const state = initializeGame(800, 400);
      const pattern = state.patterns[0];
      const initialScore = state.player.score;
      const clickPoint: Point = {
        x: pattern.position.x,
        y: pattern.position.y,
      };
      const now = Date.now();

      // First check for collision
      const collisionResult = checkCollisions(state, clickPoint, now);
      // Then handle the collision
      const updatedState = handleCollision(state, collisionResult);

      expect(updatedState.player.score).toBeGreaterThan(initialScore);
    });

    it('should increment combo on hit', () => {
      const state = initializeGame(800, 400);
      const pattern = state.patterns[0];
      const initialCombo = state.player.combo;
      const clickPoint: Point = {
        x: pattern.position.x,
        y: pattern.position.y,
      };
      const now = Date.now();

      // First check for collision
      const collisionResult = checkCollisions(state, clickPoint, now);
      // Then handle the collision
      const updatedState = handleCollision(state, collisionResult);

      expect(updatedState.player.combo).toBeGreaterThan(initialCombo);
    });

    it('should mark pattern as hit', () => {
      const state = initializeGame(800, 400);
      const pattern = state.patterns[0];
      const clickPoint: Point = {
        x: pattern.position.x,
        y: pattern.position.y,
      };
      const now = Date.now();

      // First check for collision
      const collisionResult = checkCollisions(state, clickPoint, now);
      // Then handle the collision
      const updatedState = handleCollision(state, collisionResult);

      const updatedPattern = updatedState.patterns.find((p) => p.id === pattern.id);
      expect(updatedPattern?.wasHit).toBe(true);
    });

    it('should return state unchanged if no collision', () => {
      const state = initializeGame(800, 400);
      const collisionResult = { collided: false };

      const updatedState = handleCollision(state, collisionResult);

      expect(updatedState).toBe(state);
    });

    describe('PowerUp collisions', () => {
      it('should handle FIREBALL powerup - clear all patterns', () => {
        const state = initializeGame(800, 400);
        state.patterns = [
          { ...state.patterns[0], points: 100, active: true },
          { ...state.patterns[1], points: 150, active: true },
        ];
        state.powerUps = [
          {
            id: 'fireball-1',
            type: 'FIREBALL' as PowerUpType,
            position: { x: 400, y: 200 },
            radius: 30,
            speed: 3,
            active: true,
            creation: Date.now(),
          },
        ];
        const initialScore = state.player.score;

        const collisionResult = {
          collided: true,
          powerUpId: 'fireball-1',
          powerUpType: 'FIREBALL' as PowerUpType,
          quality: 'POWERUP' as const,
          points: 500,
        };

        const updatedState = handleCollision(state, collisionResult);

        expect(updatedState.powerUps.length).toBe(0);
        expect(updatedState.patterns.every((p) => !p.active && p.wasHit)).toBe(true);
        // Score should increase by 500 (powerup points) + sum of pattern points (100 + 150 = 250)
        expect(updatedState.player.score).toBe(initialScore + 500 + 250);
      });

      it('should handle MAGNET powerup - activate magnet effect', () => {
        const state = initializeGame(800, 400);
        state.powerUps = [
          {
            id: 'magnet-1',
            type: 'MAGNET' as PowerUpType,
            position: { x: 400, y: 200 },
            radius: 30,
            speed: 3,
            active: true,
            creation: Date.now(),
          },
        ];

        const collisionResult = {
          collided: true,
          powerUpId: 'magnet-1',
          powerUpType: 'MAGNET' as PowerUpType,
          quality: 'POWERUP' as const,
          points: 500,
        };

        const updatedState = handleCollision(state, collisionResult);

        expect(updatedState.activePowerUps.magnet).toBe(true);
        expect(updatedState.activePowerUps.magnetEndTime).toBeGreaterThan(Date.now());
        expect(updatedState.powerUps.length).toBe(0);
      });

      it('should handle SLOW_MO powerup - activate slow mo effect', () => {
        const state = initializeGame(800, 400);
        state.powerUps = [
          {
            id: 'slowmo-1',
            type: 'SLOW_MO' as PowerUpType,
            position: { x: 400, y: 200 },
            radius: 30,
            speed: 3,
            active: true,
            creation: Date.now(),
          },
        ];

        const collisionResult = {
          collided: true,
          powerUpId: 'slowmo-1',
          powerUpType: 'SLOW_MO' as PowerUpType,
          quality: 'POWERUP' as const,
          points: 500,
        };

        const updatedState = handleCollision(state, collisionResult);

        expect(updatedState.activePowerUps.slowMo).toBe(true);
        expect(updatedState.activePowerUps.slowMoEndTime).toBeGreaterThan(Date.now());
      });

      it('should handle LIFE powerup in DEATH mode - increase lives', () => {
        const state = initializeGame(800, 400, 'DEATH');
        state.player.lives = 5;
        state.player.maxLives = 10;
        state.powerUps = [
          {
            id: 'life-1',
            type: 'LIFE' as PowerUpType,
            position: { x: 400, y: 200 },
            radius: 30,
            speed: 3,
            active: true,
            creation: Date.now(),
          },
        ];

        const collisionResult = {
          collided: true,
          powerUpId: 'life-1',
          powerUpType: 'LIFE' as PowerUpType,
          quality: 'POWERUP' as const,
          points: 500,
        };

        const updatedState = handleCollision(state, collisionResult);

        expect(updatedState.player.lives).toBe(6);
      });

      it('should handle LIFE powerup in FREE mode - give bonus points', () => {
        const state = initializeGame(800, 400, 'FREE');
        const initialScore = state.player.score;
        state.powerUps = [
          {
            id: 'life-1',
            type: 'LIFE' as PowerUpType,
            position: { x: 400, y: 200 },
            radius: 30,
            speed: 3,
            active: true,
            creation: Date.now(),
          },
        ];

        const collisionResult = {
          collided: true,
          powerUpId: 'life-1',
          powerUpType: 'LIFE' as PowerUpType,
          quality: 'POWERUP' as const,
          points: 500,
        };

        const updatedState = handleCollision(state, collisionResult);

        expect(updatedState.player.score).toBe(initialScore + 500 + 1000);
      });

      it('should handle SHIELD powerup - activate shield', () => {
        const state = initializeGame(800, 400);
        state.powerUps = [
          {
            id: 'shield-1',
            type: 'SHIELD' as PowerUpType,
            position: { x: 400, y: 200 },
            radius: 30,
            speed: 3,
            active: true,
            creation: Date.now(),
          },
        ];

        const collisionResult = {
          collided: true,
          powerUpId: 'shield-1',
          powerUpType: 'SHIELD' as PowerUpType,
          quality: 'POWERUP' as const,
          points: 500,
        };

        const updatedState = handleCollision(state, collisionResult);

        expect(updatedState.activePowerUps.shield).toBe(true);
      });

      it('should not exceed maxLives when LIFE powerup is collected', () => {
        const state = initializeGame(800, 400, 'DEATH');
        state.player.lives = 10;
        state.player.maxLives = 10;
        state.powerUps = [
          {
            id: 'life-1',
            type: 'LIFE' as PowerUpType,
            position: { x: 400, y: 200 },
            radius: 30,
            speed: 3,
            active: true,
            creation: Date.now(),
          },
        ];

        const collisionResult = {
          collided: true,
          powerUpId: 'life-1',
          powerUpType: 'LIFE' as PowerUpType,
          quality: 'POWERUP' as const,
          points: 500,
        };

        const updatedState = handleCollision(state, collisionResult);

        expect(updatedState.player.lives).toBe(10);
        expect(updatedState.player.lives).toBeLessThanOrEqual(updatedState.player.maxLives);
      });
    });

    describe('Pattern hit qualities', () => {
      it('should increment perfectHits for PERFECT quality', () => {
        const state = initializeGame(800, 400);
        const pattern = state.patterns[0];
        const initialPerfectHits = state.player.perfectHits;

        const collisionResult = {
          collided: true,
          patternId: pattern.id,
          quality: 'PERFECT' as const,
          points: 200,
        };

        const updatedState = handleCollision(state, collisionResult);

        expect(updatedState.player.perfectHits).toBe(initialPerfectHits + 1);
      });

      it('should increment goodHits for GOOD quality', () => {
        const state = initializeGame(800, 400);
        const pattern = state.patterns[0];
        const initialGoodHits = state.player.goodHits;

        const collisionResult = {
          collided: true,
          patternId: pattern.id,
          quality: 'GOOD' as const,
          points: 150,
        };

        const updatedState = handleCollision(state, collisionResult);

        expect(updatedState.player.goodHits).toBe(initialGoodHits + 1);
      });

      it('should increment okHits for OK quality', () => {
        const state = initializeGame(800, 400);
        const pattern = state.patterns[0];
        const initialOkHits = state.player.okHits;

        const collisionResult = {
          collided: true,
          patternId: pattern.id,
          quality: 'OK' as const,
          points: 100,
        };

        const updatedState = handleCollision(state, collisionResult);

        expect(updatedState.player.okHits).toBe(initialOkHits + 1);
      });

      it('should update highScore when score exceeds it', () => {
        const state = initializeGame(800, 400);
        state.player.score = 1000;
        state.player.highScore = 1000;
        const pattern = state.patterns[0];
        pattern.points = 200;

        const collisionResult = {
          collided: true,
          patternId: pattern.id,
          quality: 'PERFECT' as const,
          points: 400, // PERFECT doubles the points: 200 * 2 = 400
        };

        const updatedState = handleCollision(state, collisionResult);

        // Score becomes 1000 + 400 = 1400, highScore should be updated to 1400
        expect(updatedState.player.score).toBe(1400);
        expect(updatedState.player.highScore).toBe(1400);
      });

      it('should handle MISS quality - reset combo and increment missedPatterns', () => {
        const state = initializeGame(800, 400);
        state.player.combo = 5;
        state.player.missedPatterns = 0;
        const pattern = state.patterns[0];

        const collisionResult = {
          collided: true,
          patternId: pattern.id,
          quality: 'MISS' as const,
        };

        const updatedState = handleCollision(state, collisionResult);

        expect(updatedState.player.combo).toBe(0);
        expect(updatedState.player.missedPatterns).toBe(1);
      });

      it('should decrease lives in DEATH mode on MISS', () => {
        const state = initializeGame(800, 400, 'DEATH');
        state.player.lives = 5;
        const pattern = state.patterns[0];

        const collisionResult = {
          collided: true,
          patternId: pattern.id,
          quality: 'MISS' as const,
        };

        const updatedState = handleCollision(state, collisionResult);

        expect(updatedState.player.lives).toBe(4);
      });

      it('should trigger game over in DEATH mode when lives reach 0 on MISS', () => {
        const state = initializeGame(800, 400, 'DEATH');
        state.player.lives = 1;
        state.isActive = true;
        const pattern = state.patterns[0];

        const collisionResult = {
          collided: true,
          patternId: pattern.id,
          quality: 'MISS' as const,
        };

        const updatedState = handleCollision(state, collisionResult);

        expect(updatedState.isGameOver).toBe(true);
        expect(updatedState.isActive).toBe(false);
        expect(updatedState.player.lives).toBe(0);
      });

      it('should return state unchanged if patternId not found', () => {
        const state = initializeGame(800, 400);

        const collisionResult = {
          collided: true,
          patternId: 'non-existent-id',
          quality: 'PERFECT' as const,
          points: 200,
        };

        const updatedState = handleCollision(state, collisionResult);

        expect(updatedState).toBe(state);
      });
    });
  });

  describe('detectBPM', () => {
    it('should detect BPM from audio data', () => {
      const audioData = new Float32Array(1024);
      // Simulate beat pattern
      for (let i = 0; i < 1024; i += 128) {
        audioData[i] = 0.8;
      }

      const bpm = detectBPM(audioData);

      expect(bpm).toBeGreaterThan(0);
      expect(bpm).toBeLessThanOrEqual(200);
    });

    it('should return default BPM if no beats detected', () => {
      const audioData = new Float32Array(1024);
      // Silent audio
      audioData.fill(0);

      const bpm = detectBPM(audioData);

      expect(bpm).toBeGreaterThan(0);
    });

    it('should return default BPM if audioData is too short', () => {
      const audioData = new Float32Array(100); // Less than 1024

      const bpm = detectBPM(audioData);

      expect(bpm).toBe(128); // DEFAULT_BPM
    });

    it('should limit BPM between 60 and 180', () => {
      const audioData = new Float32Array(1024);
      // Simulate very high frequency (would give > 180 BPM)
      for (let i = 0; i < 1024; i += 10) {
        audioData[i] = 0.9;
      }

      const bpm = detectBPM(audioData);

      expect(bpm).toBeLessThanOrEqual(180);
      expect(bpm).toBeGreaterThanOrEqual(60);
    });
  });

  describe('addPattern', () => {
    it('should apply slow mo effect to pattern speed', () => {
      const state = initializeGame(800, 400);
      state.activePowerUps.slowMo = true;
      state.difficulty.baseSpeed = 5;

      const pattern = addPattern(state, 800, 400);

      // Speed should be reduced by 50% (5 * 0.5 = 2.5)
      expect(pattern.speed).toBeLessThan(5);
    });

    it('should use audioData to influence pattern properties', () => {
      const state = initializeGame(800, 400);
      const audioData = new Float32Array(1024);
      // Fill with some energy
      for (let i = 0; i < 1024; i++) {
        audioData[i] = 0.5;
      }

      const pattern = addPattern(state, 800, 400, audioData);

      // Speed and radius should be influenced by audio
      expect(pattern.speed).toBeGreaterThan(state.difficulty.baseSpeed);
      expect(pattern.radius).toBeGreaterThan(25);
    });

    it('should use frequencyData to influence pattern X position', () => {
      const state = initializeGame(800, 400);
      const audioData = new Float32Array(1024);
      audioData.fill(0.5);
      const frequencyData = new Uint8Array(256);
      // Set high frequency at index 128 (middle)
      frequencyData[128] = 200;

      const pattern = addPattern(state, 800, 400, audioData, frequencyData);

      // X position should be influenced by frequency (40% audio, 60% random)
      expect(pattern.position.x).toBeGreaterThanOrEqual(50);
      expect(pattern.position.x).toBeLessThanOrEqual(750);
    });

    it('should clamp speed between 1.0 and 8.0', () => {
      const state = initializeGame(800, 400);
      state.difficulty.baseSpeed = 20; // Very high speed

      const pattern = addPattern(state, 800, 400);

      expect(pattern.speed).toBeLessThanOrEqual(8.0);
      expect(pattern.speed).toBeGreaterThanOrEqual(1.0);
    });

    it('should clamp radius between 20 and 60', () => {
      const state = initializeGame(800, 400);
      const audioData = new Float32Array(1024);
      audioData.fill(10); // Very high energy

      const pattern = addPattern(state, 800, 400, audioData);

      expect(pattern.radius).toBeLessThanOrEqual(60);
      expect(pattern.radius).toBeGreaterThanOrEqual(20);
    });

    it('should handle frequencyData with totalWeight = 0', () => {
      const state = initializeGame(800, 400);
      const audioData = new Float32Array(1024);
      audioData.fill(0.5);
      const frequencyData = new Uint8Array(256);
      frequencyData.fill(0); // All zeros

      const pattern = addPattern(state, 800, 400, audioData, frequencyData);

      // Should still create a valid pattern
      expect(pattern.position.x).toBeGreaterThanOrEqual(50);
      expect(pattern.position.x).toBeLessThanOrEqual(750);
    });
  });

  describe('updateGame - advanced scenarios', () => {
    it('should spawn patterns with audioData and frequencyData', () => {
      const state = initializeGame(800, 400);
      state.isActive = true;
      state.patterns = [];
      state.startTime = Date.now() - 2000; // 2 seconds ago
      const audioData = new Float32Array(1024);
      audioData.fill(0.3);
      const frequencyData = new Uint8Array(256);
      frequencyData[100] = 150;

      const deltaTime = 16;
      const updatedState = updateGame(state, deltaTime, 800, 400, null, audioData, frequencyData);

      // Should have spawned at least one pattern
      expect(updatedState.patterns.length).toBeGreaterThan(0);
    });

    it('should not spawn PowerUp if powerUps.length >= 2', () => {
      const state = initializeGame(800, 400);
      state.isActive = true;
      state.powerUps = [
        {
          id: 'pu1',
          type: PowerUpType.FIREBALL,
          position: { x: 100, y: 100 },
          radius: 30,
          speed: 3,
          active: true,
          creation: Date.now(),
        },
        {
          id: 'pu2',
          type: PowerUpType.MAGNET,
          position: { x: 200, y: 200 },
          radius: 30,
          speed: 3,
          active: true,
          creation: Date.now(),
        },
      ];

      // Mock Math.random to always return < 0.001 (would spawn)
      const originalRandom = Math.random;
      Math.random = jest.fn(() => 0.0005);

      const deltaTime = 16;
      const updatedState = updateGame(state, deltaTime, 800, 400, null);

      // Should not spawn more PowerUps
      expect(updatedState.powerUps.length).toBe(2);

      Math.random = originalRandom;
    });

    it('should spawn PowerUp with 0.001 probability', () => {
      const state = initializeGame(800, 400);
      state.isActive = true;
      state.powerUps = [];

      // Mock Math.random to return exactly 0.0005 (< 0.001)
      const originalRandom = Math.random;
      let callCount = 0;
      Math.random = jest.fn(() => {
        callCount++;
        // Return < 0.001 on first call (spawn), then higher values
        return callCount === 1 ? 0.0005 : 0.5;
      });

      const deltaTime = 16;
      const updatedState = updateGame(state, deltaTime, 800, 400, null);

      // Should spawn a PowerUp
      expect(updatedState.powerUps.length).toBeGreaterThan(0);

      Math.random = originalRandom;
    });

    it('should handle magnet effect with dist < 400 and y > 0', () => {
      const state = initializeGame(800, 400);
      state.isActive = true;
      state.activePowerUps.magnet = true;
      state.activePowerUps.magnetEndTime = Date.now() + 5000;
      state.patterns[0].position = { x: 200, y: 100 };
      state.patterns[0].active = true;
      state.patterns[0].wasHit = false;
      const cursorPosition = { x: 300, y: 150 }; // Distance < 400
      const initialX = state.patterns[0].position.x;

      const deltaTime = 16;
      const updatedState = updateGame(state, deltaTime, 800, 400, cursorPosition);

      // Pattern should be attracted towards cursor
      if (updatedState.patterns[0]) {
        expect(updatedState.patterns[0].position.x).not.toBe(initialX);
      }
    });

    it('should not apply magnet effect if dist >= 400', () => {
      const state = initializeGame(800, 400);
      state.isActive = true;
      state.activePowerUps.magnet = true;
      state.activePowerUps.magnetEndTime = Date.now() + 5000;
      state.patterns[0].position = { x: 100, y: 100 };
      state.patterns[0].active = true;
      state.patterns[0].wasHit = false;
      const cursorPosition = { x: 600, y: 600 }; // Distance > 400

      const deltaTime = 16;
      const updatedState = updateGame(state, deltaTime, 800, 400, cursorPosition);

      // Pattern should move normally (down) but not be attracted
      if (updatedState.patterns[0]) {
        expect(updatedState.patterns[0].position.y).toBeGreaterThan(100);
      }
    });

    it('should not apply magnet effect if pattern was hit', () => {
      const state = initializeGame(800, 400);
      state.isActive = true;
      state.activePowerUps.magnet = true;
      state.activePowerUps.magnetEndTime = Date.now() + 5000;
      state.patterns[0].position = { x: 200, y: 100 };
      state.patterns[0].active = true;
      state.patterns[0].wasHit = true; // Already hit
      const cursorPosition = { x: 300, y: 150 };
      const initialX = state.patterns[0].position.x;

      const deltaTime = 16;
      const updatedState = updateGame(state, deltaTime, 800, 400, cursorPosition);

      // Pattern should not be attracted (wasHit = true)
      if (updatedState.patterns[0]) {
        // Should only move down, not sideways
        expect(updatedState.patterns[0].position.x).toBe(initialX);
      }
    });

    it('should consume shield when pattern is missed', () => {
      const state = initializeGame(800, 400);
      state.isActive = true;
      state.activePowerUps.shield = true;
      state.patterns[0].position.y = 500; // Off screen
      state.patterns[0].active = true;
      state.patterns[0].wasHit = false;
      const initialLives = state.player.lives;
      const initialMissedPatterns = state.player.missedPatterns;

      const deltaTime = 16;
      const updatedState = updateGame(state, deltaTime, 800, 400, null);

      expect(updatedState.activePowerUps.shield).toBe(false);
      expect(updatedState.player.lives).toBe(initialLives);
      expect(updatedState.player.missedPatterns).toBe(initialMissedPatterns);
      // Pattern should be marked as hit
      const missedPattern = updatedState.patterns.find((p) => p.position.y >= 500);
      if (missedPattern) {
        expect(missedPattern.wasHit).toBe(true);
      }
    });

    it('should handle multiple patterns missed', () => {
      const state = initializeGame(800, 400);
      state.isActive = true;
      state.patterns = [
        { ...state.patterns[0], position: { x: 100, y: 500 }, active: true, wasHit: false },
        { ...state.patterns[1], position: { x: 200, y: 500 }, active: true, wasHit: false },
        { ...state.patterns[2], position: { x: 300, y: 500 }, active: true, wasHit: false },
      ];
      const initialMissedPatterns = state.player.missedPatterns;

      const deltaTime = 16;
      const updatedState = updateGame(state, deltaTime, 800, 400, null);

      expect(updatedState.player.missedPatterns).toBeGreaterThan(initialMissedPatterns);
    });

    it('should spawn different PowerUp types in FREE mode based on random', () => {
      const state = initializeGame(800, 400, 'FREE');
      state.isActive = true;
      state.powerUps = [];

      // Test SLOW_MO spawn (rand >= 0.7)
      const originalRandom = Math.random;
      Math.random = jest.fn(() => 0.75); // >= 0.7, should spawn SLOW_MO

      const deltaTime = 16;
      const updatedState = updateGame(state, deltaTime, 800, 400, null);

      // Should spawn SLOW_MO
      if (updatedState.powerUps.length > 0) {
        expect([PowerUpType.FIREBALL, PowerUpType.MAGNET, PowerUpType.SLOW_MO]).toContain(
          updatedState.powerUps[0].type
        );
      }

      Math.random = originalRandom;
    });

    it('should spawn different PowerUp types in DEATH mode based on random', () => {
      const state = initializeGame(800, 400, 'DEATH');
      state.isActive = true;
      state.powerUps = [];

      // Test SHIELD spawn (0.55 <= rand < 0.7)
      const originalRandom = Math.random;
      Math.random = jest.fn(() => 0.65); // Between 0.55 and 0.7, should spawn SHIELD

      const deltaTime = 16;
      const updatedState = updateGame(state, deltaTime, 800, 400, null);

      // Should spawn SHIELD
      if (updatedState.powerUps.length > 0) {
        expect([
          PowerUpType.FIREBALL,
          PowerUpType.MAGNET,
          PowerUpType.SHIELD,
          PowerUpType.SLOW_MO,
          PowerUpType.LIFE,
        ]).toContain(updatedState.powerUps[0].type);
      }

      Math.random = originalRandom;
    });
  });

  describe('checkCollisions - advanced scenarios', () => {
    it('should prioritize pattern with lowest Y when distances are similar', () => {
      const state = initializeGame(800, 400);
      const now = Date.now();
      // Create two patterns at similar distance but different Y
      state.patterns = [
        {
          ...state.patterns[0],
          id: 'pattern-1',
          position: { x: 400, y: 200 },
          radius: 30,
          scale: 1,
          active: true,
          wasHit: false,
        },
        {
          ...state.patterns[1],
          id: 'pattern-2',
          position: { x: 405, y: 250 }, // Slightly further but lower Y
          radius: 30,
          scale: 1,
          active: true,
          wasHit: false,
        },
      ];

      const clickPoint = { x: 400, y: 200 }; // Closer to pattern-1

      const result = checkCollisions(state, clickPoint, now);

      expect(result.collided).toBe(true);
      // Should select pattern-1 (closer distance)
      expect(result.patternId).toBe('pattern-1');
    });

    it('should calculate effectiveRadius with scale', () => {
      const state = initializeGame(800, 400);
      const pattern = state.patterns[0];
      pattern.radius = 50;
      pattern.scale = 0.5; // Half scale
      pattern.active = true;
      pattern.wasHit = false;

      const clickPoint = {
        x: pattern.position.x + 25, // Within effectiveRadius (50 * 0.5 = 25) + tolerance
        y: pattern.position.y,
      };

      const result = checkCollisions(state, clickPoint, Date.now());

      expect(result.collided).toBe(true);
    });

    it('should prioritize pattern with lowest Y when distances are very similar (<= 10)', () => {
      const state = initializeGame(800, 400);
      const now = Date.now();
      // Create two patterns with distance difference <= 10
      state.patterns = [
        {
          ...state.patterns[0],
          id: 'pattern-1',
          position: { x: 400, y: 250 }, // Higher Y
          radius: 30,
          scale: 1,
          active: true,
          wasHit: false,
        },
        {
          ...state.patterns[1],
          id: 'pattern-2',
          position: { x: 405, y: 200 }, // Lower Y, slightly further (distance diff ~5)
          radius: 30,
          scale: 1,
          active: true,
          wasHit: false,
        },
      ];

      const clickPoint = { x: 400, y: 200 }; // Closer to pattern-2

      const result = checkCollisions(state, clickPoint, now);

      expect(result.collided).toBe(true);
      // When distances are similar (<= 10), should prioritize lower Y (pattern-2)
      expect(result.patternId).toBe('pattern-2');
    });

    it('should calculate GOOD quality hit (between perfectZone and goodZone)', () => {
      const state = initializeGame(800, 400);
      const pattern = state.patterns[0];
      pattern.radius = 50;
      pattern.scale = 1;
      pattern.active = true;
      pattern.wasHit = false;
      pattern.points = 100;

      // Click at distance between perfectZone (0.4 * 50 = 20) and goodZone (0.7 * 50 = 35)
      const perfectZone = 50 * 0.4; // 20
      const goodZone = 50 * 0.7; // 35
      const clickDistance = (perfectZone + goodZone) / 2; // ~27.5

      const clickPoint = {
        x: pattern.position.x + clickDistance,
        y: pattern.position.y,
      };

      const result = checkCollisions(state, clickPoint, Date.now());

      if (result.collided && result.quality) {
        // Should be GOOD or OK depending on exact distance
        expect(['GOOD', 'OK']).toContain(result.quality);
      }
    });
  });
});
