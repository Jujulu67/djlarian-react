import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event'; // Pour des interactions plus réalistes
import MusicPage from '@/app/(routes)/music/page';
import { MusicPlayerProvider } from '@/context/MusicPlayerContext';
import { Track } from '@/lib/utils/types';

// --- Mocks ---

// Mock de l'API fetch pour retourner des pistes contrôlées
global.fetch = jest.fn();

// Mock de localStorage
const localStorageMock = (() => {
  let store: { [key: string]: string } = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock de scrollIntoView (JSDOM ne l'implémente pas)
window.HTMLElement.prototype.scrollIntoView = jest.fn();

// Mock de cancelAnimationFrame
window.cancelAnimationFrame = jest.fn();
window.requestAnimationFrame = jest.fn((callback) => {
  setTimeout(() => callback(0), 0);
  return 0;
});

// Mock de useRef avec prefix mock_ pour être accessible dans jest.mock
jest.mock('react', () => {
  const originalReact = jest.requireActual('react');
  // Créer les refs à l'intérieur du mock pour éviter les erreurs de portée
  const createMockRef = () => ({
    current: {
      style: { opacity: '1', pointerEvents: 'auto' },
      contentWindow: {
        postMessage: jest.fn(),
      },
      addEventListener: jest.fn((event, callback) => {
        // Auto-déclencher le callback de load pour simuler le chargement
        if (event === 'load') {
          setTimeout(callback, 10);
        }
      }),
      removeEventListener: jest.fn(),
    },
  });

  // Créer toutes les refs à l'intérieur
  const mock_youtubeIframeRef = createMockRef();
  const mock_soundcloudIframeRef = createMockRef();
  const mock_audioAnalyzerRef = { current: null };
  const mock_animationFrameRef = { current: null };

  let useRefCallCounter = 0;

  const useRefMock = (initialValue: any) => {
    // Retourner une ref spécifique selon le cas d'utilisation
    if (initialValue === null) {
      if (useRefCallCounter === 0) {
        useRefCallCounter++;
        return mock_youtubeIframeRef;
      } else if (useRefCallCounter === 1) {
        useRefCallCounter++;
        return mock_soundcloudIframeRef;
      } else if (useRefCallCounter === 2) {
        useRefCallCounter++;
        return mock_audioAnalyzerRef;
      } else {
        return mock_animationFrameRef;
      }
    }

    // Si initialValue n'est pas null, créer une ref standard
    return { current: initialValue };
  };

  return {
    ...originalReact,
    useRef: useRefMock,
  };
});

// --- Données de Test ---
const mockTracks: Track[] = [
  {
    id: 'yt1',
    title: 'YouTube Track 1',
    artist: 'Artist YT',
    type: 'single',
    releaseDate: '2023-03-01',
    coverUrl: '/yt1.jpg',
    genre: ['electro'],
    featured: true,
    bpm: 120,
    platforms: { youtube: { url: 'youtube.com/watch?v=yt12345' } },
  },
  {
    id: 'sc1',
    title: 'SoundCloud Track 1',
    artist: 'Artist SC',
    type: 'remix',
    releaseDate: '2023-02-15',
    coverUrl: '/sc1.jpg',
    genre: ['house'],
    platforms: { soundcloud: { url: 'soundcloud.com/track/sc1' } },
  },
  {
    id: 'yt2',
    title: 'YouTube Track 2',
    artist: 'Artist YT',
    type: 'ep',
    releaseDate: '2023-01-10',
    coverUrl: '/yt2.jpg',
    genre: ['techno'],
    platforms: { youtube: { url: 'youtu.be/yt67890' } },
  },
  {
    id: 'trk4',
    title: 'No Platform Track',
    artist: 'Artist NP',
    type: 'album',
    releaseDate: '2022-12-20',
    coverUrl: '/trk4.jpg',
    genre: ['ambient'],
    platforms: {},
  },
];

// --- Helper pour Rendu ---
const renderMusicPage = async () => {
  // Simule une réponse réussie de l'API
  (fetch as jest.Mock).mockResolvedValueOnce({
    ok: true,
    json: async () => mockTracks,
  });

  const result = render(
    <MusicPlayerProvider>
      <MusicPage />
    </MusicPlayerProvider>
  );

  // Attendre que la page soit chargée
  await waitFor(() => expect(screen.queryByText(/Chargement/i)).not.toBeInTheDocument());

  return result;
};

// --- Tests ---
describe('MusicPage Integration Tests', () => {
  beforeEach(() => {
    // Réinitialiser les mocks avant chaque test
    jest.clearAllMocks();
    localStorageMock.clear();
    // Définir un volume initial par défaut dans localStorage
    localStorageMock.setItem('global-music-volume', '0.7');
  });

  test('should load tracks and display them', async () => {
    await act(async () => {
      await renderMusicPage();
    });

    // Vérifier que les titres des pistes sont affichés
    expect(screen.getByText('YouTube Track 1')).toBeInTheDocument();
    expect(screen.getByText('SoundCloud Track 1')).toBeInTheDocument();
    expect(screen.getByText('YouTube Track 2')).toBeInTheDocument();
    expect(screen.getByText('No Platform Track')).toBeInTheDocument();

    // Vérifier que la section Featured est là (car yt1 est featured)
    expect(screen.getByText(/En vedette/i)).toBeInTheDocument();
  });

  test('should play and pause a track when clicking its card, then footer button', async () => {
    await act(async () => {
      await renderMusicPage();
    });

    const trackCard = screen.getByText('YouTube Track 1').closest('div[id^="music-card-"]');
    expect(trackCard).toBeInTheDocument();
    if (!trackCard) return;

    // 1. Cliquer sur la carte pour jouer
    await act(async () => {
      userEvent.click(trackCard);
      // Attendre que les effets asynchrones se terminent
      await new Promise((r) => setTimeout(r, 100));
    });

    // Vérifier la présence du footer player
    await waitFor(() => {
      expect(screen.getByTestId('footer-player')).toBeInTheDocument();
    });

    // Utiliser le data-testid pour le bouton Pause
    const pauseButton = await screen.findByTestId('footer-play-button');
    expect(pauseButton).toBeInTheDocument();

    // Vérifier le titre dans le footer - on utilise findAllByText car plusieurs éléments ont le même texte
    const footerTrackTitles = await screen.findAllByText('YouTube Track 1', { selector: 'h3' });
    expect(footerTrackTitles.length).toBeGreaterThan(0);

    // 2. Cliquer sur le bouton Pause du footer
    await act(async () => {
      userEvent.click(pauseButton);
      await new Promise((r) => setTimeout(r, 100));
    });

    // Vérifier que le bouton play est toujours là (toggle)
    await waitFor(() => {
      expect(screen.getByTestId('footer-play-button')).toBeInTheDocument();
    });

    // 3. Cliquer sur le bouton Lecture du footer pour reprendre
    await act(async () => {
      userEvent.click(screen.getByTestId('footer-play-button'));
      await new Promise((r) => setTimeout(r, 100));
    });

    // Vérifier que le footer player est toujours là
    await waitFor(() => {
      expect(screen.getByTestId('footer-player')).toBeInTheDocument();
    });
  });

  test('should control volume using the footer player', async () => {
    await act(async () => {
      await renderMusicPage();
    });

    const trackCard = screen.getByText('YouTube Track 1').closest('div[id^="music-card-"]')!;

    // Jouer une piste pour afficher le footer
    await act(async () => {
      userEvent.click(trackCard);
      await new Promise((r) => setTimeout(r, 100));
    });

    // Vérifier la présence du footer player
    await waitFor(() => {
      expect(screen.getByTestId('footer-player')).toBeInTheDocument();
    });

    const volumeSlider = await screen.findByLabelText(/Volume/i);
    expect(volumeSlider).toBeInTheDocument();

    // Vérifier le volume initial (depuis localStorage mock)
    expect(volumeSlider).toHaveValue('70'); // 0.7 * 100
    expect(localStorageMock.getItem('global-music-volume')).toBe('0.7');

    // Changer le volume avec le slider
    await act(async () => {
      fireEvent.change(volumeSlider, { target: { value: '30' } });
      await new Promise((r) => setTimeout(r, 100));
    });

    // Vérifier la mise à jour de la valeur du slider et du localStorage
    expect(volumeSlider).toHaveValue('30');

    // Attendre potentiellement la mise à jour asynchrone du localStorage dans le contexte
    await waitFor(() => {
      expect(localStorageMock.getItem('global-music-volume')).toBe('0.3');
    });

    // Tester le bouton Mute
    const muteButton = await screen.findByLabelText(/Couper le son/i);
    expect(muteButton).toBeInTheDocument();

    await act(async () => {
      userEvent.click(muteButton);
      await new Promise((r) => setTimeout(r, 100));
    });

    await waitFor(() => {
      expect(screen.getByLabelText(/Réactiver le son/i)).toBeInTheDocument();
    });

    expect(volumeSlider).toHaveValue('0');

    await waitFor(() => {
      expect(localStorageMock.getItem('global-music-volume')).toBe('0');
    });

    // Tester Unmute (doit restaurer le volume précédent, ici 0.3)
    const unmuteButton = await screen.findByLabelText(/Réactiver le son/i);

    await act(async () => {
      userEvent.click(unmuteButton);
      await new Promise((r) => setTimeout(r, 100));
    });

    await waitFor(() => {
      expect(screen.getByLabelText(/Couper le son/i)).toBeInTheDocument();
    });

    // Le volume restauré dépend de l'implémentation (il sauvegarde avant mute)
    await waitFor(() => {
      expect(localStorageMock.getItem('global-music-volume')).toBe('0.3');
    });

    expect(volumeSlider).toHaveValue('30');
  });

  test('should navigate between tracks using next/previous buttons', async () => {
    await act(async () => {
      await renderMusicPage();
    });

    const trackCard1 = screen.getByText('YouTube Track 1').closest('div[id^="music-card-"]')!;

    // 1. Jouer la première piste
    await act(async () => {
      userEvent.click(trackCard1);
      await new Promise((r) => setTimeout(r, 150));
    });

    // Vérifier la présence du footer player et du titre
    await waitFor(() => {
      expect(screen.getByTestId('footer-player')).toBeInTheDocument();
    });

    // Utiliser findAllByText pour trouver les titres (plus stable que getByTestId qui peut échouer)
    const initialTitles = await screen.findAllByText('YouTube Track 1', { selector: 'h3' });
    expect(initialTitles.length).toBeGreaterThan(0);

    // 2. Cliquer sur Suivant
    const nextButton = await screen.findByTestId('next-button');

    await act(async () => {
      userEvent.click(nextButton);
      await new Promise((r) => setTimeout(r, 300)); // Délai plus long pour permettre la transition
    });

    // Vérifier que le titre a changé en utilisant findByText plutôt que getByTestId
    const secondTitle = await screen.findByText('SoundCloud Track 1', { selector: 'h3' });
    expect(secondTitle).toBeInTheDocument();

    // 3. Cliquer sur Précédent
    const prevButton = await screen.findByTestId('prev-button');

    await act(async () => {
      userEvent.click(prevButton);
      await new Promise((r) => setTimeout(r, 300)); // Délai plus long pour permettre la transition
    });

    // Vérifier qu'on revient au titre précédent
    const firstTitleAgain = await screen.findAllByText('YouTube Track 1', { selector: 'h3' });
    expect(firstTitleAgain.length).toBeGreaterThan(0);
  });

  test('should handle rapid next clicks correctly (stress test)', async () => {
    await act(async () => {
      await renderMusicPage();
    });

    const trackCard1 = screen.getByText('YouTube Track 1').closest('div[id^="music-card-"]')!;

    // 1. Jouer la première piste
    await act(async () => {
      userEvent.click(trackCard1);
      await new Promise((r) => setTimeout(r, 150));
    });

    // Vérifier la présence du footer player
    await waitFor(() => {
      expect(screen.getByTestId('footer-player')).toBeInTheDocument();
    });

    // Utiliser findAllByText pour le titre initial
    const initialTitles = await screen.findAllByText('YouTube Track 1', { selector: 'h3' });
    expect(initialTitles.length).toBeGreaterThan(0);

    const nextButton = await screen.findByTestId('next-button');

    // Cliquer rapidement sur Next plusieurs fois
    await act(async () => {
      userEvent.click(nextButton);
      await new Promise((r) => setTimeout(r, 50));
      userEvent.click(nextButton);
      await new Promise((r) => setTimeout(r, 50));
      userEvent.click(nextButton);
      await new Promise((r) => setTimeout(r, 300)); // Attendre un peu plus longtemps après le dernier clic
    });

    // Vérifier que nous avons traversé les pistes et sommes sur la troisième
    // Utiliser findByText qui est plus robuste que getByTestId
    const finalTitle = await screen.findByText('YouTube Track 2', { selector: 'h3' });
    expect(finalTitle).toBeInTheDocument();
  });

  test('should close player when close button is clicked', async () => {
    await act(async () => {
      await renderMusicPage();
    });
    const trackCard = screen.getByText('YouTube Track 1').closest('div[id^="music-card-"]')!;

    // Jouer une piste
    await act(async () => {
      userEvent.click(trackCard);
    });
    await waitFor(() => expect(screen.getByTestId('footer-player')).toBeInTheDocument());

    // Cliquer sur le bouton Fermer
    const closeButton = screen.getByTestId('close-button');
    await act(async () => {
      userEvent.click(closeButton);
    });

    // Vérifier que le footer player a disparu
    await waitFor(() => {
      expect(screen.queryByTestId('footer-player')).not.toBeInTheDocument();
    });
  });
});

// --- TODO ---
// - Ajouter data-testid="footer-player" au div racine de SimpleMusicPlayer.tsx
// - Implémenter les autres tests
// - Affiner les mocks si nécessaire (notamment postMessage si on veut tester les commandes iframe plus précisément)
