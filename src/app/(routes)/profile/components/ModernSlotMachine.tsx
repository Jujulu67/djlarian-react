'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, Coins, Gift, Sparkles, Zap, Info, Flame, Trophy } from 'lucide-react';
import { useEffect, useState, useRef } from 'react';
import { useSlotMachine } from '../hooks/useSlotMachine';
import { useSlotMachineSounds } from '../hooks/useSlotMachineSounds';
import { SymbolType } from '@/types/slot-machine';
import ReactDOM from 'react-dom';
import Image from 'next/image';
import {
  ConfettiExplosion,
  StreakIndicator,
  MultiplierPopup,
  CoinsRain,
  GlowingBorder,
  HotStreakBackground,
  NearMissShake,
  JackpotCounter,
  LuckySpinIntro,
  ScreenFlash,
  BonusGame,
} from './SlotMachineEffects';

interface ModernSlotMachineProps {
  isOpen: boolean;
  onClose: () => void;
}

const SYMBOL_EMOJIS: Record<SymbolType, string> = {
  [SymbolType.CHERRY]: '🍒',
  [SymbolType.LEMON]: '🍋',
  [SymbolType.ORANGE]: '🍊',
  [SymbolType.PLUM]: '🫐',
  [SymbolType.BELL]: '🔔',
  [SymbolType.STAR]: '⭐',
  [SymbolType.SEVEN]: '7️⃣',
};

// Couleurs néon pour le mode moderne
const SYMBOL_GLOWS: Record<SymbolType, string> = {
  [SymbolType.CHERRY]: 'shadow-[0_0_20px_rgba(239,68,68,0.6)]',
  [SymbolType.LEMON]: 'shadow-[0_0_20px_rgba(234,179,8,0.6)]',
  [SymbolType.ORANGE]: 'shadow-[0_0_20px_rgba(249,115,22,0.6)]',
  [SymbolType.PLUM]: 'shadow-[0_0_20px_rgba(168,85,247,0.6)]',
  [SymbolType.BELL]: 'shadow-[0_0_20px_rgba(250,204,21,0.6)]',
  [SymbolType.STAR]: 'shadow-[0_0_20px_rgba(253,224,71,0.6)]',
  [SymbolType.SEVEN]: 'shadow-[0_0_20px_rgba(236,72,153,0.6)]',
};

interface ReelProps {
  symbol: SymbolType | null;
  isSpinning: boolean;
  delay?: number;
  isLastReel?: boolean; // For suspense slowdown
  onStop?: () => void;
  isWinning?: boolean; // For glowing winning symbols
}

