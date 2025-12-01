'use client';

import { motion } from 'framer-motion';
import { useLiveRewards } from '../hooks/useLiveRewards';
import { useLiveInventoryContext } from '../context/LiveInventoryContext';

export function LiveRewards() {
  const { rewards, isLoading } = useLiveRewards();
  const { updateItem, inventory } = useLiveInventoryContext();

  const handleClaimBonus = async (itemType: string) => {
    // Trouver l'item correspondant dans l'inventaire
    const item = inventory?.unactivatedItems.find((item) => item.LiveItem?.type === itemType);

    if (item) {
      await updateItem({ itemId: item.itemId, action: 'activate' });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.4 }}
      className="glass-modern glass-modern-hover rounded-2xl p-4 sm:p-6 lg:p-5"
    >
      <h2 className="text-lg sm:text-xl lg:text-lg font-audiowide text-white mb-2">YOUR REWARDS</h2>
      <p className="text-xs text-gray-400 mb-6">
        {/* KEEP TRACK OF YOUR STREAKS AND BONUS ITEMS. THE MORE STREAMS YOU WATCH, THE MORE YOU
        EARN. */}
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        {/* Loyalty Card */}
        <motion.div
          whileHover={{ scale: 1.02, y: -2 }}
          className="bg-gradient-to-br from-purple-500/20 to-purple-600/10 border border-purple-500/30 rounded-xl p-6 relative overflow-hidden"
        >
          {/* Large number in background */}
          <div className="absolute inset-0 flex items-center justify-center opacity-10">
            <span className="text-8xl font-bold text-white">
              {rewards?.loyalty.current || 0}/{rewards?.loyalty.threshold || 10}
            </span>
          </div>
          <div className="relative z-10">
            <h3 className="text-lg font-audiowide text-white mb-3">LOYALTY</h3>
            <p className="text-sm text-gray-300 mb-4">
              Increases for every stream you watch and decreases whenever you miss a stream. When
              above 6, grants the Loyalty Bonus item.
            </p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleClaimBonus('LOYALTY_BONUS')}
              disabled={!rewards?.loyalty.bonusAvailable || isLoading}
              className="w-full bg-purple-500 hover:bg-purple-600 text-white py-3 px-4 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Loyalty Bonus
            </motion.button>
          </div>
        </motion.div>

        {/* Watch Streak Card */}
        <motion.div
          whileHover={{ scale: 1.02, y: -2 }}
          className="bg-gradient-to-br from-green-500/20 to-green-600/10 border border-green-500/30 rounded-xl p-6 relative overflow-hidden"
        >
          {/* Large number in background */}
          <div className="absolute inset-0 flex items-center justify-center opacity-10">
            <span className="text-8xl font-bold text-white">
              {rewards?.watchStreak.current || 0}/{rewards?.watchStreak.threshold || 10}
            </span>
          </div>
          <div className="relative z-10">
            <h3 className="text-lg font-audiowide text-white mb-3">WATCH STREAK</h3>
            <p className="text-sm text-gray-300 mb-4">
              Increases when you watch streams. Grants a Watch Streak Bonus Item when full.
            </p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleClaimBonus('WATCH_STREAK')}
              disabled={!rewards?.watchStreak.bonusAvailable || isLoading}
              className="w-full bg-green-500 hover:bg-green-600 text-white py-3 px-4 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Watch Streak Bonus
            </motion.button>
          </div>
        </motion.div>

        {/* Cheer Progress Card */}
        <motion.div
          whileHover={{ scale: 1.02, y: -2 }}
          className="bg-gradient-to-br from-red-500/20 to-red-600/10 border border-red-500/30 rounded-xl p-6 relative overflow-hidden"
        >
          {/* Large number in background */}
          <div className="absolute inset-0 flex items-center justify-center opacity-10">
            <span className="text-8xl font-bold text-white">
              {rewards?.cheerProgress.current || 0}/{rewards?.cheerProgress.threshold || 1}
            </span>
          </div>
          <div className="relative z-10">
            <h3 className="text-lg font-audiowide text-white mb-3">CHEER PROGRESS</h3>
            <p className="text-sm text-gray-300 mb-4">
              Your progress towards earning a Cheer Bonus item.
            </p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleClaimBonus('CHEER_PROGRESS')}
              disabled={!rewards?.cheerProgress.bonusAvailable || isLoading}
              className="w-full bg-red-500 hover:bg-red-600 text-white py-3 px-4 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              1+ Cheer Bonus
            </motion.button>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
