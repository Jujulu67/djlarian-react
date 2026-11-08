'use client';

import { useMediaQuery } from '@/hooks/useMediaQuery';
import { AnimatePresence, motion, type MotionProps } from 'framer-motion';
import { Play, Square } from 'lucide-react';
import dynamic from 'next/dynamic';
import type { CSSProperties, ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { SectionHeading } from '@/components/ui/PageHeader';
import { useUiVersion } from '@/hooks/useUiVersion';
import { durations, easeOutExpo } from '@/lib/motion';

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

/** Pendant le jeu : curseur personnalisé et, sur mobile, page calée sur le canvas sans scroll. */
function useGameViewportEffects(isSoundActive: boolean, isMobile: boolean): void {
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
          window.scrollTo(0, Number.parseInt(bodyTop, 10) * -1);
        }
      };
    }
  }, [isMobile, isSoundActive]);
}

interface HeaderProps {
  title: string;
  isSoundActive: boolean;
  isMobile: boolean;
  onToggle: () => void;
}

function getSectionPadding(
  isMobile: boolean,
  isSoundActive: boolean,
  isV2: boolean,
  isV3: boolean
): string {
  if (isMobile) {
    return isSoundActive ? 'py-0' : 'py-10';
  }
  if (isV3) {
    return 'py-12 md:py-16';
  }
  if (isV2) {
    return 'py-16 md:py-24';
  }
  return 'py-20';
}

function getSectionClassName(
  isMobile: boolean,
  isSoundActive: boolean,
  isV2: boolean,
  isV3: boolean
): string {
  const padding = getSectionPadding(isMobile, isSoundActive, isV2, isV3);
  return `${padding} relative ${isMobile ? 'overflow-visible' : 'overflow-hidden'}`;
}

function getFrameSizeClass(isMobile: boolean, isSoundActive: boolean, isV3: boolean): string {
  if (isMobile) {
    return 'min-h-[30vh]';
  }
  return isV3 && !isSoundActive ? 'aspect-[3/1]' : 'aspect-[2/1]';
}

function getFrameSurfaceClass(isV2: boolean, isSoundActive: boolean, isMobile: boolean): string {
  if (!isV2) {
    return 'rounded-2xl glass-premium-container glow-border-premium shadow-2xl';
  }
  if (isSoundActive && isMobile) {
    return 'bg-[rgb(var(--bg))]';
  }
  return 'surface-1 rounded-2xl';
}

function getFrameClassName(
  isV2: boolean,
  isV3: boolean,
  isMobile: boolean,
  isSoundActive: boolean
): string {
  const size = getFrameSizeClass(isMobile, isSoundActive, isV3);
  const surface = getFrameSurfaceClass(isV2, isSoundActive, isMobile);
  const fullscreen =
    isSoundActive && isMobile
      ? 'fixed top-0 left-0 right-0 z-[100] h-screen rounded-none border-0 transition-none'
      : '';
  return `relative w-full ${size} ${isMobile ? 'overflow-visible' : 'overflow-hidden'} ${surface} ${fullscreen}`;
}

function getFrameStyle(isMobile: boolean, isSoundActive: boolean): CSSProperties {
  if (isMobile && !isSoundActive) {
    return { scrollMarginTop: '80px', position: 'relative' };
  }
  return { position: 'relative', overflow: 'hidden' };
}

function getFrameMotionProps(isV2: boolean, isMobile: boolean): MotionProps {
  if (isV2) {
    return {
      initial: { opacity: 0, y: 12 },
      whileInView: { opacity: 1, y: 0 },
      transition: { duration: durations.slower, ease: easeOutExpo },
    };
  }
  return {
    initial: isMobile ? { opacity: 0, scale: 1 } : { opacity: 0, scale: 0.95 },
    whileInView: { opacity: 1, scale: 1 },
    transition: isMobile ? { duration: 0.3, ease: 'easeOut' } : { duration: 0.8 },
  };
}

