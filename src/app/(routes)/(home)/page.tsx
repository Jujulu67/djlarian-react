'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import gsap from 'gsap';
import useSWR from 'swr';
import LatestReleases from '@/components/sections/LatestReleases';
import UpcomingEvents from '@/components/sections/UpcomingEvents';
import TwitchStream from '@/components/sections/TwitchStream';
import ParticleVisualizer from '@/components/3d/ParticleVisualizer';
import RhythmCatcher from '@/components/RhythmCatcher';

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
  info?: any;
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
  return response.json();
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

  // Charger les configurations de la page d'accueil
  const {
    data: configData,
    error: configError,
    isLoading: configLoading,
  } = useSWR('/api/admin/config', fetcher);

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
    if (configData && configData.homepage) {
      setConfig(configData.homepage);

      // Définir l'ordre des sections si disponible
      if (configData.homepage.sectionsOrder) {
        setSectionOrder(configData.homepage.sectionsOrder.split(','));
      }
    }
  }, [configData]);

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

  // Rendu des sections selon l'ordre configuré
  const renderSections = () => {
    // Si les configurations ne sont pas encore chargées, attendre
    if (!config || configLoading) {
      return null;
    }

    // Fonction auxiliaire pour rendre chaque section en fonction de son type
    const renderSection = (sectionType: string) => {
      switch (sectionType) {
        case 'hero':
          return renderHeroSection();
        case 'releases':
          return config.releasesEnabled ? (
            <LatestReleases title={config.releasesTitle} count={config.releasesCount} />
          ) : null;
        case 'visualizer':
          return config.visualizerEnabled ? renderVisualizerSection() : null;
        case 'events':
          return config.eventsEnabled ? (
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
                      title={config.eventsTitle}
                      count={config.eventsCount}
                    />
                  </div>
                </motion.section>
              ) : null}
            </AnimatePresence>
          ) : null;
        case 'stream':
          return config.streamEnabled ? <TwitchStream /> : null;
        default:
          return null;
      }
    };

    // Rendre les sections dans l'ordre configuré
    return sectionOrder.map((section, index) => (
      <div key={`section-${section}-${index}`}>{renderSection(section)}</div>
    ));
  };

  // Rendu de la section héro
  const renderHeroSection = () => {
    if (!config) return null;

    return (
      <div ref={containerRef} className="min-h-screen relative">
        {/* Background Video */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black z-10" />
          <video
            autoPlay
            muted
            loop
            playsInline
            className="w-full h-full object-cover"
            poster={config.heroPosterImage}
          >
            <source src={config.heroBackgroundVideo} type="video/mp4" />
          </video>
        </div>

        {/* Hero Content */}
        <motion.div
          style={{ opacity, scale }}
          className="relative z-20 min-h-screen flex flex-col items-center justify-center text-center px-4"
        >
          <motion.h1
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="text-5xl md:text-7xl lg:text-8xl font-audiowide text-white mb-6"
          >
            {config.heroTitle}
          </motion.h1>

          <motion.p
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
            className="text-xl md:text-2xl text-gray-300 font-montserrat mb-8 max-w-2xl"
          >
            {config.heroSubtitle}
          </motion.p>

          {/* Animated Waveform */}
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 1, ease: 'easeOut', delay: 0.4 }}
            className="waveform w-full max-w-md h-16 bg-gradient-to-r from-purple-500 via-blue-500 to-purple-500 bg-[length:200%_100%] rounded-lg opacity-60"
          />

          {/* CTA Buttons */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, ease: 'easeOut', delay: 0.6 }}
            className="flex flex-col sm:flex-row gap-4 mt-12"
          >
            <a
              href={config.heroExploreButtonUrl}
              className="px-8 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-full font-montserrat transition-colors duration-200"
            >
              {config.heroExploreButtonText}
            </a>
            <a
              href={config.heroEventsButtonUrl}
              className="px-8 py-3 border-2 border-white hover:bg-white hover:text-black text-white rounded-full font-montserrat transition-colors duration-200"
            >
              {config.heroEventsButtonText}
            </a>
          </motion.div>
        </motion.div>

        {/* Scroll Indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 1 }}
          className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex flex-col items-center"
        >
          <span className="text-white text-sm mb-2">Scroll to Explore</span>
          <div className="w-0.5 h-8 bg-white/30 relative overflow-hidden">
            <motion.div
              animate={{
                y: [0, 32, 0],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: 'linear',
              }}
              className="w-full h-1/3 bg-white absolute top-0"
            />
          </div>
        </motion.div>
      </div>
    );
  };

  // Rendu de la section visualizer
  const renderVisualizerSection = () => {
    if (!config) return null;

    return (
      <section className="py-20">
        <div className="max-w-7xl mx-auto">
          <div className="relative group">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-4xl md:text-5xl font-audiowide mb-12 text-center flex items-center justify-center gap-4"
              onClick={handleExperienceClick}
            >
              <span className="cursor-pointer hover:text-purple-400 transition-colors">
                {isSoundActive ? `Stop ${config.visualizerTitle}` : config.visualizerTitle}
              </span>
            </motion.h2>
          </div>

          <div className="relative w-full aspect-[2/1] rounded-lg overflow-hidden border border-gray-800">
            <AnimatePresence mode="wait">
              <motion.div
                key={isSoundActive ? 'rhythm' : 'particles'}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5 }}
                className="w-full h-full absolute inset-0"
              >
                {isSoundActive ? (
                  <RhythmCatcher onClose={handleExperienceClick} />
                ) : (
                  <ParticleVisualizer />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </section>
    );
  };

  return <>{renderSections()}</>;
}
