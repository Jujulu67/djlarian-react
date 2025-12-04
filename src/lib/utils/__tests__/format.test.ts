import { formatDuration, formatDate, formatTime, formatNumber } from '../format';

describe('format utilities', () => {
  describe('formatDuration', () => {
    it('should format seconds to MM:SS', () => {
      expect(formatDuration(0)).toBe('0:00');
      expect(formatDuration(30)).toBe('0:30');
      expect(formatDuration(60)).toBe('1:00');
      expect(formatDuration(90)).toBe('1:30');
      expect(formatDuration(125)).toBe('2:05');
      expect(formatDuration(3661)).toBe('61:01');
    });

    it('should handle decimal seconds', () => {
      expect(formatDuration(90.7)).toBe('1:30');
      expect(formatDuration(125.9)).toBe('2:05');
    });

    it('should pad seconds with zero', () => {
      expect(formatDuration(65)).toBe('1:05');
      expect(formatDuration(605)).toBe('10:05');
    });
  });

  describe('formatDate', () => {
    it('should format date in French locale', () => {
      const result = formatDate('2024-01-15');
      expect(result).toContain('janvier');
      expect(result).toContain('2024');
      expect(result).toContain('15');
    });

    it('should handle different date formats', () => {
      const result1 = formatDate('2024-12-25T10:30:00Z');
      expect(result1).toContain('décembre');
      expect(result1).toContain('2024');
      expect(result1).toContain('25');
    });

    it('should handle ISO date strings', () => {
      const result = formatDate('2024-06-01T00:00:00.000Z');
      expect(result).toContain('juin');
      expect(result).toContain('2024');
    });
  });

  describe('formatTime', () => {
    it('should format time in French locale', () => {
      const result = formatTime('2024-01-15T14:30:00Z');
      // Time formatting depends on timezone, so we just check format
      expect(result).toMatch(/\d{2}:\d{2}/);
    });

    it('should use 24-hour format', () => {
      const result = formatTime('2024-01-15T23:45:00Z');
      expect(result).toMatch(/\d{2}:\d{2}/);
    });
  });

  describe('formatNumber', () => {
    it('should format numbers less than 1000 as-is', () => {
      expect(formatNumber(0)).toBe('0');
      expect(formatNumber(1)).toBe('1');
      expect(formatNumber(999)).toBe('999');
    });

    it('should format thousands with k suffix', () => {
      expect(formatNumber(1000)).toBe('1.0k');
      expect(formatNumber(1500)).toBe('1.5k');
      expect(formatNumber(10000)).toBe('10.0k');
      expect(formatNumber(999999)).toBe('1000.0k');
    });

    it('should format millions with M suffix', () => {
      expect(formatNumber(1000000)).toBe('1.0M');
      expect(formatNumber(1500000)).toBe('1.5M');
      expect(formatNumber(10000000)).toBe('10.0M');
      expect(formatNumber(123456789)).toBe('123.5M');
    });

    it('should round to one decimal place', () => {
      expect(formatNumber(1234)).toBe('1.2k');
      expect(formatNumber(1567)).toBe('1.6k');
      expect(formatNumber(1234567)).toBe('1.2M');
    });
  });
});
