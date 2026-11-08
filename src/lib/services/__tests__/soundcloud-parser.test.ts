import { describe, it, expect, jest } from '@jest/globals';

// Mock cheerio avant d'importer soundcloud
jest.mock('cheerio', () => ({
  load: jest.fn(() => ({
    html: jest.fn(),
  })),
}));

// Importer seulement les fonctions de parsing, pas le module entier qui dépend de cheerio
// Ces fonctions sont exportées pour les tests
import { parseSoundCloudTitle, normalizeArtistName } from '../soundcloud';

describe('SoundCloud Parser', () => {
  describe('normalizeArtistName', () => {
    it('should capitalize first letter and remove trailing numbers', () => {
      expect(normalizeArtistName('larian67')).toBe('Larian');
      expect(normalizeArtistName('larian')).toBe('Larian');
      expect(normalizeArtistName('DJLARIAN')).toBe('Djlarian');
    });

    it('should handle empty strings', () => {
      expect(normalizeArtistName('')).toBe('');
    });

    it('should handle single character', () => {
      expect(normalizeArtistName('a')).toBe('A');
    });
  });

  describe('parseSoundCloudTitle', () => {
    it.each([
      [
        'should parse "Artiste - Titre (REMIX TERM)" format',
        "Youssou N'Dour - KIRIKOU (LARIAN FLIP)",
        "Youssou N'Dour (LARIAN FLIP)",
        'Kirikou',
      ],
      [
        'should parse "Artiste - Titre" format without remix',
        'Artist Name - Song Title',
        'Artist Name',
        'Song Title',
      ],
      // Le pattern 2 extrait le préfixe avant REMIX si présent
      [
        'should parse "Artiste - Titre REMIX" format',
        'Artist - Song REMIX',
        'Artist (REMIX)',
        'Song',
      ],
      [
        'should parse "Titre (Artiste REMIX)" format',
        'Song Title (Original Artist REMIX)',
        'Original Artist (REMIX)',
        'Song Title',
      ],
      ['should handle BOOTLEG term', 'Artist - Song (BOOTLEG)', 'Artist (BOOTLEG)', 'Song'],
      // Le pattern 2 extrait le préfixe avant EDIT si présent
      ['should handle EDIT term', 'Artist - Song EDIT', 'Artist (EDIT)', 'Song'],
    ])('%s', (_title, input, artist, title) => {
      const result = parseSoundCloudTitle(input, 'larian67');
      expect(result.artist).toBe(artist);
      expect(result.title).toBe(title);
    });

    it('should use profile name as artist when no pattern matches', () => {
      const result = parseSoundCloudTitle('Just a simple title', 'larian67');
      expect(result.artist).toBe('Larian');
      expect(result.title).toBe('Just a simple title');
    });

    it('should normalize uppercase titles', () => {
      const result = parseSoundCloudTitle('ARTIST - SONG TITLE', 'larian67');
      expect(result.artist).toBe('ARTIST'); // L'artiste n'est pas normalisé, seul le titre l'est
      expect(result.title).toBe('Song Title');
    });

    it('should handle empty title', () => {
      const result = parseSoundCloudTitle('', 'larian67');
      expect(result.artist).toBe('Larian');
      expect(result.title).toBe('');
    });

    it('should handle FLIP in parentheses with profile name', () => {
      const result = parseSoundCloudTitle("Youssou N'Dour - KIRIKOU (LARIAN FLIP)", 'larian67');
      expect(result.artist).toBe("Youssou N'Dour (LARIAN FLIP)");
      expect(result.title).toBe('Kirikou');
    });

    it('should handle REMIX in parentheses', () => {
      const result = parseSoundCloudTitle('Artist - Song (REMIX)', 'larian67');
      expect(result.artist).toBe('Artist (REMIX)');
      expect(result.title).toBe('Song');
    });

    it('should handle multiple remix terms and use the first one', () => {
      const result = parseSoundCloudTitle('Artist - Song (FLIP REMIX)', 'larian67');
      // Should detect FLIP first
      expect(result.artist).toContain('FLIP');
      expect(result.title).toBe('Song');
    });
  });
});
