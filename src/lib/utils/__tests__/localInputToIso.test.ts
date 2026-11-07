import { localInputToIso } from '../localInputToIso';

// Indépendant du fuseau de la machine (Paris en local, UTC en CI) :
// la valeur attendue est construite comme une heure locale.
const localIso = (y: number, m: number, d: number, h: number, min: number) =>
  new Date(y, m - 1, d, h, min).toISOString();

describe('localInputToIso', () => {
  it('lit la saisie comme une heure locale (hiver et été)', () => {
    expect(localInputToIso('2026-12-15T21:00')).toBe(localIso(2026, 12, 15, 21, 0));
    expect(localInputToIso('2026-07-01T21:00')).toBe(localIso(2026, 7, 1, 21, 0));
  });

  it('renvoie une date ISO en UTC, que le serveur ne peut pas mal lire', () => {
    expect(localInputToIso('2026-12-15T21:00')).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00\.000Z$/);
  });

  it('laisse passer les valeurs vides, ISO ou date seule', () => {
    expect(localInputToIso('')).toBeNull();
    expect(localInputToIso(undefined)).toBeNull();
    expect(localInputToIso('2026-12-15T20:00:00.000Z')).toBe('2026-12-15T20:00:00.000Z');
    expect(localInputToIso('2026-12-15')).toBe('2026-12-15');
  });
});
