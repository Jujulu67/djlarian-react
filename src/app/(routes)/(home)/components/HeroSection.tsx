'use client';

import {
  motion,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from 'framer-motion';
import Image from 'next/image';
import { Fragment, useEffect, useRef, useState } from 'react';
import type { PointerEvent, ReactNode } from 'react';

import { Button } from '@/components/ui/Button';
import { useUiVersion } from '@/hooks/useUiVersion';
import { durations, easeOutExpo, springs } from '@/lib/motion';
import { HomepageConfig } from '@/types/config';

interface HeroSectionProps {
  config: HomepageConfig;
}

// Helper function pour générer les particules (en dehors du composant pour éviter les problèmes de pureté)
function generateParticles() {
  return Array.from({ length: 20 }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    delay: `${Math.random() * 15}s`,
    size: `${2 + Math.random() * 4}px`,
  }));
}

/** Décalage entre deux mots du titre (reveal en masque, UI v2) */
const TITLE_WORD_STAGGER = 0.08;
/** Amplitude max de l'effet magnétique du CTA principal (px) */
const MAGNET_MAX_OFFSET = 6;

/**
 * Titre du hero en v2 : chaque mot monte de 100 % à 0 dans un masque (overflow-hidden).
 * Le texte complet reste lisible par les lecteurs d'écran.
 */
function MaskedTitle({ text, reduceMotion }: { text: string; reduceMotion: boolean }) {
  const words = text.split(/\s+/).filter(Boolean);

  return (
    <h1 className="text-display mb-5 text-[2.75rem] text-white sm:text-6xl md:text-7xl lg:text-8xl">
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {words.map((word, index) => (
          <Fragment key={`${word}-${index}`}>
            {/* pb/-mb : laisse de la place aux jambages sans décaler la ligne */}
            <span className="-mb-[0.12em] inline-block overflow-hidden pb-[0.12em] align-bottom">
              <motion.span
                className="inline-block will-change-transform"
                initial={reduceMotion ? false : { y: '100%' }}
                animate={{ y: '0%' }}
                transition={{
                  duration: durations.slower,
                  ease: easeOutExpo,
                  delay: 0.1 + index * TITLE_WORD_STAGGER,
                }}
              >
                {word}
              </motion.span>
            </span>
            {index < words.length - 1 && ' '}
          </Fragment>
        ))}
      </span>
    </h1>
  );
}

/**
 * Léger effet magnétique (≤ 6 px) : souris uniquement (pointer: fine), désactivé si
 * l'utilisateur réduit les animations.
 */
function Magnetic({ children, disabled }: { children: ReactNode; disabled: boolean }) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, springs.snappy);
  const springY = useSpring(y, springs.snappy);

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (disabled || event.pointerType !== 'mouse') return;
    if (!window.matchMedia('(pointer: fine)').matches) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const dx = (event.clientX - (rect.left + rect.width / 2)) / (rect.width / 2);
    const dy = (event.clientY - (rect.top + rect.height / 2)) / (rect.height / 2);
    const clamp = (value: number) => Math.max(-1, Math.min(1, value));
    x.set(clamp(dx) * MAGNET_MAX_OFFSET);
    y.set(clamp(dy) * MAGNET_MAX_OFFSET);
  };

  const reset = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      className="w-full sm:w-auto"
      style={{ x: springX, y: springY }}
      onPointerMove={handlePointerMove}
      onPointerLeave={reset}
    >
      {children}
    </motion.div>
  );
}