function getGameTransitionProps(isMobile: boolean): MotionProps {
  return {
    initial: isMobile ? { opacity: 0, scale: 1 } : { opacity: 0, y: 20, scale: 0.95 },
    animate: isMobile ? { opacity: 1, scale: 1 } : { opacity: 1, y: 0, scale: 1 },
    exit: isMobile ? { opacity: 0, scale: 0.95 } : { opacity: 0, y: -20, scale: 0.95 },
    transition: isMobile
      ? { duration: 0.3, ease: 'easeOut' }
      : { duration: 0.6, ease: [0.4, 0, 0.2, 1] },
  };
}

/** v3 : le jeu de rythme mis en avant comme section « Jouer ». */
function V3Header({ isSoundActive, onToggle }: Readonly<HeaderProps>) {
  return (
    <div className="mb-9 flex flex-wrap items-end justify-between gap-6">
      <div>
        <p className="mb-2.5 text-[13px] font-semibold uppercase tracking-[0.2em] text-[rgb(var(--ice))]">
          Mini-jeu
        </p>
        <h2 className="chrome-text text-display text-4xl md:text-5xl">Jouer</h2>
        <p className="mt-4 max-w-md text-white/70">
          Attrape les notes au tempo, directement dans le navigateur.
        </p>
      </div>
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={isSoundActive}
        className="chrome-pill inline-flex h-12 items-center gap-2 rounded-full px-7 text-[15px] font-bold transition-transform hover:-translate-y-0.5"
      >
        {isSoundActive ? (
          <Square className="h-4 w-4" aria-hidden="true" />
        ) : (
          <Play className="h-4 w-4" aria-hidden="true" />
        )}
        {isSoundActive ? 'Arrêter' : 'Lancer le jeu'}
      </button>
    </div>
  );
}

function V2Header({ title, isSoundActive, onToggle }: Readonly<HeaderProps>) {
  return (
    <SectionHeading eyebrow="Visualizer" title={title}>
      <Button
        variant="outline"
        onClick={onToggle}
        className="h-11 shrink-0 rounded-full px-5"
        aria-label={isSoundActive ? `Arrêter ${title}` : `Démarrer ${title}`}
        aria-pressed={isSoundActive}
      >
        {isSoundActive ? (
          <Square className="h-4 w-4" aria-hidden="true" />
        ) : (
          <Play className="h-4 w-4" aria-hidden="true" />
        )}
        {isSoundActive ? 'Stop' : 'Play'}
      </Button>
    </SectionHeading>
  );
}

function LegacyHeader({ title, isSoundActive, isMobile, onToggle }: Readonly<HeaderProps>) {
  return (
    <div className="relative group">
      <motion.h2
        initial={isMobile ? { opacity: 0 } : { opacity: 0, y: 20 }}
        whileInView={isMobile ? { opacity: 1 } : { opacity: 1, y: 0 }}
        transition={isMobile ? { duration: 0.3, ease: 'easeOut' } : { duration: 0.6 }}
        viewport={{ once: true, margin: '-50px' }}
        className="text-4xl md:text-5xl font-audiowide mb-12 text-center flex items-center justify-center gap-4"
      >
        <motion.button
          onClick={onToggle}
          className="cursor-pointer transition-all duration-300 glass-easter-egg px-8 py-3 rounded-2xl md:rounded-full focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:ring-offset-2 focus:ring-offset-black font-audiowide text-3xl md:text-4xl lg:text-5xl"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          aria-label={isSoundActive ? `Arrêter ${title}` : `Démarrer ${title}`}
        >
          <span className="glass-easter-egg-content text-gradient-animated flex items-center justify-center py-1">
            {isSoundActive ? `Stop ${title}` : title}
          </span>
        </motion.button>
      </motion.h2>
    </div>
  );
}

