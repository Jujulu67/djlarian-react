/**
 * Tests pour ModelLimits.ts
 *
 * O6: Vérifier les limites modèle officielles et le cap de max_completion_tokens
 *
 * RT1 - Cap max_completion_tokens:
 * - si on demande 100k, doit cap à 65536 ; 768
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
      // openai/gpt-oss-20b: context 131072, max output 131072
      // openai/gpt-oss-120b: context 131072, max output 32768
      expect(ModelContextTokens['openai/gpt-oss-20b']).toBe(131072);
      expect(ModelContextTokens['openai/gpt-oss-120b']).toBe(131072);
    });

    it('should have correct max output limits for supported models', () => {
      expect(ModelMaxOutputTokens['openai/gpt-oss-20b']).toBe(65536);
      expect(ModelMaxOutputTokens['openai/gpt-oss-120b']).toBe(65536);
    });
  });

  describe('getModelContextLimit', () => {
    it('should return correct limit for known model', () => {
      expect(getModelContextLimit('openai/gpt-oss-20b')).toBe(131072);
      expect(getModelContextLimit('openai/gpt-oss-120b')).toBe(131072);
    });

    it('should return default for unknown model', () => {
      expect(getModelContextLimit('unknown-model')).toBe(8192); // DEFAULT_MODEL_LIMITS.contextTokens
    });
  });

  describe('getModelMaxOutput', () => {
    it('should return correct limit for known model', () => {
      expect(getModelMaxOutput('openai/gpt-oss-20b')).toBe(65536);
      expect(getModelMaxOutput('openai/gpt-oss-120b')).toBe(65536);
    });

    it('should return default for unknown model', () => {
      expect(getModelMaxOutput('unknown-model')).toBe(4096); // DEFAULT_MODEL_LIMITS.maxOutputTokens
    });
  });

  describe('capMaxCompletionTokens (RT1)', () => {
    describe('openai/gpt-oss-120b (max output 65536)', () => {
      const model = 'openai/gpt-oss-120b';

      it('should cap 100k tokens to 65536', () => {
        expect(capMaxCompletionTokens(model, 100000)).toBe(65536);
      });

      it('should cap 70k tokens to 65536', () => {
        expect(capMaxCompletionTokens(model, 70000)).toBe(65536);
      });

      it('should not cap tokens below limit', () => {
        expect(capMaxCompletionTokens(model, 1024)).toBe(1024);
        expect(capMaxCompletionTokens(model, 65536)).toBe(65536);
      });
    });

    describe('openai/gpt-oss-20b (max output 65536)', () => {
      const model = 'openai/gpt-oss-20b';

      it('should cap tokens exceeding 65536', () => {
        expect(capMaxCompletionTokens(model, 200000)).toBe(65536);
      });

      it('should not cap tokens below limit', () => {
        expect(capMaxCompletionTokens(model, 50000)).toBe(50000);
        expect(capMaxCompletionTokens(model, 65536)).toBe(65536);
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
      expect(getBoundedResponseReserve('openai/gpt-oss-20b', 100)).toBe(256); // Below min
      expect(getBoundedResponseReserve('openai/gpt-oss-20b', 1024)).toBe(1024); // Within range
      expect(getBoundedResponseReserve('openai/gpt-oss-20b', 10000)).toBe(8192); // Above max

      // 70B model: min 256, max 4096, default 1024
      expect(getBoundedResponseReserve('openai/gpt-oss-120b', 100)).toBe(256);
      expect(getBoundedResponseReserve('openai/gpt-oss-120b', 1024)).toBe(1024);
      expect(getBoundedResponseReserve('openai/gpt-oss-120b', 10000)).toBe(4096);
    });
  });

  describe('validateModelLimits', () => {
    it('should return valid for requests within limits', () => {
      const result = validateModelLimits('openai/gpt-oss-120b', 1024);
      expect(result.valid).toBe(true);
      expect(result.warnings).toHaveLength(0);
      expect(result.cappedValue).toBe(1024);
    });

    it('should warn and cap for requests exceeding limits', () => {
      const result = validateModelLimits('openai/gpt-oss-120b', 100000);
      expect(result.valid).toBe(false);
      expect(result.warnings).toContainEqual(expect.stringContaining('exceeds model limit'));
      expect(result.cappedValue).toBe(65536);
    });

    it('should warn for unknown models', () => {
      const result = validateModelLimits('unknown-model', 1024);
      expect(result.valid).toBe(false);
      expect(result.warnings).toContainEqual(expect.stringContaining('Unknown model'));
    });
  });
});
