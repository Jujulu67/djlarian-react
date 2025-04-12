import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  ReactNode,
  useCallback,
} from 'react';
import { Track } from '@/lib/utils/types'; // Assurez-vous que le chemin est correct

// --- Interfaces ---
interface MusicPlayerState {
  volume: number; // Volume entre 0 et 1
  isMuted: boolean;
  currentTrack: Track | null;
  isPlaying: boolean;
}

interface MusicPlayerContextProps extends MusicPlayerState {
  setVolume: (volumePercent: number) => void;
  toggleMute: () => void;
  applyVolumeGlobally: (volume: number) => void;
  playTrack: (track: Track) => void;
  togglePlayPause: () => void;
  closePlayer: () => void;
  playNext: () => void; // Placeholder - La logique sera dans la page
  playPrev: () => void; // Placeholder - La logique sera dans la page
}

// --- Contexte ---
const defaultState: MusicPlayerContextProps = {
  volume: 0.8,
  isMuted: false,
  currentTrack: null,
  isPlaying: false,
  setVolume: () => {},
  toggleMute: () => {},
  applyVolumeGlobally: () => {},
  playTrack: () => {},
  togglePlayPause: () => {},
  closePlayer: () => {},
  playNext: () => {},
  playPrev: () => {},
};

const MusicPlayerContext = createContext<MusicPlayerContextProps>(defaultState);

// --- Fournisseur ---
interface MusicPlayerProviderProps {
  children: ReactNode;
  initialTracks?: Track[]; // Pour la logique next/prev future dans le contexte si besoin
}

export const MusicPlayerProvider: React.FC<MusicPlayerProviderProps> = ({ children }) => {
  const [volume, setInternalVolume] = useState<number>(() => {
    // Initialiser depuis localStorage
    if (typeof window !== 'undefined' && window.localStorage) {
      const savedVolume = localStorage.getItem('global-music-volume');
      return savedVolume ? Number(savedVolume) : 0.8;
    }
    return 0.8;
  });
  const [isMuted, setIsMuted] = useState<boolean>(volume === 0);
  const [prevVolumeBeforeMute, setPrevVolumeBeforeMute] = useState<number>(
    volume > 0 ? volume : 0.5
  ); // Garde une trace du volume avant mute

  // Logique de gestion du volume centralisée (similaire à l'ancienne setGlobalVolume)
  const applyVolumeGlobally = useCallback((vol: number) => {
    const safeVolume = Math.max(0, Math.min(1, vol));
    console.log(`Context: Applying volume ${safeVolume * 100}% globally`);

    // Sauvegarder dans localStorage
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('global-music-volume', String(safeVolume));
    }

    // Appliquer aux iframes (cette logique peut être appelée quand une carte devient active)
    // Pour l'instant, on met juste à jour l'état du contexte
    // L'application réelle se fera via les composants consommateurs

    // --- Application aux iframes YouTube ---
    document.querySelectorAll('iframe[src*="youtube"]').forEach((iframe) => {
      if (iframe instanceof HTMLIFrameElement && iframe.contentWindow) {
        const youtubeVolume = Math.min(100, Math.floor(safeVolume * 100)); // YouTube utilise 0-100
        try {
          iframe.contentWindow.postMessage(
            JSON.stringify({ event: 'command', func: 'setVolume', args: [youtubeVolume] }),
            '*'
          );
        } catch (error) {
          console.error('Context: Error applying volume to YouTube iframe:', error);
        }
      }
    });

    // --- Application aux iframes SoundCloud ---
    document.querySelectorAll('iframe[src*="soundcloud"]').forEach((iframe) => {
      if (iframe instanceof HTMLIFrameElement && iframe.contentWindow) {
        const soundcloudVolume = Math.min(100, Math.floor(safeVolume * 100)); // SoundCloud utilise 0-100
        try {
          iframe.contentWindow.postMessage(
            `{"method":"setVolume","value":${soundcloudVolume}}`,
            '*'
          );
        } catch (error) {
          console.error('Context: Error applying volume to SoundCloud iframe:', error);
        }
      }
    });
  }, []);

  // Fonction pour définir le volume depuis les composants
  const setVolume = useCallback(
    (newVolumePercent: number) => {
      const newVolume = Math.max(0, Math.min(100, newVolumePercent)) / 100;
      console.log(`Context: Setting volume to ${newVolume * 100}%`);
      setInternalVolume(newVolume);
      setIsMuted(newVolume === 0);
      if (newVolume > 0) {
        setPrevVolumeBeforeMute(newVolume); // Mettre à jour le volume "non muté"
      }
      applyVolumeGlobally(newVolume);
    },
    [applyVolumeGlobally]
  );

  // Gérer le mute/unmute
  const toggleMute = useCallback(() => {
    setIsMuted((currentMuted) => {
      const nextMuted = !currentMuted;
      console.log(`Context: Toggling mute to ${nextMuted}`);
      if (nextMuted) {
        // Muting: sauvegarder le volume actuel et mettre à 0
        setPrevVolumeBeforeMute(volume); // Sauvegarde
        setInternalVolume(0);
        applyVolumeGlobally(0);
      } else {
        // Unmuting: restaurer le volume précédent
        const volumeToRestore = prevVolumeBeforeMute > 0 ? prevVolumeBeforeMute : 0.5; // fallback
        setInternalVolume(volumeToRestore);
        applyVolumeGlobally(volumeToRestore);
      }
      return nextMuted;
    });
  }, [volume, prevVolumeBeforeMute, applyVolumeGlobally]);

  // --- États pour la lecture (simplifié, sera géré par useReducer dans la page) ---
  // Ces états seront probablement déplacés ou gérés différemment avec useReducer
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  // --- Fonctions de contrôle (simplifiées) ---
  // La logique réelle sera dans la page ou un reducer
  const playTrack = (track: Track) => {
    console.log('Context: playTrack called (logic to be implemented in page/reducer)');
    setCurrentTrack(track);
    setIsPlaying(true);
  };

  const togglePlayPause = () => {
    console.log('Context: togglePlayPause called (logic to be implemented in page/reducer)');
    setIsPlaying((prev) => !prev);
  };

  const closePlayer = () => {
    console.log('Context: closePlayer called (logic to be implemented in page/reducer)');
    setCurrentTrack(null);
    setIsPlaying(false);
  };

  // --- Valeur du Contexte ---
  const contextValue: MusicPlayerContextProps = {
    volume,
    isMuted,
    currentTrack, // Fournit l'état actuel
    isPlaying, // Fournit l'état actuel
    setVolume,
    toggleMute,
    applyVolumeGlobally,
    playTrack, // Fournit les fonctions de contrôle
    togglePlayPause,
    closePlayer,
    playNext: () => console.log('Context: playNext needs implementation'), // Placeholder
    playPrev: () => console.log('Context: playPrev needs implementation'), // Placeholder
  };

  return <MusicPlayerContext.Provider value={contextValue}>{children}</MusicPlayerContext.Provider>;
};

// --- Hook personnalisé pour utiliser le contexte ---
// (Nommé explicitement pour clarté)
// export const useMusicVolume = () => { // Ancien nom
export const useMusicContext = () => {
  // Nouveau nom
  const context = useContext(MusicPlayerContext);
  if (context === undefined) {
    throw new Error('useMusicContext must be used within a MusicPlayerProvider');
  }
  // Retourne tout le contexte pour l'instant, on affinera si besoin
  return context;
};
