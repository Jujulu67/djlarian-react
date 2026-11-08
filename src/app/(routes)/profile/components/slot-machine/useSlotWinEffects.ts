import { useCallback, useEffect, useRef, useState } from 'react';
import { SymbolType } from '@/types/slot-machine';
import type { SpinResult } from '@/types/slot-machine';
import { getWinTier, isNearMiss } from './slotMachineUtils';

interface UseSlotWinEffectsParams {
  lastResult: SpinResult | null;
  isSpinning: boolean;
  playWinSound: () => void;
  playJackpotSound: () => void;
}

type BoolSetter = (value: boolean) => void;
type Schedule = (fn: () => void, ms: number) => unknown;

/** Trois cerises alignées : déclenche le bonus */
function isCherryTriple(symbols: SpinResult['symbols']) {
  return (
    symbols?.[0] === SymbolType.CHERRY &&
    symbols[1] === SymbolType.CHERRY &&
    symbols[2] === SymbolType.CHERRY
  );
}

interface WinStreakTargets {
  schedule: Schedule;
  setLuckyIntro: BoolSetter;
  setWasHotStreak: BoolSetter;
  setIsHotStreak: BoolSetter;
}

/** Avance la série de victoires ; l'intro « lucky » se déclenche au début d'une série chaude */
function advanceWinStreak(prev: number, wasHotStreak: boolean, targets: WinStreakTargets) {
  const newStreak = prev + 1;
  const nowHotStreak = newStreak >= 2;

  // Detect hot streak START
  if (nowHotStreak && !wasHotStreak) {
    targets.setLuckyIntro(true);
    targets.schedule(() => targets.setLuckyIntro(false), 1500);
  }
  targets.setWasHotStreak(nowHotStreak);
  targets.setIsHotStreak(nowHotStreak);
  return newStreak;
}

interface TierVisualTargets {
  schedule: Schedule;
  setConfetti: BoolSetter;
  setCoinsRain: BoolSetter;
  setWinAnimation: BoolSetter;
}

/** Effets visuels du palier de gain, coupés après un délai */
function triggerTierVisuals(
  { isJackpot, isBigWin, isMediumWin }: ReturnType<typeof getWinTier>,
  targets: TierVisualTargets
) {
  const { schedule, setConfetti, setCoinsRain, setWinAnimation } = targets;
  if (isJackpot) {
    setConfetti(true);
    setCoinsRain(true);
    setWinAnimation(true);
    schedule(() => {
      setConfetti(false);
      setCoinsRain(false);
      setWinAnimation(false);
    }, 4000);
  } else if (isBigWin) {
    setConfetti(true);
    setWinAnimation(true);
    schedule(() => {
      setConfetti(false);
      setWinAnimation(false);
    }, 3000);
  } else if (isMediumWin) {
    setCoinsRain(true);
    schedule(() => setCoinsRain(false), 2000);
  }
}

interface LossTargets {
  schedule: Schedule;
  setNearMiss: BoolSetter;
  setWinStreak: (value: number) => void;
  setIsHotStreak: BoolSetter;
  setWasHotStreak: BoolSetter;
  setWinIntensity: (value: 'low') => void;
}

/** Perte : near-miss éventuel, puis reset de la série */
function applyLoss(lastResult: SpinResult, targets: LossTargets) {
  // Loss - check for near-miss
  if (lastResult.symbols && isNearMiss(lastResult.symbols)) {
    targets.setNearMiss(true);
    targets.schedule(() => targets.setNearMiss(false), 600);
  }

  // Reset streak
  targets.setWinStreak(0);
  targets.setIsHotStreak(false);
  targets.setWasHotStreak(false);
  targets.setWinIntensity('low');
}

/** Multiplicateur affiché pour un gain en jetons */
function triggerMultiplier(
  lastResult: SpinResult,
  targets: { schedule: Schedule; setAmount: (value: number) => void; setShow: BoolSetter }
) {
  if (lastResult.rewardAmount > 0 && lastResult.rewardType === 'TOKENS') {
    targets.setAmount(lastResult.rewardAmount);
    targets.setShow(true);
    targets.schedule(() => targets.setShow(false), 2000);
  }
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

  // Timers des effets : suivis pour être annulés au démontage du composant
  const effectTimersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  const scheduleEffectTimeout = useCallback((fn: () => void, ms: number) => {
    const id = setTimeout(() => {
      effectTimersRef.current.delete(id);
      fn();
    }, ms);
    effectTimersRef.current.add(id);
    return id;
  }, []);
  useEffect(() => {
    const timers = effectTimersRef.current;
    return () => {
      timers.forEach((id) => clearTimeout(id));
      timers.clear();
    };
  }, []);

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
        scheduleEffectTimeout(() => setShowScreenFlash(false), 300);

        // Update streak using functional update to avoid dependency
        setWinStreak((prev) =>
          advanceWinStreak(prev, wasHotStreak, {
            schedule: scheduleEffectTimeout,
            setLuckyIntro: setShowLuckyIntro,
            setWasHotStreak,
            setIsHotStreak,
          })
        );

        // Determine win intensity
        const tier = getWinTier(lastResult);
        setWinIntensity(tier.intensity);

        // Show multiplier popup
        triggerMultiplier(lastResult, {
          schedule: scheduleEffectTimeout,
          setAmount: setMultiplierAmount,
          setShow: setShowMultiplier,
        });

        // Sound effects
        if (tier.isBigWin || tier.isJackpot) {
          playJackpotSound();
        } else {
          playWinSound();
        }

        // Trigger BONUS GAME on triple cherry (rare special event)
        if (isCherryTriple(lastResult.symbols)) {
          scheduleEffectTimeout(() => setShowBonusGame(true), 1000);
        }

        // Visual effects based on intensity
        triggerTierVisuals(tier, {
          schedule: scheduleEffectTimeout,
          setConfetti: setShowConfetti,
          setCoinsRain: setShowCoinsRain,
          setWinAnimation: setShowWinAnimation,
        });
      } else {
        applyLoss(lastResult, {
          schedule: scheduleEffectTimeout,
          setNearMiss: setShowNearMiss,
          setWinStreak,
          setIsHotStreak,
          setWasHotStreak,
          setWinIntensity,
        });
      }
    }
  }, [lastResult, isSpinning, playWinSound, playJackpotSound, scheduleEffectTimeout, wasHotStreak]);

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
    scheduleEffectTimeout,
  };
}
