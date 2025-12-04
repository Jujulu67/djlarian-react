import { extractProjectNameFromFileName, parseStreamsCsv } from '../parseStreamsCsv';

describe('parseStreamsCsv', () => {
  describe('extractProjectNameFromFileName', () => {
    it('should extract project name from simple filename', () => {
      expect(extractProjectNameFromFileName('Magnetized-timeline.csv')).toBe('Magnetized');
      expect(extractProjectNameFromFileName('I Lied-timeline.csv')).toBe('I Lied');
    });

    it('should remove numbered duplicates', () => {
      expect(extractProjectNameFromFileName('I Lied-timeline (1).csv')).toBe('I Lied');
      expect(extractProjectNameFromFileName('Track Name (2).csv')).toBe('Track Name');
      expect(extractProjectNameFromFileName('Song (10).csv')).toBe('Song');
    });

    it('should remove common suffixes', () => {
      expect(extractProjectNameFromFileName('Track-timeline.csv')).toBe('Track');
      expect(extractProjectNameFromFileName('Track-streams.csv')).toBe('Track');
      expect(extractProjectNameFromFileName('Track-stream.csv')).toBe('Track');
      expect(extractProjectNameFromFileName('Track-data.csv')).toBe('Track');
    });

    it('should be case insensitive for suffixes', () => {
      expect(extractProjectNameFromFileName('Track-TIMELINE.csv')).toBe('Track');
      expect(extractProjectNameFromFileName('Track-Streams.csv')).toBe('Track');
      expect(extractProjectNameFromFileName('Track-DATA.csv')).toBe('Track');
    });

    it('should handle CSV extension in different cases', () => {
      expect(extractProjectNameFromFileName('Track.csv')).toBe('Track');
      expect(extractProjectNameFromFileName('Track.CSV')).toBe('Track');
    });

    it('should handle complex names', () => {
      expect(extractProjectNameFromFileName('My Complex Track Name-timeline (1).csv')).toBe(
        'My Complex Track Name'
      );
    });

    it('should preserve name if no suffix to remove', () => {
      expect(extractProjectNameFromFileName('Simple Track.csv')).toBe('Simple Track');
      expect(extractProjectNameFromFileName('Track Name.csv')).toBe('Track Name');
    });

    it('should handle edge cases', () => {
      expect(extractProjectNameFromFileName('.csv')).toBe('');
      expect(extractProjectNameFromFileName('track.csv')).toBe('track');
    });
  });

  describe('parseStreamsCsv', () => {
    it('should parse valid CSV with header', () => {
      const csv = `date,streams
2024-01-01,1000
2024-01-02,1500
2024-01-03,2000`;

      const result = parseStreamsCsv(csv, 'test-timeline.csv');

      expect(result.fileName).toBe('test-timeline.csv');
      expect(result.projectName).toBe('test');
      expect(result.streams).toHaveLength(3);
      expect(result.streams[0]).toEqual({ date: '2024-01-01', streams: 1000 });
      expect(result.streams[1]).toEqual({ date: '2024-01-02', streams: 1500 });
      expect(result.streams[2]).toEqual({ date: '2024-01-03', streams: 2000 });
      expect(result.errors).toBeUndefined();
    });

    it('should parse valid CSV without header', () => {
      const csv = `2024-01-01,1000
2024-01-02,1500`;

      const result = parseStreamsCsv(csv, 'test.csv');

      expect(result.streams).toHaveLength(2);
      expect(result.streams[0]).toEqual({ date: '2024-01-01', streams: 1000 });
      expect(result.errors).toBeUndefined();
    });

    it('should sort streams by date', () => {
      const csv = `2024-01-03,3000
2024-01-01,1000
2024-01-02,2000`;

      const result = parseStreamsCsv(csv, 'test.csv');

      expect(result.streams[0].date).toBe('2024-01-01');
      expect(result.streams[1].date).toBe('2024-01-02');
      expect(result.streams[2].date).toBe('2024-01-03');
    });

    it('should handle empty file', () => {
      const result = parseStreamsCsv('', 'test.csv');

      expect(result.streams).toHaveLength(0);
      expect(result.errors).toContain('Le fichier CSV est vide');
    });

    it('should handle file with only whitespace', () => {
      const result = parseStreamsCsv('   \n  \n  ', 'test.csv');

      expect(result.streams).toHaveLength(0);
      expect(result.errors).toContain('Le fichier CSV est vide');
    });

    it('should parse different date formats', () => {
      const csv = `2024-01-01,1000
01/15/2024,1500
2024-02-20,2000`;

      const result = parseStreamsCsv(csv, 'test.csv');

      expect(result.streams).toHaveLength(3);
      expect(result.streams[0].date).toBe('2024-01-01');
      expect(result.streams[1].date).toBe('2024-01-15');
      expect(result.streams[2].date).toBe('2024-02-20');
    });

    it('should handle decimal stream values', () => {
      const csv = `2024-01-01,1000.7
2024-01-02,1500.3
2024-01-03,2000.5`;

      const result = parseStreamsCsv(csv, 'test.csv');

      expect(result.streams[0].streams).toBe(1000); // Floored
      expect(result.streams[1].streams).toBe(1500); // Floored
      expect(result.streams[2].streams).toBe(2000); // Floored
    });
    it('should report invalid date format', () => {
      const csv = `invalid-date,1000
2024-01-02,1500`;

      const result = parseStreamsCsv(csv, 'test.csv');

      expect(result.streams).toHaveLength(1);
      expect(result.errors).toContain('Ligne 1: Date invalide "invalid-date"');
    });

    it('should report invalid streams value', () => {
      const csv = `2024-01-01,invalid
2024-01-02,1500`;

      const result = parseStreamsCsv(csv, 'test.csv');

      expect(result.streams).toHaveLength(1);
      expect(result.errors).toContain('Ligne 1: Nombre de streams invalide "invalid"');
    });

    it('should report invalid line format', () => {
      const csv = `2024-01-01
2024-01-02,1500`;

      const result = parseStreamsCsv(csv, 'test.csv');

      expect(result.streams).toHaveLength(1);
      expect(result.errors).toContain('Ligne 1: Format invalide (attendu: date,streams)');
    });

    it('should handle multiple errors', () => {
      const csv = `date,streams
invalid-date,1000
2024-01-02,invalid
2024-01-03
2024-01-04,2000`;

      const result = parseStreamsCsv(csv, 'test.csv');

      expect(result.streams).toHaveLength(1);
      expect(result.errors).toHaveLength(3);
    });

    it('should handle CSV with extra columns', () => {
      const csv = `2024-01-01,1000,extra,data
2024-01-02,1500,more,stuff`;

      const result = parseStreamsCsv(csv, 'test.csv');

      expect(result.streams).toHaveLength(2);
      expect(result.streams[0]).toEqual({ date: '2024-01-01', streams: 1000 });
    });

    it('should trim whitespace from values', () => {
      const csv = `  2024-01-01  ,  1000  
  2024-01-02  ,  1500  `;

      const result = parseStreamsCsv(csv, 'test.csv');

      expect(result.streams).toHaveLength(2);
      expect(result.streams[0]).toEqual({ date: '2024-01-01', streams: 1000 });
    });

    it('should floor decimal stream values', () => {
      const csv = `2024-01-01,1000.7
2024-01-02,1500.3`;

      const result = parseStreamsCsv(csv, 'test.csv');

      expect(result.streams[0].streams).toBe(1000);
      expect(result.streams[1].streams).toBe(1500);
    });

    it('should handle negative stream values', () => {
      const csv = `2024-01-01,-100
2024-01-02,1500`;

      const result = parseStreamsCsv(csv, 'test.csv');

      expect(result.streams[0].streams).toBe(-100);
    });
  });
});
