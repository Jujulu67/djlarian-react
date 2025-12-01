'use client';

import { motion } from 'framer-motion';
import { Clock, ExternalLink, Sparkles } from 'lucide-react';

export function LiveItemShop() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.3 }}
      className="glass-modern glass-modern-hover rounded-2xl p-3 sm:p-4 lg:p-4 h-full flex flex-col"
    >
      <h2 className="text-base sm:text-lg lg:text-base font-audiowide text-white mb-3">
        ITEM SHOP
      </h2>

      {/* Queue Skip Item */}
      <div className="border-2 border-green-500/50 rounded-xl p-4 bg-gradient-to-br from-green-500/10 to-green-600/5 relative overflow-hidden flex-1 flex flex-col justify-center">
        {/* Glow effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/20 via-transparent to-yellow-400/20 animate-pulse opacity-50" />

        {/* Sparkle effect */}
        <div className="absolute top-2 right-2">
          <Sparkles className="w-4 h-4 text-yellow-400 animate-pulse" />
        </div>

        <div className="relative flex flex-col gap-3">
          {/* Icon and Title */}
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              <div className="w-14 h-14 bg-gradient-to-br from-green-500/30 to-green-600/20 rounded-xl flex items-center justify-center border-2 border-green-400/60 shadow-lg shadow-green-500/20">
                <Clock className="w-7 h-7 text-green-300" />
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-white font-bold text-base mb-0.5">Queue Skip</h3>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-green-400">14€</span>
                <span className="text-xs text-gray-400 line-through">18€</span>
              </div>
            </div>
          </div>

          {/* Description */}
          <p className="text-xs text-gray-300 leading-relaxed">
            Tired of waiting? Skip the Queue! Guarantees you get rolled next when activated. The use
            of a queue skip is visible to everyone!
          </p>

          {/* Button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-4 py-2.5 rounded-lg font-medium flex items-center justify-center gap-2 transition-all shadow-lg shadow-green-500/30"
          >
            <span>CHECKOUT</span>
            <ExternalLink className="w-4 h-4" />
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}
