import { formatDuration, analyzeAudioFile } from '../audio-analysis';

// Mock AudioContext
const mockDecodeAudioData = jest.fn();
const mockGetChannelData = jest.fn();
const mockClose = jest.fn();

class MockAudioContext {
  decodeAudioData = mockDecodeAudioData;
  close = mockClose;
}

class MockFileReader {
  onload: ((e: { target: { result: ArrayBuffer } }) => void) | null = null;
  onerror: (() => void) | null = null;
  readAsArrayBuffer = jest.fn((file: File) => {
    // Simulate successful read
    setTimeout(() => {
      if (this.onload) {
        this.onload({ target: { result: new ArrayBuffer(8) } });
      }
    }, 0);
  });
}

describe('audio-analysis', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.FileReader = MockFileReader as any;
    (global as any).AudioContext = MockAudioContext;
    (global as any).webkitAudioContext = undefined;
  });

  describe('analyzeAudioFile', () => {
    it('should analyze audio file and return waveform and duration', async () => {
      const mockAudioBuffer = {
        duration: 120.5,
        numberOfChannels: 2,
        getChannelData: mockGetChannelData,
      };

      mockGetChannelData.mockReturnValue(new Float32Array([0.1, 0.2, 0.3]));
      mockDecodeAudioData.mockResolvedValue(mockAudioBuffer);

      const file = new File(['audio'], 'test.mp3', { type: 'audio/mpeg' });
      const result = await analyzeAudioFile(file);

      expect(result.duration).toBe(120.5);
      expect(result.fileName).toBe('test.mp3');
      expect(Array.isArray(result.waveform)).toBe(true);
      expect(result.waveform.length).toBeGreaterThan(0);
      expect(mockClose).toHaveBeenCalled();
    });

    it('should handle AudioContext not supported', async () => {
      (global as any).AudioContext = undefined;
      (global as any).webkitAudioContext = undefined;

      const file = new File(['audio'], 'test.mp3', { type: 'audio/mpeg' });
      await expect(analyzeAudioFile(file)).rejects.toThrow('AudioContext not supported');
    });

    it('should handle webkitAudioContext', async () => {
      (global as any).AudioContext = undefined;
      (global as any).webkitAudioContext = MockAudioContext;

      const mockAudioBuffer = {
        duration: 60,
        numberOfChannels: 1,
        getChannelData: mockGetChannelData,
      };

      mockGetChannelData.mockReturnValue(new Float32Array([0.1, 0.2]));
      mockDecodeAudioData.mockResolvedValue(mockAudioBuffer);

      const file = new File(['audio'], 'test.mp3', { type: 'audio/mpeg' });
      const result = await analyzeAudioFile(file);

      expect(result.duration).toBe(60);
    });

    it('should handle decodeAudioData error', async () => {
      mockDecodeAudioData.mockRejectedValue(new Error('Decode error'));

      const file = new File(['audio'], 'test.mp3', { type: 'audio/mpeg' });
      await expect(analyzeAudioFile(file)).rejects.toThrow(
        "Erreur lors de l'analyse du fichier audio"
      );
      expect(mockClose).toHaveBeenCalled();
    });

    it('should handle mono audio', async () => {
      const mockAudioBuffer = {
        duration: 30,
        numberOfChannels: 1,
        getChannelData: mockGetChannelData,
      };

      mockGetChannelData.mockReturnValue(new Float32Array([0.1, 0.2, 0.3, 0.4]));
      mockDecodeAudioData.mockResolvedValue(mockAudioBuffer);

      const file = new File(['audio'], 'test.mp3', { type: 'audio/mpeg' });
      const result = await analyzeAudioFile(file);

      expect(result.waveform.length).toBeGreaterThan(0);
    });
  });

  describe('formatDuration', () => {
    it('should format seconds to MM:SS', () => {
      expect(formatDuration(0)).toBe('0:00');
      expect(formatDuration(30)).toBe('0:30');
      expect(formatDuration(60)).toBe('1:00');
      expect(formatDuration(90)).toBe('1:30');
      expect(formatDuration(125)).toBe('2:05');
      expect(formatDuration(3661)).toBe('61:01');
    });

    it('should handle negative numbers', () => {
      expect(formatDuration(-10)).toBe('0:00');
    });

    it('should handle NaN', () => {
      expect(formatDuration(NaN)).toBe('0:00');
    });

    it('should handle decimal seconds', () => {
      expect(formatDuration(30.7)).toBe('0:30');
      expect(formatDuration(60.9)).toBe('1:00');
    });

    it('should pad seconds with zero', () => {
      expect(formatDuration(61)).toBe('1:01');
      expect(formatDuration(62)).toBe('1:02');
      expect(formatDuration(69)).toBe('1:09');
    });
  });
});
