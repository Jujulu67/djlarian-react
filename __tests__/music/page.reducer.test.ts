import { Track } from '@/lib/utils/types';

// Récupérer la définition de PlayerState, PlayerAction et playerReducer depuis page.tsx
// NOTE: Il serait préférable d'extraire ces types et le reducer dans un fichier séparé
// (ex: src/reducers/playerReducer.ts) pour faciliter les imports et la séparation des préoccupations.
// Pour l'instant, je vais les copier/coller ici pour le test.

// --- Types et États (copiés depuis page.tsx) ---
interface PlayerState {
  currentTrack: Track | null;
  isPlaying: boolean;
  filteredTracks: Track[];
}

type PlayerAction =
  | { type: 'PLAY_TRACK'; payload: Track }
  | { type: 'TOGGLE_PLAY_PAUSE' }
  | { type: 'CLOSE_PLAYER' }
  | { type: 'PLAY_NEXT' }
  | { type: 'PLAY_PREV' }
  | { type: 'SET_FILTERED_TRACKS'; payload: Track[] };

const initialPlayerState: PlayerState = {
  currentTrack: null,
  isPlaying: false,
  filteredTracks: [],
};

// --- Reducer (copié depuis page.tsx) ---
function playerReducer(state: PlayerState, action: PlayerAction): PlayerState {
  switch (action.type) {
    case 'SET_FILTERED_TRACKS':
      const stillExists =
        state.currentTrack && action.payload.some((t) => t.id === state.currentTrack?.id);
      return {
        ...state,
        filteredTracks: action.payload,
        currentTrack: stillExists ? state.currentTrack : null,
        isPlaying: stillExists ? state.isPlaying : false,
      };
    case 'PLAY_TRACK':
      if (state.currentTrack?.id === action.payload.id) {
        return { ...state, isPlaying: !state.isPlaying };
      }
      return { ...state, currentTrack: action.payload, isPlaying: true };
    case 'TOGGLE_PLAY_PAUSE':
      if (!state.currentTrack) return state;
      return { ...state, isPlaying: !state.isPlaying };
    case 'CLOSE_PLAYER':
      return { ...state, currentTrack: null, isPlaying: false };
    case 'PLAY_NEXT': {
      if (!state.currentTrack || state.filteredTracks.length < 2) return state;
      const currentIndex = state.filteredTracks.findIndex((t) => t.id === state.currentTrack?.id);
      if (currentIndex === -1)
        return { ...state, currentTrack: state.filteredTracks[0], isPlaying: true };
      const nextIndex = (currentIndex + 1) % state.filteredTracks.length;
      return { ...state, currentTrack: state.filteredTracks[nextIndex], isPlaying: true };
    }
    case 'PLAY_PREV': {
      if (!state.currentTrack || state.filteredTracks.length < 2) return state;
      const currentIndex = state.filteredTracks.findIndex((t) => t.id === state.currentTrack?.id);
      if (currentIndex === -1)
        return { ...state, currentTrack: state.filteredTracks[0], isPlaying: true };
      const prevIndex =
        (currentIndex - 1 + state.filteredTracks.length) % state.filteredTracks.length;
      return { ...state, currentTrack: state.filteredTracks[prevIndex], isPlaying: true };
    }
    default:
      return state;
  }
}

// --- Données de Test ---
const track1: Track = {
  id: '1',
  title: 'Track 1',
  artist: 'Artist',
  type: 'single',
  releaseDate: '2023-01-01',
  coverUrl: '',
  genre: [],
  platforms: {},
};
const track2: Track = {
  id: '2',
  title: 'Track 2',
  artist: 'Artist',
  type: 'single',
  releaseDate: '2023-01-02',
  coverUrl: '',
  genre: [],
  platforms: {},
};
const track3: Track = {
  id: '3',
  title: 'Track 3',
  artist: 'Artist',
  type: 'single',
  releaseDate: '2023-01-03',
  coverUrl: '',
  genre: [],
  platforms: {},
};

