'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Track, MusicType } from '@/lib/utils/types';
import MusicCard from '@/components/ui/MusicCard';
import SimpleMusicPlayer from '@/components/ui/SimpleMusicPlayer';
import { Filter, Search, Zap, ChevronDown, Music, Loader, Sparkles } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { sendPlayerCommand } from '@/lib/utils/audioUtils';

// Helper function for locking mechanism
const withLock = async (
  lockRef: React.MutableRefObject<boolean>,
  action: () => Promise<void> | void,
  delay: number = 500 // Default delay
) => {
  if (lockRef.current) {
    console.log('Action bloquée: Verrou actif.');
    return;
  }
  lockRef.current = true;
  console.log('Verrou activé.');
  try {
    await action();
  } catch (error) {
    console.error("Erreur pendant l'action verrouillée:", error);
  } finally {
    setTimeout(() => {
      lockRef.current = false;
      console.log('Verrou désactivé après délai.');
    }, delay);
  }
};

// Helper function to find an iframe with retries
const findIframeWithRetry = async (
  trackId: string,
  platform: 'youtube' | 'soundcloud',
  retries: number = 5,
  delay: number = 100 // Increased delay slightly
): Promise<HTMLIFrameElement | null> => {
  const selector = `iframe[id="${platform}-iframe-${trackId}"]`;
  for (let i = 0; i < retries; i++) {
    const iframe = document.querySelector<HTMLIFrameElement>(selector);
    if (iframe) {
      console.log(`findIframeWithRetry: Iframe ${selector} trouvé après ${i + 1} tentatives.`);
      return iframe;
    }
    console.log(
      `findIframeWithRetry: Tentative ${i + 1}/${retries} pour trouver ${selector}, attente ${delay}ms...`
    );
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
  console.warn(`findIframeWithRetry: Iframe ${selector} non trouvé après ${retries} tentatives.`);
  return null;
};

// Types de musique disponibles
const MUSIC_TYPES: { label: string; value: MusicType | 'all' }[] = [
  { label: 'Tous', value: 'all' },
  { label: 'Singles', value: 'single' },
  { label: 'EPs & Albums', value: 'ep' },
  { label: 'Remixes', value: 'remix' },
  { label: 'DJ Sets', value: 'djset' },
  { label: 'Live', value: 'live' },
];

/**
 * Music Page Component:
 * Displays tracks, allows filtering, searching, and playing music via embedded players.
 * Manages the overall playback state (current track, playing/paused) and coordinates
 * interactions between MusicCard components and the SimpleMusicPlayer footer.
 */
export default function MusicPage() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [filteredTracks, setFilteredTracks] = useState<Track[]>([]);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<MusicType | 'all'>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCard, setActiveCard] = useState<HTMLElement | null>(null);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  // Refs for imperative logic and state management outside of React's render cycle:
  // - stateLockedRef: Prevents external events or rapid actions during critical state transitions.
  const stateLockedRef = useRef(false);

  // Protéger les lecteurs embedded contre les clics extérieurs
  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;

      // Protection globale pour tout le footer player (prioritaire)
      if (target.closest('[data-footer-player="true"]')) {
        console.log('Clic protégé: footer player');
        return;
      }

      // Si le clic est sur un élément protégé, ne rien faire
      if (
        // Contrôles du footer
        target.closest('[data-footer-control="true"]') ||
        // Éléments du lecteur dans les cartes
        target.closest('[id^="youtube-iframe"]') ||
        target.closest('[id^="soundcloud-iframe"]') ||
        target
          .closest('[id^="music-card-"]')
          ?.querySelector('[id^="youtube-iframe"], [id^="soundcloud-iframe"]') ||
        // Autres éléments à protéger
        target.closest('header') ||
        target.closest('nav') ||
        target.closest('.play-button') ||
        target.closest('button[aria-label="Lecture"]') ||
        target.closest('button[aria-label="Pause"]') ||
        target.closest('.music-card-controls') ||
        target.closest('.music-card-overlay')
      ) {
        return; // Ne rien faire, mais ne pas stopper la propagation
      }

      // Nous ne fermons plus les lecteurs en cliquant ailleurs
      // L'utilisateur devra utiliser le bouton X dans l'interface
    };

    document.addEventListener('click', handleDocumentClick);
    return () => {
      document.removeEventListener('click', handleDocumentClick);
    };
  }, [currentTrack]);

  // Charger les morceaux depuis l'API
  useEffect(() => {
    const fetchTracks = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/api/music');
        if (!response.ok) {
          throw new Error('Erreur lors de la récupération des morceaux');
        }
        const data = await response.json();
        setTracks(data);
        setError(null);
      } catch (err) {
        console.error('Erreur:', err);
        setError('Impossible de charger les morceaux');
      } finally {
        setIsLoading(false);
      }
    };

    fetchTracks();
  }, []);

  // Appliquer les filtres
  useEffect(() => {
    let filtered = [...tracks];

    // Filtre par type
    if (selectedType !== 'all') {
      filtered = filtered.filter((track) => track.type === selectedType);
    }

    // Filtre par recherche
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (track) =>
          track.title.toLowerCase().includes(term) ||
          track.artist.toLowerCase().includes(term) ||
          track.genre.some((g) => g.toLowerCase().includes(term))
      );
    }

    // Trier: d'abord les featured, puis par date (du plus récent au plus ancien)
    filtered.sort((a, b) => {
      if (a.featured && !b.featured) return -1;
      if (!a.featured && b.featured) return 1;

      const dateA = new Date(a.releaseDate);
      const dateB = new Date(b.releaseDate);
      return dateB.getTime() - dateA.getTime();
    });

    setFilteredTracks(filtered);
  }, [tracks, selectedType, searchTerm]);

  // Déclarer closePlayer au-dessus de playTrack pour éviter les problèmes de déclaration
  const closePlayer = () => {
    withLock(
      stateLockedRef,
      () => {
        console.log('Fermeture du lecteur demandée');
        if (currentTrack) {
          const activeYoutubeIframe = document.querySelector<HTMLIFrameElement>(
            `iframe[id="youtube-iframe-${currentTrack.id}"]`
          );
          const activeSoundcloudIframe = document.querySelector<HTMLIFrameElement>(
            `iframe[id="soundcloud-iframe-${currentTrack.id}"]`
          );

          if (activeYoutubeIframe) {
            sendPlayerCommand(activeYoutubeIframe, 'youtube', 'pause');
          }
          if (activeSoundcloudIframe) {
            sendPlayerCommand(activeSoundcloudIframe, 'soundcloud', 'pause');
          }
        }

        setCurrentTrack(null);
        setIsPlaying(false);
        setActiveIndex(null);
        setActiveCard(null);
        console.log('Lecteur fermé, états réinitialisés.');
      },
      100
    ); // Short lock delay 100ms
  };

  // Fonction pour jouer un morceau avec gestion simplifiée
  const playTrack = useCallback(
    async (track: Track) => {
      // Si la propriété close est définie, cela signifie que le bouton X de la carte a été cliqué
      // Comportement identique au closePlayer pour fermer complètement le lecteur
      if ('close' in track) {
        closePlayer();
        return;
      }

      // Si c'est le même morceau, on bascule l'état (pas besoin de withLock ici, géré par le debounce enfant)
      if (currentTrack && currentTrack.id === track.id) {
        setIsPlaying(!isPlaying);
        // On ne touche plus à stateLockedRef ici
      } else {
        // Pour un nouveau morceau, on l'active avec withLock
        // Réactivation du withLock
        withLock(
          stateLockedRef, // Use the main state lock
          async () => {
            console.log(`Sélection d'une nouvelle piste: ${track.title}`); // Garder ce log utile
            // Arrêter l'ancien lecteur si existant
            if (currentTrack) {
              const oldYoutubeIframe = document.querySelector<HTMLIFrameElement>(
                `iframe[id="youtube-iframe-${currentTrack.id}"]`
              );
              const oldSoundcloudIframe = document.querySelector<HTMLIFrameElement>(
                `iframe[id="soundcloud-iframe-${currentTrack.id}"]`
              );
              if (oldYoutubeIframe) sendPlayerCommand(oldYoutubeIframe, 'youtube', 'pause');
              if (oldSoundcloudIframe)
                sendPlayerCommand(oldSoundcloudIframe, 'soundcloud', 'pause');
            }

            setCurrentTrack(track);
            setIsPlaying(true);
            // L'index sera mis à jour par l'effet si nécessaire, ou on peut le chercher ici
            const newIndex = filteredTracks.findIndex((t) => t.id === track.id);
            setActiveIndex(newIndex >= 0 ? newIndex : null);
          },
          150
        ); // Lock delay 150ms for initiating play with state lock
      }
    },
    [currentTrack, isPlaying, filteredTracks, closePlayer]
  );

  // Détecter le paramètre 'play' dans l'URL et lancer la lecture automatiquement
  useEffect(() => {
    if (tracks.length === 0 || isLoading) return;

    // Fonction pour extraire les paramètres d'URL
    const getUrlParams = () => {
      if (typeof window === 'undefined') return {};
      const params = new URLSearchParams(window.location.search);
      return Object.fromEntries(params.entries());
    };

    const params = getUrlParams();
    const trackIdToPlay = params.play;

    if (trackIdToPlay) {
      console.log(`Paramètre play détecté: ${trackIdToPlay}`);

      // Rechercher la piste correspondante
      const trackToPlay = tracks.find(
        (track) => track.id === trackIdToPlay || track.trackId === trackIdToPlay // Pour compatibilité avec les ID du composant LatestReleases
      );

      if (trackToPlay) {
        console.log(`Lecture automatique de la piste: ${trackToPlay.title}`);
        playTrack(trackToPlay);

        // Optionnel: nettoyer l'URL après avoir lancé la lecture
        if (window.history && window.history.replaceState) {
          const url = new URL(window.location.href);
          url.searchParams.delete('play');
          window.history.replaceState({}, document.title, url.toString());
        }
      } else {
        console.warn(`Piste avec ID ${trackIdToPlay} non trouvée`);
      }
    }
  }, [tracks, isLoading, playTrack]);

  // Contrôle de la lecture depuis le footer (sans withLock)
  const toggleFooterPlay = () => {
    if (!currentTrack) return;

    // On se fie au debounce dans SimpleMusicPlayer
    const willPlay = !isPlaying;
    console.log(
      `ToggleFooterPlay: Basculement de lecture: ${isPlaying ? 'lecture → pause' : 'pause → lecture'}`
    );

    // Mettre à jour l'état React IMMÉDIATEMENT
    console.log(`Setting isPlaying to ${willPlay}`);
    setIsPlaying(willPlay);

    // Trouver le lecteur actif - NO LONGER NEEDED HERE, MusicCard handles it
    /*
    const activeTrackId = currentTrack.id;
    const activeYoutubeIframe = document.querySelector<HTMLIFrameElement>(
      `iframe[id="youtube-iframe-${activeTrackId}"]`
    );
    const activeSoundcloudIframe = document.querySelector<HTMLIFrameElement>(
      `iframe[id="soundcloud-iframe-${activeTrackId}"]`
    );

    const iframe = activeYoutubeIframe || activeSoundcloudIframe;
    const playerType = activeYoutubeIframe ? 'youtube' : 'soundcloud';

    if (iframe instanceof HTMLIFrameElement && iframe.contentWindow) {
      // Assurer la visibilité si on passe en lecture (pour YouTube)
      if (willPlay && playerType === 'youtube') {
        const container = iframe.closest('div');
        if (container) {
          container.style.opacity = '1';
          container.style.pointerEvents = 'auto';
        }
      }

      // Envoyer la commande
      const action = willPlay ? 'play' : 'pause';
      console.log(
        `Envoi de la commande ${action} à l'iframe ${playerType} pour: ${currentTrack.title}`
      );
      // Envoyer la commande immédiatement, sans verrou ici
      // !!! SUPPRESSION DE L'APPEL DIRECT !!!
      // sendPlayerCommand(iframe, playerType, action);
    } else {
      console.warn(`Aucun iframe actif trouvé pour ${currentTrack.title}`);
    }
    */
  };

  // Trouver l'index du morceau actuel dans la liste filtrée
  const getCurrentTrackIndex = () => {
    if (!currentTrack) return -1;
    return filteredTracks.findIndex((track) => track.id === currentTrack.id);
  };

  // Jouer le morceau suivant
  const playNextTrack = () => {
    if (stateLockedRef.current) {
      console.log('Changement de piste (suivant) bloqué: Verrou actif.');
      return;
    }

    withLock(
      stateLockedRef,
      async () => {
        const currentIndex = getCurrentTrackIndex();
        if (currentIndex === null || currentIndex >= filteredTracks.length - 1) {
          console.log('Dernière piste atteinte ou index invalide.');
          return; // Ne rien faire si c'est la dernière piste ou si l'index est invalide
        }

        const nextIndex = currentIndex + 1;
        const nextTrack = filteredTracks[nextIndex];

        console.log(`Passage à la piste suivante: ${nextTrack.title}`);

        // Arrêter l'ancien lecteur (si nécessaire)
        if (currentTrack) {
          const oldYoutubeIframe = document.querySelector<HTMLIFrameElement>(
            `iframe[id="youtube-iframe-${currentTrack.id}"]`
          );
          const oldSoundcloudIframe = document.querySelector<HTMLIFrameElement>(
            `iframe[id="soundcloud-iframe-${currentTrack.id}"]`
          );
          if (oldYoutubeIframe) sendPlayerCommand(oldYoutubeIframe, 'youtube', 'pause');
          if (oldSoundcloudIframe) sendPlayerCommand(oldSoundcloudIframe, 'soundcloud', 'pause');
        }

        setCurrentTrack(nextTrack);
        setActiveIndex(nextIndex);
        setIsPlaying(true);

        // Utiliser findIframeWithRetry au lieu d'une attente fixe - NO LONGER NEEDED HERE
        /*
        // await new Promise((resolve) => setTimeout(resolve, 150));
        const nextPlatform = nextTrack.platforms.youtube
          ? 'youtube'
          : nextTrack.platforms.soundcloud
            ? 'soundcloud'
            : null;
        if (nextPlatform) {
          const nextIframe = await findIframeWithRetry(nextTrack.id, nextPlatform);
          if (nextIframe) {
            console.log(
              `Envoi de la commande play à l'iframe ${nextPlatform} trouvé pour ${nextTrack.title}`
            );
            // !!! SUPPRESSION DE L'APPEL DIRECT !!!
            // sendPlayerCommand(nextIframe, nextPlatform, 'play');
          } else {
            console.warn(
              `Nouvel iframe ${nextPlatform} non trouvé pour ${nextTrack.title} après changement (suivant).`
            );
          }
        } else {
          console.warn(
            `Aucune plateforme de lecteur trouvée pour démarrer la lecture de ${nextTrack.title}`
          );
        }
        */
      },
      150
    ); // Délai de 150ms pour le verrou d'état lors du changement de piste
  };

  // Jouer le morceau précédent
  const playPrevTrack = () => {
    if (stateLockedRef.current) {
      console.log('Changement de piste (précédent) bloqué: Verrou actif.');
      return;
    }
    withLock(
      stateLockedRef,
      async () => {
        const currentIndex = getCurrentTrackIndex();
        if (currentIndex === null || currentIndex <= 0) {
          console.log('Première piste atteinte ou index invalide.');
          return; // Ne rien faire si c'est la première piste ou si l'index est invalide
        }

        const prevIndex = currentIndex - 1;
        const prevTrack = filteredTracks[prevIndex];

        console.log(`Passage à la piste précédente: ${prevTrack.title}`);

        // Arrêter l'ancien lecteur
        if (currentTrack) {
          const oldYoutubeIframe = document.querySelector<HTMLIFrameElement>(
            `iframe[id="youtube-iframe-${currentTrack.id}"]`
          );
          const oldSoundcloudIframe = document.querySelector<HTMLIFrameElement>(
            `iframe[id="soundcloud-iframe-${currentTrack.id}"]`
          );
          if (oldYoutubeIframe) sendPlayerCommand(oldYoutubeIframe, 'youtube', 'pause');
          if (oldSoundcloudIframe) sendPlayerCommand(oldSoundcloudIframe, 'soundcloud', 'pause');
        }

        setCurrentTrack(prevTrack);
        setActiveIndex(prevIndex);
        setIsPlaying(true);

        // Utiliser findIframeWithRetry au lieu d'une attente fixe - NO LONGER NEEDED HERE
        /*
        // await new Promise((resolve) => setTimeout(resolve, 150));
        const prevPlatform = prevTrack.platforms.youtube
          ? 'youtube'
          : prevTrack.platforms.soundcloud
            ? 'soundcloud'
            : null;
        if (prevPlatform) {
          const prevIframe = await findIframeWithRetry(prevTrack.id, prevPlatform);
          if (prevIframe) {
            console.log(
              `Envoi de la commande play à l'iframe ${prevPlatform} trouvé pour ${prevTrack.title}`
            );
             // !!! SUPPRESSION DE L'APPEL DIRECT !!!
            // sendPlayerCommand(prevIframe, prevPlatform, 'play');
          } else {
            console.warn(
              `Nouvel iframe ${prevPlatform} non trouvé pour ${prevTrack.title} après changement (précédent).`
            );
          }
        } else {
          console.warn(
            `Aucune plateforme de lecteur trouvée pour démarrer la lecture de ${prevTrack.title}`
          );
        }
        */
      },
      150
    ); // Délai de 150ms pour le verrou d'état lors du changement de piste
  };

  return (
    <div className="min-h-screen pt-24 pb-36 px-4 relative">
      <div className="max-w-7xl mx-auto">
        {/* Titre avec dégradé et icône */}
        <div className="relative mb-4">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-4xl md:text-5xl font-bold text-center bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent"
          >
            Ma Musique
          </motion.h1>
          <Sparkles className="absolute top-0 right-[calc(50%-150px)] md:right-[calc(50%-180px)] w-8 h-8 md:w-10 md:h-10 text-yellow-400 transform -translate-y-1 animate-pulse" />
        </div>

        <p className="text-gray-400 text-center mb-10 max-w-2xl mx-auto mt-0">
          Découvrez ma discographie complète avec tous mes singles, EPs, remixes et DJ sets
          disponibles sur les plateformes de streaming.
        </p>

        {/* Barre de recherche et filtres */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row gap-4 justify-between items-center mb-6">
            {/* Recherche */}
            <div className="relative w-full md:w-auto md:flex-1 max-w-lg">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Rechercher un titre, un genre..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-800/70 border border-gray-700/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
              />
            </div>

            {/* Filtres */}
            <div className="flex gap-2 w-full md:w-auto">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="px-4 py-3 bg-gray-800/70 border border-gray-700/50 rounded-lg text-white flex items-center gap-2 hover:bg-gray-700/80 transition-colors"
              >
                <Filter className="w-5 h-5" />
                Filtres
                <ChevronDown
                  className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`}
                />
              </button>

              {/* Afficher les filtres par type immédiatement sur desktop */}
              <div className="hidden md:flex gap-2">
                {MUSIC_TYPES.map((type) => (
                  <button
                    key={type.value}
                    onClick={() => setSelectedType(type.value)}
                    className={`px-4 py-3 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors ${
                      selectedType === type.value
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-800/70 text-gray-300 hover:bg-gray-700/80'
                    }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Filtres mobiles (affichés conditionnellement) */}
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden mb-4 flex flex-wrap gap-2 justify-center"
            >
              {MUSIC_TYPES.map((type) => (
                <button
                  key={type.value}
                  onClick={() => setSelectedType(type.value)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors ${
                    selectedType === type.value
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-800/70 text-gray-300 hover:bg-gray-700/80'
                  }`}
                >
                  {type.label}
                </button>
              ))}
            </motion.div>
          )}
        </div>

        {/* Affichage des résultats - État de chargement */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24">
            <Loader className="w-12 h-12 text-purple-500 animate-spin mb-4" />
            <p className="text-gray-400">Chargement de la musique...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Music className="w-16 h-16 text-gray-600 mb-4" />
            <h2 className="text-xl text-gray-300 mb-2">Erreur de chargement</h2>
            <p className="text-gray-500">{error}</p>
          </div>
        ) : filteredTracks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Music className="w-16 h-16 text-gray-600 mb-4" />
            <h2 className="text-xl text-gray-300 mb-2">Aucun résultat trouvé</h2>
            <p className="text-gray-500">
              {searchTerm
                ? "Essayez d'autres termes de recherche"
                : 'Aucun morceau disponible pour le moment'}
            </p>
          </div>
        ) : (
          <>
            {/* Section Featured (si présent et vue "Tous") */}
            {selectedType === 'all' && filteredTracks.some((t) => t.featured) && (
              <div className="mb-12">
                <div className="flex items-center gap-2 mb-4">
                  <Zap className="w-5 h-5 text-yellow-500" />
                  <h2 className="text-2xl font-bold text-white">En vedette</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 auto-rows-auto">
                  {filteredTracks
                    .filter((track) => track.featured)
                    .map((track) => (
                      <MusicCard
                        key={track.id}
                        track={track}
                        onPlay={playTrack}
                        isPlaying={isPlaying}
                        isActive={currentTrack?.id === track.id}
                      />
                    ))}
                </div>
              </div>
            )}

            {/* Tous les morceaux */}
            <div>
              <h2 className="text-2xl font-bold text-white mb-6">
                {selectedType === 'all'
                  ? 'Tous les morceaux'
                  : MUSIC_TYPES.find((t) => t.value === selectedType)?.label || 'Morceaux'}
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 auto-rows-auto">
                {filteredTracks
                  .filter((track) => (selectedType === 'all' ? !track.featured : true))
                  .map((track) => (
                    <MusicCard
                      key={track.id}
                      track={track}
                      onPlay={playTrack}
                      isPlaying={isPlaying}
                      isActive={currentTrack?.id === track.id}
                    />
                  ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Lecteur de musique */}
      {currentTrack && (
        <SimpleMusicPlayer
          track={currentTrack}
          isPlaying={isPlaying}
          onClose={closePlayer}
          onFooterToggle={() => {
            toggleFooterPlay();
          }}
          onNextTrack={filteredTracks.length > 1 ? playNextTrack : undefined}
          onPrevTrack={filteredTracks.length > 1 ? playPrevTrack : undefined}
        />
      )}
    </div>
  );
}
