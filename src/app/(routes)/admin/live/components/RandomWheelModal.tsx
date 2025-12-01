'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import { X } from 'lucide-react';
import { RandomWheel } from './RandomWheel';
import type { SubmissionWithUser } from '../hooks/useAdminLiveSubmissions';

interface RandomWheelModalProps {
  isOpen: boolean;
  submissions: SubmissionWithUser[];
  weights: number[]; // Poids correspondant à chaque soumission
  queueSkipFlags?: boolean[]; // Indique si chaque soumission a Queue Skip activé
  selectedSubmissionId: string | null;
  onClose: () => void;
  onSelectionComplete: (submissionId: string) => void;
}

export function RandomWheelModal({
  isOpen,
  submissions,
  weights,
  queueSkipFlags = [],
  selectedSubmissionId,
  onClose,
  onSelectionComplete,
}: RandomWheelModalProps) {
  const [isSpinning, setIsSpinning] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  // Trouver l'index de la soumission sélectionnée
  useEffect(() => {
    if (selectedSubmissionId && submissions.length > 0) {
      const index = submissions.findIndex((s) => s.id === selectedSubmissionId);
      if (index !== -1) {
        setSelectedIndex(index);
      }
    }
  }, [selectedSubmissionId, submissions]);

  // Réinitialiser l'état quand la modale se ferme
  useEffect(() => {
    if (!isOpen) {
      setIsSpinning(false);
      setSelectedIndex(null);
    }
  }, [isOpen]);

  // Démarrer le spin quand la modale s'ouvre
  useEffect(() => {
    if (isOpen && selectedIndex !== null && submissions.length > 0) {
      setIsSpinning(true);
    }
  }, [isOpen, selectedIndex, submissions.length]);

  const handleSpinComplete = () => {
    setIsSpinning(false);

    if (selectedSubmissionId) {
      // Attendre un peu avant de fermer pour voir le résultat
      setTimeout(async () => {
        await onSelectionComplete(selectedSubmissionId);
        // Attendre un peu pour que l'API se termine avant de fermer
        setTimeout(() => {
          onClose();
        }, 200);
      }, 1000);
    }
  };

  const handleClose = () => {
    onClose();
  };

  if (typeof window === 'undefined') return null;

  return ReactDOM.createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={handleClose}
        >
          {/* Contenu de la modale */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Bouton de fermeture */}
            <button
              onClick={handleClose}
              className="absolute -top-12 right-0 p-2 text-white hover:text-purple-400 transition-colors z-10"
              aria-label="Fermer"
            >
              <X className="w-6 h-6" />
            </button>

            {/* Conteneur de la roue avec glassmorphism */}
            <div className="glass-modern rounded-3xl p-8 sm:p-12 border border-purple-500/30 shadow-2xl bg-black/60 backdrop-blur-xl">
              <div className="flex flex-col items-center gap-6">
                <h2 className="text-2xl sm:text-3xl font-audiowide text-white mb-2">
                  {isSpinning ? 'La roue tourne...' : 'Résultat'}
                </h2>

                {submissions.length > 0 ? (
                  <RandomWheel
                    submissions={submissions}
                    weights={weights}
                    queueSkipFlags={queueSkipFlags}
                    selectedIndex={selectedIndex}
                    isSpinning={isSpinning}
                    onSpinComplete={handleSpinComplete}
                  />
                ) : (
                  <div className="text-gray-400 text-center py-8">Aucune soumission disponible</div>
                )}

                {!isSpinning && selectedIndex !== null && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center"
                  >
                    {queueSkipFlags[selectedIndex] && (
                      <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="mb-3"
                      >
                        <motion.p
                          className="text-2xl sm:text-3xl font-audiowide font-bold text-yellow-400"
                          animate={{
                            textShadow: [
                              '0 0 10px rgba(251, 191, 36, 0.8)',
                              '0 0 20px rgba(251, 191, 36, 1)',
                              '0 0 10px rgba(251, 191, 36, 0.8)',
                            ],
                          }}
                          transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: 'easeInOut',
                          }}
                        >
                          QUEUE SKIP!
                        </motion.p>
                      </motion.div>
                    )}
                    <p
                      className={`text-lg font-semibold ${
                        queueSkipFlags[selectedIndex] ? 'text-yellow-400' : 'text-purple-300'
                      }`}
                    >
                      {submissions[selectedIndex]?.User.name || 'Unknown'}
                    </p>
                    <p className="text-sm text-gray-400 mt-1">
                      {submissions[selectedIndex]?.title}
                    </p>
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
