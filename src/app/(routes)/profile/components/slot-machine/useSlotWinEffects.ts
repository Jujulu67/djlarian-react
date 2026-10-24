import { useEffect, useRef, useState } from 'react';
import { SymbolType } from '@/types/slot-machine';
import type { SpinResult } from '@/types/slot-machine';
import { getWinTier, isNearMiss } from './slotMachineUtils';

interface UseSlotWinEffectsParams {
  lastResult: SpinResult | null;
  isSpinning: boolean;
  playWinSound: () => void;
  playJackpotSound: () => void;
}

export function useSlotWinEffects({
  lastResult,
  isSpinning,
  playWinSound,
  playJackpotSound,
}: UseSlotWinEffectsParams) {
  const [showWinAnimation, setShowWinAnimation] = useState(false);
  // === VISUAL EFFECTS STATES ===
  const [winStreak, setWinStreak] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showCoinsRain, setShowCoinsRain] = useState(false);
  const [showMultiplier, setShowMultiplier] = useState(false);
  const [multiplierAmount, setMultiplierAmount] = useState(0);
  const [winIntensity, setWinIntensity] = useState<'low' | 'medium' | 'high' | 'jackpot'>('low');
  const [isHotStreak, setIsHotStreak] = useState(false);

  // === NEW EFFECTS STATES ===
  const [showNearMiss, setShowNearMiss] = useState(false);
  const [jackpotAmount, setJackpotAmount] = useState(1500); // Progressive jackpot
  const [showBonusGame, setShowBonusGame] = useState(false);
  const [showScreenFlash, setShowScreenFlash] = useState(false);
  const [showLuckyIntro, setShowLuckyIntro] = useState(false);
  const [wasHotStreak, setWasHotStreak] = useState(false); // To detect hot streak start

  const lastProcessedResult = useRef<string | null>(null);

  useEffect(() => {
    // Create a unique ID for this result to avoid processing twice
    const resultId = lastResult ? `${lastResult.message}-${lastResult.rewardAmount}` : null;

    if (
      lastResult &&
      !isSpinning &&
      lastResult.message &&
      resultId !== lastProcessedResult.current
    ) {
      lastProcessedResult.current = resultId;

      // Increment jackpot on every spin (1% of bet = 0.03)
      setJackpotAmount((prev) => prev + 0.03 * 100); // Simulate 1% going to jackpot

      if (lastResult.isWin) {
        // Screen flash on any win
        setShowScreenFlash(true);
        setTimeout(() => setShowScreenFlash(false), 300);

        // Update streak using functional update to avoid dependency
        setWinStreak((prev) => {
          const newStreak = prev + 1;
          const nowHotStreak = newStreak >= 2;

          // Detect hot streak START
          if (nowHotStreak && !wasHotStreak) {
            setShowLuckyIntro(true);
            setTimeout(() => setShowLuckyIntro(false), 1500);
          }
          setWasHotStreak(nowHotStreak);
          setIsHotStreak(nowHotStreak);
          return newStreak;
        });

        // Determine win intensity
        const { isJackpot, isBigWin, isMediumWin, intensity } = getWinTier(lastResult);
        setWinIntensity(intensity);

        // Show multiplier popup
        if (lastResult.rewardAmount > 0 && lastResult.rewardType === 'TOKENS') {
          setMultiplierAmount(lastResult.rewardAmount);
          setShowMultiplier(true);
          setTimeout(() => setShowMultiplier(false), 2000);
        }

        // Sound effects
        if (isBigWin || isJackpot) {
          playJackpotSound();
        } else {
          playWinSound();
        }

        // Trigger BONUS GAME on triple cherry (rare special event)
        if (
          lastResult.symbols &&
          lastResult.symbols[0] === SymbolType.CHERRY &&
          lastResult.symbols[1] === SymbolType.CHERRY &&
          lastResult.symbols[2] === SymbolType.CHERRY
        ) {
          setTimeout(() => setShowBonusGame(true), 1000);
        }

        // Visual effects based on intensity
        if (isJackpot) {
          setShowConfetti(true);
          setShowCoinsRain(true);
          setShowWinAnimation(true);
          setTimeout(() => {
            setShowConfetti(false);
            setShowCoinsRain(false);
            setShowWinAnimation(false);
          }, 4000);
        } else if (isBigWin) {
          setShowConfetti(true);
          setShowWinAnimation(true);
          setTimeout(() => {
            setShowConfetti(false);
            setShowWinAnimation(false);
          }, 3000);
        } else if (isMediumWin) {
          setShowCoinsRain(true);
          setTimeout(() => setShowCoinsRain(false), 2000);
        }
      } else {
        // Loss - check for near-miss
        if (lastResult.symbols && isNearMiss(lastResult.symbols)) {
          setShowNearMiss(true);
          setTimeout(() => setShowNearMiss(false), 600);
        }

        // Reset streak
        setWinStreak(0);
        setIsHotStreak(false);
        setWasHotStreak(false);
        setWinIntensity('low');
      }
    }
  }, [lastResult, isSpinning, playWinSound, playJackpotSound]);

  return {
    showWinAnimation,
    winStreak,
    showConfetti,
    showCoinsRain,
    showMultiplier,
    multiplierAmount,
    winIntensity,
    isHotStreak,
    showNearMiss,
    jackpotAmount,
    showBonusGame,
    showScreenFlash,
    showLuckyIntro,
    setShowBonusGame,
    setShowConfetti,
    setShowMultiplier,
    setMultiplierAmount,
  };
}