function V3PlayOverlay({ onClick }: Readonly<{ onClick: () => void }>) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Lancer le jeu"
      className="group absolute inset-0 z-10 flex flex-col items-center justify-center gap-4"
    >
      <span className="chrome-pill flex h-16 w-16 items-center justify-center rounded-full transition-transform duration-300 group-hover:scale-105 md:h-20 md:w-20">
        <Play className="h-6 w-6 translate-x-[2px] md:h-7 md:w-7" aria-hidden="true" />
      </span>
      <span className="font-mono-signal text-[11px] uppercase tracking-[0.18em] text-white/70">
        Clique pour jouer
      </span>
    </button>
  );
}

interface GameStageProps {
  isSoundActive: boolean;
  isMobile: boolean;
  waveformAnimationReady: boolean;
  onClose: () => void;
}

function GameStage({
  isSoundActive,
  isMobile,
  waveformAnimationReady,
  onClose,
}: Readonly<GameStageProps>) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={isSoundActive ? 'rhythm' : 'particles'}
        {...getGameTransitionProps(isMobile)}
        className={`w-full ${isMobile ? 'relative min-h-[30vh]' : 'absolute inset-0 h-full'}`}
        style={{ position: isMobile ? 'relative' : 'absolute' }}
      >
        {waveformAnimationReady &&
          (isSoundActive ? <RhythmCatcher onClose={onClose} /> : <ParticleVisualizer />)}
      </motion.div>
    </AnimatePresence>
  );
}

export default function VisualizerSection({
  title,
  waveformAnimationReady,
}: Readonly<VisualizerSectionProps>) {
  const uiVersion = useUiVersion();
  const isV2 = uiVersion !== 'legacy';
  const isV3 = uiVersion === 'v3';
  const [isSoundActive, setIsSoundActive] = useState(false);
  const isMobile = useMediaQuery('(max-width: 768px)');
  const visualizerSectionRef = useRef<HTMLElement | null>(null);

  const handleExperienceClick = () => {
    setIsSoundActive((prev) => !prev);
  };

  useGameViewportEffects(isSoundActive, isMobile);

  const headerProps: HeaderProps = {
    title,
    isSoundActive,
    isMobile,
    onToggle: handleExperienceClick,
  };
  let header: ReactNode;
  if (isV3) {
    header = <V3Header {...headerProps} />;
  } else if (isV2) {
    header = <V2Header {...headerProps} />;
  } else {
    header = <LegacyHeader {...headerProps} />;
  }

  return (
    <section
      id="visualizer"
      ref={visualizerSectionRef}
      className={getSectionClassName(isMobile, isSoundActive, isV2, isV3)}
    >
      {/* Animated Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-black via-purple-900/10 to-black v2:hidden">
        <div
          className={`absolute inset-0 bg-gradient-to-r from-purple-900/15 via-blue-900/10 to-purple-900/15 ${isMobile ? '' : 'animate-gradient-pulse'}`}
        />
      </div>

      <div className="max-w-7xl mx-auto px-4 relative z-10 v2:max-w-[1180px]">
        {header}

        <motion.div
          {...getFrameMotionProps(isV2, isMobile)}
          viewport={{ once: true, margin: '-50px' }}
          className={getFrameClassName(isV2, isV3, isMobile, isSoundActive)}
          id="game-container"
          style={getFrameStyle(isMobile, isSoundActive)}
        >
          {/* Animated glass background layer */}
          {!isV2 && <div className="glass-premium-inner" />}

          <GameStage
            isSoundActive={isSoundActive}
            isMobile={isMobile}
            waveformAnimationReady={waveformAnimationReady}
            onClose={handleExperienceClick}
          />

          {/* v3 : au repos, le cadre invite à jouer plutôt que de rester un fond vide */}
          {isV3 && !isSoundActive && <V3PlayOverlay onClick={handleExperienceClick} />}
        </motion.div>
      </div>
    </section>
  );
}