function Reel({
  symbol,
  isSpinning,
  delay = 0,
  isLastReel = false,
  onStop,
  isWinning = false,
}: ReelProps) {
  const [displaySymbol, setDisplaySymbol] = useState<SymbolType | null>(symbol);
  const [spinKey, setSpinKey] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isSlowingDown, setIsSlowingDown] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const finalSymbolRef = useRef<SymbolType | null>(symbol);

  // Update the final symbol ref when it changes (but don't trigger effect)
  useEffect(() => {
    finalSymbolRef.current = symbol;
  }, [symbol]);

  // Main spinning effect - only depends on isSpinning!
  useEffect(() => {
    if (isSpinning) {
      setSpinKey((prev) => prev + 1);
      setIsAnimating(true);
      setIsSlowingDown(false);

      // Start fast spinning
      intervalRef.current = setInterval(() => {
        const randomSymbol = Object.keys(SYMBOL_EMOJIS)[
          Math.floor(Math.random() * Object.keys(SYMBOL_EMOJIS).length)
        ] as SymbolType;
        setDisplaySymbol(randomSymbol);
      }, 80);

      // Calculate stop time: 1s, 2.2s, 3.4s
      const baseTime = 1000 + delay * 1200;

      // For last reel: start slowing down before stop
      let slowdownTimer: NodeJS.Timeout | undefined;
      if (isLastReel) {
        const slowdownAt = baseTime - 1000;
        slowdownTimer = setTimeout(() => {
          setIsSlowingDown(true);
          if (intervalRef.current) clearInterval(intervalRef.current);
          // Slow spinning
          intervalRef.current = setInterval(() => {
            const randomSymbol = Object.keys(SYMBOL_EMOJIS)[
              Math.floor(Math.random() * Object.keys(SYMBOL_EMOJIS).length)
            ] as SymbolType;
            setDisplaySymbol(randomSymbol);
          }, 250);
        }, slowdownAt);
      }

      const stopTimer = setTimeout(() => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        setIsAnimating(false);
        setIsSlowingDown(false);
        if (finalSymbolRef.current) {
          setDisplaySymbol(finalSymbolRef.current);
          if (onStop) onStop();
        }
      }, baseTime);

      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        clearTimeout(stopTimer);
        if (slowdownTimer) clearTimeout(slowdownTimer);
      };
    }
  }, [isSpinning, delay, isLastReel, onStop]);

  // When not spinning, show the current symbol
  useEffect(() => {
    if (!isSpinning && symbol) {
      setDisplaySymbol(symbol);
      setIsAnimating(false);
    }
  }, [isSpinning, symbol]);

  return (
    <div className="relative w-28 h-36 sm:w-36 sm:h-48 mx-1">
      {/* Cadre du rouleau */}
      <div className="absolute -inset-1 z-20 rounded-xl bg-gradient-to-b from-purple-500 via-pink-500 to-purple-600 p-[2px] shadow-[0_0_15px_rgba(168,85,247,0.5)]">
        <div className="w-full h-full bg-black/80 rounded-[10px] overflow-hidden relative">
          {/* Reflet vitré */}
          <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none z-30" />

          {/* Ombres internes pour la profondeur */}
          <div className="absolute inset-0 shadow-[inset_0_0_20px_rgba(0,0,0,0.8)] z-20 pointer-events-none" />

          {/* Contenu du rouleau */}
          <motion.div
            key={spinKey}
            className="w-full h-full flex items-center justify-center"
            animate={
              isAnimating
                ? isSlowingDown
                  ? { y: [0, -30, 0] } // Bigger movement when slowing
                  : { y: [0, -20, 0] }
                : { scale: [1.15, 1], y: 0 }
            }
            transition={
              isAnimating
                ? isSlowingDown
                  ? { duration: 0.3, repeat: Infinity } // Slower animation
                  : { duration: 0.1, repeat: Infinity }
                : { duration: 0.2, type: 'spring' }
            }
          >
            <motion.div
              className={`
              relative z-10 text-5xl sm:text-6xl filter drop-shadow-lg transition-all duration-200
              ${displaySymbol ? SYMBOL_GLOWS[displaySymbol] : ''}
              ${!isAnimating && displaySymbol ? 'scale-110' : ''}
              ${isSlowingDown ? 'opacity-90' : ''}
            `}
              animate={
                isWinning
                  ? {
                      scale: [1.1, 1.3, 1.1],
                      filter: ['brightness(1)', 'brightness(1.5)', 'brightness(1)'],
                    }
                  : {}
              }
              transition={isWinning ? { duration: 0.5, repeat: Infinity } : {}}
            >
              {displaySymbol ? SYMBOL_EMOJIS[displaySymbol] : '🎰'}
            </motion.div>

            {/* Effet de flou de mouvement lors du spin */}
            {isAnimating && (
              <motion.div
                className="absolute inset-0 bg-gradient-to-b from-transparent via-white/10 to-transparent"
                animate={{ opacity: isSlowingDown ? [0.3, 0.5, 0.3] : [0.5, 0.8, 0.5] }}
                transition={{ duration: isSlowingDown ? 0.4 : 0.2, repeat: Infinity }}
              />
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}

const SPIN_DURATION = 2000;

function PayoutRow({
  symbol,
  name,
  x3,
  x2,
  isRare,
}: {
  symbol: string;
  name: string;
  x3: number;
  x2: number;
  isRare?: boolean;
}) {
  return (
    <div
      className={`grid grid-cols-[1fr_1fr_1fr] gap-2 items-center py-1 ${isRare ? 'text-yellow-200' : 'text-slate-300'}`}
    >
      <div className="flex items-center gap-2">
        <span className="text-2xl">{symbol}</span>
      </div>
      <div className="text-center font-bold text-yellow-500">{x3}</div>
      <div className="text-right font-medium text-slate-400">{x2}</div>
    </div>
  );
}

export function ModernSlotMachine({ isOpen, onClose }: ModernSlotMachineProps) {
  const {
    status,
    isLoading,
    spin,
    spinMultiple,
    isSpinning,
    lastResult,
    batchResult,
    setBatchResult,
    pendingReward,
    claimReward,
    refreshStatus,
    sessionSpent,
  } = useSlotMachine();

  const [showPayoutTable, setShowPayoutTable] = useState(false);
  const [reels, setReels] = useState<SymbolType[]>([]);

  const { playSpinSound, stopSpinSound, playReelStopSound, playWinSound, playJackpotSound } =
    useSlotMachineSounds();
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

  // Effet pour le son de spin
  useEffect(() => {
    if (isSpinning) {
      playSpinSound();
    } else {
      stopSpinSound();
    }
  }, [isSpinning, playSpinSound, stopSpinSound]);

  useEffect(() => {
    if (isOpen && !status) {
      refreshStatus();
    }
  }, [isOpen, status, refreshStatus]);

  // === WIN EFFECTS & STREAK HANDLER ===
  const lastProcessedResult = useRef<string | null>(null);

  // Helper to detect near-miss (2 rare symbols)
  const isNearMiss = (symbols: SymbolType[]) => {
    const rareSymbols = [SymbolType.SEVEN, SymbolType.STAR, SymbolType.BELL];
    const rareCount = symbols.filter((s) => rareSymbols.includes(s)).length;
    return rareCount === 2;
  };

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
        const isJackpot =
          lastResult.rewardType === 'QUEUE_SKIP' || lastResult.rewardType === 'ETERNAL_TICKET';
        const isBigWin = lastResult.rewardAmount >= 50 || isJackpot;
        const isMediumWin = lastResult.rewardAmount >= 15;

        const intensity = isJackpot
          ? 'jackpot'
          : isBigWin
            ? 'high'
            : isMediumWin
              ? 'medium'
              : 'low';
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

  // === AUTO SPIN MODE ===
  const [isAutoSpinning, setIsAutoSpinning] = useState(false);
  const autoSpinRef = useRef(false);

  const handleSpin = async () => {
    if (isSpinning || !status || status.tokens < 3) return;
    await spin();
  };

  // Auto spin effect
  useEffect(() => {
    autoSpinRef.current = isAutoSpinning;
  }, [isAutoSpinning]);

  useEffect(() => {
    // When spin completes and auto mode is on, spin again
    if (!isSpinning && autoSpinRef.current && status && status.tokens >= 3) {
      const timer = setTimeout(() => {
        if (autoSpinRef.current) {
          spin();
        }
      }, 500); // Small delay between spins
      return () => clearTimeout(timer);
    }
  }, [isSpinning, status, spin]);

  const toggleAutoSpin = () => {
    if (isAutoSpinning) {
      setIsAutoSpinning(false);
    } else {
      setIsAutoSpinning(true);
      if (!isSpinning && status && status.tokens >= 3) {
        spin(); // Start first spin
      }
    }
  };

  // Stop auto spin if tokens run out
  useEffect(() => {
    if (isAutoSpinning && status && status.tokens < 3) {
      setIsAutoSpinning(false);
    }
  }, [status, isAutoSpinning]);

  // Stop auto spin when dialog closes
  useEffect(() => {
    if (!isOpen && isAutoSpinning) {
      setIsAutoSpinning(false);
      autoSpinRef.current = false;
    }
  }, [isOpen, isAutoSpinning]);

  if (!isOpen) return null;

  const content = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/90 backdrop-blur-md"
        >
          {/* Background Image */}
          <div className="absolute inset-0 z-0 opacity-40">
            <Image
              src="/images/slot-machine/bg.png"
              alt="Background"
              fill
              className="object-cover"
              priority
            />
          </div>

          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 50 }}
            className="relative z-10 w-full max-w-4xl mx-4 flex flex-col items-center"
          >
            {/* === VISUAL EFFECTS LAYER === */}
            <ConfettiExplosion isActive={showConfetti} intensity={winIntensity} />
            <CoinsRain isActive={showCoinsRain} count={winIntensity === 'jackpot' ? 50 : 25} />
            <MultiplierPopup amount={multiplierAmount} isVisible={showMultiplier} />
            <HotStreakBackground isActive={isHotStreak} />
            <NearMissShake isActive={showNearMiss} />
            <ScreenFlash isActive={showScreenFlash} />
            <LuckySpinIntro isActive={showLuckyIntro} />

            {/* Jackpot Counter */}
            <JackpotCounter amount={Math.floor(jackpotAmount)} isVisible={true} />

            {/* Bonus Game Overlay */}
            <AnimatePresence>
              {showBonusGame && (
                <BonusGame
                  isActive={showBonusGame}
                  onComplete={(multiplier) => {
                    setShowBonusGame(false);
                    // Award bonus tokens (simulated)
                    const bonusWin = Math.floor(15 * multiplier);
                    setMultiplierAmount(bonusWin);
                    setShowMultiplier(true);
                    setShowConfetti(true);
                    setTimeout(() => {
                      setShowMultiplier(false);
                      setShowConfetti(false);
                    }, 3000);
                  }}
                />
              )}
            </AnimatePresence>

            {/* Streak Indicator */}
            <StreakIndicator streak={winStreak} isOnFire={isHotStreak} />
            {/* Payout Table Modal */}
            {showPayoutTable && (
              <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                <div className="bg-gradient-to-b from-slate-800 to-slate-900 border border-yellow-500/30 rounded-2xl p-6 max-w-lg w-full shadow-2xl relative">
                  <button
                    onClick={() => setShowPayoutTable(false)}
                    className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full bg-slate-700 hover:bg-red-500 text-slate-300 hover:text-white transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>

                  <h3 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500 mb-6 text-center uppercase tracking-wider">
                    🎰 Tableau des Gains
                  </h3>

                  <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                    {/* JACKPOTS */}
                    <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 p-4 rounded-xl border border-yellow-500/30">
                      <div className="text-xs text-yellow-300 uppercase tracking-wider mb-3 font-bold">
                        JACKPOTS LÉGENDAIRES
                      </div>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-3">
                            <span className="text-3xl">7️⃣7️⃣7️⃣</span>
                            <span className="text-yellow-400 font-bold">QUEUE SKIP</span>
                          </div>
                          <span className="text-xs text-slate-400">0.00002%</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-3">
                            <span className="text-3xl">⭐⭐⭐</span>
                            <span className="text-purple-400 font-bold">TICKET ÉTERNEL</span>
                          </div>
                          <span className="text-xs text-slate-400">0.006%</span>
                        </div>
                      </div>
                    </div>

                    {/* TRIPLES */}
                    <div className="bg-slate-800/50 p-4 rounded-xl border border-purple-500/20">
                      <div className="text-xs text-purple-300 uppercase tracking-wider mb-3 font-bold">
                        TRIPLES (x3)
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center py-1">
                          <div className="flex items-center gap-2">
                            <span className="text-2xl">🔔</span>
                            <span className="text-slate-300">Cloche</span>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="text-yellow-400 font-bold">+200</span>
                            <span className="text-xs text-slate-500 w-16 text-right">0.06%</span>
                          </div>
                        </div>
                        <div className="flex justify-between items-center py-1">
                          <div className="flex items-center gap-2">
                            <span className="text-2xl">🫐</span>
                            <span className="text-slate-300">Prune</span>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="text-yellow-400 font-bold">+100</span>
                            <span className="text-xs text-slate-500 w-16 text-right">0.14%</span>
                          </div>
                        </div>
                        <div className="flex justify-between items-center py-1">
                          <div className="flex items-center gap-2">
                            <span className="text-2xl">🍊</span>
                            <span className="text-slate-300">Orange</span>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="text-yellow-400 font-bold">+50</span>
                            <span className="text-xs text-slate-500 w-16 text-right">0.28%</span>
                          </div>
                        </div>
                        <div className="flex justify-between items-center py-1">
                          <div className="flex items-center gap-2">
                            <span className="text-2xl">🍋</span>
                            <span className="text-slate-300">Citron</span>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="text-yellow-400 font-bold">+25</span>
                            <span className="text-xs text-slate-500 w-16 text-right">0.56%</span>
                          </div>
                        </div>
                        <div className="flex justify-between items-center py-1">
                          <div className="flex items-center gap-2">
                            <span className="text-2xl">🍒</span>
                            <span className="text-slate-300">Cerise</span>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="text-yellow-400 font-bold">+15</span>
                            <span className="text-xs text-slate-500 w-16 text-right">1.06%</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* DOUBLES */}
                    <div className="bg-slate-800/30 p-4 rounded-xl border border-slate-600/20">
                      <div className="text-xs text-slate-400 uppercase tracking-wider mb-3 font-bold">
                        DOUBLES (x2)
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="flex justify-between">
                          <span>7️⃣7️⃣</span>
                          <span className="text-green-400">+50</span>
                        </div>
                        <div className="flex justify-between">
                          <span>⭐⭐</span>
                          <span className="text-green-400">+30</span>
                        </div>
                        <div className="flex justify-between">
                          <span>🔔🔔</span>
                          <span className="text-green-400">+15</span>
                        </div>
                        <div className="flex justify-between">
                          <span>🫐🫐</span>
                          <span className="text-green-400">+8</span>
                        </div>
                        <div className="flex justify-between">
                          <span>🍊🍊</span>
                          <span className="text-blue-400">+3</span>
                        </div>
                        <div className="flex justify-between">
                          <span>🍋🍋</span>
                          <span className="text-slate-400">+2</span>
                        </div>
                        <div className="flex justify-between">
                          <span>🍒🍒</span>
                          <span className="text-slate-400">+1</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Footer Stats */}
                  <div className="mt-4 pt-4 border-t border-white/10 text-center text-xs text-slate-500">
                    <span>
                      Coût: <span className="text-white">3 jetons/spin</span>
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Batch Results Modal */}
            {batchResult && (
              <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                <div className="bg-gradient-to-b from-slate-800 to-slate-900 border border-purple-500/30 rounded-xl max-w-md w-full shadow-2xl relative flex flex-col max-h-[85vh]">
                  <div className="p-4 border-b border-white/10 flex justify-between items-center bg-slate-800/50 rounded-t-xl">
                    <h3 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
                      Résultats (10 spins)
                    </h3>
                    <button
                      onClick={() => setBatchResult(null)}
                      className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="p-4 bg-purple-500/10 border-b border-purple-500/20">
                    <div className="flex justify-between items-end mb-2">
                      <span className="text-sm text-slate-400">Total Gagné</span>
                      <span className="text-3xl font-bold text-yellow-500 drop-shadow-md">
                        {batchResult.summary.totalTokensWon} 🪙
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs bg-black/20 p-2 rounded-lg">
                      <div className="flex flex-col items-center">
                        <span className="text-slate-500">Coût</span>
                        <span className="font-mono">{batchResult.summary.totalSpins * 3}</span>
                      </div>
                      <div className="flex flex-col items-center border-l border-white/10 border-r">
                        <span className="text-slate-500">Win Rate</span>
                        <span className="font-mono text-blue-300">
                          {batchResult.summary.winRate}%
                        </span>
                      </div>
                      <div className="flex flex-col items-center">
                        <span className="text-slate-500">Net</span>
                        <span
                          className={`font-mono font-bold ${batchResult.summary.netProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}
                        >
                          {batchResult.summary.netProfit > 0 ? '+' : ''}
                          {batchResult.summary.netProfit}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="overflow-y-auto p-4 space-y-2 flex-grow custom-scrollbar">
                    {batchResult.results.map((res, idx) => (
                      <div
                        key={idx}
                        className={`flex justify-between items-center p-2 rounded-lg border ${
                          res.isWin
                            ? 'bg-purple-500/20 border-purple-500/30'
                            : 'bg-slate-800/50 border-white/5'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-slate-500 font-mono w-4">{idx + 1}</span>
                          <div className="text-2xl tracking-widest bg-black/30 px-2 rounded">
                            {res.symbols.join(' ')}
                          </div>
                        </div>
                        <div className="text-right">
                          {res.isWin ? (
                            <div className="flex flex-col items-end">
                              <span className="font-bold text-yellow-400 text-sm">
                                {res.rewardType === 'TOKENS'
                                  ? `+${res.rewardAmount}`
                                  : res.rewardType}
                              </span>
                              {/* Show bonus tokens if applicable (though backend includes it in total, nice to visualize) */}
                              {(res.rewardType === 'QUEUE_SKIP' ||
                                res.rewardType === 'ETERNAL_TICKET') && (
                                <span className="text-[10px] text-yellow-200/70">+Bonus 🪙</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-600 text-xs">-</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="p-4 border-t border-white/10 text-center">
                    <button
                      onClick={() => setBatchResult(null)}
                      className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 px-4 rounded-lg transition-colors"
                    >
                      Fermer
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Footer / Controls */}
            <div className="relative w-full text-center mb-8">
              <motion.h2
                className="text-5xl sm:text-7xl font-audiowide text-transparent bg-clip-text bg-gradient-to-b from-white to-purple-300 drop-shadow-[0_0_15px_rgba(168,85,247,0.8)]"
                animate={{
                  textShadow: [
                    '0 0 15px rgba(168,85,247,0.8)',
                    '0 0 25px rgba(236,72,153,0.8)',
                    '0 0 15px rgba(168,85,247,0.8)',
                  ],
                }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                NEON SLOTS
              </motion.h2>

              {/* Improved visibility Info Button */}
              <button
                onClick={() => setShowPayoutTable(true)}
                className="absolute top-1 left-0 p-2 text-white bg-slate-800/80 hover:bg-purple-600 rounded-full transition-all border border-white/20 hover:border-white/50 shadow-lg group"
                title="Table des gains"
              >
                <Info className="w-6 h-6 group-hover:scale-110 transition-transform" />
              </button>

              {/* Improved visibility Close Button */}
              <button
                onClick={onClose}
                className="absolute top-1 right-0 p-2 text-white bg-red-900/80 hover:bg-red-600 rounded-full transition-all border border-white/20 hover:border-white/50 shadow-lg group"
                title="Quitter"
              >
                <X className="w-6 h-6 group-hover:scale-110 transition-transform" />
              </button>
            </div>

            {/* Main Machine Area */}
            <div className="relative bg-black/40 p-8 rounded-3xl border border-purple-500/30 backdrop-blur-md shadow-[0_0_50px_rgba(168,85,247,0.2)]">
              {/* Glowing Border on Win */}
              <GlowingBorder
                isWinning={showWinAnimation || showConfetti}
                intensity={winIntensity}
              />

              {/* Tokens Display with Streak */}
              <div
                className={`
                absolute -top-6 left-1/2 -translate-x-1/2 px-6 py-2 rounded-full flex items-center gap-3 
                shadow-[0_0_20px_rgba(168,85,247,0.4)] transition-all duration-300
                ${
                  isHotStreak
                    ? 'bg-gradient-to-r from-orange-900/90 via-red-900/90 to-orange-900/90 border-2 border-orange-500'
                    : 'bg-black/80 border border-purple-500/50'
                }
              `}
              >
                {isHotStreak && <Flame className="w-5 h-5 text-orange-400 animate-pulse" />}
                <Coins className="w-5 h-5 text-yellow-400" />
                <span className="text-xl font-bold text-white font-mono">
                  {isLoading ? '...' : (status?.tokens ?? 0)}
                </span>
                {winStreak >= 2 && (
                  <span className="text-sm font-bold text-yellow-400 ml-2">{winStreak}🔥</span>
                )}
              </div>

              {/* Reels Container */}
              <div className="flex justify-center items-center gap-2 sm:gap-4 mb-8 mt-4 p-6 bg-black/30 rounded-2xl border-2 border-purple-500/20 shadow-inner">
                <Reel
                  symbol={lastResult?.symbols[0] ?? null}
                  isSpinning={isSpinning}
                  delay={0} // Stops at 1s
                  onStop={playReelStopSound}
                  isWinning={!isSpinning && lastResult?.isWin}
                />
                <Reel
                  symbol={lastResult?.symbols[1] ?? null}
                  isSpinning={isSpinning}
                  delay={1} // Stops at 2.2s
                  onStop={playReelStopSound}
                  isWinning={!isSpinning && lastResult?.isWin}
                />
                <Reel
                  symbol={lastResult?.symbols[2] ?? null}
                  isSpinning={isSpinning}
                  delay={2} // Stops at 3.4s with slowdown
                  isLastReel={true}
                  onStop={playReelStopSound}
                  isWinning={!isSpinning && lastResult?.isWin}
                />
              </div>

              {/* Controls */}
              <div className="flex flex-col items-center gap-4">
                {/* Streak Display */}
                {winStreak > 0 && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className={`px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2
                      ${
                        isHotStreak
                          ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white animate-pulse shadow-lg shadow-orange-500/50'
                          : 'bg-purple-600/50 text-purple-200'
                      }
                    `}
                  >
                    {isHotStreak && <span>🔥</span>}
                    <span>
                      {winStreak} WIN{winStreak > 1 ? 'S' : ''} D'AFFILÉE!
                    </span>
                    {isHotStreak && (
                      <span className="bg-yellow-400 text-black px-2 py-0.5 rounded text-xs font-black ml-1">
                        BONUS x1.5
                      </span>
                    )}
                    {isHotStreak && <span>🔥</span>}
                  </motion.div>
                )}

                {/* Message Area */}
                <div className="h-12 flex items-center justify-center">
                  {lastResult && !isSpinning && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.5, y: 20 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      className={`text-2xl font-bold flex items-center gap-2 ${
                        lastResult.isWin
                          ? lastResult.rewardAmount >= 20
                            ? 'text-yellow-400 drop-shadow-[0_0_15px_rgba(234,179,8,0.8)]'
                            : 'text-green-400 drop-shadow-[0_0_10px_rgba(74,222,128,0.5)]'
                          : 'text-red-400/80'
                      }`}
                    >
                      <span>{lastResult.message}</span>
                      {/* Show bonus indicator if hot streak was active */}
                      {lastResult.isWin &&
                        isHotStreak &&
                        lastResult.rewardType === 'TOKENS' &&
                        lastResult.rewardAmount > 0 && (
                          <motion.span
                            initial={{ scale: 0, rotate: -10 }}
                            animate={{ scale: 1, rotate: 0 }}
                            className="text-sm bg-gradient-to-r from-yellow-400 to-orange-500 text-black px-2 py-1 rounded-lg font-black"
                          >
                            +50% BONUS!
                          </motion.span>
                        )}
                    </motion.div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 w-full max-w-2xl">
                  {/* Single Spin */}
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={handleSpin}
                    disabled={isSpinning || isAutoSpinning || !status || status.tokens < 3}
                    className={`flex-1 py-3 rounded-xl font-audiowide text-white text-lg border-t disabled:opacity-50 disabled:cursor-not-allowed group relative overflow-hidden
                      ${
                        isHotStreak
                          ? 'bg-gradient-to-b from-orange-600 to-red-800 shadow-[0_0_30px_rgba(249,115,22,0.5)] border-orange-400'
                          : 'bg-gradient-to-b from-purple-600 to-purple-800 shadow-[0_0_20px_rgba(147,51,234,0.4)] border-purple-400'
                      }
                    `}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500" />
                    <span className="flex items-center justify-center gap-2">
                      {isHotStreak ? (
                        <Flame className="w-5 h-5" />
                      ) : (
                        <Zap className="w-5 h-5 fill-current" />
                      )}
                      SPIN
                    </span>
                    <span className="text-xs font-sans opacity-70 block mt-1">3 jetons</span>
                  </motion.button>

                  {/* x5 Turbo */}
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => spinMultiple(5)}
                    disabled={isSpinning || isAutoSpinning || !status || status.tokens < 15}
                    className="flex-1 py-3 bg-gradient-to-b from-blue-600 to-blue-800 rounded-xl font-audiowide text-white text-lg shadow-[0_0_20px_rgba(37,99,235,0.4)] border-t border-blue-400 disabled:opacity-50 disabled:cursor-not-allowed group relative overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500" />
                    <span className="flex items-center justify-center gap-2">
                      <Zap className="w-5 h-5" />
                      x5
                    </span>
                    <span className="text-xs font-sans opacity-70 block mt-1">15 jetons</span>
                  </motion.button>

                  {/* AUTO Mode Toggle */}
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={toggleAutoSpin}
                    disabled={!status || status.tokens < 3}
                    className={`flex-1 py-3 rounded-xl font-audiowide text-white text-lg border-t disabled:opacity-50 disabled:cursor-not-allowed group relative overflow-hidden
                      ${
                        isAutoSpinning
                          ? 'bg-gradient-to-b from-red-600 to-red-800 shadow-[0_0_30px_rgba(239,68,68,0.6)] border-red-400 animate-pulse'
                          : 'bg-gradient-to-b from-green-600 to-green-800 shadow-[0_0_20px_rgba(34,197,94,0.4)] border-green-400'
                      }
                    `}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500" />
                    <span className="flex items-center justify-center gap-2">
                      {isAutoSpinning ? (
                        <>
                          <X className="w-5 h-5" />
                          STOP
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-5 h-5" />
                          AUTO
                        </>
                      )}
                    </span>
                    <span className="text-xs font-sans opacity-70 block mt-1">
                      {isAutoSpinning ? 'Arrêter' : 'Boucle'}
                    </span>
                  </motion.button>
                </div>

                {/* Quick Stats */}
                <div className="flex gap-4 text-xs text-slate-400 mt-2">
                  <span>
                    Session: <span className="text-red-400">-{sessionSpent}</span>
                  </span>
                  {status && (
                    <span>
                      Total spins: <span className="text-purple-400">{status.totalSpins}</span>
                    </span>
                  )}
                  {status && (
                    <span>
                      Wins: <span className="text-green-400">{status.totalWins}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Reward Popup */}
            <AnimatePresence>
              {pendingReward && (
                <motion.div
                  initial={{ opacity: 0, y: 50 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 50 }}
                  className="absolute bottom-[-80px] left-0 right-0 bg-gradient-to-r from-green-900/90 to-emerald-900/90 p-4 rounded-xl border border-green-500/50 backdrop-blur-md shadow-[0_0_30px_rgba(16,185,129,0.3)] flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-500/20 rounded-lg">
                      <Gift className="w-6 h-6 text-green-400" />
                    </div>
                    <div>
                      <div className="font-bold text-green-300">Récompense gagnée !</div>
                      <div className="text-white text-sm">
                        {pendingReward.rewardType === 'ETERNAL_TICKET'
                          ? `${pendingReward.rewardAmount} Ticket(s) Éternel(s)`
                          : `${pendingReward.rewardAmount} Queue Skip(s)`}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => claimReward()}
                    className="px-6 py-2 bg-green-500 hover:bg-green-400 text-black font-bold rounded-lg transition-colors shadow-lg shadow-green-500/20"
                  >
                    RÉCLAMER
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Win Animation Overlay */}
            <AnimatePresence>
              {showWinAnimation && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 pointer-events-none flex items-center justify-center z-50"
                >
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: [0, 1.2, 1], rotate: 0 }}
                    exit={{ scale: 0, rotate: 180 }}
                    transition={{ duration: 0.5, ease: 'backOut' }}
                    className="text-8xl sm:text-9xl filter drop-shadow-[0_0_50px_rgba(234,179,8,0.8)]"
                  >
                    BIG WIN!
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  if (typeof window === 'undefined') return null;
  return ReactDOM.createPortal(content, document.body);
}
