import { normalizeArtistName, parseSoundCloudTitle, detectTrackType } from '../parseTitle';

describe('parseTitle', () => {
  describe('normalizeArtistName', () => {
    it('should capitalize first letter and remove trailing numbers', () => {
      expect(normalizeArtistName('larian67')).toBe('Larian');
      expect(normalizeArtistName('artist123')).toBe('Artist');
    });

    it('should handle empty string', () => {
      expect(normalizeArtistName('')).toBe('');
    });

    it('should capitalize first letter', () => {
      expect(normalizeArtistName('test')).toBe('Test');
    });

    it('should handle single character', () => {
      expect(normalizeArtistName('a')).toBe('A');
    });
  });

  describe('parseSoundCloudTitle', () => {
    it('should parse "Artist - Title (REMIX)" format', () => {
      const result = parseSoundCloudTitle("Youssou N'Dour - KIRIKOU (LARIAN FLIP)", 'larian67');

      expect(result.artist).toContain("Youssou N'Dour");
      expect(result.artist).toContain('LARIAN FLIP');
      expect(result.title).toBe('Kirikou'); // Title is normalized from uppercase
    });

    it('should parse "Artist - Title" format', () => {
      const result = parseSoundCloudTitle('Artist - Song Title', 'larian67');

      expect(result.artist).toBe('Artist');
      expect(result.title).toBe('Song Title');
    });

    it('should handle title with remix term', () => {
      const result = parseSoundCloudTitle('Artist - Song FLIP', 'larian67');

      expect(result.artist).toContain('Artist');
      expect(result.artist).toContain('FLIP');
    });

    it('should handle empty title', () => {
      const result = parseSoundCloudTitle('', 'larian67');

      expect(result.artist).toBe('Larian');
      expect(result.title).toBe('');
    });

    it('should normalize uppercase titles', () => {
      const result = parseSoundCloudTitle('ARTIST - SONG TITLE', 'larian67');

      expect(result.title).toBe('Song Title');
    });

    it('should capitalize first letter of title', () => {
      const result = parseSoundCloudTitle('artist - song title', 'larian67');

      expect(result.title).toBe('Song title');
    });
  });

  describe('detectTrackType', () => {
    it('should detect remix', () => {
      expect(detectTrackType('Song (Artist REMIX)')).toBe('remix');
      expect(detectTrackType('Song FLIP')).toBe('remix');
      expect(detectTrackType('Song bootleg')).toBe('remix');
    });

    it('should detect djset', () => {
      expect(detectTrackType('DJ Set Mix')).toBe('djset');
      expect(detectTrackType('DJSet')).toBe('djset');
    });

    it('should detect live', () => {
      expect(detectTrackType('Song Live')).toBe('live');
    });

    it('should detect ep', () => {
      expect(detectTrackType('EP Title')).toBe('ep');
    });

    it('should detect album', () => {
      expect(detectTrackType('Album Title')).toBe('album');
    });

    it('should detect video', () => {
      expect(detectTrackType('Video Clip')).toBe('video');
    });

    it('should default to single', () => {
      expect(detectTrackType('Regular Song')).toBe('single');
    });
  });
});
