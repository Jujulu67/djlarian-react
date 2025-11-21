'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUp } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function ScrollToTop() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    let ticking = false;

    const toggleVisibility = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const shouldShow = window.scrollY > 300;
          setIsVisible((prev) => {
            // Ne mettre à jour que si l'état change vraiment
            if (prev !== shouldShow) {
              return shouldShow;
            }
            return prev;
          });
          ticking = false;
        });
        ticking = true;
      }
    };

    // Vérifier l'état initial
    toggleVisibility();

    window.addEventListener('scroll', toggleVisibility, { passive: true });
    return () => window.removeEventListener('scroll', toggleVisibility);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  return (
    <AnimatePresence mode="wait">
      {isVisible && (
        <motion.button
          key="scroll-to-top"
          initial={{ opacity: 0, scale: 0.5, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.5, y: 20 }}
          transition={{
            duration: 0.4,
            ease: [0.4, 0, 0.2, 1],
          }}
          onClick={scrollToTop}
          className="fixed bottom-8 right-8 z-[100] p-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 border border-white/20 glow-purple focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-black overflow-hidden"
          style={{ borderRadius: '9999px' }}
          aria-label="Retour en haut de la page"
        >
          <ArrowUp className="w-6 h-6 relative z-10" />
        </motion.button>
      )}
    </AnimatePresence>
  );
}
