'use client';

import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import gsap from 'gsap';
import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';
import useSWR from 'swr';

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

import LatestReleases from '@/components/sections/LatestReleases';
import TwitchStream from '@/components/sections/TwitchStream';
import UpcomingEvents from '@/components/sections/UpcomingEvents';
import ScrollToTop from '@/components/ui/ScrollToTop';
import ScrollProgress from '@/components/ui/ScrollProgress';
import { defaultConfigs } from '@/config/defaults';

// Type pour les configurations de la page d'accueil
interface HomepageConfig {
  heroTitle: string;
  heroSubtitle: string;
  heroExploreButtonText: string;
  heroExploreButtonUrl: string;
  heroEventsButtonText: string;
  heroEventsButtonUrl: string;
  heroBackgroundVideo: string;
  heroPosterImage: string;
  sectionsOrder: string;
  releasesEnabled: boolean;
  releasesTitle: string;
  releasesCount: number;
  visualizerEnabled: boolean;
  visualizerTitle: string;
  eventsEnabled: boolean;
  eventsTitle: string;
  eventsCount: number;
  eventsViewAllText: string;
  eventsViewAllUrl: string;
  streamEnabled: boolean;
  streamTitle: string;
  streamSubtitle: string;
  streamDescription: string;
  twitchUsername: string;
  twitchFollowButtonText: string;
  twitchFollowButtonUrl: string;
  streamNotifyButtonText: string;
  streamStatsEnabled: boolean;
  streamFollowers: string;
  streamHoursStreamed: string;
  streamTracksPlayed: string;
}

// Définir une classe d'erreur personnalisée pour le fetch
class FetchError extends Error {
  info?: unknown;
  status?: number;

  constructor(message: string) {
    super(message);
    this.name = 'FetchError';
  }
}

// Définir la fonction fetcher pour SWR
const fetcher = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    // Pour la config homepage, on retourne les valeurs par défaut en cas d'erreur
    if (url === '/api/config/homepage') {
      return defaultConfigs.homepage;
    }
    const error = new FetchError('An error occurred while fetching the data.');
    // Attach extra info to the error object.
    try {
      error.info = await response.json();
    } catch (e) {
      // Ignore if response is not JSON
    }
    error.status = response.status;
    throw error;
  }
  const result = await response.json();
  // Les routes qui utilisent createSuccessResponse retournent { data: ... }
  // Les routes qui utilisent NextResponse.json directement retournent les données directement
  // On détecte automatiquement le format en vérifiant si result.data existe
  if (result && typeof result === 'object' && 'data' in result && !('error' in result)) {
    return result.data;
  }
  return result;
};

