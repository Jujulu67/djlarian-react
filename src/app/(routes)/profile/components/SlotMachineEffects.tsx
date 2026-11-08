'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState, useMemo } from 'react';

// ============================================
// CONFETTI EXPLOSION
// ============================================
interface ConfettiProps {
  isActive: boolean;
  intensity?: 'low' | 'medium' | 'high' | 'jackpot';
}

const CONFETTI_COLORS = [
  '#FFD700',
  '#FF6B6B',
  '#4ECDC4',
  '#45B7D1',
  '#96CEB4',
  '#FFEAA7',
  '#DDA0DD',
  '#98D8C8',
  '#F7DC6F',
  '#BB8FCE',
];

/** Nombre de confettis selon l'intensité */
function getConfettiCount(intensity: NonNullable<ConfettiProps['intensity']>) {
  if (intensity === 'jackpot') return 100;
  if (intensity === 'high') return 60;
  if (intensity === 'medium') return 40;
  return 20;
}

export function ConfettiExplosion({ isActive, intensity = 'medium' }: Readonly<ConfettiProps>) {
  const [particles, setParticles] = useState<
    Array<{
      id: number;
      x: number;
      y: number;
      color: string;
      rotation: number;
      scale: number;
      duration: number;
    }>
  >([]);

  useEffect(() => {
    if (isActive) {
      const count = getConfettiCount(intensity);
      const newParticles = Array.from({ length: count }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
        rotation: Math.random() * 360,
        scale: 0.5 + Math.random() * 1,
        duration: 2 + Math.random(),
      }));
      setParticles(newParticles);

      const timer = setTimeout(() => setParticles([]), 3000);
      return () => clearTimeout(timer);
    }
  }, [isActive, intensity]);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-50">
      <AnimatePresence>
        {particles.map((p) => (
          <motion.div
            key={p.id}
            initial={{
              x: '50%',
              y: '50%',
              scale: 0,
              rotate: 0,
              opacity: 1,
            }}
            animate={{
              x: `${p.x}%`,
              y: `${p.y}%`,
              scale: p.scale,
              rotate: p.rotation,
              opacity: 0,
            }}
            exit={{ opacity: 0 }}
            transition={{
              duration: p.duration,
              ease: 'easeOut',
            }}
            className="absolute w-3 h-3"
            style={{ backgroundColor: p.color }}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

// ============================================
// STREAK FIRE INDICATOR
// ============================================
interface StreakIndicatorProps {
  streak: number;
  isOnFire: boolean;
}

export function StreakIndicator({ streak, isOnFire }: Readonly<StreakIndicatorProps>) {
  if (streak < 2) return null;

  return (
    <motion.div
      initial={{ scale: 0, y: 20 }}
      animate={{ scale: 1, y: 0 }}
      className="absolute -top-16 left-1/2 -translate-x-1/2 z-30"
    >
      <div
        className={`
        px-4 py-2 rounded-full font-bold text-lg
        ${
          isOnFire
            ? 'bg-gradient-to-r from-orange-500 via-red-500 to-yellow-500 text-white animate-pulse'
            : 'bg-purple-600 text-white'
        }
        shadow-lg
      `}
      >
        <span className="flex items-center gap-2">
          {isOnFire && <span className="text-2xl">🔥</span>}
          <span>{streak}x STREAK</span>
          {isOnFire && <span className="text-2xl">🔥</span>}
        </span>
      </div>
      {isOnFire && (
        <motion.div
          className="text-xs text-center mt-1 text-yellow-300 font-bold"
          animate={{ opacity: [1, 0.5, 1] }}
          transition={{ repeat: Infinity, duration: 0.5 }}
        >
          BONUS x1.5 ACTIF!
        </motion.div>
      )}
    </motion.div>
  );
}

// ============================================
// MULTIPLIER POPUP
// ============================================
interface MultiplierPopupProps {
  amount: number;
  isVisible: boolean;
}

/** Taille du texte du multiplicateur */
function getMultiplierSize(amount: number) {
  if (amount >= 100) return 'text-8xl';
  if (amount >= 50) return 'text-7xl';
  if (amount >= 20) return 'text-6xl';
  return 'text-5xl';
}

/** Dégradé du texte du multiplicateur */
function getMultiplierColor(amount: number) {
  if (amount >= 100) return 'from-yellow-400 via-orange-500 to-red-500';
  if (amount >= 50) return 'from-purple-400 via-pink-500 to-red-500';
  if (amount >= 20) return 'from-green-400 via-emerald-500 to-teal-500';
  return 'from-blue-400 via-cyan-500 to-teal-500';
}

export function MultiplierPopup({ amount, isVisible }: Readonly<MultiplierPopupProps>) {
  if (!isVisible || amount <= 0) return null;

  const size = getMultiplierSize(amount);
  const color = getMultiplierColor(amount);

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1.2, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="absolute inset-0 flex items-center justify-center z-40 pointer-events-none"
    >
      <div
        className={`
        ${size} font-black
        bg-gradient-to-br ${color}
        bg-clip-text text-transparent
        drop-shadow-[0_0_30px_rgba(255,255,255,0.8)]
        animate-bounce
      `}
      >
        +{amount}
      </div>
    </motion.div>
  );
}

// ============================================
// NEAR MISS SHAKE
// ============================================
interface NearMissEffectProps {
  isActive: boolean;
}

export function NearMissEffect({ isActive }: Readonly<NearMissEffectProps>) {
  if (!isActive) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{
        opacity: [0, 1, 1, 0],
        x: [0, -5, 5, -5, 5, 0],
      }}
      transition={{ duration: 0.5 }}
      className="absolute inset-0 border-4 border-yellow-500 rounded-3xl z-30 pointer-events-none"
    />
  );
}

