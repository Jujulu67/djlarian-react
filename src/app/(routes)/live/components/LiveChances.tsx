'use client';

import { motion } from 'framer-motion';
import { Download, Loader2 } from 'lucide-react';
import { useEffect } from 'react';
import { useLiveChances } from '../hooks/useLiveChances';

export function LiveChances() {
  const { chances, isLoading, loadChances } = useLiveChances();

  // Écouter les événements de soumission pour recharger les chances immédiatement
  useEffect(() => {
    const handleSubmissionSuccess = () => {
      // Recharger les chances immédiatement après une soumission
      loadChances();
    };

    // Écouter l'événement personnalisé
    window.addEventListener('liveSubmissionSuccess', handleSubmissionSuccess);

    return () => {
      window.removeEventListener('liveSubmissionSuccess', handleSubmissionSuccess);
    };
  }, [loadChances]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.1 }}
      className="glass-modern glass-modern-hover rounded-2xl p-4 sm:p-6 lg:p-5 h-full flex flex-col"
    >
      <h2 className="text-lg sm:text-xl lg:text-lg font-audiowide text-white mb-4">Your Chances</h2>

      <div className="space-y-4 flex-1 flex flex-col justify-between">
        {/* Multiplier */}
        <div className="text-center">
          <p className="text-sm text-gray-400 mb-1">MULTIPLIER</p>
          <p className="text-2xl font-bold text-purple-400">
            {isLoading ? (
              <Loader2 className="w-6 h-6 animate-spin inline-block" />
            ) : (
              `x${chances?.multiplier.toFixed(1) || '1.0'}`
            )}
          </p>
        </div>

        {/* Chances */}
        <div className="text-center">
          <p className="text-5xl sm:text-6xl font-bold text-white mb-2">
            {isLoading ? (
              <Loader2 className="w-12 h-12 animate-spin inline-block" />
            ) : (
              `${chances?.chancePercentage.toFixed(2) || '00.00'}%`
            )}
          </p>
        </div>

        {/* Statut */}
        <div className="text-center">
          {chances?.isRolled ? (
            <div className="space-y-3">
              <p className="text-2xl sm:text-3xl font-bold text-purple-400 font-audiowide">
                YOU'VE BEEN ROLLED!
              </p>
              <p className="text-sm text-gray-300">
                Congratulations! Your submission was selected.
              </p>
            </div>
          ) : (
            <p className="text-sm text-gray-400">
              {chances?.hasSubmission ? 'SUBMISSION PENDING' : 'NO SUBMISSION'}
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}
