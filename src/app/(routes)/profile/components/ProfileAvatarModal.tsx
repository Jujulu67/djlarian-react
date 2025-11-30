'use client';

import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import ReactDOM from 'react-dom';
import { X } from 'lucide-react';

interface ProfileAvatarModalProps {
  isOpen: boolean;
  imageUrl: string;
  onClose: () => void;
}

export function ProfileAvatarModal({ isOpen, imageUrl, onClose }: ProfileAvatarModalProps) {
  if (typeof window === 'undefined') return null;

  return ReactDOM.createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[99999] bg-black/95 backdrop-blur-sm flex items-center justify-center p-4"
          onMouseDown={(e) => {
            // Fermer uniquement si on clique sur le fond (pas sur l'image)
            if (e.target === e.currentTarget) {
              onClose();
            }
          }}
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
        >
          {/* Bouton de fermeture */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onClose();
            }}
            onMouseDown={(e) => e.stopPropagation()}
            className="absolute top-4 right-4 z-10 w-12 h-12 rounded-full bg-gray-900/80 hover:bg-gray-800/80 border border-gray-700/50 flex items-center justify-center transition-all duration-200 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-purple-500/50 pointer-events-auto"
            aria-label="Fermer"
          >
            <X className="w-6 h-6 text-white" />
          </button>

          {/* Image en grand */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="relative max-w-[90vw] max-h-[90vh] w-full h-full flex items-center justify-center pointer-events-none"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative w-full h-full max-w-[90vw] max-h-[90vh] pointer-events-auto">
              <Image
                src={imageUrl}
                alt="Avatar en grand"
                fill
                className="object-contain"
                unoptimized
                sizes="90vw"
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
