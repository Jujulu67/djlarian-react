'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, Coins, Gift, Info, Flame } from 'lucide-react';
import { useEffect, useState } from 'react';
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
import { Reel } from './slot-machine/Reel';
import { useSlotWinEffects } from './slot-machine/useSlotWinEffects';
import { useAutoSpin } from './slot-machine/useAutoSpin';
import { PayoutTableModal } from './slot-machine/PayoutTableModal';
import { BatchResultsModal } from './slot-machine/BatchResultsModal';
import { SlotControls } from './slot-machine/SlotControls';

interface ModernSlotMachineProps {
  isOpen: boolean;
  onClose: () => void;
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

  const {
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
  } = useSlotWinEffects({ lastResult, isSpinning, playWinSound, playJackpotSound });

  const { isAutoSpinning, toggleAutoSpin } = useAutoSpin({ isOpen, isSpinning, status, spin });

  const handleSpin = async () => {
    if (isSpinning || !status || status.tokens < 3) return;
    await spin();
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
            {showPayoutTable && <PayoutTableModal setShowPayoutTable={setShowPayoutTable} />}

            {/* Batch Results Modal */}
            {batchResult && (
              <BatchResultsModal batchResult={batchResult} setBatchResult={setBatchResult} />
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
              <SlotControls
                handleSpin={handleSpin}
                isAutoSpinning={isAutoSpinning}
                isHotStreak={isHotStreak}
                isSpinning={isSpinning}
                lastResult={lastResult}
                sessionSpent={sessionSpent}
                spinMultiple={spinMultiple}
                status={status}
                toggleAutoSpin={toggleAutoSpin}
                winStreak={winStreak}
              />
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
