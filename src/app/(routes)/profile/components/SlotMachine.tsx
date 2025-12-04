'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, Coins, Gift, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useSlotMachine } from '../hooks/useSlotMachine';
import { SymbolType } from '@/types/slot-machine';
import ReactDOM from 'react-dom';

interface SlotMachineProps {
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

const SYMBOL_COLORS: Record<SymbolType, string> = {
  [SymbolType.CHERRY]: 'from-red-500 to-pink-500',
  [SymbolType.LEMON]: 'from-yellow-400 to-yellow-600',
  [SymbolType.ORANGE]: 'from-orange-500 to-orange-600',
  [SymbolType.PLUM]: 'from-purple-500 to-indigo-500',
  [SymbolType.BELL]: 'from-yellow-300 to-yellow-500',
  [SymbolType.STAR]: 'from-yellow-300 to-yellow-400',
  [SymbolType.SEVEN]: 'from-purple-600 to-pink-600',
};

interface ReelProps {
  symbol: SymbolType | null;
  isSpinning: boolean;
  delay?: number;
}

function Reel({ symbol, isSpinning, delay = 0 }: ReelProps) {
  const [displaySymbol, setDisplaySymbol] = useState<SymbolType | null>(symbol);
  const [spinKey, setSpinKey] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isSpinning) {
      // Réinitialiser le key pour forcer la relance de l'animation
      setSpinKey((prev) => prev + 1);
      setIsAnimating(true);
      const interval = setInterval(() => {
        const randomSymbol = Object.keys(SYMBOL_EMOJIS)[
          Math.floor(Math.random() * Object.keys(SYMBOL_EMOJIS).length)
        ] as SymbolType;
        setDisplaySymbol(randomSymbol);
      }, 100);

      // Arrêter l'animation après un délai minimum (pour l'effet visuel)
      const stopTimer = setTimeout(
        () => {
          setIsAnimating(false);
          if (symbol) {
            setDisplaySymbol(symbol);
          }
        },
        2000 + delay * 100
      ); // 2 secondes + délai par rouleau

      return () => {
        clearInterval(interval);
        clearTimeout(stopTimer);
      };
    } else if (symbol) {
      setDisplaySymbol(symbol);
      setIsAnimating(false);
    }
  }, [isSpinning, symbol, delay]);

  return (
    <motion.div
      key={spinKey}
      className={`relative w-24 h-24 sm:w-32 sm:h-32 rounded-xl overflow-hidden border-2 border-purple-500/50 bg-gradient-to-br ${
        displaySymbol ? SYMBOL_COLORS[displaySymbol] : 'from-gray-700 to-gray-900'
      } shadow-lg flex items-center justify-center`}
      animate={isAnimating ? { scale: [1, 1.1, 1] } : {}}
      transition={isAnimating ? { duration: 0.3, repeat: Infinity, delay } : {}}
    >
      <span className="text-4xl sm:text-5xl">
        {displaySymbol ? SYMBOL_EMOJIS[displaySymbol] : '🎰'}
      </span>
      {isAnimating && (
        <motion.div
          key={`shimmer-${spinKey}`}
          className="absolute inset-0 bg-gradient-to-b from-transparent via-white/20 to-transparent"
          initial={{ y: '-100%' }}
          animate={{ y: ['-100%', '100%'] }}
          transition={{ duration: 0.5, repeat: Infinity, ease: 'linear', delay }}
        />
      )}
    </motion.div>
  );
}

