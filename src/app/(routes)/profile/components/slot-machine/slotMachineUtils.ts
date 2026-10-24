import { SymbolType } from '@/types/slot-machine';
import type { SpinResult } from '@/types/slot-machine';
import { SYMBOL_EMOJIS } from './constants';

export type WinIntensity = 'low' | 'medium' | 'high' | 'jackpot';

/** Near-miss: exactly 2 rare symbols among the 3 reels. */
export function isNearMiss(symbols: SymbolType[]): boolean {
  const rareSymbols = [SymbolType.SEVEN, SymbolType.STAR, SymbolType.BELL];
  const rareCount = symbols.filter((s) => rareSymbols.includes(s)).length;
  return rareCount === 2;
}

/** Win tier used for the visual intensity of a winning spin. */
export function getWinTier(result: Pick<SpinResult, 'rewardType' | 'rewardAmount'>): {
  isJackpot: boolean;
  isBigWin: boolean;
  isMediumWin: boolean;
  intensity: WinIntensity;
} {
  const isJackpot = result.rewardType === 'QUEUE_SKIP' || result.rewardType === 'ETERNAL_TICKET';
  const isBigWin = result.rewardAmount >= 50 || isJackpot;
  const isMediumWin = result.rewardAmount >= 15;

  const intensity: WinIntensity = isJackpot
    ? 'jackpot'
    : isBigWin
      ? 'high'
      : isMediumWin
        ? 'medium'
        : 'low';

  return { isJackpot, isBigWin, isMediumWin, intensity };
}

/** Time (ms) at which the reel at `delay` stops: 1s, 2.2s, 3.4s. */
export function getReelStopTime(delay: number): number {
  return 1000 + delay * 1200;
}

/** Picks a random symbol key. `random` is injectable for tests. */
export function pickRandomSymbol(random: () => number = Math.random): SymbolType {
  const keys = Object.keys(SYMBOL_EMOJIS);
  return keys[Math.floor(random() * keys.length)] as SymbolType;
}
