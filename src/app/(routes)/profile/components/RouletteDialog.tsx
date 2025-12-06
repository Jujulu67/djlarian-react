'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, RotateCw, Coins, Trophy, Sparkles } from 'lucide-react';
import { useState, useCallback } from 'react';
import ReactDOM from 'react-dom';
import Image from 'next/image';
import { useMiniGame, GameResult } from '../hooks/useMiniGame';
import { CelebrationOverlay, RouletteBall, ROULETTE_SECTIONS } from './MiniGameEffects';
import { ConfettiExplosion, CoinsRain } from './SlotMachineEffects';

interface RouletteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onTokenUpdate?: () => Promise<void>;
}

export function RouletteDialog({ isOpen, onClose, onTokenUpdate }: RouletteDialogProps) {
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [gameResult, setGameResult] = useState<GameResult | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [phase, setPhase] = useState<'idle' | 'spinning' | 'slowing' | 'result'>('idle');

  const { play, isLoading } = useMiniGame(onTokenUpdate);

  const handleBallStop = useCallback(() => {
    // Ball has stopped, show result
    setPhase('result');
    setIsSpinning(false);

    if (gameResult?.isWin) {
      setShowCelebration(true);
      setTimeout(() => setShowCelebration(false), 3000);
    }
  }, [gameResult]);

  const handleSpin = async () => {
    if (isSpinning || isLoading) return;

    setIsSpinning(true);
    setPhase('spinning');
    setGameResult(null);
    setShowCelebration(false);

    // Call API first
    const result = await play('roulette');

    if (result) {
      setGameResult(result);
    }

    // Calculate visual spin
    // More dramatic spin: 5-8 full rotations + random offset
    const spins = 6 + Math.random() * 3;
    const extraDegrees = Math.random() * 360;
    const newRotation = rotation + spins * 360 + extraDegrees;
    setRotation(newRotation);

    // After wheel animation, transition to slowing phase
    setTimeout(() => {
      setPhase('slowing');
    }, 2000);

    // Ball animation handles the rest via handleBallStop callback
    // Fallback timeout in case ball doesn't trigger
    setTimeout(() => {
      if (phase !== 'result') {
        handleBallStop();
      }
    }, 4500);
  };

  const handlePlayAgain = () => {
    setGameResult(null);
    setPhase('idle');
  };

  if (!isOpen) return null;

  const content = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/90 backdrop-blur-md overflow-hidden"
        >
          {/* Effects */}
          <ConfettiExplosion
            isActive={showCelebration}
            intensity={gameResult?.rewardType === 'QUEUE_SKIP' ? 'jackpot' : 'high'}
          />
          <CoinsRain isActive={showCelebration && gameResult?.rewardType === 'TOKENS'} count={30} />

          <div className="relative w-full max-w-4xl p-8 flex flex-col items-center">
            <button
              onClick={onClose}
              className="absolute top-0 right-0 p-2 text-white/50 hover:text-white transition-colors z-50"
            >
              <X size={32} />
            </button>

            {/* Title */}
            <motion.h2
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="text-4xl font-audiowide text-white mb-8 text-center flex items-center gap-3"
            >
              <Sparkles className="text-yellow-400" />
              Roulette Royale
              <Sparkles className="text-yellow-400" />
            </motion.h2>

            {/* Wheel Container */}
            <div className="relative w-80 h-80 md:w-96 md:h-96 mb-8">
              {/* Outer Glow */}
              <motion.div
                className="absolute inset-[-10px] rounded-full"
                animate={
                  isSpinning
                    ? {
                        boxShadow: [
                          '0 0 30px rgba(168,85,247,0.3), 0 0 60px rgba(168,85,247,0.2)',
                          '0 0 50px rgba(168,85,247,0.5), 0 0 100px rgba(168,85,247,0.3)',
                          '0 0 30px rgba(168,85,247,0.3), 0 0 60px rgba(168,85,247,0.2)',
                        ],
                      }
                    : {}
                }
                transition={{ duration: 0.5, repeat: isSpinning ? Infinity : 0 }}
              />

              {/* Wheel */}
              <motion.div
                className="w-full h-full relative"
                animate={{ rotate: rotation }}
                transition={{
                  duration: phase === 'spinning' ? 3 : 0,
                  ease: [0.25, 0.1, 0.25, 1], // Custom easing for realistic slowdown
                }}
              >
                <Image
                  src="/assets/easter-egg/roulette-wheel.png"
                  alt="Roulette Wheel"
                  fill
                  className="object-contain"
                />
              </motion.div>

              {/* Ball */}
              <RouletteBall
                isSpinning={isSpinning}
                wheelRotation={rotation}
                onStop={handleBallStop}
              />

              {/* Center Hub */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-yellow-500 to-yellow-700 border-4 border-yellow-400 shadow-lg" />
              </div>

              {/* Marker */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 z-20">
                <motion.div
                  animate={phase === 'slowing' ? { scale: [1, 1.2, 1], rotate: [0, 5, -5, 0] } : {}}
                  transition={{ duration: 0.3, repeat: phase === 'slowing' ? 3 : 0 }}
                  className="w-0 h-0 border-l-[12px] border-r-[12px] border-t-[20px] border-l-transparent border-r-transparent border-t-yellow-500 drop-shadow-lg"
                />
              </div>
            </div>

            {/* Result & Controls */}
            <div className="flex flex-col items-center gap-6">
              {/* Result Display */}
              <div className="h-24 flex items-center justify-center">
                <AnimatePresence mode="wait">
                  {phase === 'result' && gameResult && (
                    <motion.div
                      initial={{ scale: 0, opacity: 0, y: 20 }}
                      animate={{ scale: 1, opacity: 1, y: 0 }}
                      exit={{ scale: 0, opacity: 0 }}
                      transition={{ type: 'spring', damping: 12 }}
                      className={`text-center p-6 rounded-2xl border-2 backdrop-blur-sm ${
                        gameResult.isWin
                          ? 'bg-green-500/20 border-green-500/50'
                          : 'bg-red-500/20 border-red-500/50'
                      }`}
                    >
                      <motion.div
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ duration: 0.5, repeat: gameResult.isWin ? 2 : 0 }}
                        className={`text-2xl font-bold mb-2 ${
                          gameResult.isWin ? 'text-green-400' : 'text-red-400'
                        }`}
                      >
                        {gameResult.isWin ? '🎉 FÉLICITATIONS !' : '😔 Pas de chance...'}
                      </motion.div>
                      <div className="text-white/90 text-lg">{gameResult.message}</div>
                      {gameResult.isWin && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.3 }}
                          className="flex items-center justify-center gap-2 mt-2 text-yellow-400 font-bold"
                        >
                          <Trophy size={20} />
                          <span>
                            {gameResult.rewardType === 'TOKENS'
                              ? `+${gameResult.rewardAmount} Jetons`
                              : gameResult.rewardType === 'QUEUE_SKIP'
                                ? 'Queue Skip !'
                                : 'Ticket Éternel !'}
                          </span>
                        </motion.div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Spin Button */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={phase === 'result' ? handlePlayAgain : handleSpin}
                disabled={isSpinning || isLoading}
                className={`px-10 py-5 font-bold rounded-full text-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3 shadow-xl ${
                  phase === 'result'
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white shadow-purple-900/50'
                    : 'bg-gradient-to-r from-red-600 to-red-800 hover:from-red-500 hover:to-red-700 text-white shadow-red-900/50'
                }`}
              >
                {isSpinning ? (
                  <>
                    <RotateCw className="animate-spin" />
                    <span className="font-audiowide">Rien ne va plus...</span>
                  </>
                ) : phase === 'result' ? (
                  <>
                    <RotateCw />
                    <span className="font-audiowide">Rejouer</span>
                  </>
                ) : (
                  <>
                    <div className="flex flex-col items-start">
                      <span className="text-lg leading-none font-audiowide">Lancer la bille</span>
                      <span className="text-xs opacity-70 font-normal flex items-center gap-1">
                        <Coins size={12} /> 10 jetons
                      </span>
                    </div>
                  </>
                )}
              </motion.button>
            </div>
          </div>

          {/* Celebration Overlay */}
          <CelebrationOverlay
            isVisible={showCelebration}
            message={gameResult?.rewardType === 'QUEUE_SKIP' ? 'JACKPOT !' : 'VICTOIRE !'}
            subMessage={gameResult?.message}
            type={gameResult?.rewardType === 'QUEUE_SKIP' ? 'jackpot' : 'win'}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );

  if (typeof window === 'undefined') return null;
  return ReactDOM.createPortal(content, document.body);
}
