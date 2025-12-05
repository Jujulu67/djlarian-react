'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, Gamepad2, Sparkles } from 'lucide-react';
import ReactDOM from 'react-dom';

interface SlotMachineSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (version: 'retro' | 'modern') => void;
}

export function SlotMachineSelectionDialog({
  isOpen,
  onClose,
  onSelect,
}: SlotMachineSelectionDialogProps) {
  if (!isOpen) return null;

  const content = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="relative w-full max-w-3xl mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Bouton de fermeture */}
            <button
              onClick={onClose}
              className="absolute -top-12 right-0 p-2 text-gray-400 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-colors"
              aria-label="Fermer"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="text-center mb-8">
              <h2 className="text-3xl sm:text-4xl font-audiowide text-white mb-2">
                Choisissez votre style
              </h2>
              <p className="text-gray-400">Deux façons de tenter votre chance</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Version Retro */}
              <motion.div
                whileHover={{ scale: 1.02, y: -5 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onSelect('retro')}
                className="group relative cursor-pointer overflow-hidden rounded-2xl border border-purple-500/30 bg-gradient-to-br from-[#1a0f2a] to-[#0c0117] p-1"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-blue-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                <div className="relative h-full flex flex-col items-center justify-center p-8 rounded-xl bg-black/40 backdrop-blur-sm">
                  <div className="w-24 h-24 mb-6 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shadow-lg shadow-purple-500/30 group-hover:shadow-purple-500/50 transition-all">
                    <Gamepad2 className="w-12 h-12 text-white" />
                  </div>

                  <h3 className="text-2xl font-bold text-white mb-2 font-audiowide">Retro</h3>
                  <p className="text-gray-400 text-center text-sm">
                    L'expérience classique avec des emojis et un style arcade.
                  </p>

                  <div className="mt-6 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm text-purple-300 group-hover:bg-purple-500 group-hover:text-white transition-colors">
                    Jouer en Retro
                  </div>
                </div>
              </motion.div>

              {/* Version Moderne */}
              <motion.div
                whileHover={{ scale: 1.02, y: -5 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onSelect('modern')}
                className="group relative cursor-pointer overflow-hidden rounded-2xl border border-pink-500/30 bg-gradient-to-br from-[#2a0f1a] to-[#17010c] p-1"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-pink-500/20 to-orange-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                <div className="relative h-full flex flex-col items-center justify-center p-8 rounded-xl bg-black/40 backdrop-blur-sm">
                  <div className="w-24 h-24 mb-6 rounded-full bg-gradient-to-br from-pink-500 to-orange-500 flex items-center justify-center shadow-lg shadow-pink-500/30 group-hover:shadow-pink-500/50 transition-all">
                    <Sparkles className="w-12 h-12 text-white" />
                  </div>

                  <h3 className="text-2xl font-bold text-white mb-2 font-audiowide">Moderne</h3>
                  <p className="text-gray-400 text-center text-sm">
                    Une nouvelle expérience immersive avec des graphismes HD.
                  </p>

                  <div className="mt-6 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm text-pink-300 group-hover:bg-pink-500 group-hover:text-white transition-colors">
                    Jouer en Moderne
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  if (typeof window === 'undefined') return null;
  return ReactDOM.createPortal(content, document.body);
}
