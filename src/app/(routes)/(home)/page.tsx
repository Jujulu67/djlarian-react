'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import gsap from 'gsap';
import LatestReleases from '@/components/sections/LatestReleases';
import UpcomingEvents from '@/components/sections/UpcomingEvents';
import TwitchStream from '@/components/sections/TwitchStream';
import ParticleVisualizer from '@/components/3d/ParticleVisualizer';
import RhythmCatcher from '@/components/RhythmCatcher';
import { useGameManager } from '@/hooks/useGameManager';

export default function HomePage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isSoundActive, setIsSoundActive] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [gameAudio, setGameAudio] = useState<HTMLAudioElement | null>(null);
  const [shouldStartGame, setShouldStartGame] = useState(false);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end start'],
  });

  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.5], [1, 0.8]);

  const { gameState, patterns, startGame, endGame, handleCollision, audioData } =
    useGameManager(gameAudio);

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

  // Effet pour démarrer le jeu quand l'audio est prêt
  useEffect(() => {
    if (shouldStartGame && gameAudio) {
      console.log('Starting game from useEffect with audio:', {
        exists: !!gameAudio,
        readyState: gameAudio.readyState,
        src: gameAudio.src,
        currentTime: gameAudio.currentTime,
      });
      startGame();
      setShouldStartGame(false);
    }
  }, [shouldStartGame, gameAudio, startGame]);

  const handleExperienceClick = async () => {
    if (!isSoundActive) {
      console.log('Initializing visual experience');
      try {
        // Initialise l'audio pour notre jeu rythmique
        const audio = new Audio('/audio/easter-egg.mp3');
        audio.preload = 'auto';
        audio.volume = 0.8;
        audioRef.current = audio;

        setIsSoundActive(true);
        document.documentElement.classList.add('custom-cursor-active', 'sound-active');
      } catch (error) {
        console.error('Error in handleExperienceClick:', error);
      }
    } else {
      console.log('Stopping experience');
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      setGameAudio(null);
      setIsSoundActive(false);
      setIsPlaying(false);
      document.documentElement.classList.remove('custom-cursor-active', 'sound-active');
      endGame();
    }
  };

  const handleVolumeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (audioRef.current) {
      if (!audioRef.current.paused) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        // Joue l'audio et informe l'utilisateur si une erreur survient
        audioRef.current
          .play()
          .then(() => {
            setIsPlaying(true);
            // Déclenche l'animation avec l'audio actif
            setGameAudio(audioRef.current);
          })
          .catch((error) => {
            console.error('Erreur de lecture audio:', error);
            // Informe l'utilisateur si le navigateur bloque la lecture auto
            alert(
              'Interaction utilisateur requise pour la lecture audio. Veuillez cliquer à nouveau.'
            );
          });
      }
    }
  };

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
                Experience the Sound
              </span>
              {isSoundActive && (
                <>
                  <motion.button
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    whileHover={{ scale: 1.1 }}
                    className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-purple-600 hover:bg-purple-700 transition-colors"
                    onClick={handleVolumeClick}
                    aria-label={isPlaying ? 'Désactiver le son' : 'Activer le son'}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-6 h-6 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d={
                          isPlaying
                            ? 'M15.536 8.464a5 5 0 010 7.072M18.364 5.636a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z'
                            : 'M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2'
                        }
                      />
                    </svg>
                  </motion.button>
                </>
              )}
            </motion.h2>
          </div>

          {/* Affiche ParticleVisualizer par défaut, RhythmCatcher si isSoundActive est true */}
          <div className="relative w-full aspect-[2/1] rounded-lg overflow-hidden border border-gray-800">
            <AnimatePresence>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5 }}
                className="w-full h-full"
              >
                {!isSoundActive ? (
                  <ParticleVisualizer />
                ) : (
                  <RhythmCatcher audioSrc="/audio/easter-egg.mp3" onClose={handleExperienceClick} />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </section>

      {/* Upcoming Events Section */}
      <UpcomingEvents />

      {/* Twitch Stream Section */}
      <TwitchStream />
    </>
  );
}
