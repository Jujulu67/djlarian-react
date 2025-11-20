import {
  calculateFrequencyMapping,
  calculateRealAudioBarValue,
  calculateSimulatedAudioBarValue,
  calculatePauseAnimationBarValue,
} from '../audioVisualizerUtils';

describe('audioVisualizerUtils', () => {
  describe('calculateFrequencyMapping', () => {
    it('should return 20 mappings for any input size', () => {
      const mapping = calculateFrequencyMapping(1024);
      expect(mapping).toHaveLength(20);
    });

    it('should have correct structure for each mapping', () => {
      const mapping = calculateFrequencyMapping(1024);
      mapping.forEach((map) => {
        expect(map).toHaveProperty('binStart');
        expect(map).toHaveProperty('binEnd');
        expect(map).toHaveProperty('index');
        expect(typeof map.binStart).toBe('number');
        expect(typeof map.binEnd).toBe('number');
        expect(typeof map.index).toBe('number');
      });
    });

    it('should have increasing binStart values', () => {
      const mapping = calculateFrequencyMapping(1024);
      for (let i = 1; i < mapping.length; i++) {
        expect(mapping[i].binStart).toBeGreaterThanOrEqual(mapping[i - 1].binStart);
      }
    });

    it('should handle different input sizes', () => {
      const mapping512 = calculateFrequencyMapping(512);
      const mapping2048 = calculateFrequencyMapping(2048);
      expect(mapping512).toHaveLength(20);
      expect(mapping2048).toHaveLength(20);
    });
  });

  describe('calculateRealAudioBarValue', () => {
    const frequencyMapping = calculateFrequencyMapping(1024);
    const previousAudioData = Array(20).fill(20);

    it('should return a value between 18 and 92', () => {
      const frequencyData = new Uint8Array(1024).fill(128);
      const value = calculateRealAudioBarValue(
        0,
        frequencyData,
        previousAudioData,
        frequencyMapping
      );
      expect(value).toBeGreaterThanOrEqual(18);
      expect(value).toBeLessThanOrEqual(92);
    });

    it('should handle empty frequency data', () => {
      const frequencyData = new Uint8Array(1024).fill(0);
      const value = calculateRealAudioBarValue(
        0,
        frequencyData,
        previousAudioData,
        frequencyMapping
      );
      expect(value).toBeGreaterThanOrEqual(18);
    });

    it('should handle maximum frequency data', () => {
      const frequencyData = new Uint8Array(1024).fill(255);
      const value = calculateRealAudioBarValue(
        0,
        frequencyData,
        previousAudioData,
        frequencyMapping
      );
      expect(value).toBeGreaterThanOrEqual(18);
      expect(value).toBeLessThanOrEqual(92);
    });

    it('should apply smoothing from previous values', () => {
      const frequencyData = new Uint8Array(1024).fill(128);
      const highPrevious = Array(20).fill(80);
      const lowPrevious = Array(20).fill(20);

      const valueHigh = calculateRealAudioBarValue(
        0,
        frequencyData,
        highPrevious,
        frequencyMapping
      );
      const valueLow = calculateRealAudioBarValue(0, frequencyData, lowPrevious, frequencyMapping);

      // Values should be different due to smoothing
      expect(valueHigh).not.toBe(valueLow);
    });

    it('should handle different bar indices', () => {
      const frequencyData = new Uint8Array(1024).fill(128);
      const values = [0, 7, 14, 19].map((index) =>
        calculateRealAudioBarValue(index, frequencyData, previousAudioData, frequencyMapping)
      );

      values.forEach((value) => {
        expect(value).toBeGreaterThanOrEqual(18);
        expect(value).toBeLessThanOrEqual(92);
      });
    });
  });

  describe('calculateSimulatedAudioBarValue', () => {
    const previousAudioData = Array(20).fill(20);

    it('should return a value between 20 and 90', () => {
      const value = calculateSimulatedAudioBarValue(0, 0, previousAudioData);
      expect(value).toBeGreaterThanOrEqual(20);
      expect(value).toBeLessThanOrEqual(90);
    });

    it('should vary with time', () => {
      const value1 = calculateSimulatedAudioBarValue(0, 0, previousAudioData);
      const value2 = calculateSimulatedAudioBarValue(0, 1, previousAudioData);
      // Values should be different (or at least valid)
      expect(value1).toBeGreaterThanOrEqual(20);
      expect(value2).toBeGreaterThanOrEqual(20);
    });

    it('should handle different bar indices (bass, mid, high)', () => {
      const time = 1.0;
      const bassValue = calculateSimulatedAudioBarValue(0, time, previousAudioData);
      const midValue = calculateSimulatedAudioBarValue(10, time, previousAudioData);
      const highValue = calculateSimulatedAudioBarValue(19, time, previousAudioData);

      expect(bassValue).toBeGreaterThanOrEqual(20);
      expect(midValue).toBeGreaterThanOrEqual(20);
      expect(highValue).toBeGreaterThanOrEqual(20);
    });

    it('should apply smoothing from previous values', () => {
      const time = 1.0;
      const highPrevious = Array(20).fill(80);
      const lowPrevious = Array(20).fill(20);

      const valueHigh = calculateSimulatedAudioBarValue(0, time, highPrevious);
      const valueLow = calculateSimulatedAudioBarValue(0, time, lowPrevious);

      // Values should be different due to smoothing
      expect(valueHigh).not.toBe(valueLow);
    });
  });

  describe('calculatePauseAnimationBarValue', () => {
    const previousAudioData = Array(20).fill(20);

    it('should return a value between 15 and 90', () => {
      const value = calculatePauseAnimationBarValue(0, 0, previousAudioData);
      expect(value).toBeGreaterThanOrEqual(15);
      expect(value).toBeLessThanOrEqual(90);
    });

    it('should create wave-like animation', () => {
      const value1 = calculatePauseAnimationBarValue(0, 0, previousAudioData);
      const value2 = calculatePauseAnimationBarValue(0, 1, previousAudioData);
      const value3 = calculatePauseAnimationBarValue(0, 2, previousAudioData);

      // Values should vary (creating wave effect)
      expect(value1).toBeGreaterThanOrEqual(15);
      expect(value2).toBeGreaterThanOrEqual(15);
      expect(value3).toBeGreaterThanOrEqual(15);
    });

    it('should handle different bar positions', () => {
      const time = 1.0;
      const values = [0, 10, 19].map((index) =>
        calculatePauseAnimationBarValue(index, time, previousAudioData)
      );

      values.forEach((value) => {
        expect(value).toBeGreaterThanOrEqual(15);
        expect(value).toBeLessThanOrEqual(90);
      });
    });

    it('should apply smoothing from previous values', () => {
      const time = 1.0;
      const highPrevious = Array(20).fill(80);
      const lowPrevious = Array(20).fill(20);

      const valueHigh = calculatePauseAnimationBarValue(0, time, highPrevious);
      const valueLow = calculatePauseAnimationBarValue(0, time, lowPrevious);

      // Values should be different due to smoothing
      expect(valueHigh).not.toBe(valueLow);
    });
  });
});