export default function HeroSection({ config }: HeroSectionProps) {
  const isV2 = useUiVersion() !== 'legacy';
  const reduceMotion = useReducedMotion() ?? false;
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [waveformAnimationReady, setWaveformAnimationReady] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [readyForOtherAnimations, setReadyForOtherAnimations] = useState(false);
  const [criticalDataLoaded, setCriticalDataLoaded] = useState(true); // Déjà chargé côté serveur

  // Détecter si on est sur mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Démarrer la vidéo uniquement après que l'animation de déploiement soit terminée
  useEffect(() => {
    if (waveformAnimationReady && videoLoaded && !videoFailed && videoRef.current) {
      const video = videoRef.current;
      video.currentTime = 0;
      video.play().catch((err) => {
        console.warn('[Waveform] Erreur lors du démarrage de la vidéo:', err);
      });
    }
  }, [waveformAnimationReady, videoLoaded, videoFailed]);

  // Optimiser useScroll sur mobile
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end start'],
  });

  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, isMobile ? 1 : 0]);
  const scale = useTransform(scrollYProgress, [0, 0.5], [1, isMobile ? 1 : 0.8]);
  const heroY = useTransform(scrollYProgress, [0, 1], [0, isMobile ? 0 : -50]);

  // Sortie v2 liée au scroll : fondu, léger recul et flou (flou desktop uniquement).
  // Le filtre reste à `none` au repos : un filtre actif couperait le backdrop-filter du verre.
  const v2Opacity = useTransform(scrollYProgress, [0, 0.55], [1, 0]);
  const v2Scale = useTransform(scrollYProgress, [0, 0.55], [1, 0.96]);
  const v2Filter = useTransform(scrollYProgress, (progress) => {
    const blur = Math.min(progress / 0.55, 1) * 6;
    return blur < 0.1 ? 'none' : `blur(${blur.toFixed(2)}px)`;
  });

  // Générer des particules flottantes - désactivées sur mobile
  // Utilisation de useState avec initialisation lazy pour éviter les appels impurs pendant le rendu
  const [particles] = useState(() => generateParticles());

  // v2 : le contenu apparaît tout de suite (le titre ne dépend plus du déploiement du waveform)
  const v2Enter = (delay: number) => ({
    initial: reduceMotion ? false : { y: 12, opacity: 0 },
    animate: { y: 0, opacity: 1 },
    transition: { duration: durations.slower, ease: easeOutExpo, delay },
  });

  return (
    <div
      ref={containerRef}
      className="min-h-[calc(100vh-4rem)] relative overflow-hidden v2:min-h-svh v2:first:-mt-20"
      style={{ position: 'relative' }}
    >
      {/* Animated Gradient Background Layers */}
      <div className="absolute inset-0 z-0 v2:hidden">
        <div
          className={`absolute inset-0 bg-gradient-to-br from-purple-900/30 via-blue-900/20 to-purple-900/30 bg-[length:200%_200%] ${isMobile ? '' : 'animate-gradient-shift'}`}
          style={{
            willChange: isMobile ? 'auto' : 'background-position',
            transform: 'translateZ(0)',
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            animationDelay: '1s',
          }}
        />
        <div
          className={`absolute inset-0 bg-gradient-to-tr from-blue-900/20 via-transparent to-purple-900/20 ${isMobile ? '' : 'animate-gradient-pulse'}`}
          style={{
            willChange: isMobile ? 'auto' : 'opacity',
            transform: 'translateZ(0)',
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            animationDelay: '1.2s',
          }}
        />
      </div>

      {/* Background Image (Spotify Banner) - Optimisé */}
      <div className="absolute inset-0 overflow-hidden z-[1]">
        <Image
          src="/images/spotify/spotify_banner.png"
          alt="Hero Background"
          fill
          className="object-cover object-center"
          priority
          quality={75}
          sizes="100vw"
        />

        {/* Gradient Overlays (v2 : fondu vers le fond de page pour enchaîner sur les sections) */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/40 to-black/80 z-10 v2:from-black/55 v2:via-black/40 v2:to-[rgb(var(--bg))]" />
        <div className="absolute inset-0 bg-purple-900/20 mix-blend-overlay z-10 v2:hidden" />
      </div>

      {/* Floating Particles */}
      {!isMobile &&
        particles.map((particle) => (
          <div
            key={particle.id}
            className="particle v2:hidden"
            style={{
              left: particle.left,
              top: '100%',
              animationDelay: particle.delay,
              width: particle.size,
              height: particle.size,
            }}
          />
        ))}

      {/* Hero Content */}
      <motion.div
        style={
          isV2
            ? {
                opacity: v2Opacity,
                scale: v2Scale,
                filter: isMobile ? undefined : v2Filter,
                y: heroY,
                position: 'relative',
              }
            : {
                opacity: isMobile ? 1 : opacity,
                scale: isMobile ? 1 : scale,
                y: heroY,
                position: 'relative',
              }
        }
        className="relative z-20 h-[calc(100vh-4rem)] flex flex-col items-center justify-center text-center px-4 v2:h-svh v2:min-h-[34rem] v2:pt-20"
      >
        <div
          className={
            isV2
              ? 'surface-1 w-full max-w-3xl rounded-[2rem] px-6 py-10 sm:px-10 md:px-14 md:py-14'
              : 'glass-modern rounded-3xl p-8 md:p-12 backdrop-blur-xl border border-white/20 shadow-2xl'
          }
          style={{ willChange: isMobile ? 'auto' : 'transform' }}
        >
          {/* Profile Picture */}
          <motion.div
            {...(isV2
              ? v2Enter(0)
              : {
                  initial: isMobile ? { opacity: 1 } : { y: -20, opacity: 0 },
                  animate:
                    isMobile || readyForOtherAnimations
                      ? isMobile
                        ? undefined
                        : { y: 0, opacity: 1 }
                      : { y: -20, opacity: 0 },
                  transition: isMobile ? undefined : { duration: 0.6, ease: 'easeOut' },
                })}
            className="mb-8 relative w-24 h-24 md:w-32 md:h-32 mx-auto rounded-full overflow-hidden shadow-2xl ring-4 ring-white/10 v2:mb-7 v2:h-20 v2:w-20 md:v2:h-24 md:v2:w-24 v2:shadow-none v2:ring-1 v2:ring-white/15"
            style={{ willChange: isMobile ? 'auto' : 'transform, opacity' }}
          >
            <Image
              src="/images/spotify/profile_pic.jpg"
              alt="Larian Profile"
              fill
              className="object-cover"
              style={{ objectPosition: '50% 20%' }}
              priority
            />
          </motion.div>

          {isV2 ? (
            <MaskedTitle text={config.heroTitle} reduceMotion={reduceMotion} />
          ) : (
            <motion.h1
              initial={isMobile ? { opacity: 1 } : { y: 20, opacity: 0 }}
              animate={
                isMobile || readyForOtherAnimations
                  ? isMobile
                    ? undefined
                    : { y: 0, opacity: 1 }
                  : { y: 20, opacity: 0 }
              }
              transition={isMobile ? undefined : { duration: 0.6, ease: 'easeOut', delay: 0.1 }}
              className={`text-5xl md:text-7xl lg:text-8xl font-audiowide mb-6 ${isMobile ? 'text-gradient' : 'text-gradient-animated'}`}
              style={{ willChange: isMobile ? 'auto' : 'transform, opacity' }}
            >
              {config.heroTitle}
            </motion.h1>
          )}

          <motion.p
            {...(isV2
              ? v2Enter(0.35)
              : {
                  initial: isMobile ? { opacity: 1 } : { y: 20, opacity: 0 },
                  animate:
                    isMobile || readyForOtherAnimations
                      ? isMobile
                        ? undefined
                        : { y: 0, opacity: 1 }
                      : { y: 20, opacity: 0 },
                  transition: isMobile ? undefined : { duration: 0.6, ease: 'easeOut', delay: 0.3 },
                })}
            className="text-xl md:text-2xl text-gray-200 font-montserrat mb-8 max-w-2xl drop-shadow-lg v2:mx-auto v2:max-w-xl v2:text-base sm:v2:text-lg md:v2:text-xl v2:leading-relaxed v2:text-white/60 v2:drop-shadow-none"
            style={{ willChange: isMobile ? 'auto' : 'transform, opacity' }}
          >
            {config.heroSubtitle}
          </motion.p>

          {/* Enhanced Animated Waveform */}
          <motion.div
            initial={{ scaleX: 0, opacity: 0 }}
            animate={
              criticalDataLoaded
                ? { scaleX: 1, opacity: isV2 ? 0.9 : 0.7 }
                : { scaleX: 0, opacity: 0 }
            }
            transition={
              isV2
                ? { duration: durations.slower, ease: easeOutExpo, delay: 0.25 }
                : {
                    duration: 0.8,
                    ease: [0.25, 0.1, 0.25, 1],
                    delay: 0,
                  }
            }
            onAnimationComplete={() => {
              setWaveformAnimationReady(true);
              setReadyForOtherAnimations(true);
            }}
            className={
              isV2
                ? 'waveform relative mx-auto h-12 w-full max-w-sm overflow-hidden rounded-full ring-1 ring-inset ring-white/10'
                : 'waveform w-full max-w-md h-16 rounded-lg glow-purple mx-auto relative overflow-hidden'
            }
            style={{
              position: 'relative',
              willChange: 'transform, opacity',
              transform: 'translateZ(0)',
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              isolation: 'isolate',
              contain: 'layout style paint',
            }}
          >
            {/* Video - Lazy loaded avec preload metadata */}
            {!videoFailed && (
              <video
                autoPlay={false}
                muted
                loop
                playsInline
                preload="metadata"
                className="absolute inset-0 w-full h-full object-cover opacity-50 mix-blend-overlay"
                style={{
                  opacity: videoLoaded && waveformAnimationReady ? 0.5 : 0,
                  transition: 'opacity 0.3s ease-in',
                }}
                ref={videoRef}
                onLoadedData={() => {
                  setVideoLoaded(true);
                }}
                onTimeUpdate={(e) => {
                  const video = e.currentTarget;
                  if (video.duration && video.currentTime >= video.duration - 0.1) {
                    video.currentTime = 0;
                  }
                }}
                onError={() => {
                  setVideoFailed(true);
                  setWaveformAnimationReady(true);
                }}
              >
                <source src="/videos/waveform-gradient.mp4" type="video/mp4" />
              </video>
            )}

            {/* Fallback gradient CSS (v2 : dégradé fixe, pas d'animation en boucle) */}
            <div
              className={
                isV2
                  ? 'absolute inset-0 bg-gradient-to-r from-brand-indigo via-brand to-brand-magenta'
                  : `absolute inset-0 bg-gradient-to-r from-purple-500 via-blue-500 to-purple-500 bg-[length:200%_100%] ${(!videoLoaded || videoFailed) && waveformAnimationReady ? 'waveform-animated' : ''}`
              }
              style={{
                opacity: !videoLoaded || videoFailed ? 1 : 0,
                display: !videoLoaded || videoFailed ? 'block' : 'none',
                transition: 'opacity 0.3s ease-out',
              }}
            />
          </motion.div>

          {/* CTA Buttons */}
          {isV2 ? (
            <motion.div
              {...v2Enter(0.5)}
              className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row"
            >
              <Magnetic disabled={reduceMotion}>
                <Button asChild size="lg" className="h-12 w-full px-7 text-base sm:w-auto">
                  <a href={config.heroExploreButtonUrl} aria-label={config.heroExploreButtonText}>
                    {config.heroExploreButtonText}
                  </a>
                </Button>
              </Magnetic>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-12 w-full px-7 text-base sm:w-auto"
              >
                <a href={config.heroEventsButtonUrl} aria-label={config.heroEventsButtonText}>
                  {config.heroEventsButtonText}
                </a>
              </Button>
            </motion.div>
          ) : (
            <motion.div
              initial={isMobile ? { opacity: 1 } : { y: 20, opacity: 0 }}
              animate={
                isMobile || readyForOtherAnimations
                  ? isMobile
                    ? undefined
                    : { y: 0, opacity: 1 }
                  : { y: 20, opacity: 0 }
              }
              transition={isMobile ? undefined : { duration: 0.6, ease: 'easeOut', delay: 0.8 }}
              className="flex flex-col sm:flex-row gap-4 mt-12 justify-center items-center"
              style={{
                position: 'relative',
                willChange: isMobile ? 'auto' : 'transform, opacity',
              }}
            >
              <a
                href={config.heroExploreButtonUrl}
                className="btn-modern px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white rounded-full font-montserrat font-semibold text-lg relative overflow-hidden glow-purple animate-glow-pulse focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-black"
                aria-label={config.heroExploreButtonText}
              >
                <span className="relative z-10">{config.heroExploreButtonText}</span>
              </a>
              <a
                href={config.heroEventsButtonUrl}
                className="btn-modern px-8 py-4 border-2 border-white/30 hover:border-white/60 text-white rounded-full font-montserrat font-semibold text-lg relative overflow-hidden glass-modern-hover backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-black"
                aria-label={config.heroEventsButtonText}
              >
                <span className="relative z-10">{config.heroEventsButtonText}</span>
              </a>
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* Scroll Indicator */}
      {!isMobile &&
        (isV2 ? (
          <motion.div
            style={{ opacity: v2Opacity }}
            className="pointer-events-none absolute bottom-8 left-1/2 z-20 flex -translate-x-1/2 flex-col items-center gap-3 [@media(max-height:880px)]:hidden"
            aria-hidden="true"
          >
            <span className="text-[11px] font-medium uppercase tracking-[0.3em] text-white/40">
              Scroll
            </span>
            <span className="h-10 w-px bg-gradient-to-b from-white/40 to-transparent" />
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1, duration: 1 }}
            className="absolute bottom-16 left-1/2 transform -translate-x-1/2 flex flex-col items-center z-20 glass-modern px-4 py-3 rounded-full"
            aria-label="Scroll Indicator"
          >
            <span className="text-white text-sm mb-2 font-montserrat">Scroll to Explore</span>
            <div className="w-0.5 h-8 bg-white/30 relative overflow-hidden rounded-full">
              <motion.div
                animate={{
                  y: [0, 32, 0],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: 'linear',
                }}
                className="w-full h-1/3 bg-gradient-to-b from-purple-400 to-blue-400 absolute top-0 rounded-full"
                aria-hidden="true"
              />
            </div>
          </motion.div>
        ))}
    </div>
  );
}
