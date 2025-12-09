'use client';

import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
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
import ScrollProgress from '@/components/ui/ScrollProgress';
import ScrollToTop from '@/components/ui/ScrollToTop';
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
  const router = useRouter();
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
  // État pour détecter si on est sur mobile
  const [isMobile, setIsMobile] = useState(false);
  // État pour contrôler le démarrage de l'animation du gradient waveform (fallback)
  const [waveformAnimationReady, setWaveformAnimationReady] = useState(false);
  // État pour vérifier si la vidéo est chargée
  const [videoLoaded, setVideoLoaded] = useState(false);
  // État pour savoir si la vidéo a échoué à charger
  const [videoFailed, setVideoFailed] = useState(false);
  // Référence à l'élément vidéo pour contrôler la lecture
  const videoRef = useRef<HTMLVideoElement>(null);
  // État pour contrôler quand démarrer les autres animations (après le waveform)
  const [readyForOtherAnimations, setReadyForOtherAnimations] = useState(false);
  // État pour savoir si les données critiques sont chargées
  const [criticalDataLoaded, setCriticalDataLoaded] = useState(false);

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

  // Nettoyer le paramètre callbackUrl de l'URL après le chargement
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('callbackUrl')) {
      // Supprimer callbackUrl de l'URL sans recharger la page
      urlParams.delete('callbackUrl');
      const newUrl = urlParams.toString()
        ? `${window.location.pathname}?${urlParams.toString()}`
        : window.location.pathname;
      router.replace(newUrl, { scroll: false });
    }
  }, [router]);

  // S'assurer que le body a une position relative pour Framer Motion (seulement si le jeu n'est pas actif)
  useEffect(() => {
    if (typeof document !== 'undefined' && !isSoundActive) {
      // Si le body n'a pas de position, lui donner relative pour Framer Motion
      // Mais seulement si le jeu n'est pas actif (pour éviter les conflits avec le code de désactivation du scroll)
      if (!document.body.style.position || document.body.style.position === 'static') {
        document.body.style.position = 'relative';
      }
    }
  }, [isSoundActive]);

  // Détecter si on est sur mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Attendre que les données critiques soient chargées avant de démarrer l'animation du waveform
  // Cela évite les stutters causés par le chargement simultané (lazy loading, API calls, etc.)
  useEffect(() => {
    // Attendre que les configurations soient chargées (données critiques pour le hero)
    if (!configLoading && configData) {
      // Petit délai pour laisser le navigateur terminer les opérations de rendu initiales
      const timer = setTimeout(() => {
        setCriticalDataLoaded(true);
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [configLoading, configData]);

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

  // Optimiser useScroll sur mobile - simplifier le parallax pour de meilleures performances
  // Note: on garde useScroll actif mais on simplifie les transformations sur mobile
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end start'],
  });

  // Simplifier les transformations sur mobile - utiliser des valeurs statiques
  // Sur mobile, on utilise directement des valeurs numériques au lieu de useTransform
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, isMobile ? 1 : 0]);
  const scale = useTransform(scrollYProgress, [0, 0.5], [1, isMobile ? 1 : 0.8]);

  // Parallax effect for hero content - désactivé sur mobile
  const heroY = useTransform(scrollYProgress, [0, 1], [0, isMobile ? 0 : -50]);

  // Configurer les animations et appliquer les configurations
  // Optimiser GSAP sur mobile - utiliser CSS animation à la place si possible
  // Utiliser CSS animation directement (plus performant que GSAP pour animations continues)
  useEffect(() => {
    // L'animation est maintenant gérée par CSS via la classe 'waveform-animated'
    // Plus besoin de GSAP pour cette animation - CSS est plus performant
    // GSAP reste disponible pour d'autres animations si nécessaire
  }, [isMobile]);

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

  // Référence pour la section visualizer pour le scroll automatique
  const visualizerSectionRef = useRef<HTMLElement | null>(null);

  const handleExperienceClick = () => {
    setIsSoundActive((prev) => !prev);
  };

  // Scroll automatique vers le canvas du jeu quand il est lancé (sur mobile uniquement)
  useEffect(() => {
    if (isSoundActive && isMobile) {
      let retryCount = 0;
      const maxRetries = 15;

      const scrollToGame = () => {
        // Cherche le conteneur du jeu
        const gameContainer = document.getElementById('game-container') as HTMLElement;

        if (gameContainer) {
          // Attendre que le canvas soit rendu
          const canvas = gameContainer.querySelector('.canvasContainer') as HTMLElement;

          if (canvas || retryCount >= 5) {
            // Scroll vers le haut du conteneur (qui sera en position fixed)
            // Comme le conteneur est fixed, on scroll juste en haut de la page
            window.scrollTo({
              top: 0,
              behavior: 'smooth',
            });

            // Fallback : forcer le scroll si smooth ne fonctionne pas
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

      // Délai initial pour laisser le composant dynamique se charger et se positionner en fixed
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

  // Enable scroll snapping for homepage - désactivé sur mobile pour éviter les bugs
  useEffect(() => {
    // Ne pas ajouter la classe sur mobile pour éviter les problèmes de performance
    if (!isMobile) {
      document.documentElement.classList.add('homepage-scroll-snap');
    }
    return () => {
      document.documentElement.classList.remove('homepage-scroll-snap');
    };
  }, [isMobile]);

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
                  initial={isMobile ? { opacity: 1 } : { opacity: 0, y: 40 }}
                  animate={isMobile ? undefined : { opacity: 1, y: 0 }}
                  exit={isMobile ? undefined : { opacity: 0, y: -40 }}
                  transition={isMobile ? undefined : { duration: 0.5, ease: 'easeOut' }}
                  className="py-20 bg-gradient-to-b from-black to-purple-900/20"
                  style={{ position: 'relative' }}
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
                  initial={isMobile ? { opacity: 1 } : { opacity: 0, y: 40 }}
                  animate={isMobile ? undefined : { opacity: 1, y: 0 }}
                  exit={isMobile ? undefined : { opacity: 0, y: -40 }}
                  transition={isMobile ? undefined : { duration: 0.5, ease: 'easeOut' }}
                  className="py-20 bg-gradient-to-b from-black to-purple-900/20"
                  style={{ position: 'relative' }}
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
                  initial={isMobile ? { opacity: 1 } : { opacity: 0, y: 40 }}
                  animate={isMobile ? undefined : { opacity: 1, y: 0 }}
                  exit={isMobile ? undefined : { opacity: 0, y: -40 }}
                  transition={isMobile ? undefined : { duration: 0.7, ease: 'easeOut' }}
                  className="py-20 bg-gradient-to-b from-black to-purple-900/20"
                  style={{ position: 'relative' }}
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

      // Optimiser les animations sur mobile - garder l'affichage mais simplifier les animations
      const isMobileSection = isMobile;

      return (
        <motion.div
          key={`section-${section}-${index}`}
          initial={
            isMobileSection
              ? isFirstSection
                ? { opacity: 1 }
                : { opacity: 0 } // Sur mobile: juste opacity, pas de mouvement
              : isFirstSection
                ? { opacity: 1, y: 0 }
                : { opacity: 0, y: 30 }
          }
          animate={
            isMobileSection
              ? isFirstSection
                ? { opacity: 1 }
                : undefined // Sur mobile: pas d'animation automatique
              : isFirstSection
                ? { opacity: 1, y: 0 }
                : undefined
          }
          whileInView={
            isMobileSection
              ? isFirstSection
                ? undefined
                : { opacity: 1 } // Sur mobile: juste opacity au scroll, pas de mouvement
              : isFirstSection
                ? undefined
                : { opacity: 1, y: 0 }
          }
          viewport={isFirstSection ? undefined : { once: true, margin: '-100px' }}
          transition={
            isMobileSection
              ? { duration: 0.3, ease: 'easeOut' } // Animation plus rapide et simple sur mobile
              : {
                  duration: 0.6,
                  ease: [0.4, 0, 0.2, 1],
                  delay: isFirstSection ? 0 : index * 0.1,
                }
          }
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

    // Générer des particules flottantes - désactivées sur mobile pour améliorer les performances
    const particles = isMobile
      ? []
      : Array.from({ length: 20 }, (_, i) => ({
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
        {/* Animated Gradient Background Layers - optimisé pour mobile avec GPU acceleration */}
        <div className="absolute inset-0 z-0">
          <div
            className={`absolute inset-0 bg-gradient-to-br from-purple-900/30 via-blue-900/20 to-purple-900/30 bg-[length:200%_200%] ${isMobile ? '' : 'animate-gradient-shift'}`}
            style={{
              willChange: isMobile ? 'auto' : 'background-position',
              transform: 'translateZ(0)', // Force GPU acceleration
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              animationDelay: '1s', // Démarrer après les animations principales
            }}
          />
          <div
            className={`absolute inset-0 bg-gradient-to-tr from-blue-900/20 via-transparent to-purple-900/20 ${isMobile ? '' : 'animate-gradient-pulse'}`}
            style={{
              willChange: isMobile ? 'auto' : 'opacity',
              transform: 'translateZ(0)', // Force GPU acceleration
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              animationDelay: '1.2s', // Démarrer après les animations principales
            }}
          />
        </div>

        {/* Background Image (Spotify Banner) */}
        <div className="absolute inset-0 overflow-hidden z-[1]">
          {/* Main Background Image */}
          <Image
            src="/images/spotify/spotify_banner.png"
            alt="Hero Background"
            fill
            className="object-cover object-center"
            priority
            quality={100}
          />

          {/* Gradient Overlays for depth and readability */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/40 to-black/80 z-10" />
          <div className="absolute inset-0 bg-purple-900/20 mix-blend-overlay z-10" />

          {/* Subtle animated texture/noise if desired, or keep clean glass look */}
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
            opacity: isMobile ? 1 : opacity,
            scale: isMobile ? 1 : scale,
            y: heroY,
            position: 'relative',
          }}
          className="relative z-20 h-[calc(100vh-4rem)] flex flex-col items-center justify-center text-center px-4"
        >
          {/* Glassmorphism Container - optimisé pour mobile */}
          <div
            className="glass-modern rounded-3xl p-8 md:p-12 backdrop-blur-xl border border-white/20 shadow-2xl"
            style={{ willChange: isMobile ? 'auto' : 'transform' }}
          >
            {/* Spotify Brand / Logo Integration */}
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
              {currentConfig.heroTitle}
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
              {currentConfig.heroSubtitle}
            </motion.p>

            {/* Enhanced Animated Waveform - Démarré APRÈS le chargement des données critiques */}
            <motion.div
              initial={{ scaleX: 0, opacity: 0 }}
              animate={criticalDataLoaded ? { scaleX: 1, opacity: 0.7 } : { scaleX: 0, opacity: 0 }}
              transition={{
                duration: 0.8,
                ease: [0.25, 0.1, 0.25, 1], // Courbe de Bézier personnalisée pour plus de fluidité
                delay: 0, // Pas de délai supplémentaire, mais attend que criticalDataLoaded soit true
              }}
              onAnimationComplete={() => {
                // Marquer que l'animation de déploiement est terminée
                // Maintenant on peut démarrer les autres animations et la vidéo
                setWaveformAnimationReady(true);
                setReadyForOtherAnimations(true);
              }}
              className="waveform w-full max-w-md h-16 rounded-lg glow-purple mx-auto relative overflow-hidden"
              style={{
                position: 'relative',
                willChange: 'transform, opacity',
                transform: 'translateZ(0)', // Force GPU acceleration
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden',
                // Optimisations supplémentaires pour la fluidité
                isolation: 'isolate', // Créer un nouveau contexte de stacking pour l'isolation GPU
                // Priorité GPU maximale
                contain: 'layout style paint',
              }}
            >
              {/* Video du gradient animé - plus fluide que CSS animation, utilisée aussi sur mobile pour performance */}
              {!videoFailed && (
                <video
                  autoPlay={false}
                  muted
                  loop
                  playsInline
                  preload={isMobile ? 'metadata' : 'auto'}
                  className="absolute inset-0 w-full h-full object-cover opacity-50 mix-blend-overlay"
                  style={{
                    opacity: videoLoaded && waveformAnimationReady ? 0.5 : 0,
                    transition: 'opacity 0.3s ease-in',
                  }}
                  ref={videoRef}
                  onLoadedData={() => {
                    setVideoLoaded(true);
                    // La vidéo sera démarrée par le useEffect quand l'animation sera terminée
                  }}
                  onTimeUpdate={(e) => {
                    // S'assurer que la boucle est parfaite en revenant à 0 juste avant la fin
                    const video = e.currentTarget;
                    if (video.duration && video.currentTime >= video.duration - 0.1) {
                      video.currentTime = 0;
                    }
                  }}
                  onError={(e) => {
                    // Si la vidéo ne charge pas (404 ou autre erreur), utiliser le fallback CSS
                    const video = e.currentTarget;
                    const errorDetails = {
                      error: e.type,
                      videoSrc: video?.src || video?.currentSrc,
                      networkState: video?.networkState, // 0=empty, 1=idle, 2=loading, 3=noSource
                      readyState: video?.readyState, // 0=haveNothing, 1=haveMetadata, 2=haveCurrentData, 3=haveFutureData, 4=haveEnough
                      errorCode: video?.error?.code,
                      errorMessage: video?.error?.message,
                    };
                    console.warn(
                      '[Waveform] ❌ Erreur lors du chargement de la vidéo:',
                      errorDetails
                    );
                    setVideoFailed(true);
                    setWaveformAnimationReady(true);
                  }}
                  onLoadStart={() => {
                    // Début du chargement de la vidéo
                  }}
                >
                  <source src="/videos/waveform-gradient.mp4" type="video/mp4" />
                </video>
              )}

              {/* Fallback gradient animé CSS si vidéo non disponible */}
              <div
                className={`absolute inset-0 bg-gradient-to-r from-purple-500 via-blue-500 to-purple-500 bg-[length:200%_100%] ${(!videoLoaded || videoFailed) && waveformAnimationReady ? 'waveform-animated' : ''}`}
                style={{
                  opacity: !videoLoaded || videoFailed ? 1 : 0,
                  display: !videoLoaded || videoFailed ? 'block' : 'none',
                  transition: 'opacity 0.3s ease-out',
                }}
              />
            </motion.div>

            {/* Modern CTA Buttons */}
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

        {/* Enhanced Scroll Indicator - masqué sur mobile pour économiser les performances */}
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
  };

  // Rendu de la section visualizer
  const renderVisualizerSection = () => {
    const currentConfig = config || defaultConfigs.homepage;

    return (
      <section
        id="visualizer"
        ref={visualizerSectionRef}
        className={`${isMobile && !isSoundActive ? 'py-10' : isMobile ? 'py-0' : 'py-20'} relative ${isMobile ? 'overflow-visible' : 'overflow-hidden'}`}
      >
        {/* Animated Gradient Background - optimisé pour mobile */}
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
  };

  // Désactiver le scroll global quand le jeu est actif (sur mobile)
  // Délai pour laisser le scroll automatique se faire d'abord
  useEffect(() => {
    if (isMobile && isSoundActive) {
      // Attendre que le scroll automatique soit terminé avant de désactiver le scroll
      const disableScrollTimeout = setTimeout(() => {
        // Sauvegarder la position de scroll actuelle
        const scrollY = window.scrollY;
        // Désactiver le scroll
        document.body.style.position = 'fixed';
        document.body.style.top = `-${scrollY}px`;
        document.body.style.width = '100%';
        document.body.style.overflow = 'hidden';
      }, 1000); // Délai plus long pour laisser le scroll automatique se terminer (300ms + 700ms de marge)

      return () => {
        clearTimeout(disableScrollTimeout);
        // Réactiver le scroll
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
    <div style={{ position: 'relative', minHeight: '100vh' }}>
      <ScrollProgress />
      <div className="scroll-snap-container" style={{ position: 'relative' }}>
        {renderSections()}
      </div>
      {!isSoundActive && <ScrollToTop />}
    </div>
  );
}
