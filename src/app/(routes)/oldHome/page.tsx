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

export default function OldHomePage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isSoundActive, setIsSoundActive] = useState(false);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end start'],
  });

  // Utiliser useSWR pour récupérer les événements
  const {
    data: eventsData,
    error: eventsError,
    isLoading: eventsLoading,
  } = useSWR('/api/events', fetcher);

  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.5], [1, 0.8]);

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

  return (
    <>
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
            poster="/images/hero-poster.jpg"
          >
            <source src="/videos/hero-background.mp4" type="video/mp4" />
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
            DJ LARIAN
          </motion.h1>

          <motion.p
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
            className="text-xl md:text-2xl text-gray-300 font-montserrat mb-8 max-w-2xl"
          >
            Electronic Music Producer & Innovative Performer
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
              href="/music"
              className="px-8 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-full font-montserrat transition-colors duration-200"
            >
              Explore Music
            </a>
            <a
              href="/events"
              className="px-8 py-3 border-2 border-white hover:bg-white hover:text-black text-white rounded-full font-montserrat transition-colors duration-200"
            >
              Upcoming Events
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

      {/* Latest Releases Section */}
      <LatestReleases />

      {/* Music Visualizer Section */}
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
                {isSoundActive ? 'Stop Experience' : 'Experience the Sound'}
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

      {/* Upcoming Events Section - Passer les données fetchées */}
      <section className="py-20 bg-gradient-to-b from-black to-purple-900/20">
        <div className="max-w-7xl mx-auto px-4">
          {eventsLoading && (
            <p className="text-center text-gray-400">Chargement des événements...</p>
          )}
          {eventsError && (
            <p className="text-center text-red-400">Erreur lors du chargement des événements.</p>
          )}
          {eventsData && !eventsError && <UpcomingEvents events={eventsData?.events || []} />}
        </div>
      </section>

      {/* Twitch Stream Section */}
      <TwitchStream />
    </>
  );
}
