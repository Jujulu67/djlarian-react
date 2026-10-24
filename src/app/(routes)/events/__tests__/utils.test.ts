/**
 * Tests de la logique pure de la page événements.
 * Ces tests figent le comportement actuel (extrait tel quel de page.tsx).
 */
import {
  type Event,
  buildEventsUrl,
  calculateEndDate,
  filterEventsBySearch,
  formatEventDate,
  generateRecurringDatesForEvent,
  generateVirtualOccurrences,
  getStatusColor,
  getStatusLabel,
  isPastEvent,
  sortEventsForDisplay,
} from '../utils';

jest.mock('@/lib/logger', () => ({
  logger: {
    debug: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

const NOW = new Date('2026-06-01T12:00:00.000Z');

function makeEvent(overrides: Partial<Event> = {}): Event {
  return {
    id: 'evt-1',
    title: 'Soirée techno',
    description: 'Une nuit électronique',
    location: 'Paris',
    startDate: '2026-07-01T20:00:00.000Z',
    status: 'UPCOMING',
    isPublished: true,
    ...overrides,
  } as Event;
}

describe('buildEventsUrl', () => {
  it('ne filtre pas par statut quand la valeur est "all"', () => {
    expect(buildEventsUrl('all')).toBe('/api/events?isPublished=true');
  });

  it('ajoute le paramètre de statut sinon', () => {
    expect(buildEventsUrl('UPCOMING')).toBe('/api/events?isPublished=true&status=UPCOMING');
  });
});

describe('sortEventsForDisplay', () => {
  it('met les événements mis en avant en premier, puis trie par date', () => {
    const a = makeEvent({ id: 'a', startDate: '2026-07-01T20:00:00.000Z' });
    const b = makeEvent({ id: 'b', startDate: '2026-08-01T20:00:00.000Z', featured: true });
    const c = makeEvent({ id: 'c', startDate: '2026-06-15T20:00:00.000Z' });

    expect(sortEventsForDisplay([a, b, c]).map((e) => e.id)).toEqual(['b', 'c', 'a']);
  });

  it('ne met pas en avant une occurrence virtuelle mise en avant', () => {
    const virtual = makeEvent({
      id: 'v',
      startDate: '2026-06-10T20:00:00.000Z',
      featured: true,
      isVirtualOccurrence: true,
    });
    const normal = makeEvent({ id: 'n', startDate: '2026-06-20T20:00:00.000Z' });

    expect(sortEventsForDisplay([normal, virtual]).map((e) => e.id)).toEqual(['v', 'n']);
  });
});

describe('filterEventsBySearch', () => {
  const events = [
    makeEvent({ id: '1', title: 'Soirée Techno', description: 'Club', location: 'Paris' }),
    makeEvent({ id: '2', title: 'Open air', description: 'Plein air techno', location: 'Lyon' }),
    makeEvent({ id: '3', title: 'Festival', description: 'Grand', location: 'Marseille' }),
  ];

  it('retourne tous les événements sans terme de recherche', () => {
    expect(filterEventsBySearch(events, '')).toHaveLength(3);
  });

  it('cherche dans le titre, la description et le lieu, sans casse', () => {
    expect(filterEventsBySearch(events, 'TECHNO').map((e) => e.id)).toEqual(['1', '2']);
    expect(filterEventsBySearch(events, 'marseille').map((e) => e.id)).toEqual(['3']);
  });

  it('retourne une liste vide si rien ne correspond', () => {
    expect(filterEventsBySearch(events, 'inconnu')).toEqual([]);
  });
});

describe('libellés et couleurs de statut', () => {
  it('traduit les statuts connus', () => {
    expect(getStatusLabel('UPCOMING')).toBe('À venir');
    expect(getStatusLabel('CANCELLED')).toBe('Annulé');
    expect(getStatusLabel('COMPLETED')).toBe('Terminé');
  });

  it('retourne le statut brut quand il est inconnu', () => {
    expect(getStatusLabel('DRAFT')).toBe('DRAFT');
  });

  it('associe une couleur à chaque statut, bleu par défaut', () => {
    expect(getStatusColor('UPCOMING')).toBe('bg-blue-500');
    expect(getStatusColor('CANCELLED')).toBe('bg-red-500');
    expect(getStatusColor('COMPLETED')).toBe('bg-gray-500');
    expect(getStatusColor('AUTRE')).toBe('bg-blue-500');
  });
});

describe('dates', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(NOW);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('formate la date au format court français', () => {
    expect(formatEventDate('2026-07-14T12:00:00')).toBe('14 juillet 2026');
  });

  it('indique si un événement est passé', () => {
    expect(isPastEvent('2026-05-01T00:00:00.000Z')).toBe(true);
    expect(isPastEvent('2026-07-01T00:00:00.000Z')).toBe(false);
  });

  it("calcule la fin d'une occurrence en conservant la durée d'origine", () => {
    const end = calculateEndDate(
      new Date('2026-07-01T10:00:00.000Z'),
      new Date('2026-06-01T10:00:00.000Z'),
      new Date('2026-06-01T12:00:00.000Z')
    );

    expect(end).toBe('2026-07-01T12:00:00.000Z');
  });

  it("génère les dates mensuelles jusqu'à 6 mois, sans exclusion", () => {
    const event = makeEvent({ startDate: '2026-05-15T10:00:00.000Z' });
    const dates = generateRecurringDatesForEvent(event, { frequency: 'monthly' });

    expect(dates).toHaveLength(6);
    expect(dates.every((d) => d.getTime() > new Date(event.startDate).getTime())).toBe(true);
  });

  it('respecte la date de fin de récurrence', () => {
    const event = makeEvent({ startDate: '2026-05-15T10:00:00.000Z' });
    const dates = generateRecurringDatesForEvent(event, {
      frequency: 'monthly',
      endDate: '2026-08-20',
    });

    expect(dates).toHaveLength(3);
  });

  it('retire les dates exclues', () => {
    const event = makeEvent({ startDate: '2026-05-15T10:00:00.000Z' });
    // Les dates exclues sont passées en 3e argument (cf. appel dans generateVirtualOccurrences)
    const dates = generateRecurringDatesForEvent(event, { frequency: 'monthly' }, ['2026-07-15']);

    expect(dates).toHaveLength(5);
    expect(dates.map((d) => d.toISOString().split('T')[0])).not.toContain('2026-07-15');
  });

  it('génère les occurrences virtuelles futures après le maître', () => {
    const master = makeEvent({
      id: 'm1',
      startDate: '2026-05-15T10:00:00.000Z',
      isMasterEvent: true,
      recurrenceConfig: { frequency: 'monthly' },
    });

    const result = generateVirtualOccurrences([master]);

    expect(result).toHaveLength(7);
    expect(result[0]).toMatchObject({ id: 'm1', isRecurringMaster: true });
    expect(result[1]).toMatchObject({
      isVirtualOccurrence: true,
      masterId: 'm1',
      startDate: '2026-06-15T10:00:00.000Z',
      virtualStartDate: '2026-06-15T10:00:00.000Z',
    });
    expect(result[1].id).toBe('m1___VIRTUAL___2026-06-15T10:00:00.000Z');
  });

  it('laisse les événements non récurrents tels quels', () => {
    const single = makeEvent({ id: 's1' });

    expect(generateVirtualOccurrences([single])).toEqual([single]);
  });
});
