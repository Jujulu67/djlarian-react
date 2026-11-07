import { matchTitreField } from '../parseTitle';

const OLD = /Titre\s*[: ]\s*(.+?)(?:\s+par\s+|$)/i;
const PIECES = ['Titre', 'titre', ':', ' ', ' ', '  ', 'par', 'Par', 'x', 'Mama', '-'];

function randomText(seed: number): string {
  let state = seed;
  const next = () => (state = (state * 1103515245 + 12345) % 2 ** 31);
  return Array.from({ length: 1 + (next() % 9) }, () => PIECES[next() % PIECES.length]).join('');
}

describe('matchTitreField', () => {
  it('extrait le titre avant « par »', () => {
    expect(matchTitreField('Titre : Mama (Larian Remix) par Larian')?.[1]).toBe(
      'Mama (Larian Remix)'
    );
    expect(matchTitreField('Pas de titre ici')).toBeNull();
  });

  it('donne le même titre que l’ancienne regex sur une ligne', () => {
    for (let i = 1; i <= 5000; i++) {
      const text = randomText(i);
      const expected = text.match(OLD)?.[1].trim() || null;
      // L'ancienne regex pouvait prendre le séparateur « : » lui-même pour le titre
      if (expected && /^[:\u00A0\s]+$/.test(expected)) continue;
      expect({ text, title: matchTitreField(text)?.[1] ?? null }).toEqual({
        text,
        title: expected,
      });
    }
  });
});
