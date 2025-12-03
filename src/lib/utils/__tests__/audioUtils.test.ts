/**
 * Tests for audioUtils
 */
import { getInitialVolume, sendPlayerCommand, applyVolumeToAllPlayers } from '../audioUtils';

// Mock logger
jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value.toString();
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock AudioContext
global.AudioContext = jest.fn().mockImplementation(() => ({
  createGain: jest.fn(() => ({
    connect: jest.fn(),
    gain: { value: 1 },
  })),
  destination: {},
  close: jest.fn(),
})) as unknown as typeof AudioContext;

describe('audioUtils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
  });

  describe('getInitialVolume', () => {
    it('should return default volume when localStorage is empty', () => {
      const volume = getInitialVolume();
      expect(volume).toBe(0.8);
    });

    it('should return volume from localStorage', () => {
      localStorageMock.setItem('global-music-volume', '0.5');
      const volume = getInitialVolume();
      expect(volume).toBe(0.5);
    });

    it('should clamp volume to valid range [0, 1]', () => {
      localStorageMock.setItem('global-music-volume', '1.5');
      const volume = getInitialVolume();
      expect(volume).toBe(1);

      localStorageMock.setItem('global-music-volume', '-0.5');
      const volume2 = getInitialVolume();
      expect(volume2).toBe(0);
    });
  });

  describe('sendPlayerCommand', () => {
    it('should return early if iframe is null', () => {
      const result = sendPlayerCommand(null, 'youtube', 'play');
      expect(result).toBeUndefined();
    });

    it('should return early if platform is null', () => {
      const iframe = document.createElement('iframe');
      const result = sendPlayerCommand(iframe, null, 'play');
      expect(result).toBeUndefined();
    });

    it('should send play command to YouTube iframe', () => {
      const iframe = document.createElement('iframe');
      const mockContentWindow = {
        postMessage: jest.fn(),
      };
      Object.defineProperty(iframe, 'contentWindow', {
        value: mockContentWindow,
        writable: true,
      });

      sendPlayerCommand(iframe, 'youtube', 'play');

      expect(mockContentWindow.postMessage).toHaveBeenCalledWith(
        JSON.stringify({ event: 'command', func: 'playVideo', args: [] }),
        '*'
      );
    });

    it('should send pause command to YouTube iframe', () => {
      const iframe = document.createElement('iframe');
      const mockContentWindow = {
        postMessage: jest.fn(),
      };
      Object.defineProperty(iframe, 'contentWindow', {
        value: mockContentWindow,
        writable: true,
      });

      sendPlayerCommand(iframe, 'youtube', 'pause');

      expect(mockContentWindow.postMessage).toHaveBeenCalledWith(
        JSON.stringify({ event: 'command', func: 'pauseVideo', args: [] }),
        '*'
      );
    });

    it('should send setVolume command to YouTube iframe', () => {
      const iframe = document.createElement('iframe');
      const mockContentWindow = {
        postMessage: jest.fn(),
      };
      Object.defineProperty(iframe, 'contentWindow', {
        value: mockContentWindow,
        writable: true,
      });

      sendPlayerCommand(iframe, 'youtube', 'setVolume', 0.5);

      expect(mockContentWindow.postMessage).toHaveBeenCalledWith(
        JSON.stringify({ event: 'command', func: 'setVolume', args: [50] }),
        '*'
      );
    });

    it('should send command to SoundCloud iframe', () => {
      const iframe = document.createElement('iframe');
      const mockContentWindow = {
        postMessage: jest.fn(),
      };
      Object.defineProperty(iframe, 'contentWindow', {
        value: mockContentWindow,
        writable: true,
      });

      sendPlayerCommand(iframe, 'soundcloud', 'play');

      expect(mockContentWindow.postMessage).toHaveBeenCalledWith(
        JSON.stringify({ method: 'play' }),
        '*'
      );
    });
  });

  describe('applyVolumeToAllPlayers', () => {
    it('should apply volume to all players', () => {
      const audio = document.createElement('audio');
      document.body.appendChild(audio);

      const volume = applyVolumeToAllPlayers(0.5);
      expect(volume).toBe(0.5);
      expect(audio.volume).toBe(0.5);
    });

    it('should clamp volume to valid range', () => {
      const volume1 = applyVolumeToAllPlayers(1.5);
      expect(volume1).toBe(1);

      const volume2 = applyVolumeToAllPlayers(-0.5);
      expect(volume2).toBe(0);
    });
  });
});
