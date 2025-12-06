'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState, useCallback } from 'react';
import { Trophy, Sparkles, Star } from 'lucide-react';

// ============================================
// ROULETTE BALL ANIMATION
// ============================================
interface RouletteBallProps {
  isSpinning: boolean;
  wheelRotation: number;
  onStop: () => void;
}

export function RouletteBall({ isSpinning, wheelRotation, onStop }: RouletteBallProps) {
  const [ballAngle, setBallAngle] = useState(0);
  const [ballRadius, setBallRadius] = useState(140);
  const [phase, setPhase] = useState<'idle' | 'fast' | 'slow' | 'bounce' | 'stopped'>('idle');

  useEffect(() => {
    if (!isSpinning) {
      setPhase('idle');
      setBallRadius(140);
      return;
    }

    // Ball starts spinning in opposite direction
    setPhase('fast');
    let angle = 0;
    let speed = 25;
    let radius = 140;

    const spinInterval = setInterval(() => {
      if (phase === 'stopped') {
        clearInterval(spinInterval);
        return;
      }

      angle += speed;
      setBallAngle(angle);

      // After 2s, start slowing down
      if (angle > 360 * 8) {
        speed *= 0.97;
        radius -= 0.3;
        setBallRadius(Math.max(100, radius));
        setPhase('slow');

        // Add bouncing effect when very slow
        if (speed < 3) {
          setPhase('bounce');
          if (speed < 0.5) {
            clearInterval(spinInterval);
            setPhase('stopped');
            onStop();
          }
        }
      }
    }, 16);

    return () => clearInterval(spinInterval);
  }, [isSpinning, onStop, phase]);

  if (phase === 'idle') return null;

  const x = Math.cos((ballAngle * Math.PI) / 180) * ballRadius;
  const y = Math.sin((ballAngle * Math.PI) / 180) * ballRadius;

  return (
    <motion.div
      className="absolute w-4 h-4 rounded-full bg-white shadow-lg z-20"
      style={{
        left: '50%',
        top: '50%',
        transform: `translate(${x}px, ${y}px) translate(-50%, -50%)`,
        boxShadow: '0 0 10px rgba(255,255,255,0.8), inset 0 0 5px rgba(0,0,0,0.3)',
      }}
      animate={
        phase === 'bounce'
          ? {
              scale: [1, 1.2, 1],
            }
          : {}
      }
      transition={{ duration: 0.2, repeat: phase === 'bounce' ? 3 : 0 }}
    />
  );
}

// ============================================
// PARTICLE SCRATCH EFFECT
// ============================================
interface ScratchParticle {
  id: number;
  x: number;
  y: number;
  angle: number;
  color: string;
}

interface ScratchParticlesProps {
  particles: ScratchParticle[];
}

