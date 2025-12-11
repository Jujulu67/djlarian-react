'use client';

import { motion, useScroll, useTransform } from 'framer-motion';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';

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

export default function HeroSection({ config }: HeroSectionProps) {
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

  // Générer des particules flottantes - désactivées sur mobile
  // Utilisation de useState avec initialisation lazy pour éviter les appels impurs pendant le rendu
  const [particles] = useState(() => generateParticles());

  return (
    <div
      ref={containerRef}
      className="min-h-[calc(100vh-4rem)] relative overflow-hidden"
      style={{ position: 'relative' }}
    >
      {/* Animated Gradient Background Layers */}
      <div className="absolute inset-0 z-0">
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

        {/* Gradient Overlays */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/40 to-black/80 z-10" />
        <div className="absolute inset-0 bg-purple-900/20 mix-blend-overlay z-10" />
      </div>

      {/* Floating Particles */}
      {!isMobile &&
        particles.map((particle) => (
          <div
            key={particle.id}
            className="particle"
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
        style={{
          opacity: isMobile ? 1 : opacity,
          scale: isMobile ? 1 : scale,
          y: heroY,
          position: 'relative',
        }}
        className="relative z-20 h-[calc(100vh-4rem)] flex flex-col items-center justify-center text-center px-4"
      >
        <div
          className="glass-modern rounded-3xl p-8 md:p-12 backdrop-blur-xl border border-white/20 shadow-2xl"
          style={{ willChange: isMobile ? 'auto' : 'transform' }}
        >
          {/* Profile Picture */}
          <motion.div
            initial={isMobile ? { opacity: 1 } : { y: -20, opacity: 0 }}
            animate={
              isMobile || readyForOtherAnimations
                ? isMobile
                  ? undefined
                  : { y: 0, opacity: 1 }
                : { y: -20, opacity: 0 }
            }
            transition={isMobile ? undefined : { duration: 0.6, ease: 'easeOut' }}
            className="mb-8 relative w-24 h-24 md:w-32 md:h-32 mx-auto rounded-full overflow-hidden shadow-2xl ring-4 ring-white/10"
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

          <motion.p
            initial={isMobile ? { opacity: 1 } : { y: 20, opacity: 0 }}
            animate={
              isMobile || readyForOtherAnimations
                ? isMobile
                  ? undefined
                  : { y: 0, opacity: 1 }
                : { y: 20, opacity: 0 }
            }
            transition={isMobile ? undefined : { duration: 0.6, ease: 'easeOut', delay: 0.3 }}
            className="text-xl md:text-2xl text-gray-200 font-montserrat mb-8 max-w-2xl drop-shadow-lg"
            style={{ willChange: isMobile ? 'auto' : 'transform, opacity' }}
          >
            {config.heroSubtitle}
          </motion.p>

          {/* Enhanced Animated Waveform */}
          <motion.div
            initial={{ scaleX: 0, opacity: 0 }}
            animate={criticalDataLoaded ? { scaleX: 1, opacity: 0.7 } : { scaleX: 0, opacity: 0 }}
            transition={{
              duration: 0.8,
              ease: [0.25, 0.1, 0.25, 1],
              delay: 0,
            }}
            onAnimationComplete={() => {
              setWaveformAnimationReady(true);
              setReadyForOtherAnimations(true);
            }}
            className="waveform w-full max-w-md h-16 rounded-lg glow-purple mx-auto relative overflow-hidden"
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

            {/* Fallback gradient CSS */}
            <div
              className={`absolute inset-0 bg-gradient-to-r from-purple-500 via-blue-500 to-purple-500 bg-[length:200%_100%] ${(!videoLoaded || videoFailed) && waveformAnimationReady ? 'waveform-animated' : ''}`}
              style={{
                opacity: !videoLoaded || videoFailed ? 1 : 0,
                display: !videoLoaded || videoFailed ? 'block' : 'none',
                transition: 'opacity 0.3s ease-out',
              }}
            />
          </motion.div>

          {/* CTA Buttons */}
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
        </div>
      </motion.div>

      {/* Scroll Indicator */}
      {!isMobile && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 1 }}
          className="absolute bottom-16 left-1/2 transform -translate-x-1/2 flex flex-col items-center z-20 glass-modern px-4 py-3 rounded-full"
          aria-label="Indicateur de défilement"
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
      )}
    </div>
  );
}
