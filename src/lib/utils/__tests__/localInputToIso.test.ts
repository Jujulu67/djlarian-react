import { localInputToIso } from '../localInputToIso';

describe('localInputToIso', () => {
  const originalTz = process.env.TZ;
  beforeAll(() => {
    process.env.TZ = 'Europe/Paris';
  });
  afterAll(() => {
    process.env.TZ = originalTz;
  });

  it("convertit l'heure locale en UTC (hiver : UTC+1)", () => {
    expect(localInputToIso('2026-12-15T21:00')).toBe('2026-12-15T20:00:00.000Z');
  });

  it("convertit l'heure locale en UTC (été : UTC+2)", () => {
    expect(localInputToIso('2026-07-01T21:00')).toBe('2026-07-01T19:00:00.000Z');
  });

  it('laisse passer les valeurs vides, ISO ou date seule', () => {
    expect(localInputToIso('')).toBeNull();
    expect(localInputToIso(undefined)).toBeNull();
    expect(localInputToIso('2026-12-15T20:00:00.000Z')).toBe('2026-12-15T20:00:00.000Z');
    expect(localInputToIso('2026-12-15')).toBe('2026-12-15');
  });
});
