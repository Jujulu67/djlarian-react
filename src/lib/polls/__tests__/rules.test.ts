import {
  formatCountdown,
  generatePollCode,
  getRoundOutcome,
  isRoundOpen,
  parseParticipants,
  POLL_CODE_PATTERN,
  secondsLeft,
  tallyVotes,
} from '../rules';

describe('parseParticipants', () => {
  it('lit une liste numérotée ou à puces, un nom par ligne', () => {
    const text = '1. DJ Alpha\n2) Beta  Crew\n\n#3 - Gamma\n- Delta\n• Epsilon\n';
    expect(parseParticipants(text)).toEqual(['DJ Alpha', 'Beta Crew', 'Gamma', 'Delta', 'Epsilon']);
  });

  it('sépare une seule ligne par virgules ou points-virgules', () => {
    expect(parseParticipants('Alpha, Beta ;Gamma')).toEqual(['Alpha', 'Beta', 'Gamma']);
  });

  it('garde les virgules quand il y a plusieurs lignes', () => {
    expect(parseParticipants('Alpha, le retour\nBeta')).toEqual(['Alpha, le retour', 'Beta']);
  });

  it('retire les doublons sans tenir compte de la casse et garde la première écriture', () => {
    expect(parseParticipants('Alpha\nALPHA\nbeta\nBeta')).toEqual(['Alpha', 'beta']);
  });

  it('ne garde pas un nom réduit à un numéro et coupe les noms trop longs', () => {
    const long = 'x'.repeat(200);
    expect(parseParticipants(`1.\n${long}`)).toEqual(['x'.repeat(80)]);
  });

  it('garde un nom qui commence par un chiffre sans séparateur', () => {
    expect(parseParticipants('2Pac\n50 Cent')).toEqual(['2Pac', '50 Cent']);
  });
});

describe('tallyVotes et getRoundOutcome', () => {
  const ids = ['a', 'b', 'c'];

  it('classe par voix puis par ordre de saisie, en ignorant les voix hors manche', () => {
    const votes = [{ optionId: 'c' }, { optionId: 'b' }, { optionId: 'c' }, { optionId: 'zz' }];
    expect(tallyVotes(ids, votes)).toEqual([
      { optionId: 'c', votes: 2 },
      { optionId: 'b', votes: 1 },
      { optionId: 'a', votes: 0 },
    ]);
  });

  it('désigne un gagnant unique', () => {
    expect(getRoundOutcome(tallyVotes(ids, [{ optionId: 'b' }]))).toEqual({
      kind: 'winner',
      winnerId: 'b',
    });
  });

  it('renvoie les ex æquo en tête', () => {
    const votes = [{ optionId: 'a' }, { optionId: 'c' }, { optionId: 'a' }, { optionId: 'c' }];
    expect(getRoundOutcome(tallyVotes(ids, votes))).toEqual({ kind: 'tie', tiedIds: ['a', 'c'] });
  });

  it("met tout le monde à égalité quand personne n'a voté", () => {
    expect(getRoundOutcome(tallyVotes(ids, []))).toEqual({ kind: 'tie', tiedIds: ids });
  });
});

describe('minuterie', () => {
  const now = new Date('2026-11-07T20:00:00Z');

  it('une manche est ouverte strictement avant sa fin', () => {
    expect(isRoundOpen({ endsAt: new Date(now.getTime() + 1) }, now)).toBe(true);
    expect(isRoundOpen({ endsAt: now }, now)).toBe(false);
  });

  it('arrondit les secondes restantes au-dessus et ne descend pas sous 0', () => {
    expect(secondsLeft(now.getTime() + 1500, now.getTime())).toBe(2);
    expect(secondsLeft(now.getTime() - 5000, now.getTime())).toBe(0);
  });

  it('formate en minutes:secondes', () => {
    expect(formatCountdown(0)).toBe('0:00');
    expect(formatCountdown(65)).toBe('1:05');
    expect(formatCountdown(600)).toBe('10:00');
  });
});

describe('generatePollCode', () => {
  it('produit un code de 6 caractères sans caractère ambigu', () => {
    let seed = 0;
    const code = generatePollCode((max) => seed++ % max);
    expect(code).toMatch(POLL_CODE_PATTERN);
    expect(code).not.toMatch(/[01OIL]/);
  });
});