export function SlotMachine({ isOpen, onClose }: SlotMachineProps) {
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

  const [showWinAnimation, setShowWinAnimation] = useState(false);

  useEffect(() => {
    if (isOpen && !status) {
      refreshStatus();
    }
  }, [isOpen, status, refreshStatus]);

  useEffect(() => {
    if (lastResult?.isWin && !isSpinning) {
      // Attendre que l'animation de spin soit terminée avant d'afficher l'animation de victoire
      const timer = setTimeout(() => {
        setShowWinAnimation(true);
        const hideTimer = setTimeout(() => {
          setShowWinAnimation(false);
        }, 3000);
        return () => clearTimeout(hideTimer);
      }, 2500); // Attendre que l'animation de spin se termine (2s + marge)
      return () => clearTimeout(timer);
    } else if (!lastResult?.isWin) {
      setShowWinAnimation(false);
    }
  }, [lastResult, isSpinning]);

  const handleSpin = async () => {
    if (isSpinning || !status || status.tokens < 1) return;
    await spin();
  };

  const handleSpinMultiple = async (count: number) => {
    if (isSpinning || !status || status.tokens < count) return;
    await spinMultiple(count);
  };

  const handleClaimReward = async () => {
    await claimReward();
  };

  if (!isOpen) return null;

  const content = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="relative glass-modern rounded-3xl p-6 sm:p-8 lg:p-10 border border-purple-500/30 shadow-2xl bg-gradient-to-br from-[#1a0f2a] via-[#0c0117] to-[#1a0f2a] max-w-2xl w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Bouton de fermeture */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white bg-black/20 hover:bg-black/40 rounded-full transition-colors z-10"
              aria-label="Fermer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Titre */}
            <div className="text-center mb-6">
              <h2 className="text-3xl sm:text-4xl font-audiowide bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent mb-2">
                🎰 Machine à Sous 🎰
              </h2>
              <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
                <Coins className="w-4 h-4" />
                <span>{isLoading ? '...' : (status?.tokens ?? 0)} jetons disponibles</span>
              </div>
            </div>

            {/* Machine à sous */}
            <div className="relative mb-6">
              {/* Rouleaux */}
              <div className="flex gap-3 sm:gap-4 justify-center mb-6">
                <Reel symbol={lastResult?.symbols[0] ?? null} isSpinning={isSpinning} delay={0} />
                <Reel symbol={lastResult?.symbols[1] ?? null} isSpinning={isSpinning} delay={0.1} />
                <Reel symbol={lastResult?.symbols[2] ?? null} isSpinning={isSpinning} delay={0.2} />
              </div>

              {/* Message de résultat */}
              {lastResult && !isSpinning && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center"
                >
                  <p
                    className={`text-lg font-semibold ${lastResult.isWin ? 'text-green-400' : 'text-red-400'}`}
                  >
                    {lastResult.message}
                  </p>
                </motion.div>
              )}

              {/* Animation de victoire */}
              <AnimatePresence>
                {showWinAnimation && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0 }}
                    className="absolute inset-0 flex items-center justify-center pointer-events-none"
                  >
                    <motion.div
                      initial={{ scale: 0, rotate: 0 }}
                      animate={{
                        scale: [0, 1.5, 1.2, 1.5, 1],
                        rotate: [0, 360, 720],
                      }}
                      transition={{
                        duration: 2,
                        repeat: 0,
                        ease: 'easeInOut',
                      }}
                      className="text-8xl"
                    >
                      🎉
                    </motion.div>
                    {[...Array(20)].map((_, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{
                          opacity: [1, 0],
                          scale: [0, 1],
                          x: Math.cos((i * 360) / 20) * 200,
                          y: Math.sin((i * 360) / 20) * 200,
                        }}
                        transition={{
                          duration: 2,
                          delay: i * 0.1,
                        }}
                        className="absolute text-2xl"
                      >
                        ✨
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Boutons SPIN */}
            <div className="flex flex-col items-center mb-6 gap-3">
              <div className="flex flex-col sm:flex-row gap-2 w-full">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleSpin}
                  disabled={isSpinning || !status || status.tokens < 3}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 rounded-xl font-bold text-white text-lg shadow-lg shadow-purple-500/50 hover:shadow-purple-500/70 transition-all disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden"
                >
                  {isSpinning ? (
                    <span className="flex items-center justify-center gap-2">
                      <motion.span
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      >
                        ⚡
                      </motion.span>
                      En cours...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      SPIN (1)
                    </span>
                  )}
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                    animate={isSpinning ? { x: ['-100%', '100%'] } : {}}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  />
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleSpinMultiple(10)}
                  disabled={isSpinning || !status || status.tokens < 30}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 rounded-xl font-bold text-white text-lg shadow-lg shadow-blue-500/50 hover:shadow-blue-500/70 transition-all disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden"
                >
                  {isSpinning ? (
                    <span className="flex items-center justify-center gap-2">
                      <motion.span
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      >
                        ⚡
                      </motion.span>
                      En cours...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      10 SPINS
                    </span>
                  )}
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleSpinMultiple(100)}
                  disabled={isSpinning || !status || status.tokens < 300}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-orange-600 via-red-600 to-orange-600 rounded-xl font-bold text-white text-lg shadow-lg shadow-orange-500/50 hover:shadow-orange-500/70 transition-all disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden"
                >
                  {isSpinning ? (
                    <span className="flex items-center justify-center gap-2">
                      <motion.span
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      >
                        ⚡
                      </motion.span>
                      En cours...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      100 SPINS
                    </span>
                  )}
                </motion.button>
              </div>
              <div className="text-xs text-gray-400 flex items-center gap-1">
                <Coins className="w-3 h-3" />
                <span>3 jetons par spin</span>
              </div>
            </div>

            {/* Grille des gains */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-white mb-3 text-center">
                🎁 Grille des Gains
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  className="p-3 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 rounded-lg"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-2xl">🎉</span>
                    <span className="font-semibold text-yellow-300">Triple</span>
                  </div>
                  <div className="text-gray-300 text-xs">
                    <div>• 2% Queue Skip</div>
                    <div>• 3% Ticket Éternel</div>
                    <div>• 95% 15-35 jetons</div>
                  </div>
                </motion.div>
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  className="p-3 bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/30 rounded-lg"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-2xl">🎊</span>
                    <span className="font-semibold text-blue-300">Double</span>
                  </div>
                  <div className="text-gray-300 text-xs">
                    <div>50% rien</div>
                    <div>50% 1-5 jetons</div>
                  </div>
                </motion.div>
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  className="p-3 bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-lg sm:col-span-2"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-2xl">✨</span>
                    <span className="font-semibold text-green-300">Aucun match</span>
                  </div>
                  <div className="text-gray-300 text-xs">
                    <div>70% rien</div>
                    <div>30% 1-2 jetons</div>
                  </div>
                </motion.div>
              </div>
            </div>

            {/* Récompense en attente */}
            {pendingReward && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 p-4 bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-xl"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Gift className="w-5 h-5 text-green-400" />
                    <span className="text-white">
                      {pendingReward.rewardType === 'ETERNAL_TICKET'
                        ? `${pendingReward.rewardAmount} Ticket(s) Éternel(s)`
                        : `${pendingReward.rewardAmount} Queue Skip(s)`}
                    </span>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleClaimReward}
                    disabled={isLoading}
                    className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg text-white font-semibold hover:shadow-lg hover:shadow-green-500/30 transition-all disabled:opacity-50"
                  >
                    Réclamer
                  </motion.button>
                </div>
              </motion.div>
            )}

            {/* Jetons dépensés */}
            <div className="mb-4 p-4 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-xl">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <div className="text-xs text-gray-400 mb-1">Session</div>
                  <div className="text-2xl font-bold text-purple-300">{sessionSpent}</div>
                  <div className="text-xs text-gray-500">jetons dépensés</div>
                </div>
                <div>
                  <div className="text-xs text-gray-400 mb-1">Total</div>
                  <div className="text-2xl font-bold text-pink-300">{status?.totalSpins || 0}</div>
                  <div className="text-xs text-gray-500">jetons dépensés</div>
                </div>
              </div>
            </div>

            {/* Statistiques */}
            {status && (
              <div className="grid grid-cols-2 gap-4 text-center text-sm">
                <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                  <div className="text-gray-400">Total spins</div>
                  <div className="text-xl font-bold text-white">{status.totalSpins}</div>
                </div>
                <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                  <div className="text-gray-400">Victoires</div>
                  <div className="text-xl font-bold text-green-400">{status.totalWins}</div>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  if (typeof window === 'undefined') return null;
  return ReactDOM.createPortal(content, document.body);
}
