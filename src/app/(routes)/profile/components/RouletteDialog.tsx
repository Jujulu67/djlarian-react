'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, RotateCw, Coins, Trophy } from 'lucide-react';
import { useState } from 'react';
import ReactDOM from 'react-dom';
import Image from 'next/image';
import { useMiniGame, GameResult } from '../hooks/useMiniGame';

interface RouletteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onTokenUpdate?: () => Promise<void>;
}

export function RouletteDialog({ isOpen, onClose, onTokenUpdate }: RouletteDialogProps) {
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [gameResult, setGameResult] = useState<GameResult | null>(null);

  const { play, isLoading } = useMiniGame(onTokenUpdate);

  const handleSpin = async () => {
    if (isSpinning || isLoading) return;

    setIsSpinning(true);
    setGameResult(null);

    // Call API
    const result = await play('roulette');

    // Visual spin
    const spins = 5 + Math.random() * 5;
    const newRotation = rotation + spins * 360 + Math.random() * 360;
    setRotation(newRotation);

    setTimeout(() => {
      setIsSpinning(false);
      if (result) {
        setGameResult(result);
      }
    }, 3000);
  };

  if (!isOpen) return null;

  const content = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/90 backdrop-blur-md"
        >
          <div className="relative w-full max-w-4xl p-8 flex flex-col items-center">
            <button
              onClick={onClose}
              className="absolute top-0 right-0 p-2 text-white/50 hover:text-white transition-colors"
            >
              <X size={32} />
            </button>

            <h2 className="text-4xl font-audiowide text-white mb-8 text-center">Roulette Royale</h2>

            <div className="relative w-80 h-80 md:w-96 md:h-96 mb-8">
              {/* Wheel Container */}
              <motion.div
                className="w-full h-full relative"
                animate={{ rotate: rotation }}
                transition={{ duration: 3, ease: 'easeOut' }}
              >
                <Image
                  src="/assets/easter-egg/roulette-wheel.png"
                  alt="Roulette Wheel"
                  fill
                  className="object-contain"
                />
              </motion.div>

              {/* Marker */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 z-10">
                <div className="w-4 h-8 bg-yellow-500 clip-triangle" />
              </div>
            </div>

            <div className="flex flex-col items-center gap-6">
              {/* Result Display */}
              <div className="h-20 flex items-center justify-center">
                <AnimatePresence mode="wait">
                  {gameResult && (
                    <motion.div
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      className={`text-center p-4 rounded-xl border ${
                        gameResult.isWin
                          ? 'bg-green-500/20 border-green-500/50 text-green-400'
                          : 'bg-red-500/20 border-red-500/50 text-red-400'
                      }`}
                    >
                      <div className="text-xl font-bold mb-1">{gameResult.message}</div>
                      {gameResult.isWin && (
                        <div className="flex items-center justify-center gap-2 text-sm text-white">
                          <Trophy size={16} className="text-yellow-400" />
                          <span>
                            {gameResult.rewardType === 'TOKENS'
                              ? `+${gameResult.rewardAmount} Jetons`
                              : gameResult.rewardType === 'QUEUE_SKIP'
                                ? 'Queue Skip !'
                                : 'Ticket Éternel !'}
                          </span>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <button
                onClick={handleSpin}
                disabled={isSpinning || isLoading}
                className="px-8 py-4 bg-gradient-to-r from-red-600 to-red-800 hover:from-red-500 hover:to-red-700 text-white font-bold rounded-full text-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3 shadow-lg shadow-red-900/50"
              >
                {isSpinning ? (
                  <>
                    <RotateCw className="animate-spin" />
                    <span>Rien ne va plus...</span>
                  </>
                ) : (
                  <>
                    <div className="flex flex-col items-start">
                      <span className="text-lg leading-none">Lancer la bille</span>
                      <span className="text-xs opacity-70 font-normal flex items-center gap-1">
                        <Coins size={12} /> 10 jetons
                      </span>
                    </div>
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  if (typeof window === 'undefined') return null;
  return ReactDOM.createPortal(content, document.body);
}
