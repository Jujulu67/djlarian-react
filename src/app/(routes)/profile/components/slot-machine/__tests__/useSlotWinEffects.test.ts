import { renderHook } from '@testing-library/react';
import { SymbolType } from '@/types/slot-machine';
import type { SpinResult } from '@/types/slot-machine';

import { useSlotWinEffects } from '../useSlotWinEffects';

const noop = () => {};

const winResult: SpinResult = {
  symbols: [SymbolType.CHERRY, SymbolType.LEMON, SymbolType.BELL],
  rewardType: 'TOKENS',
  rewardAmount: 5,
  isWin: true,
  message: 'Gagné',
};

describe('useSlotWinEffects', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('cancels its pending effect timers when unmounted', () => {
    const setSpy = jest.spyOn(global, 'setTimeout');
    const clearSpy = jest.spyOn(global, 'clearTimeout');

    const { unmount } = renderHook(() =>
      useSlotWinEffects({
        lastResult: winResult,
        isSpinning: false,
        playWinSound: noop,
        playJackpotSound: noop,
      })
    );

    // Un gain programme le flash écran (300 ms) et le multiplicateur (2000 ms)
    const effectTimerIds = setSpy.mock.calls
      .map(([, delay], i) => ({ delay, id: setSpy.mock.results[i].value }))
      .filter(({ delay }) => delay === 300 || delay === 2000)
      .map(({ id }) => id);
    expect(effectTimerIds.length).toBeGreaterThanOrEqual(2);

    unmount();

    effectTimerIds.forEach((id) => expect(clearSpy).toHaveBeenCalledWith(id));
  });
});
