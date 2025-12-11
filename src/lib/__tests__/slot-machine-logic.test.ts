/**
 * Tests for slot-machine-logic
 */
import { SymbolType, RewardType } from '@/types/slot-machine';

import {
  getRandomSymbol,
  determineReward,
  SYMBOL_WEIGHTS,
  BOOSTED_WEIGHTS,
  SYMBOL_VALUES,
  COST_PER_SPIN,
} from '../slot-machine-logic';

describe('slot-machine-logic', () => {
  describe('getRandomSymbol', () => {
    it('should return a valid symbol', () => {
      const symbol = getRandomSymbol();
      expect(Object.values(SymbolType)).toContain(symbol);
    });

    it('should return a valid symbol when booster is enabled', () => {
      const symbol = getRandomSymbol(true);
      expect(Object.values(SymbolType)).toContain(symbol);
    });

    it('should respect symbol weights distribution', () => {
      const results: Record<SymbolType, number> = {
        [SymbolType.CHERRY]: 0,
        [SymbolType.LEMON]: 0,
        [SymbolType.ORANGE]: 0,
        [SymbolType.PLUM]: 0,
        [SymbolType.BELL]: 0,
        [SymbolType.STAR]: 0,
        [SymbolType.SEVEN]: 0,
      };

      // Generate many symbols to test distribution
      for (let i = 0; i < 10000; i++) {
        const symbol = getRandomSymbol();
        results[symbol]++;
      }

      // CHERRY should be most common (weight 50)
      expect(results[SymbolType.CHERRY]).toBeGreaterThan(results[SymbolType.SEVEN]);
      // SEVEN should be least common (weight 2)
      expect(results[SymbolType.SEVEN]).toBeLessThan(results[SymbolType.CHERRY]);
    });

    it('should use boosted weights when booster is enabled', () => {
      const normalResults: Record<SymbolType, number> = {
        [SymbolType.CHERRY]: 0,
        [SymbolType.LEMON]: 0,
        [SymbolType.ORANGE]: 0,
        [SymbolType.PLUM]: 0,
        [SymbolType.BELL]: 0,
        [SymbolType.STAR]: 0,
        [SymbolType.SEVEN]: 0,
      };

      const boostedResults: Record<SymbolType, number> = {
        [SymbolType.CHERRY]: 0,
        [SymbolType.LEMON]: 0,
        [SymbolType.ORANGE]: 0,
        [SymbolType.PLUM]: 0,
        [SymbolType.BELL]: 0,
        [SymbolType.STAR]: 0,
        [SymbolType.SEVEN]: 0,
      };

      for (let i = 0; i < 5000; i++) {
        normalResults[getRandomSymbol(false)]++;
        boostedResults[getRandomSymbol(true)]++;
      }

      // Boosted mode should have more CHERRY and LEMON
      const normalCherryRatio = normalResults[SymbolType.CHERRY] / 5000;
      const boostedCherryRatio = boostedResults[SymbolType.CHERRY] / 5000;
      expect(boostedCherryRatio).toBeGreaterThan(normalCherryRatio);
    });
  });

  describe('determineReward', () => {
    describe('Triple matches (3 identical symbols)', () => {
      it('should return QUEUE_SKIP for triple SEVEN (jackpot)', () => {
        const result = determineReward([SymbolType.SEVEN, SymbolType.SEVEN, SymbolType.SEVEN]);
        expect(result.rewardType).toBe(RewardType.QUEUE_SKIP);
        expect(result.rewardAmount).toBe(1);
        expect(result.isWin).toBe(true);
        expect(result.message).toContain('JACKPOT ULTIME');
      });

      it('should return ETERNAL_TICKET for triple STAR', () => {
        const result = determineReward([SymbolType.STAR, SymbolType.STAR, SymbolType.STAR]);
        expect(result.rewardType).toBe(RewardType.ETERNAL_TICKET);
        expect(result.rewardAmount).toBe(1);
        expect(result.isWin).toBe(true);
        expect(result.message).toContain('JACKPOT');
      });

      it('should return TOKENS for triple BELL', () => {
        const result = determineReward([SymbolType.BELL, SymbolType.BELL, SymbolType.BELL]);
        expect(result.rewardType).toBe(RewardType.TOKENS);
        expect(result.rewardAmount).toBe(200);
        expect(result.isWin).toBe(true);
        expect(result.message).toContain('MEGA WIN');
      });

      it('should return TOKENS for triple PLUM', () => {
        const result = determineReward([SymbolType.PLUM, SymbolType.PLUM, SymbolType.PLUM]);
        expect(result.rewardType).toBe(RewardType.TOKENS);
        expect(result.rewardAmount).toBe(100);
        expect(result.isWin).toBe(true);
        expect(result.message).toContain('MEGA WIN');
      });

      it('should return TOKENS for triple ORANGE', () => {
        const result = determineReward([SymbolType.ORANGE, SymbolType.ORANGE, SymbolType.ORANGE]);
        expect(result.rewardType).toBe(RewardType.TOKENS);
        expect(result.rewardAmount).toBe(50);
        expect(result.isWin).toBe(true);
        expect(result.message).toContain('TRIPLE');
      });

      it('should return TOKENS for triple LEMON', () => {
        const result = determineReward([SymbolType.LEMON, SymbolType.LEMON, SymbolType.LEMON]);
        expect(result.rewardType).toBe(RewardType.TOKENS);
        expect(result.rewardAmount).toBe(25);
        expect(result.isWin).toBe(true);
        expect(result.message).toContain('TRIPLE');
      });

      it('should return TOKENS for triple CHERRY', () => {
        const result = determineReward([SymbolType.CHERRY, SymbolType.CHERRY, SymbolType.CHERRY]);
        expect(result.rewardType).toBe(RewardType.TOKENS);
        expect(result.rewardAmount).toBe(15);
        expect(result.isWin).toBe(true);
        expect(result.message).toContain('TRIPLE');
      });
    });

    describe('Double matches (2 identical symbols)', () => {
      it('should return TOKENS for double SEVEN', () => {
        const result = determineReward([SymbolType.SEVEN, SymbolType.SEVEN, SymbolType.CHERRY]);
        expect(result.rewardType).toBe(RewardType.TOKENS);
        expect(result.rewardAmount).toBe(50);
        expect(result.isWin).toBe(true);
        expect(result.message).toContain('Beau double');
      });

      it('should return TOKENS for double STAR', () => {
        const result = determineReward([SymbolType.STAR, SymbolType.STAR, SymbolType.LEMON]);
        expect(result.rewardType).toBe(RewardType.TOKENS);
        expect(result.rewardAmount).toBe(30);
        expect(result.isWin).toBe(true);
        expect(result.message).toContain('Beau double');
      });

      it('should return TOKENS for double BELL', () => {
        const result = determineReward([SymbolType.BELL, SymbolType.BELL, SymbolType.ORANGE]);
        expect(result.rewardType).toBe(RewardType.TOKENS);
        expect(result.rewardAmount).toBe(15);
        expect(result.isWin).toBe(true);
        expect(result.message).toContain('Beau double');
      });

      it('should return TOKENS for double PLUM', () => {
        const result = determineReward([SymbolType.PLUM, SymbolType.PLUM, SymbolType.CHERRY]);
        expect(result.rewardType).toBe(RewardType.TOKENS);
        expect(result.rewardAmount).toBe(8);
        expect(result.isWin).toBe(true);
        expect(result.message).toContain('Double');
      });

      it('should return TOKENS for double ORANGE', () => {
        const result = determineReward([SymbolType.ORANGE, SymbolType.ORANGE, SymbolType.LEMON]);
        expect(result.rewardType).toBe(RewardType.TOKENS);
        expect(result.rewardAmount).toBe(3);
        expect(result.isWin).toBe(true);
        expect(result.message).toContain('jetons');
      });

      it('should return TOKENS for double LEMON', () => {
        const result = determineReward([SymbolType.LEMON, SymbolType.LEMON, SymbolType.CHERRY]);
        expect(result.rewardType).toBe(RewardType.TOKENS);
        expect(result.rewardAmount).toBe(2);
        expect(result.isWin).toBe(true);
        expect(result.message).toContain('jeton');
      });

      it('should return TOKENS for double CHERRY', () => {
        const result = determineReward([SymbolType.CHERRY, SymbolType.CHERRY, SymbolType.ORANGE]);
        expect(result.rewardType).toBe(RewardType.TOKENS);
        expect(result.rewardAmount).toBe(1);
        expect(result.isWin).toBe(true);
        expect(result.message).toContain('jeton');
      });

      it('should handle double in different positions', () => {
        const result1 = determineReward([SymbolType.SEVEN, SymbolType.CHERRY, SymbolType.SEVEN]);
        const result2 = determineReward([SymbolType.CHERRY, SymbolType.SEVEN, SymbolType.SEVEN]);
        expect(result1.rewardType).toBe(RewardType.TOKENS);
        expect(result2.rewardType).toBe(RewardType.TOKENS);
        expect(result1.rewardAmount).toBe(result2.rewardAmount);
      });
    });

    describe('No matches', () => {
      it('should return no reward for all different symbols', () => {
        const result = determineReward([SymbolType.CHERRY, SymbolType.LEMON, SymbolType.ORANGE]);
        expect(result.rewardType).toBeNull();
        expect(result.rewardAmount).toBe(0);
        expect(result.isWin).toBe(false);
        expect(result.message).toContain('Pas de chance');
      });

      it('should return no reward for all different high-value symbols', () => {
        const result = determineReward([SymbolType.BELL, SymbolType.STAR, SymbolType.SEVEN]);
        expect(result.rewardType).toBeNull();
        expect(result.rewardAmount).toBe(0);
        expect(result.isWin).toBe(false);
      });
    });
  });

  describe('Constants', () => {
    it('should have valid SYMBOL_WEIGHTS', () => {
      expect(SYMBOL_WEIGHTS[SymbolType.CHERRY]).toBe(50);
      expect(SYMBOL_WEIGHTS[SymbolType.LEMON]).toBe(40);
      expect(SYMBOL_WEIGHTS[SymbolType.SEVEN]).toBe(2);
    });

    it('should have valid BOOSTED_WEIGHTS', () => {
      expect(BOOSTED_WEIGHTS[SymbolType.CHERRY]).toBe(70);
      expect(BOOSTED_WEIGHTS[SymbolType.LEMON]).toBe(55);
      expect(BOOSTED_WEIGHTS[SymbolType.SEVEN]).toBe(2); // Should remain same
    });

    it('should have valid SYMBOL_VALUES', () => {
      expect(SYMBOL_VALUES[SymbolType.CHERRY]).toBe(2);
      expect(SYMBOL_VALUES[SymbolType.SEVEN]).toBe(100);
    });

    it('should have valid COST_PER_SPIN', () => {
      expect(COST_PER_SPIN).toBe(3);
    });
  });
});