export default function HomePage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isSoundActive, setIsSoundActive] = useState(false);
  // État pour stocker les configurations de la page d'accueil
  const [config, setConfig] = useState<HomepageConfig | null>(null);
  // État pour stocker l'ordre des sections
  const [sectionOrder, setSectionOrder] = useState<string[]>([
    'hero',
    'releases',
    'visualizer',
    'events',
    'stream',
  ]);

  // Charger les configurations de la page d'accueil (API publique)
  const {
    data: configData,
    error: configError,
    isLoading: configLoading,
  } = useSWR('/api/config/homepage', fetcher);

  // Utiliser useSWR pour récupérer les événements
  const {
    data: eventsData,
    error: eventsError,
    isLoading: eventsLoading,
  } = useSWR('/api/events', fetcher);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end start'],
  });

  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.5], [1, 0.8]);

  // Parallax effect for hero content
  const heroY = useTransform(scrollYProgress, [0, 1], [0, -50]);

  // Configurer les animations et appliquer les configurations
  useEffect(() => {
    if (!containerRef.current) return;
    const tl = gsap.timeline({ repeat: -1 });
    tl.to('.waveform', {
      backgroundPositionX: '100%',
      duration: 10,
      ease: 'none',
    });
    return () => {
      tl.kill();
    };
  }, []);

  // Extraire les configurations de la page d'accueil lors du chargement des données
  useEffect(() => {
    if (configData) {
      // configData est directement la homepage config depuis la nouvelle API
      setConfig(configData);

      // Définir l'ordre des sections si disponible
      if (configData.sectionsOrder) {
        setSectionOrder(configData.sectionsOrder.split(','));
      }
    } else if (!configLoading && !configError) {
      // Si pas de données mais pas d'erreur, utiliser les valeurs par défaut
      setConfig(defaultConfigs.homepage);
      setSectionOrder(defaultConfigs.homepage.sectionsOrder.split(','));
    }
  }, [configData, configLoading, configError]);

  const handleExperienceClick = () => {
    setIsSoundActive((prev) => !prev);
  };

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

  // Enable scroll snapping for homepage (CSS only, no JS interference)
  useEffect(() => {
    document.documentElement.classList.add('homepage-scroll-snap');
    return () => {
      document.documentElement.classList.remove('homepage-scroll-snap');
    };
  }, []);

  // Rendu des sections selon l'ordre configuré
  const renderSections = () => {
    // Utiliser les valeurs par défaut si la config n'est pas encore chargée
    const currentConfig = config || defaultConfigs.homepage;

    // Fonction auxiliaire pour rendre chaque section en fonction de son type
    const renderSection = (sectionType: string, sectionIndex: number) => {
      // Seule la première section (index 0) doit être visible immédiatement
      const isFirstSection = sectionIndex === 0;

      switch (sectionType) {
        case 'hero':
          return renderHeroSection();
        case 'releases':
          return currentConfig.releasesEnabled ? (
            <LatestReleases
              title={currentConfig.releasesTitle}
              count={currentConfig.releasesCount}
              isFirstSection={isFirstSection}
            />
          ) : null;
        case 'visualizer':
          return currentConfig.visualizerEnabled ? renderVisualizerSection() : null;
        case 'events':
          return currentConfig.eventsEnabled ? (
            <AnimatePresence mode="wait">
              {eventsLoading ? (
                <motion.section
                  key="events-loader"
                  initial={{ opacity: 0, y: 40 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -40 }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                  className="py-20 bg-gradient-to-b from-black to-purple-900/20"
                  aria-live="polite"
                >
                  <div className="max-w-7xl mx-auto px-4">
                    <div className="flex flex-col gap-6 animate-pulse">
                      {[1, 2].map((i) => (
                        <div
                          key={i}
                          className="bg-gray-900/40 rounded-lg p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-gray-800/40"
                        >
                          <div className="flex-1 w-full">
                            <div className="h-6 bg-gray-700/40 rounded w-2/3 mb-4" />
                            <div className="h-4 bg-gray-700/30 rounded w-1/3 mb-2" />
                            <div className="h-4 bg-gray-700/30 rounded w-1/2" />
                          </div>
                          <div className="h-10 w-32 bg-purple-700/30 rounded-full" />
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.section>
              ) : eventsError ? (
                <motion.section
                  key="events-error"
                  initial={{ opacity: 0, y: 40 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -40 }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                  className="py-20 bg-gradient-to-b from-black to-purple-900/20"
                  aria-live="polite"
                >
                  <div className="max-w-7xl mx-auto px-4">
                    <p className="text-center text-red-400">
                      Erreur lors du chargement des événements.
                    </p>
                  </div>
                </motion.section>
              ) : eventsData && !eventsError ? (
                <motion.section
                  key="events-section"
                  initial={{ opacity: 0, y: 40 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -40 }}
                  transition={{ duration: 0.7, ease: 'easeOut' }}
                  className="py-20 bg-gradient-to-b from-black to-purple-900/20"
                  aria-live="polite"
                >
                  <div className="max-w-7xl mx-auto px-4">
                    <UpcomingEvents
                      events={eventsData?.events || []}
                      title={currentConfig.eventsTitle}
                      count={currentConfig.eventsCount}
                    />
                  </div>
                </motion.section>
              ) : null}
            </AnimatePresence>
          ) : null;
        case 'stream':
          return currentConfig.streamEnabled ? <TwitchStream /> : null;
        default:
          return null;
      }
    };

    // Rendre les sections dans l'ordre configuré avec transitions fluides
    return sectionOrder.map((section, index) => {
      // Seule la première section (index 0) doit être visible immédiatement
      const isFirstSection = index === 0;

      return (
        <motion.div
          key={`section-${section}-${index}`}
          initial={isFirstSection ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          animate={isFirstSection ? { opacity: 1, y: 0 } : undefined}
          whileInView={isFirstSection ? undefined : { opacity: 1, y: 0 }}
          viewport={isFirstSection ? undefined : { once: true, margin: '-100px' }}
          transition={{
            duration: 0.6,
            ease: [0.4, 0, 0.2, 1],
            delay: isFirstSection ? 0 : index * 0.1,
          }}
          className="scroll-snap-section"
          style={{ position: 'relative' }} // Fix for Framer Motion scroll offset warning
        >
          {renderSection(section, index)}
        </motion.div>
      );
    });
  };

  // Rendu de la section héro
  const renderHeroSection = () => {
    const currentConfig = config || defaultConfigs.homepage;

    // Générer des particules flottantes
    const particles = Array.from({ length: 20 }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      delay: `${Math.random() * 15}s`,
      size: `${2 + Math.random() * 4}px`,
    }));

    return (
      <div
        ref={containerRef}
        className="min-h-[calc(100vh-4rem)] relative overflow-hidden"
        style={{ position: 'relative' }}
      >
        {/* Animated Gradient Background Layers */}
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-900/30 via-blue-900/20 to-purple-900/30 animate-gradient-shift bg-[length:200%_200%]" />
          <div className="absolute inset-0 bg-gradient-to-tr from-blue-900/20 via-transparent to-purple-900/20 animate-gradient-pulse" />
        </div>

        {/* Background Video */}
        <div className="absolute inset-0 overflow-hidden z-[1]">
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-black/60 z-10 backdrop-blur-[1px]" />
          <video
            autoPlay
            muted
            loop
            playsInline
            className="w-full h-full object-cover"
            poster={currentConfig.heroPosterImage}
          >
            <source src={currentConfig.heroBackgroundVideo} type="video/mp4" />
          </video>
        </div>

        {/* Floating Particles */}
        {particles.map((particle) => (
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

        {/* Hero Content with Enhanced Glassmorphism and Parallax */}
        <motion.div
          style={{
            opacity,
            scale,
            y: heroY,
          }}
          className="relative z-20 h-[calc(100vh-4rem)] flex flex-col items-center justify-center text-center px-4"
        >
          {/* Glassmorphism Container */}
          <div className="glass-modern rounded-3xl p-8 md:p-12 backdrop-blur-xl border border-white/20 shadow-2xl">
            <motion.h1
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="text-5xl md:text-7xl lg:text-8xl font-audiowide mb-6 text-gradient-animated"
            >
              {currentConfig.heroTitle}
            </motion.h1>

            <motion.p
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
              className="text-xl md:text-2xl text-gray-200 font-montserrat mb-8 max-w-2xl drop-shadow-lg"
            >
              {currentConfig.heroSubtitle}
            </motion.p>

            {/* Enhanced Animated Waveform */}
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 1, ease: 'easeOut', delay: 0.4 }}
              className="waveform w-full max-w-md h-16 bg-gradient-to-r from-purple-500 via-blue-500 to-purple-500 bg-[length:200%_100%] rounded-lg opacity-70 animate-gradient-shift glow-purple mx-auto"
            />

            {/* Modern CTA Buttons */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.8, ease: 'easeOut', delay: 0.6 }}
              className="flex flex-col sm:flex-row gap-4 mt-12 justify-center items-center"
            >
              <a
                href={currentConfig.heroExploreButtonUrl}
                className="btn-modern px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white rounded-full font-montserrat font-semibold text-lg relative overflow-hidden glow-purple animate-glow-pulse focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-black"
                aria-label={currentConfig.heroExploreButtonText}
              >
                <span className="relative z-10">{currentConfig.heroExploreButtonText}</span>
              </a>
              <a
                href={currentConfig.heroEventsButtonUrl}
                className="btn-modern px-8 py-4 border-2 border-white/30 hover:border-white/60 text-white rounded-full font-montserrat font-semibold text-lg relative overflow-hidden glass-modern-hover backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-black"
                aria-label={currentConfig.heroEventsButtonText}
              >
                <span className="relative z-10">{currentConfig.heroEventsButtonText}</span>
              </a>
            </motion.div>
          </div>
        </motion.div>

        {/* Enhanced Scroll Indicator */}
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
      </div>
    );
  };

  // Rendu de la section visualizer
  const renderVisualizerSection = () => {
    const currentConfig = config || defaultConfigs.homepage;

    return (
      <section className="py-20 relative overflow-hidden">
        {/* Animated Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-b from-black via-purple-900/10 to-black">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-900/15 via-blue-900/10 to-purple-900/15 animate-gradient-pulse" />
        </div>

        <div className="max-w-7xl mx-auto px-4 relative z-10">
          <div className="relative group">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-4xl md:text-5xl font-audiowide mb-12 text-center flex items-center justify-center gap-4"
            >
              <motion.button
                onClick={handleExperienceClick}
                className="cursor-pointer text-gradient-animated transition-all duration-300 glass-modern px-6 py-3 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-black"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                aria-label={
                  isSoundActive
                    ? `Arrêter ${currentConfig.visualizerTitle}`
                    : `Démarrer ${currentConfig.visualizerTitle}`
                }
              >
                {isSoundActive
                  ? `Stop ${currentConfig.visualizerTitle}`
                  : currentConfig.visualizerTitle}
              </motion.button>
            </motion.h2>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="relative w-full aspect-[2/1] rounded-2xl overflow-hidden glass-modern animate-glow-border border-2 border-purple-500/30 shadow-2xl"
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={isSoundActive ? 'rhythm' : 'particles'}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                transition={{
                  duration: 0.6,
                  ease: [0.4, 0, 0.2, 1],
                }}
                className="w-full h-full absolute inset-0"
              >
                {isSoundActive ? (
                  <RhythmCatcher onClose={handleExperienceClick} />
                ) : (
                  <ParticleVisualizer />
                )}
              </motion.div>
            </AnimatePresence>
          </motion.div>
        </div>
      </section>
    );
  };

  return (
    <>
      <ScrollProgress />
      <div className="scroll-snap-container">{renderSections()}</div>
      <ScrollToTop />
    </>
  );
}
