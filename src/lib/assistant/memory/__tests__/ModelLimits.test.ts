/**
 * Tests pour ModelLimits.ts
 *
 * O6: Vérifier les limites modèle officielles et le cap de max_completion_tokens
 *
 * RT1 - Cap max_completion_tokens:
 * - sur 70B: si on demande 100k, doit cap à 32768
 * - sur 8B: cap à 131072 si nécessaire
 */

import {
  ModelContextTokens,
  ModelMaxOutputTokens,
  getModelContextLimit,
  getModelMaxOutput,
  capMaxCompletionTokens,
  getBoundedResponseReserve,
  validateModelLimits,
} from '../ModelLimits';

describe('ModelLimits', () => {
  describe('Constants', () => {
    it('should have correct context limits for supported models', () => {
      // Rappel (source: GroqCloud docs)
      // llama-3.1-8b-instant: context 131072, max output 131072
      // llama-3.3-70b-versatile: context 131072, max output 32768
      expect(ModelContextTokens['llama-3.1-8b-instant']).toBe(131072);
      expect(ModelContextTokens['llama-3.3-70b-versatile']).toBe(131072);
    });

    it('should have correct max output limits for supported models', () => {
      expect(ModelMaxOutputTokens['llama-3.1-8b-instant']).toBe(131072);
      expect(ModelMaxOutputTokens['llama-3.3-70b-versatile']).toBe(32768);
    });
  });

  describe('getModelContextLimit', () => {
    it('should return correct limit for known model', () => {
      expect(getModelContextLimit('llama-3.1-8b-instant')).toBe(131072);
      expect(getModelContextLimit('llama-3.3-70b-versatile')).toBe(131072);
    });

    it('should return default for unknown model', () => {
      expect(getModelContextLimit('unknown-model')).toBe(8192); // DEFAULT_MODEL_LIMITS.contextTokens
    });
  });

  describe('getModelMaxOutput', () => {
    it('should return correct limit for known model', () => {
      expect(getModelMaxOutput('llama-3.1-8b-instant')).toBe(131072);
      expect(getModelMaxOutput('llama-3.3-70b-versatile')).toBe(32768);
    });

    it('should return default for unknown model', () => {
      expect(getModelMaxOutput('unknown-model')).toBe(4096); // DEFAULT_MODEL_LIMITS.maxOutputTokens
    });
  });

  describe('capMaxCompletionTokens (RT1)', () => {
    describe('llama-3.3-70b-versatile (max output 32768)', () => {
      const model = 'llama-3.3-70b-versatile';

      it('should cap 100k tokens to 32768', () => {
        // RT1: sur 70B: si on demande 100k, doit cap à 32768
        expect(capMaxCompletionTokens(model, 100000)).toBe(32768);
      });

      it('should cap 50k tokens to 32768', () => {
        expect(capMaxCompletionTokens(model, 50000)).toBe(32768);
      });

      it('should not cap tokens below limit', () => {
        expect(capMaxCompletionTokens(model, 1024)).toBe(1024);
        expect(capMaxCompletionTokens(model, 32768)).toBe(32768);
      });
    });

    describe('llama-3.1-8b-instant (max output 131072)', () => {
      const model = 'llama-3.1-8b-instant';

      it('should cap tokens exceeding 131072', () => {
        // RT1: sur 8B: cap à 131072 si nécessaire
        expect(capMaxCompletionTokens(model, 200000)).toBe(131072);
      });

      it('should not cap tokens below limit', () => {
        expect(capMaxCompletionTokens(model, 100000)).toBe(100000);
        expect(capMaxCompletionTokens(model, 131072)).toBe(131072);
      });
    });

    describe('unknown model', () => {
      it('should use default limits', () => {
        expect(capMaxCompletionTokens('unknown', 10000)).toBe(4096);
        expect(capMaxCompletionTokens('unknown', 1000)).toBe(1000);
      });
    });
  });

  describe('getBoundedResponseReserve', () => {
    it('should bound reserve within model limits', () => {
      // 8B model: min 256, max 8192, default 1024
      expect(getBoundedResponseReserve('llama-3.1-8b-instant', 100)).toBe(256); // Below min
      expect(getBoundedResponseReserve('llama-3.1-8b-instant', 1024)).toBe(1024); // Within range
      expect(getBoundedResponseReserve('llama-3.1-8b-instant', 10000)).toBe(8192); // Above max

      // 70B model: min 256, max 4096, default 1024
      expect(getBoundedResponseReserve('llama-3.3-70b-versatile', 100)).toBe(256);
      expect(getBoundedResponseReserve('llama-3.3-70b-versatile', 1024)).toBe(1024);
      expect(getBoundedResponseReserve('llama-3.3-70b-versatile', 10000)).toBe(4096);
    });
  });

  describe('validateModelLimits', () => {
    it('should return valid for requests within limits', () => {
      const result = validateModelLimits('llama-3.3-70b-versatile', 1024);
      expect(result.valid).toBe(true);
      expect(result.warnings).toHaveLength(0);
      expect(result.cappedValue).toBe(1024);
    });

    it('should warn and cap for requests exceeding limits', () => {
      const result = validateModelLimits('llama-3.3-70b-versatile', 100000);
      expect(result.valid).toBe(false);
      expect(result.warnings).toContainEqual(expect.stringContaining('exceeds model limit'));
      expect(result.cappedValue).toBe(32768);
    });

    it('should warn for unknown models', () => {
      const result = validateModelLimits('unknown-model', 1024);
      expect(result.valid).toBe(false);
      expect(result.warnings).toContainEqual(expect.stringContaining('Unknown model'));
    });
  });
});