// ============================================
// COINS RAIN
// ============================================
interface CoinsRainProps {
  isActive: boolean;
  count?: number;
}

export function CoinsRain({ isActive, count = 20 }: Readonly<CoinsRainProps>) {
  const [coins, setCoins] = useState<Array<{ id: number; x: number; delay: number }>>([]);

  useEffect(() => {
    if (isActive) {
      const newCoins = Array.from({ length: count }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        delay: Math.random() * 0.5,
      }));
      setCoins(newCoins);
      const timer = setTimeout(() => setCoins([]), 3000);
      return () => clearTimeout(timer);
    }
  }, [isActive, count]);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-40">
      <AnimatePresence>
        {coins.map((coin) => (
          <motion.div
            key={coin.id}
            initial={{ y: -50, x: `${coin.x}%`, opacity: 1, rotate: 0 }}
            animate={{
              y: '120%',
              rotate: 360 * 3,
              opacity: [1, 1, 0],
            }}
            transition={{
              duration: 2,
              delay: coin.delay,
              ease: 'easeIn',
            }}
            className="absolute text-3xl"
          >
            🪙
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// ============================================
// GLOWING BORDER
// ============================================
interface GlowingBorderProps {
  isWinning: boolean;
  intensity: 'low' | 'medium' | 'high' | 'jackpot';
}

/** Couleur de la bordure lumineuse selon l'intensité */
function getGlowColor(intensity: GlowingBorderProps['intensity']) {
  if (intensity === 'jackpot') return 'rgba(255,215,0,0.8)';
  if (intensity === 'high') return 'rgba(168,85,247,0.6)';
  if (intensity === 'medium') return 'rgba(74,222,128,0.5)';
  return 'rgba(59,130,246,0.4)';
}

export function GlowingBorder({ isWinning, intensity }: Readonly<GlowingBorderProps>) {
  if (!isWinning) return null;

  const glowColor = getGlowColor(intensity);

  return (
    <motion.div
      className="absolute -inset-2 rounded-3xl pointer-events-none z-20"
      initial={{ opacity: 0 }}
      animate={{
        opacity: [0.5, 1, 0.5],
        boxShadow: [
          `0 0 20px ${glowColor}, 0 0 40px ${glowColor}`,
          `0 0 40px ${glowColor}, 0 0 80px ${glowColor}`,
          `0 0 20px ${glowColor}, 0 0 40px ${glowColor}`,
        ],
      }}
      transition={{ duration: 1, repeat: 3 }}
    />
  );
}

// ============================================
// HOT STREAK BACKGROUND
// ============================================
interface HotStreakBackgroundProps {
  isActive: boolean;
}

export function HotStreakBackground({ isActive }: Readonly<HotStreakBackgroundProps>) {
  if (!isActive) return null;

  return (
    <motion.div
      className="absolute inset-0 pointer-events-none z-0 overflow-hidden rounded-3xl"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0 bg-gradient-to-t from-orange-900/30 via-red-900/20 to-transparent" />
      <motion.div
        className="absolute bottom-0 left-0 right-0 h-32"
        style={{
          background: 'linear-gradient(to top, rgba(255,100,0,0.3), transparent)',
        }}
        animate={{
          opacity: [0.3, 0.6, 0.3],
          scaleY: [1, 1.2, 1],
        }}
        transition={{ duration: 1, repeat: Infinity }}
      />
    </motion.div>
  );
}

// ============================================
// NEAR MISS SHAKE (2 rare symbols aligned)
// ============================================
interface NearMissShakeProps {
  isActive: boolean;
}

export function NearMissShake({ isActive }: Readonly<NearMissShakeProps>) {
  if (!isActive) return null;

  return (
    <motion.div
      className="absolute inset-0 pointer-events-none z-30"
      animate={{
        x: [0, -8, 8, -8, 8, -4, 4, 0],
      }}
      transition={{ duration: 0.5 }}
    >
      <div className="absolute inset-0 border-4 border-yellow-500/50 rounded-3xl animate-pulse" />
    </motion.div>
  );
}

// ============================================
// JACKPOT COUNTER (Progressive jackpot display)
// ============================================
interface JackpotCounterProps {
  amount: number;
  isVisible: boolean;
}

export function JackpotCounter({ amount, isVisible }: Readonly<JackpotCounterProps>) {
  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="absolute -top-20 left-1/2 -translate-x-1/2 z-40"
    >
      <div className="bg-gradient-to-r from-yellow-600 via-yellow-500 to-yellow-600 px-6 py-3 rounded-xl shadow-lg shadow-yellow-500/50 border-2 border-yellow-400">
        <div className="text-xs text-yellow-900 font-bold text-center">🏆 JACKPOT PROGRESSIF</div>
        <motion.div
          className="text-2xl font-black text-yellow-900 text-center"
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          {amount.toLocaleString()} 🪙
        </motion.div>
      </div>
    </motion.div>
  );
}

// ============================================
// LUCKY SPIN INTRO (Hot streak start animation)
// ============================================
interface LuckySpinIntroProps {
  isActive: boolean;
}

export function LuckySpinIntro({ isActive }: Readonly<LuckySpinIntroProps>) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (isActive) {
      setShow(true);
      const timer = setTimeout(() => setShow(false), 1500);
      return () => clearTimeout(timer);
    }
  }, [isActive]);

  if (!show) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 2 }}
      animate={{ opacity: [0, 1, 1, 0], scale: [2, 1, 1, 0.5] }}
      transition={{ duration: 1.5 }}
      className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none"
    >
      <div className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-red-500 to-yellow-400 drop-shadow-[0_0_30px_rgba(255,100,0,0.8)]">
        🔥 HOT STREAK! 🔥
      </div>
    </motion.div>
  );
}

