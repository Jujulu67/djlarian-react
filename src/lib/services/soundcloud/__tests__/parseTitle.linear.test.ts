import { matchBracketRemix, matchDash, matchDashParen } from '../parseTitle';

// Anciennes regex (retour arrière super-linéaire) : la référence de comportement
const OLD_DASH_PAREN = /^(.+?)\s*-\s*(.+?)\s*\(([^)]+)\)$/i;
const OLD_DASH = /^(.+?)\s*-\s*(.+)$/;
const OLD_BRACKET = /^(.+?)\s*[([](.+?)\s+(FLIP|REMIX|BOOTLEG|EDIT|REWORK)[)\]]$/i;

const PIECES = ['a', 'B', ' ', '  ', '-', '(', ')', '[', ']', 'Remix', 'FLIP', 'x y'];

function randomTitle(seed: number): string {
  let state = seed;
  const next = () => {
    state = (state * 1103515245 + 12345) % 2 ** 31;
    return state;
  };
  const length = 1 + (next() % 10);
  return Array.from({ length }, () => PIECES[next() % PIECES.length]).join('');
}

const trimAll = (groups: readonly string[] | null | undefined) =>
  groups ? groups.map((g) => g.trim()) : null;

describe('découpages linéaires de parseTitle', () => {
  const titles = [
    "Youssou N'Dour - KIRIKOU (LARIAN FLIP)",
    'Artist - Title',
    'Title (Larian Remix)',
    'Title [Some One BOOTLEG]',
    '- leading dash',
    'trailing dash -',
    'a - b (c (d)',
    ...Array.from({ length: 5000 }, (_, i) => randomTitle(i + 1)),
  ];

  it.each([
    ['Artiste - Titre (Remix)', OLD_DASH_PAREN, matchDashParen],
    ['Artiste - Titre', OLD_DASH, matchDash],
    ['Titre (Artiste REMIX)', OLD_BRACKET, matchBracketRemix],
  ] as const)('%s : mêmes groupes que l’ancienne regex', (_name, oldRegex, linear) => {
    for (const title of titles) {
      const expected = trimAll(title.match(oldRegex)?.slice(1));
      const actual = trimAll(linear(title));
      if (expected) {
        expect({ title, groups: actual }).toEqual({ title, groups: expected });
      } else {
        expect({ title, groups: actual }).toEqual({ title, groups: null });
      }
    }
  });
});
