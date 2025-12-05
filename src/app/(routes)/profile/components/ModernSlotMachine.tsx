'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, Coins, Gift, Sparkles, Zap } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useSlotMachine } from '../hooks/useSlotMachine';
import { useSlotMachineSounds } from '../hooks/useSlotMachineSounds';
import { SymbolType } from '@/types/slot-machine';
import ReactDOM from 'react-dom';
import Image from 'next/image';

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
  onStop?: () => void;
}

function Reel({ symbol, isSpinning, delay = 0, onStop }: ReelProps) {
  const [displaySymbol, setDisplaySymbol] = useState<SymbolType | null>(symbol);
  const [spinKey, setSpinKey] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isSpinning) {
      setSpinKey((prev) => prev + 1);
      setIsAnimating(true);
      const interval = setInterval(() => {
        const randomSymbol = Object.keys(SYMBOL_EMOJIS)[
          Math.floor(Math.random() * Object.keys(SYMBOL_EMOJIS).length)
        ] as SymbolType;
        setDisplaySymbol(randomSymbol);
      }, 80); // Plus rapide pour le mode moderne

      const stopTimer = setTimeout(
        () => {
          setIsAnimating(false);
          if (symbol) {
            setDisplaySymbol(symbol);
            if (onStop) onStop();
          }
        },
        2000 + delay * 150
      );

      return () => {
        clearInterval(interval);
        clearTimeout(stopTimer);
      };
    } else if (symbol) {
      setDisplaySymbol(symbol);
      setIsAnimating(false);
    }
  }, [isSpinning, symbol, delay, onStop]);

  return (
    <div className="relative w-28 h-36 sm:w-36 sm:h-48 mx-1">
      {/* Cadre du rouleau (CSS pur pour éviter les problèmes d'image) */}
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
            animate={isAnimating ? { y: [0, -20, 0] } : {}}
            transition={isAnimating ? { duration: 0.1, repeat: Infinity } : {}}
          >
            <div
              className={`
              relative z-10 text-5xl sm:text-6xl filter drop-shadow-lg
              ${displaySymbol ? SYMBOL_GLOWS[displaySymbol] : ''}
            `}
            >
              {displaySymbol ? SYMBOL_EMOJIS[displaySymbol] : '🎰'}
            </div>

            {/* Effet de flou de mouvement lors du spin */}
            {isAnimating && (
              <motion.div
                className="absolute inset-0 bg-gradient-to-b from-transparent via-white/10 to-transparent"
                animate={{ opacity: [0.5, 0.8, 0.5] }}
                transition={{ duration: 0.2, repeat: Infinity }}
              />
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}

export function ModernSlotMachine({ isOpen, onClose }: ModernSlotMachineProps) {
  const {
    status,
    isLoading,
    isSpinning,
    lastResult,
    pendingReward,
    sessionSpent,
    refreshStatus,
    spin,
    spinMultiple,
    claimReward,
  } = useSlotMachine();

  const { playSpinSound, stopSpinSound, playReelStopSound, playWinSound, playJackpotSound } =
    useSlotMachineSounds();
  const [showWinAnimation, setShowWinAnimation] = useState(false);

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

  useEffect(() => {
    if (lastResult?.isWin && !isSpinning) {
      const timer = setTimeout(() => {
        if (lastResult.message.includes('JACKPOT') || lastResult.message.includes('Triple')) {
          playJackpotSound();
        } else {
          playWinSound();
        }
        setShowWinAnimation(true);
        const hideTimer = setTimeout(() => {
          setShowWinAnimation(false);
        }, 4000);
        return () => clearTimeout(hideTimer);
      }, 2500);
      return () => clearTimeout(timer);
    } else if (!lastResult?.isWin) {
      setShowWinAnimation(false);
    }
  }, [lastResult, isSpinning, playWinSound, playJackpotSound]);

  const handleSpin = async () => {
    if (isSpinning || !status || status.tokens < 1) return;
    await spin();
  };

  const handleSpinMultiple = async (count: number) => {
    if (isSpinning || !status || status.tokens < count) return;
    await spinMultiple(count);
  };

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
            {/* Header */}
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
              <button
                onClick={onClose}
                className="absolute top-0 right-0 p-3 text-white/50 hover:text-white bg-black/30 hover:bg-black/50 rounded-full transition-all border border-white/10 hover:border-white/30"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Main Machine Area */}
            <div className="relative bg-black/40 p-8 rounded-3xl border border-purple-500/30 backdrop-blur-md shadow-[0_0_50px_rgba(168,85,247,0.2)]">
              {/* Tokens Display */}
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-black/80 px-6 py-2 rounded-full border border-purple-500/50 flex items-center gap-3 shadow-[0_0_20px_rgba(168,85,247,0.4)]">
                <Coins className="w-5 h-5 text-yellow-400" />
                <span className="text-xl font-bold text-white font-mono">
                  {isLoading ? '...' : (status?.tokens ?? 0)}
                </span>
              </div>

              {/* Reels Container */}
              <div className="flex justify-center items-center gap-2 sm:gap-4 mb-8 mt-4 p-6 bg-black/30 rounded-2xl border-2 border-purple-500/20 shadow-inner">
                <Reel
                  symbol={lastResult?.symbols[0] ?? null}
                  isSpinning={isSpinning}
                  delay={0}
                  onStop={playReelStopSound}
                />
                <Reel
                  symbol={lastResult?.symbols[1] ?? null}
                  isSpinning={isSpinning}
                  delay={0.1}
                  onStop={playReelStopSound}
                />
                <Reel
                  symbol={lastResult?.symbols[2] ?? null}
                  isSpinning={isSpinning}
                  delay={0.2}
                  onStop={playReelStopSound}
                />
              </div>

              {/* Controls */}
              <div className="flex flex-col items-center gap-6">
                {/* Message Area */}
                <div className="h-8 flex items-center justify-center">
                  {lastResult && !isSpinning && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className={`text-xl font-bold ${lastResult.isWin ? 'text-green-400 drop-shadow-[0_0_10px_rgba(74,222,128,0.5)]' : 'text-red-400'}`}
                    >
                      {lastResult.message}
                    </motion.div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-4 w-full max-w-lg">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleSpin}
                    disabled={isSpinning || !status || status.tokens < 3}
                    className="flex-1 py-4 bg-gradient-to-b from-purple-600 to-purple-800 rounded-xl font-audiowide text-white text-xl shadow-[0_0_20px_rgba(147,51,234,0.4)] border-t border-purple-400 disabled:opacity-50 disabled:cursor-not-allowed group relative overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500" />
                    <span className="flex items-center justify-center gap-2">
                      <Zap className="w-5 h-5 fill-current" />
                      SPIN
                    </span>
                    <span className="text-xs font-sans opacity-70 block mt-1">3 jetons</span>
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleSpinMultiple(10)}
                    disabled={isSpinning || !status || status.tokens < 30}
                    className="flex-1 py-4 bg-gradient-to-b from-blue-600 to-blue-800 rounded-xl font-audiowide text-white text-xl shadow-[0_0_20px_rgba(37,99,235,0.4)] border-t border-blue-400 disabled:opacity-50 disabled:cursor-not-allowed group relative overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500" />
                    <span className="flex items-center justify-center gap-2">
                      <Sparkles className="w-5 h-5" />
                      AUTO x10
                    </span>
                    <span className="text-xs font-sans opacity-70 block mt-1">30 jetons</span>
                  </motion.button>
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
                    transition={{ duration: 0.5, type: 'spring' }}
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
