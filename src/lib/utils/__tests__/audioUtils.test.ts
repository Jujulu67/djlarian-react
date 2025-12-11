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
const MockAudioContext = jest.fn().mockImplementation(() => ({
  createGain: jest.fn(() => ({
    connect: jest.fn(),
    gain: { value: 1 },
  })),
  destination: {},
  state: 'running',
  resume: jest.fn().mockResolvedValue(undefined),
}));
global.AudioContext = MockAudioContext as unknown as typeof AudioContext;

describe('audioUtils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
    // Clean up any elements added to document.body
    document.body.innerHTML = '';
  });

  afterEach(() => {
    // Clean up any elements added to document.body
    document.body.innerHTML = '';
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

    it('should handle localStorage.getItem returning null', () => {
      localStorageMock.getItem.mockReturnValueOnce(null);
      const volume = getInitialVolume();
      expect(volume).toBe(0.8);
    });

    it('should handle localStorage errors gracefully', () => {
      const originalGetItem = localStorageMock.getItem;
      localStorageMock.getItem.mockImplementationOnce(() => {
        throw new Error('localStorage error');
      });
      const volume = getInitialVolume();
      expect(volume).toBe(0.8);
      localStorageMock.getItem = originalGetItem;
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

    it('should return early if iframe.contentWindow is null', () => {
      const iframe = document.createElement('iframe');
      Object.defineProperty(iframe, 'contentWindow', {
        value: null,
        writable: true,
      });

      const result = sendPlayerCommand(iframe, 'youtube', 'play');
      expect(result).toBeUndefined();
    });

    it('should send seekTo command to YouTube iframe', () => {
      const iframe = document.createElement('iframe');
      const mockContentWindow = {
        postMessage: jest.fn(),
      };
      Object.defineProperty(iframe, 'contentWindow', {
        value: mockContentWindow,
        writable: true,
      });

      sendPlayerCommand(iframe, 'youtube', 'seekTo', 30);

      expect(mockContentWindow.postMessage).toHaveBeenCalledWith(
        JSON.stringify({ event: 'command', func: 'seekTo', args: [30, true] }),
        '*'
      );
    });

    it('should use default value when setVolume value is undefined for YouTube', () => {
      const iframe = document.createElement('iframe');
      const mockContentWindow = {
        postMessage: jest.fn(),
      };
      Object.defineProperty(iframe, 'contentWindow', {
        value: mockContentWindow,
        writable: true,
      });

      sendPlayerCommand(iframe, 'youtube', 'setVolume');

      expect(mockContentWindow.postMessage).toHaveBeenCalledWith(
        JSON.stringify({ event: 'command', func: 'setVolume', args: [50] }),
        '*'
      );
    });

    it('should send setVolume command to SoundCloud iframe', () => {
      const iframe = document.createElement('iframe');
      const mockContentWindow = {
        postMessage: jest.fn(),
      };
      Object.defineProperty(iframe, 'contentWindow', {
        value: mockContentWindow,
        writable: true,
      });

      sendPlayerCommand(iframe, 'soundcloud', 'setVolume', 0.7);

      expect(mockContentWindow.postMessage).toHaveBeenCalledWith(
        JSON.stringify({ method: 'setVolume', value: 70 }),
        '*'
      );
    });

    it('should send seekTo command to SoundCloud iframe', () => {
      const iframe = document.createElement('iframe');
      const mockContentWindow = {
        postMessage: jest.fn(),
      };
      Object.defineProperty(iframe, 'contentWindow', {
        value: mockContentWindow,
        writable: true,
      });

      sendPlayerCommand(iframe, 'soundcloud', 'seekTo', 45);

      expect(mockContentWindow.postMessage).toHaveBeenCalledWith(
        JSON.stringify({ method: 'seekTo', value: 45000 }),
        '*'
      );
    });

    it('should use default value when setVolume value is undefined for SoundCloud', () => {
      const iframe = document.createElement('iframe');
      const mockContentWindow = {
        postMessage: jest.fn(),
      };
      Object.defineProperty(iframe, 'contentWindow', {
        value: mockContentWindow,
        writable: true,
      });

      sendPlayerCommand(iframe, 'soundcloud', 'setVolume');

      expect(mockContentWindow.postMessage).toHaveBeenCalledWith(
        JSON.stringify({ method: 'setVolume', value: 50 }),
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

    it('should send pause command to SoundCloud iframe', () => {
      const iframe = document.createElement('iframe');
      const mockContentWindow = {
        postMessage: jest.fn(),
      };
      Object.defineProperty(iframe, 'contentWindow', {
        value: mockContentWindow,
        writable: true,
      });

      sendPlayerCommand(iframe, 'soundcloud', 'pause');

      expect(mockContentWindow.postMessage).toHaveBeenCalledWith(
        JSON.stringify({ method: 'pause' }),
        '*'
      );
    });

    it('should handle errors when sending command', () => {
      const iframe = document.createElement('iframe');
      const mockContentWindow = {
        postMessage: jest.fn(() => {
          throw new Error('PostMessage error');
        }),
      };
      Object.defineProperty(iframe, 'contentWindow', {
        value: mockContentWindow,
        writable: true,
      });

      // Should not throw
      expect(() => sendPlayerCommand(iframe, 'youtube', 'play')).not.toThrow();
    });
  });

  describe('applyVolumeToAllPlayers', () => {
    beforeEach(() => {
      // Reset window global audio context (safely, without using delete)
      // Don't manipulate window properties that might cause jsdom issues
      jest.clearAllMocks();
    });

    it('should apply volume to all players', () => {
      const audio = document.createElement('audio');
      document.body.appendChild(audio);

      const volume = applyVolumeToAllPlayers(0.5);
      expect(volume).toBe(0.5);
      expect(audio.volume).toBe(0.5);
    });

    it('should apply volume to YouTube iframes when applyToIframes is true', () => {
      const iframe = document.createElement('iframe');
      iframe.src = 'https://www.youtube.com/embed/test';
      document.body.appendChild(iframe);
      const mockContentWindow = {
        postMessage: jest.fn(),
      };
      Object.defineProperty(iframe, 'contentWindow', {
        value: mockContentWindow,
        writable: true,
      });

      applyVolumeToAllPlayers(0.6, true);

      expect(mockContentWindow.postMessage).toHaveBeenCalled();
    });

    it('should apply volume to SoundCloud iframes when applyToIframes is true', () => {
      const iframe = document.createElement('iframe');
      iframe.src = 'https://soundcloud.com/test';
      document.body.appendChild(iframe);
      const mockContentWindow = {
        postMessage: jest.fn(),
      };
      Object.defineProperty(iframe, 'contentWindow', {
        value: mockContentWindow,
        writable: true,
      });

      applyVolumeToAllPlayers(0.7, true);

      expect(mockContentWindow.postMessage).toHaveBeenCalled();
    });

    it('should clamp volume to valid range', () => {
      const volume1 = applyVolumeToAllPlayers(1.5);
      expect(volume1).toBe(1);

      const volume2 = applyVolumeToAllPlayers(-0.5);
      expect(volume2).toBe(0);
    });

    it('should skip iframes when applyToIframes is false', () => {
      const volume = applyVolumeToAllPlayers(0.5, false);
      expect(volume).toBe(0.5);
    });

    it('should handle iframes with different src patterns', () => {
      const iframe1 = document.createElement('iframe');
      iframe1.src = 'https://www.youtube.com/embed/test';
      document.body.appendChild(iframe1);

      const iframe2 = document.createElement('iframe');
      iframe2.src = 'https://w.soundcloud.com/player/?url=test';
      document.body.appendChild(iframe2);

      const mockContentWindow1 = { postMessage: jest.fn() };
      const mockContentWindow2 = { postMessage: jest.fn() };
      Object.defineProperty(iframe1, 'contentWindow', {
        value: mockContentWindow1,
        writable: true,
      });
      Object.defineProperty(iframe2, 'contentWindow', {
        value: mockContentWindow2,
        writable: true,
      });

      applyVolumeToAllPlayers(0.6, true);

      expect(mockContentWindow1.postMessage).toHaveBeenCalled();
      expect(mockContentWindow2.postMessage).toHaveBeenCalled();
    });
  });

  describe('sendPlayerCommand edge cases', () => {
    it('should handle unsupported YouTube command', () => {
      const iframe = document.createElement('iframe');
      const mockContentWindow = { postMessage: jest.fn() };
      Object.defineProperty(iframe, 'contentWindow', {
        value: mockContentWindow,
        writable: true,
      });

      // @ts-expect-error - Testing unsupported command
      sendPlayerCommand(iframe, 'youtube', 'unsupported');
      // Should not throw, but may log error
    });

    it('should handle unsupported SoundCloud command', () => {
      const iframe = document.createElement('iframe');
      const mockContentWindow = { postMessage: jest.fn() };
      Object.defineProperty(iframe, 'contentWindow', {
        value: mockContentWindow,
        writable: true,
      });

      // @ts-expect-error - Testing unsupported command
      sendPlayerCommand(iframe, 'soundcloud', 'unsupported');
      // Should not throw, but may log error
    });

    it('should handle YouTube setVolume with undefined value', () => {
      const iframe = document.createElement('iframe');
      const mockContentWindow = { postMessage: jest.fn() };
      Object.defineProperty(iframe, 'contentWindow', {
        value: mockContentWindow,
        writable: true,
      });

      sendPlayerCommand(iframe, 'youtube', 'setVolume', undefined);

      expect(mockContentWindow.postMessage).toHaveBeenCalledWith(
        JSON.stringify({ event: 'command', func: 'setVolume', args: [50] }),
        '*'
      );
    });
  });
});