export function ScratchParticles({ particles }: ScratchParticlesProps) {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-30">
      <AnimatePresence>
        {particles.map((p) => (
          <motion.div
            key={p.id}
            initial={{
              x: p.x,
              y: p.y,
              scale: 1,
              opacity: 1,
            }}
            animate={{
              x: p.x + Math.cos(p.angle) * 50,
              y: p.y + Math.sin(p.angle) * 50 + 30, // gravity
              scale: 0,
              opacity: 0,
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="absolute w-2 h-2 rounded-full"
            style={{ backgroundColor: p.color }}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

// ============================================
// BLOCK EXPLOSION EFFECT
// ============================================
interface BlockExplosionProps {
  x: number;
  y: number;
  color: string;
  count: number;
  isActive: boolean;
}

export function BlockExplosion({ x, y, color, count, isActive }: BlockExplosionProps) {
  const [particles, setParticles] = useState<
    Array<{ id: number; angle: number; distance: number; size: number }>
  >([]);

  useEffect(() => {
    if (isActive) {
      const newParticles = Array.from({ length: Math.min(count * 2, 12) }, (_, i) => ({
        id: i,
        angle: (i * 360) / Math.min(count * 2, 12) + Math.random() * 30,
        distance: 30 + Math.random() * 30,
        size: 4 + Math.random() * 6,
      }));
      setParticles(newParticles);
      const timer = setTimeout(() => setParticles([]), 600);
      return () => clearTimeout(timer);
    }
  }, [isActive, count]);

  return (
    <div
      className="absolute pointer-events-none z-40"
      style={{ left: x, top: y, transform: 'translate(-50%, -50%)' }}
    >
      <AnimatePresence>
        {particles.map((p) => (
          <motion.div
            key={p.id}
            initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
            animate={{
              x: Math.cos((p.angle * Math.PI) / 180) * p.distance,
              y: Math.sin((p.angle * Math.PI) / 180) * p.distance,
              scale: 0,
              opacity: 0,
            }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="absolute rounded-full"
            style={{
              backgroundColor: color,
              width: p.size,
              height: p.size,
              boxShadow: `0 0 10px ${color}`,
            }}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

// ============================================
// FLOATING SCORE POPUP
// ============================================
interface FloatingScoreProps {
  score: number;
  x: number;
  y: number;
  isVisible: boolean;
  combo?: number;
}

export function FloatingScore({ score, x, y, isVisible, combo = 1 }: FloatingScoreProps) {
  if (!isVisible) return null;

  const color =
    combo >= 3
      ? 'from-yellow-400 to-orange-500'
      : combo >= 2
        ? 'from-purple-400 to-pink-500'
        : 'from-green-400 to-emerald-500';

  return (
    <motion.div
      initial={{ opacity: 1, y: 0, scale: 0.5 }}
      animate={{ opacity: 0, y: -60, scale: 1.2 }}
      transition={{ duration: 0.8, ease: 'easeOut' }}
      className="absolute pointer-events-none z-50"
      style={{ left: x, top: y, transform: 'translateX(-50%)' }}
    >
      <div
        className={`text-2xl font-black bg-gradient-to-r ${color} bg-clip-text text-transparent drop-shadow-lg`}
      >
        +{score}
        {combo > 1 && <span className="text-sm ml-1">x{combo}</span>}
      </div>
    </motion.div>
  );
}

// ============================================
// COMBO INDICATOR
// ============================================
interface ComboIndicatorProps {
  combo: number;
  isVisible: boolean;
}

export function ComboIndicator({ combo, isVisible }: ComboIndicatorProps) {
  if (!isVisible || combo < 2) return null;

  const intensity =
    combo >= 5 ? 'from-red-500 via-orange-500 to-yellow-500' : 'from-purple-500 to-pink-500';

  return (
    <motion.div
      initial={{ scale: 0, rotate: -10 }}
      animate={{ scale: 1, rotate: 0 }}
      exit={{ scale: 0, opacity: 0 }}
      className="absolute top-4 right-4 z-40"
    >
      <div
        className={`px-4 py-2 rounded-full bg-gradient-to-r ${intensity} text-white font-bold shadow-lg`}
      >
        <motion.span
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 0.3, repeat: Infinity }}
        >
          🔥 COMBO x{combo}
        </motion.span>
      </div>
    </motion.div>
  );
}

// ============================================
// CELEBRATION OVERLAY
// ============================================
interface CelebrationOverlayProps {
  isVisible: boolean;
  message: string;
  subMessage?: string;
  type: 'win' | 'jackpot' | 'bonus';
}

export function CelebrationOverlay({
  isVisible,
  message,
  subMessage,
  type,
}: CelebrationOverlayProps) {
  const [stars, setStars] = useState<Array<{ id: number; x: number; y: number; delay: number }>>(
    []
  );

  useEffect(() => {
    if (isVisible) {
      const newStars = Array.from({ length: type === 'jackpot' ? 20 : 10 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        delay: Math.random() * 0.5,
      }));
      setStars(newStars);
    } else {
      setStars([]);
    }
  }, [isVisible, type]);

  if (!isVisible) return null;

  const bgColor =
    type === 'jackpot'
      ? 'from-yellow-500/90 via-orange-500/90 to-red-500/90'
      : type === 'bonus'
        ? 'from-purple-500/90 to-pink-500/90'
        : 'from-green-500/90 to-emerald-500/90';

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 50 }}
      className="fixed bottom-8 left-0 right-0 z-[100001] pointer-events-none flex justify-center"
    >
      <div
        className={`relative bg-gradient-to-r ${bgColor} backdrop-blur-md rounded-2xl px-8 py-4 shadow-2xl border border-white/20 overflow-hidden`}
      >
        {/* Animated stars */}
        {stars.map((star) => (
          <motion.div
            key={star.id}
            initial={{ opacity: 0, scale: 0 }}
            animate={{
              opacity: [0, 1, 0],
              scale: [0, 1, 0],
            }}
            transition={{
              duration: 1.5,
              delay: star.delay,
              repeat: Infinity,
              repeatDelay: 1,
            }}
            className="absolute text-lg"
            style={{ left: `${star.x}%`, top: `${star.y}%` }}
          >
            ✨
          </motion.div>
        ))}

        {/* Center content */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', damping: 10 }}
          className="flex items-center gap-4 z-10 relative"
        >
          <motion.div
            animate={{ scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] }}
            transition={{ duration: 0.6, repeat: Infinity }}
            className="text-4xl"
          >
            {type === 'jackpot' ? '🏆' : type === 'bonus' ? '🎁' : '🎉'}
          </motion.div>
          <div className="text-center">
            <div className="text-2xl font-black text-white drop-shadow-lg">{message}</div>
            {subMessage && <div className="text-sm text-white/90">{subMessage}</div>}
          </div>
          <motion.div
            animate={{ scale: [1, 1.2, 1], rotate: [0, -10, 10, 0] }}
            transition={{ duration: 0.6, repeat: Infinity }}
            className="text-4xl"
          >
            {type === 'jackpot' ? '🏆' : type === 'bonus' ? '🎁' : '🎉'}
          </motion.div>
        </motion.div>
      </div>
    </motion.div>
  );
}

// ============================================
// SCRATCH SYMBOL DISPLAY
// ============================================
interface ScratchSymbolProps {
  symbol: string;
  isRevealed: boolean;
  isWinning?: boolean;
}

export function ScratchSymbol({ symbol, isRevealed, isWinning = false }: ScratchSymbolProps) {
  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={{
        scale: isRevealed ? 1 : 0,
        rotate: isRevealed ? [0, 10, -10, 0] : 0,
      }}
      className={`text-5xl ${isWinning ? 'drop-shadow-[0_0_10px_rgba(255,215,0,0.8)]' : ''}`}
    >
      {symbol}
    </motion.div>
  );
}

// ============================================
// SCREEN SHAKE WRAPPER
// ============================================
interface ScreenShakeProps {
  isActive: boolean;
  intensity?: number;
  children: React.ReactNode;
}

export function ScreenShake({ isActive, intensity = 5, children }: ScreenShakeProps) {
  return (
    <motion.div
      animate={
        isActive
          ? {
              x: [0, -intensity, intensity, -intensity, intensity, 0],
              y: [0, intensity, -intensity, intensity, -intensity, 0],
            }
          : {}
      }
      transition={{ duration: 0.4 }}
    >
      {children}
    </motion.div>
  );
}

// ============================================
// ROULETTE RESULT SECTIONS (for visual wheel)
// ============================================
export const ROULETTE_SECTIONS = [
  { label: '2x', color: '#ef4444', value: 2 },
  { label: '0', color: '#1f2937', value: 0 },
  { label: '3x', color: '#22c55e', value: 3 },
  { label: '1x', color: '#ef4444', value: 1 },
  { label: '5x', color: '#eab308', value: 5 },
  { label: '0', color: '#1f2937', value: 0 },
  { label: '2x', color: '#22c55e', value: 2 },
  { label: '10x', color: '#a855f7', value: 10 },
  { label: '0', color: '#1f2937', value: 0 },
  { label: '1x', color: '#ef4444', value: 1 },
  { label: '3x', color: '#22c55e', value: 3 },
  { label: '0', color: '#1f2937', value: 0 },
];

// ============================================
// SCRATCH CARD SYMBOLS
// ============================================
export const SCRATCH_SYMBOLS = ['💎', '🍀', '⭐', '🎰', '👑', '💰'];

export function getRandomSymbols(isWin: boolean): string[] {
  if (isWin) {
    // All 3 same for win
    const symbol = SCRATCH_SYMBOLS[Math.floor(Math.random() * SCRATCH_SYMBOLS.length)];
    return [symbol, symbol, symbol];
  } else {
    // Make sure at least 2 are different
    const symbols = [];
    const first = SCRATCH_SYMBOLS[Math.floor(Math.random() * SCRATCH_SYMBOLS.length)];
    symbols.push(first);

    // Second - make it different
    let second;
    do {
      second = SCRATCH_SYMBOLS[Math.floor(Math.random() * SCRATCH_SYMBOLS.length)];
    } while (second === first);
    symbols.push(second);

    // Third - random
    symbols.push(SCRATCH_SYMBOLS[Math.floor(Math.random() * SCRATCH_SYMBOLS.length)]);

    return symbols;
  }
}
