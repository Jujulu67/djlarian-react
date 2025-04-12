'use client';

import React, { useState, useEffect, useReducer, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Track, MusicType } from '@/lib/utils/types';
import MusicCard from '@/components/ui/MusicCard';
import SimpleMusicPlayer from '@/components/ui/SimpleMusicPlayer';
import { Filter, Search, Zap, ChevronDown, Music, Loader } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { useMusicContext } from '@/context/MusicPlayerContext';

// --- Définition du Reducer pour l'état de lecture ---
interface PlayerState {
  currentTrack: Track | null;
  isPlaying: boolean;
  // On garde la liste filtrée ici pour la logique next/prev
  filteredTracks: Track[];
}

type PlayerAction =
  | { type: 'PLAY_TRACK'; payload: Track }
  | { type: 'TOGGLE_PLAY_PAUSE' }
  | { type: 'CLOSE_PLAYER' }
  | { type: 'PLAY_NEXT' }
  | { type: 'PLAY_PREV' }
  | { type: 'SET_FILTERED_TRACKS'; payload: Track[] }; // Pour mettre à jour la liste pour next/prev

const initialPlayerState: PlayerState = {
  currentTrack: null,
  isPlaying: false,
  filteredTracks: [],
};

function playerReducer(state: PlayerState, action: PlayerAction): PlayerState {
  switch (action.type) {
    case 'SET_FILTERED_TRACKS':
      // Si la piste actuelle n'est plus dans les pistes filtrées, on arrête la lecture
      const stillExists =
        state.currentTrack && action.payload.some((t) => t.id === state.currentTrack?.id);
      return {
        ...state,
        filteredTracks: action.payload,
        currentTrack: stillExists ? state.currentTrack : null,
        isPlaying: stillExists ? state.isPlaying : false,
      };

    case 'PLAY_TRACK':
      // Si c'est la même piste, basculer play/pause
      if (state.currentTrack?.id === action.payload.id) {
        return { ...state, isPlaying: !state.isPlaying };
      }
      // Nouvelle piste
      return { ...state, currentTrack: action.payload, isPlaying: true };

    case 'TOGGLE_PLAY_PAUSE':
      if (!state.currentTrack) return state; // Ne rien faire si pas de piste
      return { ...state, isPlaying: !state.isPlaying };

    case 'CLOSE_PLAYER':
      // Mettre en pause les lecteurs via postMessage (logique à ajouter si nécessaire ou laisser MusicCard le faire)
      // Ici, on réinitialise juste l'état
      return { ...state, currentTrack: null, isPlaying: false };

    case 'PLAY_NEXT': {
      if (!state.currentTrack || state.filteredTracks.length < 2) return state;
      const currentIndex = state.filteredTracks.findIndex((t) => t.id === state.currentTrack?.id);
      if (currentIndex === -1)
        return { ...state, currentTrack: state.filteredTracks[0], isPlaying: true }; // Fallback
      const nextIndex = (currentIndex + 1) % state.filteredTracks.length;
      return { ...state, currentTrack: state.filteredTracks[nextIndex], isPlaying: true };
    }

    case 'PLAY_PREV': {
      if (!state.currentTrack || state.filteredTracks.length < 2) return state;
      const currentIndex = state.filteredTracks.findIndex((t) => t.id === state.currentTrack?.id);
      if (currentIndex === -1)
        return { ...state, currentTrack: state.filteredTracks[0], isPlaying: true }; // Fallback
      const prevIndex =
        (currentIndex - 1 + state.filteredTracks.length) % state.filteredTracks.length;
      return { ...state, currentTrack: state.filteredTracks[prevIndex], isPlaying: true };
    }

    default:
      return state;
  }
}
// --- Fin Définition Reducer ---

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
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<MusicType | 'all'>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Utilisation du reducer pour l'état de lecture
  const [playerState, dispatch] = useReducer(playerReducer, initialPlayerState);
  const { currentTrack, isPlaying, filteredTracks } = playerState;

  // Obtenir applyVolumeGlobally du contexte de volume
  const { applyVolumeGlobally } = useMusicContext();

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

  // Appliquer les filtres et mettre à jour le reducer
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

    // Mettre à jour l'état du reducer avec les pistes filtrées
    dispatch({ type: 'SET_FILTERED_TRACKS', payload: filtered });
  }, [tracks, selectedType, searchTerm]);

  // Effet pour faire défiler vers la carte active et appliquer le volume
  useEffect(() => {
    if (currentTrack && isPlaying) {
      console.log(`Effect: Scrolling to track ${currentTrack.id}`);
      setTimeout(() => {
        const cardElement = document.getElementById(`music-card-${currentTrack.id}`);
        cardElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Appliquer le volume actuel lors du changement de piste ou reprise
        const currentVolume =
          typeof window !== 'undefined'
            ? Number(localStorage.getItem('global-music-volume') || 0.8)
            : 0.8;
        applyVolumeGlobally(currentVolume);
      }, 150); // Délai réduit
    }
  }, [currentTrack, isPlaying, applyVolumeGlobally]);

  // --- Handlers utilisant dispatch ---

  // Jouer un morceau (appelé par MusicCard)
  const handlePlayTrack = useCallback((track: Track) => {
    if ('close' in track) {
      dispatch({ type: 'CLOSE_PLAYER' });
    } else {
      dispatch({ type: 'PLAY_TRACK', payload: track });
    }
  }, []);

  // Basculer lecture/pause (appelé par SimpleMusicPlayer)
  const handleTogglePlayPause = useCallback(() => {
    // La logique de communication avec l'iframe est complexe à gérer ici
    // MusicCard gère déjà play/pause de l'iframe quand isPlaying change
    // SimpleMusicPlayer pourrait aussi envoyer un message si besoin, mais évitons la duplication
    // On se contente de dispatcher l'action pour changer l'état React
    dispatch({ type: 'TOGGLE_PLAY_PAUSE' });

    // Solution alternative (moins propre) : manipuler l'iframe depuis ici
    /*
    if (currentTrack) {
       const iframe = document.querySelector(`#youtube-iframe-${currentTrack.id}, #soundcloud-iframe-${currentTrack.id}`);
       if (iframe instanceof HTMLIFrameElement && iframe.contentWindow) {
           const command = isPlaying ? 'pauseVideo' : 'playVideo'; // Adapater pour SC
           // ... postMessage ... 
       }
    }
    */
  }, []);

  // Fermer le lecteur (appelé par SimpleMusicPlayer)
  const handleClosePlayer = useCallback(() => {
    dispatch({ type: 'CLOSE_PLAYER' });
  }, []);

  // Jouer suivant (appelé par SimpleMusicPlayer)
  const handlePlayNext = useCallback(() => {
    dispatch({ type: 'PLAY_NEXT' });
  }, []);

  // Jouer précédent (appelé par SimpleMusicPlayer)
  const handlePlayPrev = useCallback(() => {
    dispatch({ type: 'PLAY_PREV' });
  }, []);

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
                        onPlay={handlePlayTrack}
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
                      onPlay={handlePlayTrack}
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
          onClose={handleClosePlayer}
          onTogglePlay={handleTogglePlayPause}
          onNextTrack={filteredTracks.length > 1 ? handlePlayNext : undefined}
          onPrevTrack={filteredTracks.length > 1 ? handlePlayPrev : undefined}
        />
      )}
    </div>
  );
}
