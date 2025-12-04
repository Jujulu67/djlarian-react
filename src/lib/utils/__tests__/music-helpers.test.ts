import { MUSIC_TYPES, emptyTrackForm, extractInfoFromTitle } from '../music-helpers';

describe('music-helpers', () => {
  describe('MUSIC_TYPES', () => {
    it('should have all music types', () => {
      expect(MUSIC_TYPES).toHaveLength(6);
      expect(MUSIC_TYPES.map((t) => t.value)).toContain('single');
      expect(MUSIC_TYPES.map((t) => t.value)).toContain('ep');
      expect(MUSIC_TYPES.map((t) => t.value)).toContain('remix');
    });
  });

  describe('emptyTrackForm', () => {
    it('should have default values', () => {
      expect(emptyTrackForm.title).toBe('');
      expect(emptyTrackForm.artist).toBe('Larian');
      expect(emptyTrackForm.type).toBe('single');
      expect(emptyTrackForm.isPublished).toBe(true);
    });
  });

  describe('extractInfoFromTitle', () => {
    it('should extract BPM from title', () => {
      const result = extractInfoFromTitle('Track Name 128 BPM');
      expect(result.bpm).toBe(128);
    });

    it('should extract BPM from brackets', () => {
      const result = extractInfoFromTitle('Track Name [128]');
      expect(result.bpm).toBe(128);
    });

    it('should extract BPM from parentheses', () => {
      const result = extractInfoFromTitle('Track Name (128 BPM)');
      expect(result.bpm).toBe(128);
    });

    it('should not extract invalid BPM', () => {
      const result1 = extractInfoFromTitle('Track Name 50 BPM'); // Too low
      expect(result1.bpm).toBeUndefined();

      const result2 = extractInfoFromTitle('Track Name 250 BPM'); // Too high
      expect(result2.bpm).toBeUndefined();
    });

    it('should extract genres from title', () => {
      const result = extractInfoFromTitle('Track Name House');
      expect(result.genres).toContain('House');
    });

    it('should extract multiple genres', () => {
      const result = extractInfoFromTitle('Track Name Tech House Progressive');
      expect(result.genres.length).toBeGreaterThan(0);
    });

    it('should extract remix genre', () => {
      const result = extractInfoFromTitle('Track Name Remix');
      expect(result.genres).toContain('Remix');
    });

    it('should extract live genre', () => {
      const result = extractInfoFromTitle('Track Name Live');
      expect(result.genres).toContain('Live');
    });

    it('should extract DJ Set genre', () => {
      const result = extractInfoFromTitle('Track Name Mix');
      expect(result.genres).toContain('DJ Set');
    });

    it('should clean HTML entities', () => {
      const result = extractInfoFromTitle('Track &amp; Name &quot;Test&quot;');
      expect(result.cleanTitle).toBe('Track & Name "Test"');
    });

    it('should handle empty title', () => {
      const result = extractInfoFromTitle('');
      expect(result.cleanTitle).toBe('');
      expect(result.bpm).toBeUndefined();
      expect(result.genres).toEqual([]);
    });

    it('should extract Techno genre', () => {
      const result = extractInfoFromTitle('Track Name Techno');
      expect(result.genres).toContain('Techno');
    });

    it('should extract Trance genre', () => {
      const result = extractInfoFromTitle('Track Name Trance');
      expect(result.genres).toContain('Trance');
    });

    it('should extract Drum & Bass genre', () => {
      const result = extractInfoFromTitle('Track Name Drum & Bass');
      expect(result.genres).toContain('Drum & Bass');
    });

    it('should extract DnB genre', () => {
      const result = extractInfoFromTitle('Track Name DnB');
      expect(result.genres).toContain('DnB');
    });
  });
});
