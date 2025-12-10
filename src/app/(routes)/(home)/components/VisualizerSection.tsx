'use client';

import { AnimatePresence, motion } from 'framer-motion';
import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';

// Lazy loading des composants lourds
const ParticleVisualizer = dynamic(() => import('@/components/3d/ParticleVisualizer'), {
  loading: () => (
    <div className="w-full h-full flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
    </div>
  ),
  ssr: false,
});

const RhythmCatcher = dynamic(() => import('@/components/RhythmCatcher'), {
  loading: () => (
    <div className="w-full h-full flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
    </div>
  ),
  ssr: false,
});

interface VisualizerSectionProps {
  title: string;
  waveformAnimationReady: boolean;
}

export default function VisualizerSection({
  title,
  waveformAnimationReady,
}: VisualizerSectionProps) {
  const [isSoundActive, setIsSoundActive] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const visualizerSectionRef = useRef<HTMLElement | null>(null);

  // Détecter si on est sur mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleExperienceClick = () => {
    setIsSoundActive((prev) => !prev);
  };

  // Scroll automatique vers le canvas du jeu quand il est lancé (sur mobile uniquement)
  useEffect(() => {
    if (isSoundActive && isMobile) {
      let retryCount = 0;
      const maxRetries = 15;

      const scrollToGame = () => {
        const gameContainer = document.getElementById('game-container') as HTMLElement;

        if (gameContainer) {
          const canvas = gameContainer.querySelector('.canvasContainer') as HTMLElement;

          if (canvas || retryCount >= 5) {
            window.scrollTo({
              top: 0,
              behavior: 'smooth',
            });

            setTimeout(() => {
              if (window.pageYOffset > 10) {
                window.scrollTo(0, 0);
              }
            }, 500);
          } else if (retryCount < maxRetries) {
            retryCount++;
            setTimeout(scrollToGame, 200);
          }
        } else if (retryCount < maxRetries) {
          retryCount++;
          setTimeout(scrollToGame, 200);
        }
      };

      const timeout = setTimeout(scrollToGame, 1200);

      return () => clearTimeout(timeout);
    }
  }, [isSoundActive, isMobile]);

  useEffect(() => {
    if (isSoundActive) {
      document.documentElement.classList.add('custom-cursor-active', 'sound-active');
    } else {
      document.documentElement.classList.remove('custom-cursor-active', 'sound-active');
    }
    return () => {
      document.documentElement.classList.remove('custom-cursor-active', 'sound-active');
    };
  }, [isSoundActive]);

  // Désactiver le scroll global quand le jeu est actif (sur mobile)
  useEffect(() => {
    if (isMobile && isSoundActive) {
      const disableScrollTimeout = setTimeout(() => {
        const scrollY = window.scrollY;
        document.body.style.position = 'fixed';
        document.body.style.top = `-${scrollY}px`;
        document.body.style.width = '100%';
        document.body.style.overflow = 'hidden';
      }, 1000);

      return () => {
        clearTimeout(disableScrollTimeout);
        const bodyTop = document.body.style.top;
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        document.body.style.overflow = '';
        if (bodyTop) {
          window.scrollTo(0, parseInt(bodyTop || '0') * -1);
        }
      };
    }
  }, [isMobile, isSoundActive]);

  return (
    <section
      id="visualizer"
      ref={visualizerSectionRef}
      className={`${isMobile && !isSoundActive ? 'py-10' : isMobile ? 'py-0' : 'py-20'} relative ${isMobile ? 'overflow-visible' : 'overflow-hidden'}`}
    >
      {/* Animated Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-black via-purple-900/10 to-black">
        <div
          className={`absolute inset-0 bg-gradient-to-r from-purple-900/15 via-blue-900/10 to-purple-900/15 ${isMobile ? '' : 'animate-gradient-pulse'}`}
        />
      </div>

      <div className="max-w-7xl mx-auto px-4 relative z-10">
        <div className="relative group">
          <motion.h2
            initial={isMobile ? { opacity: 0 } : { opacity: 0, y: 20 }}
            whileInView={isMobile ? { opacity: 1 } : { opacity: 1, y: 0 }}
            transition={isMobile ? { duration: 0.3, ease: 'easeOut' } : { duration: 0.6 }}
            viewport={{ once: true, margin: '-50px' }}
            className="text-4xl md:text-5xl font-audiowide mb-12 text-center flex items-center justify-center gap-4"
          >
            <motion.button
              onClick={handleExperienceClick}
              className="cursor-pointer text-gradient-animated transition-all duration-300 glass-modern px-6 py-3 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-black"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              aria-label={isSoundActive ? `Arrêter ${title}` : `Démarrer ${title}`}
            >
              {isSoundActive ? `Stop ${title}` : title}
            </motion.button>
          </motion.h2>
        </div>

        <motion.div
          initial={isMobile ? { opacity: 0, scale: 1 } : { opacity: 0, scale: 0.95 }}
          whileInView={isMobile ? { opacity: 1, scale: 1 } : { opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={isMobile ? { duration: 0.3, ease: 'easeOut' } : { duration: 0.8 }}
          className={`relative w-full ${isMobile ? 'min-h-[30vh]' : 'aspect-[2/1]'} ${isMobile ? 'overflow-visible' : 'overflow-hidden'} rounded-2xl glass-modern border-2 border-purple-500/30 shadow-2xl ${isMobile ? '' : 'animate-glow-border'} ${isSoundActive && isMobile ? 'fixed top-0 left-0 right-0 z-[100] h-screen rounded-none border-0' : ''}`}
          id="game-container"
          style={
            isMobile && !isSoundActive
              ? { scrollMarginTop: '80px', position: 'relative' }
              : { position: 'relative' }
          }
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={isSoundActive ? 'rhythm' : 'particles'}
              initial={isMobile ? { opacity: 0, scale: 1 } : { opacity: 0, y: 20, scale: 0.95 }}
              animate={isMobile ? { opacity: 1, scale: 1 } : { opacity: 1, y: 0, scale: 1 }}
              exit={isMobile ? { opacity: 0, scale: 0.95 } : { opacity: 0, y: -20, scale: 0.95 }}
              transition={
                isMobile
                  ? {
                      duration: 0.3,
                      ease: 'easeOut',
                    }
                  : {
                      duration: 0.6,
                      ease: [0.4, 0, 0.2, 1],
                    }
              }
              className={`w-full ${isMobile ? 'relative min-h-[30vh]' : 'absolute inset-0 h-full'}`}
              style={{ position: isMobile ? 'relative' : 'absolute' }}
            >
              {waveformAnimationReady &&
                (isSoundActive ? (
                  <RhythmCatcher onClose={handleExperienceClick} />
                ) : (
                  <ParticleVisualizer />
                ))}
            </motion.div>
          </AnimatePresence>
        </motion.div>
      </div>
    </section>
  );
}
