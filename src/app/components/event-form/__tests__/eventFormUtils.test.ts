/**
 * Tests de la logique pure du formulaire d'événement.
 * Ces tests figent le comportement actuel (extrait tel quel de EventForm.tsx).
 */
import { centerAspectCrop, getRecurrenceOccurrences } from '../eventFormUtils';

describe('getRecurrenceOccurrences', () => {
  // Midi local : reste dans le même jour quelle que soit la timezone de la CI
  const monday = '2026-01-05T12:00:00';

  it('retourne une liste vide sans date de première occurrence', () => {
    expect(getRecurrenceOccurrences(undefined, 'weekly', undefined, undefined)).toEqual([]);
    expect(getRecurrenceOccurrences('', 'weekly', undefined, undefined)).toEqual([]);
  });

  it('génère 26 occurrences hebdomadaires sans date de fin', () => {
    const result = getRecurrenceOccurrences(monday, 'weekly', undefined, undefined);

    expect(result).toHaveLength(26);
    expect(result[0]).toEqual({ value: '2026-01-12', label: '12 janvier 2026' });
    expect(result[1]).toEqual({ value: '2026-01-19', label: '19 janvier 2026' });
  });

  it('génère 12 occurrences mensuelles sans date de fin', () => {
    const result = getRecurrenceOccurrences(monday, 'monthly', undefined, undefined);

    expect(result).toHaveLength(12);
    expect(result[0]).toEqual({ value: '2026-02-05', label: '05 février 2026' });
    expect(result[1]).toEqual({ value: '2026-03-05', label: '05 mars 2026' });
  });

  it("utilise 'weekly' quand la fréquence est absente", () => {
    const result = getRecurrenceOccurrences(monday, undefined, undefined, undefined);

    expect(result).toHaveLength(26);
    expect(result[0].value).toBe('2026-01-12');
  });

  it('arrête les occurrences après la date de fin', () => {
    const result = getRecurrenceOccurrences(monday, 'weekly', '2026-01-20', undefined);

    expect(result.map((o) => o.value)).toEqual(['2026-01-12', '2026-01-19']);
  });

  it('retire les dates exclues de la liste', () => {
    const result = getRecurrenceOccurrences(monday, 'weekly', undefined, ['2026-01-12']);

    expect(result).toHaveLength(25);
    expect(result[0].value).toBe('2026-01-19');
    expect(result.some((o) => o.value === '2026-01-12')).toBe(false);
  });
});

describe('centerAspectCrop', () => {
  it('crée une zone recadrée en pourcentage centrée verticalement pour une image carrée', () => {
    const crop = centerAspectCrop(1000, 1000, 16 / 9);

    expect(crop.unit).toBe('%');
    expect(crop.x).toBeCloseTo(0);
    expect(crop.width).toBeCloseTo(100);
    expect(crop.height).toBeCloseTo(56.25);
    expect(crop.y).toBeCloseTo(21.875);
  });

  it('couvre toute la largeur et la hauteur pour une image déjà en 16/9', () => {
    const crop = centerAspectCrop(1600, 900, 16 / 9);

    expect(crop.width).toBeCloseTo(100);
    expect(crop.height).toBeCloseTo(100);
    expect(crop.x).toBeCloseTo(0);
    expect(crop.y).toBeCloseTo(0);
  });
});