// ============================================
// SCREEN FLASH (Win flash effect)
// ============================================
interface ScreenFlashProps {
  isActive: boolean;
  color?: string;
}

export function ScreenFlash({
  isActive,
  color = 'rgba(255,255,255,0.3)',
}: Readonly<ScreenFlashProps>) {
  if (!isActive) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: [0, 1, 0] }}
      transition={{ duration: 0.3 }}
      className="absolute inset-0 pointer-events-none z-40"
      style={{ backgroundColor: color }}
    />
  );
}

// ============================================
// BONUS GAME OVERLAY
// ============================================
interface BonusGameProps {
  isActive: boolean;
  onComplete: (multiplier: number) => void;
}

/** Classe d'une boîte du bonus : choisie, mise de côté après le choix, ou neutre */
function getBonusBoxClassName(isSelected: boolean, isDimmed: boolean) {
  if (isSelected)
    return 'bg-gradient-to-br from-yellow-400 to-orange-500 shadow-lg shadow-yellow-500/50';
  if (isDimmed) return 'bg-slate-700';
  return 'bg-gradient-to-br from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 cursor-pointer shadow-lg';
}

export function BonusGame({ isActive, onComplete }: Readonly<BonusGameProps>) {
  const [selectedBox, setSelectedBox] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  // Memoize shuffled multipliers to avoid calling Math.random during render
  const multipliers = useMemo(() => {
    const values = [1.5, 2, 2, 3, 5, 10];
    // Fisher-Yates shuffle using seeded order
    return values.sort(() => Math.random() - 0.5);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive]); // Re-shuffle when game becomes active

  if (!isActive) return null;

  const handleSelect = (index: number) => {
    if (selectedBox !== null) return;
    setSelectedBox(index);
    setRevealed(true);
    setTimeout(() => {
      onComplete(multipliers[index]);
    }, 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 bg-black/90 backdrop-blur-md z-50 flex flex-col items-center justify-center p-8"
    >
      <motion.h2
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="text-3xl font-black text-yellow-400 mb-8 text-center"
      >
        🎁 BONUS GAME! 🎁
        <br />
        <span className="text-lg text-white/80">Choisis une boîte!</span>
      </motion.h2>

      <div className="grid grid-cols-3 gap-4">
        {multipliers.map((mult, i) => (
          <motion.button
            key={i}
            initial={{ scale: 0, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: i * 0.1 }}
            whileHover={selectedBox === null ? { scale: 1.1 } : {}}
            whileTap={selectedBox === null ? { scale: 0.95 } : {}}
            onClick={() => handleSelect(i)}
            disabled={selectedBox !== null}
            className={`
                            w-24 h-24 rounded-xl text-4xl flex items-center justify-center
                            transition-all duration-300
                            ${getBonusBoxClassName(selectedBox === i, selectedBox !== null && revealed)}
                        `}
          >
            {revealed ? (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className={`font-black ${selectedBox === i ? 'text-black text-2xl' : 'text-white/50 text-xl'}`}
              >
                x{mult}
              </motion.span>
            ) : (
              '🎁'
            )}
          </motion.button>
        ))}
      </div>

      {revealed && selectedBox !== null && (
        <motion.div
          initial={{ scale: 0, y: 50 }}
          animate={{ scale: 1, y: 0 }}
          className="mt-8 text-4xl font-black text-yellow-400"
        >
          x{multipliers[selectedBox]} MULTIPLICATEUR!
        </motion.div>
      )}
    </motion.div>
  );
}
