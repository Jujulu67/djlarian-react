'use client';

import type { SlotMachineStatus, SpinResult } from '@/types/slot-machine';

import { motion } from 'framer-motion';
import { Flame, Sparkles, X, Zap } from 'lucide-react';

interface SlotControlsProps {
  handleSpin: () => unknown;
  isAutoSpinning: boolean;
  isHotStreak: boolean;
  isSpinning: boolean;
  lastResult: SpinResult | null;
  sessionSpent: number;
  spinMultiple: (count: number) => unknown;
  status: SlotMachineStatus | null;
  toggleAutoSpin: () => unknown;
  winStreak: number;
}

export function SlotControls({
  handleSpin,
  isAutoSpinning,
  isHotStreak,
  isSpinning,
  lastResult,
  sessionSpent,
  spinMultiple,
  status,
  toggleAutoSpin,
  winStreak,
}: SlotControlsProps) {
  return (
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
            {isHotStreak ? <Flame className="w-5 h-5" /> : <Zap className="w-5 h-5 fill-current" />}
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
  );
}