// --- Tests ---
describe('playerReducer', () => {
  let state: PlayerState;

  beforeEach(() => {
    state = { ...initialPlayerState, filteredTracks: [track1, track2, track3] };
  });

  test('PLAY_TRACK: should start playing a new track', () => {
    const newState = playerReducer(state, { type: 'PLAY_TRACK', payload: track1 });
    expect(newState.currentTrack).toEqual(track1);
    expect(newState.isPlaying).toBe(true);
  });

  test('PLAY_TRACK: should toggle pause if the same track is played again', () => {
    state.currentTrack = track1;
    state.isPlaying = true;
    const newState = playerReducer(state, { type: 'PLAY_TRACK', payload: track1 });
    expect(newState.currentTrack).toEqual(track1);
    expect(newState.isPlaying).toBe(false);
  });

  test('PLAY_TRACK: should toggle play if the same track is played while paused', () => {
    state.currentTrack = track1;
    state.isPlaying = false;
    const newState = playerReducer(state, { type: 'PLAY_TRACK', payload: track1 });
    expect(newState.currentTrack).toEqual(track1);
    expect(newState.isPlaying).toBe(true);
  });

  test('TOGGLE_PLAY_PAUSE: should pause when playing', () => {
    state.currentTrack = track1;
    state.isPlaying = true;
    const newState = playerReducer(state, { type: 'TOGGLE_PLAY_PAUSE' });
    expect(newState.isPlaying).toBe(false);
  });

  test('TOGGLE_PLAY_PAUSE: should play when paused', () => {
    state.currentTrack = track1;
    state.isPlaying = false;
    const newState = playerReducer(state, { type: 'TOGGLE_PLAY_PAUSE' });
    expect(newState.isPlaying).toBe(true);
  });

  test('TOGGLE_PLAY_PAUSE: should do nothing if no track is current', () => {
    const newState = playerReducer(state, { type: 'TOGGLE_PLAY_PAUSE' });
    expect(newState).toEqual(state); // L'état ne doit pas changer
  });

  test('CLOSE_PLAYER: should reset current track and stop playing', () => {
    state.currentTrack = track1;
    state.isPlaying = true;
    const newState = playerReducer(state, { type: 'CLOSE_PLAYER' });
    expect(newState.currentTrack).toBeNull();
    expect(newState.isPlaying).toBe(false);
  });

  test('PLAY_NEXT: should play the next track', () => {
    state.currentTrack = track1;
    state.isPlaying = true;
    const newState = playerReducer(state, { type: 'PLAY_NEXT' });
    expect(newState.currentTrack).toEqual(track2);
    expect(newState.isPlaying).toBe(true);
  });

  test('PLAY_NEXT: should wrap around to the first track', () => {
    state.currentTrack = track3;
    state.isPlaying = true;
    const newState = playerReducer(state, { type: 'PLAY_NEXT' });
    expect(newState.currentTrack).toEqual(track1);
    expect(newState.isPlaying).toBe(true);
  });

  test('PLAY_NEXT: should do nothing if only one track or no track', () => {
    state.filteredTracks = [track1];
    state.currentTrack = track1;
    let newState = playerReducer(state, { type: 'PLAY_NEXT' });
    expect(newState.currentTrack).toEqual(track1);

    state.currentTrack = null;
    newState = playerReducer(state, { type: 'PLAY_NEXT' });
    expect(newState.currentTrack).toBeNull();
  });

  test('PLAY_PREV: should play the previous track', () => {
    state.currentTrack = track2;
    state.isPlaying = true;
    const newState = playerReducer(state, { type: 'PLAY_PREV' });
    expect(newState.currentTrack).toEqual(track1);
    expect(newState.isPlaying).toBe(true);
  });

  test('PLAY_PREV: should wrap around to the last track', () => {
    state.currentTrack = track1;
    state.isPlaying = true;
    const newState = playerReducer(state, { type: 'PLAY_PREV' });
    expect(newState.currentTrack).toEqual(track3);
    expect(newState.isPlaying).toBe(true);
  });

  test('PLAY_PREV: should do nothing if only one track or no track', () => {
    state.filteredTracks = [track1];
    state.currentTrack = track1;
    let newState = playerReducer(state, { type: 'PLAY_PREV' });
    expect(newState.currentTrack).toEqual(track1);

    state.currentTrack = null;
    newState = playerReducer(state, { type: 'PLAY_PREV' });
    expect(newState.currentTrack).toBeNull();
  });

  test('SET_FILTERED_TRACKS: should update the track list', () => {
    const newTracks = [track2, track3];
    const newState = playerReducer(state, { type: 'SET_FILTERED_TRACKS', payload: newTracks });
    expect(newState.filteredTracks).toEqual(newTracks);
  });

  test('SET_FILTERED_TRACKS: should stop playing if current track is removed', () => {
    state.currentTrack = track1;
    state.isPlaying = true;
    const newTracks = [track2, track3]; // track1 est retiré
    const newState = playerReducer(state, { type: 'SET_FILTERED_TRACKS', payload: newTracks });
    expect(newState.filteredTracks).toEqual(newTracks);
    expect(newState.currentTrack).toBeNull();
    expect(newState.isPlaying).toBe(false);
  });

  test('SET_FILTERED_TRACKS: should keep playing if current track still exists', () => {
    state.currentTrack = track2;
    state.isPlaying = true;
    const newTracks = [track1, track2]; // track2 existe toujours
    const newState = playerReducer(state, { type: 'SET_FILTERED_TRACKS', payload: newTracks });
    expect(newState.filteredTracks).toEqual(newTracks);
    expect(newState.currentTrack).toEqual(track2);
    expect(newState.isPlaying).toBe(true);
  });
});
