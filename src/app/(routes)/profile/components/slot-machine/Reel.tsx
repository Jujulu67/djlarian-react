'use client';

import { motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import type { SymbolType } from '@/types/slot-machine';
import { SYMBOL_EMOJIS, SYMBOL_GLOWS } from './constants';
import { getReelStopTime, pickRandomSymbol } from './slotMachineUtils';

interface ReelProps {
  symbol: SymbolType | null;
  isSpinning: boolean;
  delay?: number;
  isLastReel?: boolean; // For suspense slowdown
  onStop?: () => void;
  isWinning?: boolean; // For glowing winning symbols
}

export function Reel({
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
        const randomSymbol = pickRandomSymbol();
        setDisplaySymbol(randomSymbol);
      }, 80);

      // Calculate stop time: 1s, 2.2s, 3.4s
      const baseTime = getReelStopTime(delay);

      // For last reel: start slowing down before stop
      let slowdownTimer: NodeJS.Timeout | undefined;
      if (isLastReel) {
        const slowdownAt = baseTime - 1000;
        slowdownTimer = setTimeout(() => {
          setIsSlowingDown(true);
          if (intervalRef.current) clearInterval(intervalRef.current);
          // Slow spinning
          intervalRef.current = setInterval(() => {
            const randomSymbol = pickRandomSymbol();
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
