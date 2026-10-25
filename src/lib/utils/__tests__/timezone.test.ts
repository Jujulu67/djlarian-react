import { addDaysInTimeZone, addMonthsInTimeZone } from '../timezone';

// Heure de Paris d'un instant, au format HH:mm
const parisTime = (date: Date) =>
  new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);

const parisDate = (date: Date) =>
  new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', dateStyle: 'short' }).format(date);

describe('addDaysInTimeZone', () => {
  it('keeps 20:00 Paris across the October DST change', () => {
    const start = new Date('2026-10-21T18:00:00.000Z'); // mercredi 21/10 20:00 (UTC+2)
    const next = addDaysInTimeZone(start, 7);

    expect(next.toISOString()).toBe('2026-10-28T19:00:00.000Z'); // 20:00 (UTC+1)
    expect(parisTime(next)).toBe('20:00');
    expect(parisDate(next)).toBe('28/10/2026');
  });

  it('keeps 00:30 Paris across the March DST change', () => {
    const start = new Date('2026-03-24T23:30:00.000Z'); // 25/03 00:30 (UTC+1)
    const next = addDaysInTimeZone(start, 7);

    expect(parisTime(next)).toBe('00:30');
    expect(parisDate(next)).toBe('01/04/2026');
    expect(next.toISOString()).toBe('2026-03-31T22:30:00.000Z'); // UTC+2
  });

  it('is a plain 7-day shift when no DST change is crossed', () => {
    const start = new Date('2026-06-10T18:00:00.000Z');
    expect(addDaysInTimeZone(start, 7).toISOString()).toBe('2026-06-17T18:00:00.000Z');
  });

  it('preserves milliseconds', () => {
    const start = new Date('2026-06-10T18:00:00.123Z');
    expect(addDaysInTimeZone(start, 1).toISOString()).toBe('2026-06-11T18:00:00.123Z');
  });
});

describe('addMonthsInTimeZone', () => {
  it('keeps the Paris wall-clock time across DST', () => {
    const start = new Date('2026-10-10T18:00:00.000Z'); // 10/10 20:00 (UTC+2)
    const next = addMonthsInTimeZone(start, 1);

    expect(parisTime(next)).toBe('20:00');
    expect(parisDate(next)).toBe('10/11/2026');
  });

  it('clamps to the last day of shorter months like date-fns', () => {
    const start = new Date('2027-01-31T19:00:00.000Z'); // 31/01 20:00
    const next = addMonthsInTimeZone(start, 1);

    expect(parisDate(next)).toBe('28/02/2027');
    expect(parisTime(next)).toBe('20:00');
  });

  it('handles year rollover', () => {
    const start = new Date('2026-12-15T19:00:00.000Z');
    expect(parisDate(addMonthsInTimeZone(start, 1))).toBe('15/01/2027');
  });
});
