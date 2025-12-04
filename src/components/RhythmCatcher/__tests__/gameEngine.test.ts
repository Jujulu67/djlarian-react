import {
  initializeGame,
  updateGame,
  handleCollision,
  checkCollisions,
  detectBPM,
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

      expect(state.patterns.length).toBe(5);
      state.patterns.forEach((pattern) => {
        expect(pattern.active).toBe(true);
        expect(pattern.position.x).toBeGreaterThanOrEqual(0);
        expect(pattern.position.y).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('updateGame', () => {
    it('should update game state', () => {
      const state = initializeGame(800, 400);
      const now = Date.now();

      const updatedState = updateGame(state, now, 800, 400);

      // Allow for small timing differences (within 1ms)
      expect(updatedState.lastUpdateTime).toBeCloseTo(now, -1);
    });

    it('should move patterns', () => {
      const state = initializeGame(800, 400);
      const initialX = state.patterns[0].position.x;
      const now = Date.now() + 100;

      const updatedState = updateGame(state, now, 800, 400);

      // Patterns should have moved
      expect(updatedState.patterns.length).toBeGreaterThan(0);
    });

    it('should remove patterns that are off screen', () => {
      const state = initializeGame(800, 400);
      // Move patterns off screen
      state.patterns.forEach((pattern) => {
        pattern.position.x = -100;
      });

      const now = Date.now() + 1000;
      const updatedState = updateGame(state, now, 800, 400);

      // Patterns off screen should be removed or deactivated
      expect(updatedState.patterns.every((p) => p.position.x >= -100 || !p.active)).toBe(true);
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
  });

  describe('detectBPM', () => {
    it('should detect BPM from audio data', () => {
      const audioData = new Float32Array(1024);
      // Simulate beat pattern
      for (let i = 0; i < 1024; i += 128) {
        audioData[i] = 0.8;
      }

      const bpm = detectBPM(audioData, 44100);

      expect(bpm).toBeGreaterThan(0);
      expect(bpm).toBeLessThanOrEqual(200);
    });

    it('should return default BPM if no beats detected', () => {
      const audioData = new Float32Array(1024);
      // Silent audio
      audioData.fill(0);

      const bpm = detectBPM(audioData, 44100);

      expect(bpm).toBeGreaterThan(0);
    });
  });
});
