import { RewardType, SymbolType } from '@/types/slot-machine';
import { getReelStopTime, getWinTier, isNearMiss, pickRandomSymbol } from '../slotMachineUtils';

describe('isNearMiss', () => {
  it('is true when exactly two rare symbols (SEVEN, STAR, BELL) are present', () => {
    expect(isNearMiss([SymbolType.SEVEN, SymbolType.STAR, SymbolType.CHERRY])).toBe(true);
    expect(isNearMiss([SymbolType.BELL, SymbolType.CHERRY, SymbolType.BELL])).toBe(true);
  });

  it('is false for three rare symbols', () => {
    expect(isNearMiss([SymbolType.SEVEN, SymbolType.STAR, SymbolType.BELL])).toBe(false);
  });

  it('is false for zero or one rare symbol', () => {
    expect(isNearMiss([SymbolType.CHERRY, SymbolType.LEMON, SymbolType.ORANGE])).toBe(false);
    expect(isNearMiss([SymbolType.SEVEN, SymbolType.CHERRY, SymbolType.LEMON])).toBe(false);
  });
});

describe('getWinTier', () => {
  it('returns low intensity for small token wins', () => {
    expect(getWinTier({ rewardType: RewardType.TOKENS, rewardAmount: 10 })).toEqual({
      isJackpot: false,
      isBigWin: false,
      isMediumWin: false,
      intensity: 'low',
    });
  });

  it('returns medium intensity from 15 tokens', () => {
    expect(getWinTier({ rewardType: RewardType.TOKENS, rewardAmount: 15 }).intensity).toBe(
      'medium'
    );
  });

  it('returns high intensity from 50 tokens', () => {
    const tier = getWinTier({ rewardType: RewardType.TOKENS, rewardAmount: 50 });
    expect(tier.isBigWin).toBe(true);
    expect(tier.intensity).toBe('high');
  });

  it('returns jackpot for QUEUE_SKIP and ETERNAL_TICKET whatever the amount', () => {
    const queueSkip = getWinTier({ rewardType: RewardType.QUEUE_SKIP, rewardAmount: 1 });
    expect(queueSkip).toEqual({
      isJackpot: true,
      isBigWin: true,
      // Current behavior: the medium flag only depends on the amount
      isMediumWin: false,
      intensity: 'jackpot',
    });
    expect(getWinTier({ rewardType: RewardType.ETERNAL_TICKET, rewardAmount: 0 }).intensity).toBe(
      'jackpot'
    );
  });

  it('treats a null reward type as a regular win based on amount', () => {
    expect(getWinTier({ rewardType: null, rewardAmount: 49 }).intensity).toBe('medium');
  });
});

describe('getReelStopTime', () => {
  it('stops the reels at 1s, 2.2s and 3.4s', () => {
    expect(getReelStopTime(0)).toBe(1000);
    expect(getReelStopTime(1)).toBe(2200);
    expect(getReelStopTime(2)).toBe(3400);
  });
});

describe('pickRandomSymbol', () => {
  it('maps the random value to the symbol list in declaration order', () => {
    expect(pickRandomSymbol(() => 0)).toBe(SymbolType.CHERRY);
    expect(pickRandomSymbol(() => 0.5)).toBe(SymbolType.PLUM);
    expect(pickRandomSymbol(() => 0.999999)).toBe(SymbolType.SEVEN);
  });

  it('uses Math.random by default', () => {
    const spy = jest.spyOn(Math, 'random').mockReturnValue(0.2);
    try {
      expect(pickRandomSymbol()).toBe(SymbolType.LEMON);
      expect(spy).toHaveBeenCalledTimes(1);
    } finally {
      spy.mockRestore();
    }
  });
});
