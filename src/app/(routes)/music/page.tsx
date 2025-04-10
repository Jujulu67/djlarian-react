'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Track, MusicType } from '@/lib/utils/types';
import MusicCard from '@/components/ui/MusicCard';
import SimpleMusicPlayer from '@/components/ui/SimpleMusicPlayer';
import { Filter, Search, Zap, ChevronDown, Music, Loader } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { setGlobalVolume } from '@/components/ui/SimpleMusicPlayer';

// Types de musique disponibles
const MUSIC_TYPES: { label: string; value: MusicType | 'all' }[] = [
  { label: 'Tous', value: 'all' },
  { label: 'Singles', value: 'single' },
  { label: 'EPs & Albums', value: 'ep' },
  { label: 'Remixes', value: 'remix' },
  { label: 'DJ Sets', value: 'djset' },
  { label: 'Live', value: 'live' },
];

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

  // Variable globale pour éviter les commandes en cascade
  let isTogglingPlayback = false;

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

  // Fonction pour jouer un morceau avec gestion simplifiée
  const playTrack = (track: Track) => {
    // Si la propriété close est définie, cela signifie que le bouton X de la carte a été cliqué
    // Comportement identique au closePlayer pour fermer complètement le lecteur
    if ('close' in track) {
      closePlayer();
      return;
    }

    // Si c'est le même morceau, on bascule l'état
    if (currentTrack && currentTrack.id === track.id) {
      setIsPlaying(!isPlaying);

      // On ne modifie pas la visibilité du lecteur ici, juste l'état de lecture
      // Le composant MusicCard s'occupe de maintenir le bon affichage
    } else {
      // Pour un nouveau morceau, on l'active
      setCurrentTrack(track);
      setIsPlaying(true);
    }
  };

  // Contrôle de la lecture depuis le footer
  const toggleFooterPlay = () => {
    if (!currentTrack || isTogglingPlayback) return;

    // Activer le verrouillage pour éviter les commandes multiples
    isTogglingPlayback = true;

    // L'état isPlaying va changer après cette fonction, donc la logique doit être inversée
    const willPlay = !isPlaying;

    // Trouver le lecteur YouTube actif
    const activeTrackId = currentTrack.id;
    const activeYoutubeIframe = document.querySelector(
      `iframe[id="youtube-iframe-${activeTrackId}"]`
    );

    // Mettre à jour l'état React AVANT de manipuler l'iframe
    setIsPlaying(willPlay);

    // Gestion spéciale pour YouTube
    if (activeYoutubeIframe instanceof HTMLIFrameElement && activeYoutubeIframe.contentWindow) {
      try {
        // 1. Assurer la visibilité du conteneur de l'iframe si on passe en lecture
        if (willPlay) {
          const container = activeYoutubeIframe.closest('div');
          if (container) {
            container.style.opacity = '1';
            container.style.pointerEvents = 'auto';
          }
        }

        // 2. Envoyer une SEULE commande à YouTube avec un délai minimum
        setTimeout(() => {
          if (activeYoutubeIframe.contentWindow) {
            activeYoutubeIframe.contentWindow.postMessage(
              JSON.stringify({
                event: 'command',
                func: willPlay ? 'playVideo' : 'pauseVideo',
              }),
              '*'
            );
          }

          console.log(
            `${willPlay ? 'Playing' : 'Pausing'} active YouTube track: ${currentTrack.title}`
          );

          // Appliquer le volume après l'action
          setTimeout(() => {
            const currentVolume = localStorage.getItem('global-music-volume');
            if (currentVolume) {
              setGlobalVolume(parseFloat(currentVolume));
            }

            // Relâcher le verrouillage après un délai suffisant
            isTogglingPlayback = false;
          }, 300);
        }, 50);
      } catch (error) {
        console.error('Error controlling YouTube iframe:', error);
        isTogglingPlayback = false;
      }
    }
    // Gestion pour SoundCloud
    else {
      // Contrôle du lecteur SoundCloud actif
      const activeSoundcloudIframe = document.querySelector(
        `iframe[id="soundcloud-iframe-${activeTrackId}"]`
      );

      if (
        activeSoundcloudIframe instanceof HTMLIFrameElement &&
        activeSoundcloudIframe.contentWindow
      ) {
        try {
          // Commande simple à SoundCloud
          activeSoundcloudIframe.contentWindow.postMessage(
            `{"method":"${willPlay ? 'play' : 'pause'}"}`,
            '*'
          );

          console.log(
            `${willPlay ? 'Playing' : 'Pausing'} active SoundCloud track: ${currentTrack.title}`
          );

          // Appliquer le volume et relâcher le verrouillage après un délai
          setTimeout(() => {
            const currentVolume = localStorage.getItem('global-music-volume');
            if (currentVolume) {
              setGlobalVolume(parseFloat(currentVolume));
            }
            isTogglingPlayback = false;
          }, 300);
        } catch (error) {
          console.error('Error controlling SoundCloud iframe:', error);
          isTogglingPlayback = false;
        }
      } else {
        // Pas d'iframe trouvé, relâcher le verrouillage
        isTogglingPlayback = false;
      }
    }
  };

  // Fermer le lecteur - comportement identique aux boutons X des cartes
  const closePlayer = () => {
    if (!currentTrack) return;

    // Fermer d'abord tous les lecteurs YouTube actifs
    const activeTrackId = currentTrack.id;
    const activeYoutubeIframe = document.querySelector(
      `iframe[id="youtube-iframe-${activeTrackId}"]`
    );
    if (activeYoutubeIframe instanceof HTMLIFrameElement && activeYoutubeIframe.contentWindow) {
      try {
        activeYoutubeIframe.contentWindow.postMessage(
          JSON.stringify({ event: 'command', func: 'pauseVideo' }),
          '*'
        );
      } catch (error) {
        console.error('Error pausing YouTube iframe:', error);
      }
    }

    // Fermer tous les lecteurs SoundCloud actifs
    const activeSoundcloudIframe = document.querySelector(
      `iframe[id="soundcloud-iframe-${activeTrackId}"]`
    );
    if (
      activeSoundcloudIframe instanceof HTMLIFrameElement &&
      activeSoundcloudIframe.contentWindow
    ) {
      try {
        activeSoundcloudIframe.contentWindow.postMessage('{"method":"pause"}', '*');
      } catch (error) {
        console.error('Error pausing SoundCloud iframe:', error);
      }
    }

    // Réinitialiser l'état de lecture
    setCurrentTrack(null);
    setIsPlaying(false);
  };

  // Trouver l'index du morceau actuel dans la liste filtrée
  const getCurrentTrackIndex = () => {
    if (!currentTrack) return -1;
    return filteredTracks.findIndex((track) => track.id === currentTrack.id);
  };

  // Jouer la piste suivante
  const playNextTrack = () => {
    if (!currentTrack) return;

    console.log('Play next track, current track:', currentTrack);
    const currentIndex = filteredTracks.findIndex((track) => track.id === currentTrack.id);
    if (currentIndex === -1 || currentIndex === null) return;

    const nextIndex = (currentIndex + 1) % filteredTracks.length;
    console.log('Next index:', nextIndex, 'Next track:', filteredTracks[nextIndex]);

    // Définir la piste suivante et commencer la lecture
    setCurrentTrack(filteredTracks[nextIndex]);
    setIsPlaying(true);

    // Mettre à jour l'UI après un court délai
    setTimeout(() => {
      const cardElement = document.getElementById(`music-card-${filteredTracks[nextIndex].id}`);
      if (cardElement && cardElement instanceof HTMLElement) {
        cardElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setActiveCard(cardElement);
      }

      // Appliquer le volume actuel
      const currentVolume = localStorage.getItem('global-music-volume');
      if (currentVolume) {
        setGlobalVolume(parseFloat(currentVolume));
      }
    }, 300);
  };

  // Jouer la piste précédente
  const playPrevTrack = () => {
    if (!currentTrack) return;

    console.log('Play previous track, current track:', currentTrack);
    const currentIndex = filteredTracks.findIndex((track) => track.id === currentTrack.id);
    if (currentIndex === -1 || currentIndex === null) return;

    const prevIndex = (currentIndex - 1 + filteredTracks.length) % filteredTracks.length;
    console.log('Previous index:', prevIndex, 'Previous track:', filteredTracks[prevIndex]);

    // Définir la piste précédente et commencer la lecture
    setCurrentTrack(filteredTracks[prevIndex]);
    setIsPlaying(true);

    // Mettre à jour l'UI après un court délai
    setTimeout(() => {
      const cardElement = document.getElementById(`music-card-${filteredTracks[prevIndex].id}`);
      if (cardElement && cardElement instanceof HTMLElement) {
        cardElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setActiveCard(cardElement);
      }

      // Appliquer le volume actuel
      const currentVolume = localStorage.getItem('global-music-volume');
      if (currentVolume) {
        setGlobalVolume(parseFloat(currentVolume));
      }
    }, 300);
  };

  return (
    <div className="min-h-screen pt-24 pb-36 px-4 relative">
      <div className="max-w-7xl mx-auto">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-4xl md:text-5xl font-bold mb-4 text-center text-white"
        >
          Ma Musique
        </motion.h1>

        <p className="text-gray-400 text-center mb-10 max-w-2xl mx-auto">
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
          onTogglePlay={toggleFooterPlay}
          onNextTrack={filteredTracks.length > 1 ? playNextTrack : undefined}
          onPrevTrack={filteredTracks.length > 1 ? playPrevTrack : undefined}
        />
      )}
    </div>
  );
}
